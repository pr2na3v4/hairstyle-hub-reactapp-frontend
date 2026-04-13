import React, {
    useState,
    useRef,
    useEffect,
    useCallback,
    useMemo,
} from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { Card } from '../components/cards';
import './FaceScanPage.css';
import Loader from '../components/Loader';

// ─── Configuration ────────────────────────────────────────────────────────────
const AI_API          = 'https://hairstyle-hub-backend-ai.onrender.com';
const DB_API          = 'https://hairstyle-hub-backend.onrender.com';
const LENGTH_FILTERS  = ['All', 'Short', 'Medium', 'Long'];
const ERROR_DISMISS_MS = 5000;
const SIMILAR_COUNT   = 4;

// Oblong has no separate haircut category in the DB — map to Oval
const toDbShape = (shape) => (shape === 'Oblong' ? 'Oval' : shape);

// ─── API Layer ────────────────────────────────────────────────────────────────
const analyzeFace = async (fileSource) => {
    const body = new FormData();
    body.append('file', fileSource);
    const res = await fetch(`${AI_API}/analyze-face`, { method: 'POST', body });
    if (!res.ok) throw new Error(`AI server error ${res.status}`);
    return res.json();
};

const fetchHaircutsByShape = async (shape) => {
    try {
        const res = await fetch(`${DB_API}/api/haircuts`);
        if (!res.ok) throw new Error(`DB error ${res.status}`);
        const all = await res.json();
        const dbShape = toDbShape(shape);
        return all.filter(
            (h) => Array.isArray(h.faceShape) && h.faceShape.includes(dbShape)
        );
    } catch (err) {
        console.error('DB fetch failed:', err);
        return [];
    }
};

// ─── Custom Hook ──────────────────────────────────────────────────────────────
const useFaceScan = (currentUser) => {
    const [phase, setPhase]                     = useState('idle');
    const [result, setResult]                   = useState(null);
    const [recommendations, setRecommendations] = useState([]);
    const [capturedImg, setCapturedImg]         = useState(null);
    const [error, setError]                     = useState(null);

    const videoRef     = useRef(null);
    const canvasRef    = useRef(null);
    const fileInputRef = useRef(null);
    const streamRef    = useRef(null);
    const isLoadingRef = useRef(false);

    const stopCamera = useCallback(() => {
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        if (videoRef.current) videoRef.current.srcObject = null;
    }, []);

    useEffect(() => () => stopCamera(), [stopCamera]);

    // Auto-dismiss error toast after ERROR_DISMISS_MS
    useEffect(() => {
        if (!error) return;
        const id = setTimeout(() => setError(null), ERROR_DISMISS_MS);
        return () => clearTimeout(id);
    }, [error]);

    const startCamera = useCallback(async () => {
        if (!currentUser) return;
        setError(null);
        setPhase('camera');
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
            });
            streamRef.current = stream;
            if (videoRef.current) videoRef.current.srcObject = stream;
        } catch {
            setError('Camera access denied. Please allow camera permission.');
            setPhase('idle');
        }
    }, [currentUser]);

    const handleAnalysis = useCallback(async (fileSource) => {
        if (isLoadingRef.current || !currentUser) return;
        isLoadingRef.current = true;

        setPhase('loading');
        setError(null);
        stopCamera();

        if (fileInputRef.current) fileInputRef.current.value = '';

        try {
            // 1. AI analysis — main.py handles data storage server-side
            const aiData = await analyzeFace(fileSource);

            if (aiData.status === 'success') {
                // 2. Fetch matching haircuts from DB
                const cuts = await fetchHaircutsByShape(aiData.detected_shape);
                setResult(aiData);
                setRecommendations(cuts);
                setPhase('result');
            } else {
                setError(aiData.message || 'Analysis failed. Try a clearer photo.');
                setPhase('idle');
            }
        } catch {
            setError('Server is warming up — please try again in a few seconds.');
            setPhase('idle');
        } finally {
            isLoadingRef.current = false;
        }
    }, [stopCamera, currentUser]);

    const captureFromCamera = useCallback(() => {
        const video  = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas) return;

        const ctx = canvas.getContext('2d');
        canvas.width  = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.save();
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0);
        ctx.restore();

        setCapturedImg(canvas.toDataURL('image/jpeg'));
        canvas.toBlob((blob) => handleAnalysis(blob), 'image/jpeg', 0.9);
    }, [handleAnalysis]);

    const reset = useCallback(() => {
        setPhase('idle');
        setResult(null);
        setRecommendations([]);
        setCapturedImg(null);
        setError(null);
    }, []);

    return {
        phase, result, recommendations, capturedImg, error,
        videoRef, canvasRef, fileInputRef,
        startCamera, stopCamera, captureFromCamera, handleAnalysis, reset, setError,
    };
};

// ─── Sub-components ───────────────────────────────────────────────────────────

const FilterChips = ({ active, onChange }) => (
    <div className="filter-section">
        <h4 className="section-heading">Filter by Length</h4>
        <div className="chips-container">
            {LENGTH_FILTERS.map((f) => (
                <button
                    key={f}
                    onClick={() => onChange(f)}
                    className={`chip${active === f ? ' active' : ''}`}
                >
                    {f}
                </button>
            ))}
        </div>
    </div>
);

