import React, {
    useState,
    useRef,
    useEffect,
    useCallback,
    useMemo,
} from 'react';
import { Card } from '../components/cards';
import './FaceScanPage.css';
import Loader from '../components/Loader';

// ─── Configuration ────────────────────────────────────────────────────────────
const AI_API = 'https://hairstyle-hub-backend-ai.onrender.com';
const DB_API  = 'https://hairstyle-hub-backend.onrender.com';
const LENGTH_FILTERS = ['All', 'Short', 'Medium', 'Long'];
const ERROR_DISMISS_MS = 5000;

// FIX #3: Mongoose schema stores "Oval"; map AI's "Oblong" before querying
const toDbShape = (shape) => (shape === 'Oblong' ? 'Oval' : shape);

// ─── API Layer ────────────────────────────────────────────────────────────────
const analyzeFace = async (fileSource) => {
    const body = new FormData();
    body.append('file', fileSource);
    const res = await fetch(`${AI_API}/analyze-face`, { method: 'POST', body });
    if (!res.ok) throw new Error(`AI server error ${res.status}`);
    return res.json(); // { status, detected_shape, confidence, message? }
};

// FIX #5: Returns [] on failure — DB outage never crashes the UI
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
const useFaceScan = () => {
    const [phase, setPhase]                     = useState('idle'); // idle | camera | loading | result
    const [result, setResult]                   = useState(null);
    const [recommendations, setRecommendations] = useState([]);
    const [capturedImg, setCapturedImg]         = useState(null);
    const [error, setError]                     = useState(null);

    const videoRef     = useRef(null);
    const canvasRef    = useRef(null);
    const fileInputRef = useRef(null);
    const streamRef    = useRef(null);  // Holds live MediaStream — ref avoids stale-closure bugs
    // FIX #11: Track loading with a ref so handleAnalysis never needs `phase` as a dep,
    //          keeping the function reference stable across phase changes
    const isLoadingRef = useRef(false);

    // ── Camera ────────────────────────────────────────────────────────────────
    const stopCamera = useCallback(() => {
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        if (videoRef.current) videoRef.current.srcObject = null;
    }, []);

    // Guaranteed cleanup on unmount
    useEffect(() => () => stopCamera(), [stopCamera]);

    // FIX #14: Auto-dismiss error toast after 5 s
    useEffect(() => {
        if (!error) return;
        const id = setTimeout(() => setError(null), ERROR_DISMISS_MS);
        return () => clearTimeout(id);
    }, [error]);

    // FIX #1: Stable reference via useCallback
    // FIX #6: Clears stale error before opening camera
    const startCamera = useCallback(async () => {
        setError(null);
        setPhase('camera');
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
            });
            streamRef.current = stream;
            if (videoRef.current) videoRef.current.srcObject = stream;
        } catch {
            setError('Camera access denied. Please allow camera permission and try again.');
            setPhase('idle');
        }
    }, []);

    // ── Analysis ──────────────────────────────────────────────────────────────
    // FIX #11: Stable reference — isLoadingRef replaces `phase` as the duplicate-call guard
    const handleAnalysis = useCallback(async (fileSource) => {
        if (isLoadingRef.current) return;
        isLoadingRef.current = true;

        setPhase('loading');
        setError(null);
        stopCamera();

        // FIX #4 + #15: Reset so the same file can be re-selected next time
        if (fileInputRef.current) fileInputRef.current.value = '';

        try {
            const aiData = await analyzeFace(fileSource);
            if (aiData.status === 'success') {
                const cuts = await fetchHaircutsByShape(aiData.detected_shape);
                setResult(aiData);
                setRecommendations(cuts);
                setPhase('result');
            } else {
                setError(aiData.message || 'Analysis failed. Try a clearer, well-lit photo.');
                setPhase('idle');
            }
        } catch {
            setError('Server is warming up — please try again in 15 seconds.');
            setPhase('idle');
        } finally {
            // Always unlock so subsequent attempts can proceed
            isLoadingRef.current = false;
        }
    }, [stopCamera]); // stopCamera is stable → handleAnalysis is now stable too

    // FIX #2: Stable useCallback with correct dep (handleAnalysis)
    // FIX #16: Guards against a 0×0 canvas when stream isn't ready yet
    const captureFromCamera = useCallback(() => {
        const video  = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas) return;

        if (!video.videoWidth || !video.videoHeight) {
            setError('Camera is still starting — please try again in a moment.');
            return;
        }

        const ctx = canvas.getContext('2d');
        canvas.width  = video.videoWidth;
        canvas.height = video.videoHeight;

        // Draw mirrored so the blob matches the viewfinder preview
        ctx.save();
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0);
        ctx.restore();

        // Capture preview + send blob in one pass — never call toBlob twice
        setCapturedImg(canvas.toDataURL('image/jpeg'));
        canvas.toBlob((blob) => handleAnalysis(blob), 'image/jpeg', 0.9);
    }, [handleAnalysis]);

    // FIX #17 + #18: Stable useCallback that clears ALL state including recommendations
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

    const filteredItems = useMemo(
        () =>
            filter === 'All'
                ? recommendations
                : recommendations.filter((h) => h.hairLength === filter),
        [recommendations, filter]
    );

    return (
        <div className="results-wrapper animate-fade-in">
            <section className="analysis-hero">
                <div className="user-scan-card">
                    <div className="captured-image-container">
                        <img src={capturedImg} alt="Your face scan" className="user-face-print" />
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
                {filteredItems.length > 0 ? (
                    <div className="haircut-grid">
                        {filteredItems.map((h) => (
                            <Card key={h._id} {...h} />
                        ))}     
                    </div>
                ) : (
                    <p className="empty-state">
                        No {filter !== 'All' ? `${filter.toLowerCase()} ` : ''}styles found for your face shape.
                    </p>
                )}
            </section>
        </div>
    );
};