const ResultView = ({ result, capturedImg, recommendations, onReset }) => {
    const [filter, setFilter] = useState('All');

    // Items matching the active length filter
    const filteredItems = useMemo(
        () =>
            filter === 'All'
                ? recommendations
                : recommendations.filter((h) => h.hairLength === filter),
        [recommendations, filter]
    );

    // "More Styles" — random picks from the full pool, excluding already-shown items
    // FIX: was using Math.random() inside useMemo which only runs once and never
    //      reshuffles. Also was pooling from the wrong set (non-matching lengths).
    //      Now uses useState + useEffect so it re-shuffles when filter or
    //      recommendations change.
    const [similarStyles, setSimilarStyles] = useState([]);
    useEffect(() => {
        const shownIds = new Set(filteredItems.map((h) => h._id));
        const pool     = recommendations.filter((h) => !shownIds.has(h._id));
        const shuffled = [...pool].sort(() => Math.random() - 0.5);
        setSimilarStyles(shuffled.slice(0, SIMILAR_COUNT));
    }, [filteredItems, recommendations]);

    return (
        <div className="results-wrapper animate-fade-in">
            <section className="analysis-hero">
                <div className="user-scan-card">
                    <div className="captured-image-container">
                        <img src={capturedImg} alt="User scan" className="user-face-print" />
                        <div className="scan-overlay-label">AI Analysis</div>
                    </div>
                    <div className="result-details">
                        <h2 className="result-label">Analysis Complete</h2>
                        <h3 className="detected-shape">{result.detected_shape}</h3>
                        <p className="confidence-text">
                            Confidence: <span>{result.confidence}</span>
                        </p>
                        <button onClick={onReset} className="reset-btn">Try Again</button>
                    </div>
                </div>
            </section>

            <FilterChips active={filter} onChange={setFilter} />

            <section className="recommendations-section">
                <h4 className="grid-title">
                    Top {filter !== 'All' ? filter : ''} Picks
                </h4>
                <div className="cards-grid">
                    {filteredItems.map((h) => (
                        // FIX: removed h._id?.$oid fallback — Mongoose returns plain string _id
                        <Card key={h._id} id={h._id} imageUrl={h.imageUrl} name={h.name} description={h.style} />
                    ))}
                </div>
            </section>

            {similarStyles.length > 0 && (
                <section className="similar-styles-section">
                    <div className="section-divider" />
                    <h4 className="grid-title">More Styles for {result.detected_shape} Faces</h4>
                    <div className="cards-grid">
                        {similarStyles.map((h) => (
                            <Card key={h._id} id={h._id} imageUrl={h.imageUrl} name={h.name} description={h.style} />
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
};

// ─── Main Page ────────────────────────────────────────────────────────────────
const FaceScanPage = ({ currentUser, authLoading }) => {
    const navigate = useNavigate();
    const {
        phase, result, recommendations, capturedImg, error,
        videoRef, canvasRef, fileInputRef,
        startCamera, stopCamera, captureFromCamera, handleAnalysis, reset, setError,
    } = useFaceScan(currentUser);

    useEffect(() => {
        if (!authLoading && !currentUser) {
            Swal.fire({
                title: 'Members Only',
                text: 'Please login to access the AI Face Scan feature.',
                icon: 'lock',
                confirmButtonColor: '#ff4757',
                confirmButtonText: 'Go to Login',
                allowOutsideClick: false,
            }).then(() => navigate('/login'));
        }
    }, [currentUser, authLoading, navigate]);

    if (authLoading) return <Loader />;
    if (!currentUser) return null;

    return (
        <div className="facescan-page">
            {phase === 'idle' && (
                <section className="hero-section">
                    <h1 className="hero-title">Know Your Face Shape</h1>
                    <p className="hero-subtitle">
                        Upload a photo or use your camera for AI recommendations.
                    </p>
                    <div className="action-buttons">
                        <button className="btn-outline" onClick={() => fileInputRef.current?.click()}>
                            <i className="ri-image-add-line" /> Upload
                        </button>
                        <button className="btn-primary" onClick={startCamera}>
                            <i className="ri-camera-lens-line" /> Camera
                        </button>
                    </div>
                    <input
                        type="file"
                        ref={fileInputRef}
                        hidden
                        accept="image/*"
                        onChange={(e) => e.target.files[0] && handleAnalysis(e.target.files[0])}
                    />
                </section>
            )}

            {phase === 'camera' && (
                <section className="scanner-container">
                    <div className="camera-viewfinder">
                        <video ref={videoRef} autoPlay playsInline className="camera-video" />
                        <div className="face-guideline">
                            <div className="oval-guide" />
                        </div>
                    </div>
                    <div className="scanner-actions">
                        <button onClick={captureFromCamera} className="capture-btn" />
                        <button
                            onClick={() => { stopCamera(); reset(); }}
                            className="text-btn"
                        >
                            Cancel
                        </button>
                    </div>
                </section>
            )}

            {phase === 'loading' && <Loader />}

            {phase === 'result' && result && (
                <ResultView
                    result={result}
                    capturedImg={capturedImg}
                    recommendations={recommendations}
                    onReset={reset}
                />
            )}

            {error && (
                <div className="error-toast" onClick={() => setError(null)}>
                    {error}
                </div>
            )}

            <canvas ref={canvasRef} style={{ display: 'none' }} />
        </div>
    );
};

export default FaceScanPage;