// ─── Page Component ───────────────────────────────────────────────────────────
const FaceScanPage = () => {
    // FIX #19: Multi-line destructuring for readability
    const {
        phase, result, recommendations, capturedImg, error,
        videoRef, canvasRef, fileInputRef,
        startCamera, stopCamera, captureFromCamera, handleAnalysis, reset, setError,
    } = useFaceScan();

    return (
        <div className="facescan-page">

            {/* ── Idle ── */}
            {phase === 'idle' && (
                <section className="hero-section">
                    <h1 className="hero-title">Know Your Face Shape</h1>
                    {/* FIX #20: Subtitle restored */}
                    <p className="hero-subtitle">
                        Upload a photo or use your camera for AI-powered hairstyle recommendations.
                    </p>
                    <div className="action-buttons">
                        <button className="btn-outline" onClick={() => fileInputRef.current?.click()}>
                            <i className="ri-image-add-line" /> Upload Image
                        </button>
                        <button className="btn-primary" onClick={startCamera}>
                            <i className="ri-camera-lens-line" /> Open Camera
                        </button>
                    </div>
                    <input
                        type="file"
                        ref={fileInputRef}
                        hidden
                        accept="image/*"
                        onChange={(e) => {
                            const file = e.target.files[0];
                            if (file) handleAnalysis(file);
                        }}
                    />
                </section>
            )}

            {/* ── Camera ── */}
            {/* FIX #7 #8 #9 #10: Restored camera-viewfinder, oval overlay, and scanner-actions wrappers */}
            {phase === 'camera' && (
                <section className="scanner-container">
                    <div className="camera-viewfinder">
                        <video ref={videoRef} autoPlay playsInline className="camera-video" />
                        <div className="face-guideline">
                            <div className="oval-guide" />
                        </div>
                    </div>
                    <div className="scanner-actions">
                        <button
                            onClick={captureFromCamera}
                            className="capture-btn"
                            aria-label="Capture photo"
                        />
                        <button
                            onClick={() => { stopCamera(); reset(); }}
                            className="text-btn"
                        >
                            Cancel
                        </button>
                    </div>
                </section>
            )}

            {/* ── Loading ── */}
            {phase === 'loading' && <Loader />}

            {/* ── Result ── */}
            {phase === 'result' && result && (
                <ResultView
                    result={result}
                    capturedImg={capturedImg}
                    recommendations={recommendations}
                    onReset={reset}
                />
            )}

            {/* ── Error toast ── */}
            {error && (
                <div className="error-toast" role="alert" onClick={() => setError(null)}>
                    {error}
                </div>
            )}

            <canvas ref={canvasRef} style={{ display: 'none' }} />
        </div>
    );
};

export default FaceScanPage;