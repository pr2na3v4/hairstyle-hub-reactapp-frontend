import React, {
    useState,
    useRef,
    useEffect,
    useCallback,
    useMemo,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Swal from 'sweetalert2';
import { Card } from '../components/cards';
import './FaceScanPage.css';
import Loader from '../components/Loader';

const AI_API      = 'https://hairstyle-hub-backend-ai.onrender.com';
const DB_API      = 'https://hairstyle-hub-backend.onrender.com';
const LENGTH_FILTERS  = ['All', 'Short', 'Medium', 'Long'];
const SIMILAR_COUNT   = 4;

const toDbShape = (shape) => (shape === 'Oblong' ? 'Oval' : shape);

// --- 1. Optimization: Move constant fetchers outside to avoid re-creation ---
const analyzeFace = async (fileSource) => {
    const body = new FormData();
    body.append('file', fileSource);
    const res = await fetch(`${AI_API}/analyze-face`, { method: 'POST', body });
    if (!res.ok) throw new Error(`AI server error`);
    return res.json();
};

const fetchAllHaircuts = async () => {
    const res = await fetch(`${DB_API}/api/haircuts`);
    return res.json();
};

const useFaceScan = (currentUser) => {
    const [phase, setPhase] = useState('idle');
    const [result, setResult] = useState(null);
    const [capturedImg, setCapturedImg] = useState(null);
    const [error, setError] = useState(null);

    const videoRef     = useRef(null);
    const canvasRef    = useRef(null);
    const fileInputRef = useRef(null);
    const streamRef    = useRef(null);

    const { data: allHaircuts = [] } = useQuery({
        queryKey: ['haircuts'],
        queryFn: fetchAllHaircuts,
        staleTime: 1000 * 60 * 60,
    });

    const stopCamera = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((t) => t.stop());
            streamRef.current = null;
        }
        if (videoRef.current) videoRef.current.srcObject = null;
    }, []);

    // --- 2. Cleanup: Ensure camera stops if user navigates away mid-scan ---
    useEffect(() => {
        return () => stopCamera();
    }, [stopCamera]);

    const startCamera = useCallback(async () => {
        if (!currentUser) return;
        setError(null);
        setPhase('camera');
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                // Optimization: Use exact constraints for mobile performance
                video: { facingMode: 'user', width: { ideal: 720 }, height: { ideal: 1280 } },
            });
            streamRef.current = stream;
            if (videoRef.current) videoRef.current.srcObject = stream;
        } catch (err) {
            setError('Camera access denied.');
            setPhase('idle');
        }
    }, [currentUser]);

    const handleAnalysis = useCallback(async (fileSource) => {
        setPhase('loading');
        stopCamera();
        try {
            const aiData = await analyzeFace(fileSource);
            if (aiData.status === 'success') {
                setResult(aiData);
                setPhase('result');
            } else {
                throw new Error(aiData.message || 'Face not detected');
            }
        } catch (err) {
            setError(err.message);
            setPhase('idle');
        }
    }, [stopCamera]);

    const captureFromCamera = useCallback(() => {
        const video  = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas) return;

        const ctx = canvas.getContext('2d');
        canvas.width  = video.videoWidth;
        canvas.height = video.videoHeight;
        
        // Mirror the image for the final result
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        setCapturedImg(dataUrl);
        
        canvas.toBlob((blob) => handleAnalysis(blob), 'image/jpeg', 0.8);
    }, [handleAnalysis]);

    const reset = useCallback(() => {
        setPhase('idle');
        setResult(null);
        setCapturedImg(null);
        setError(null);
    }, []);

    const recommendations = useMemo(() => {
        if (!result) return [];
        const dbShape = toDbShape(result.detected_shape);
        return allHaircuts.filter(h => Array.isArray(h.faceShape) && h.faceShape.includes(dbShape));
    }, [result, allHaircuts]);

    return { phase, result, recommendations, capturedImg, error, videoRef, canvasRef, fileInputRef, startCamera, stopCamera, captureFromCamera, handleAnalysis, reset, setError };
};

// --- Main Components ---

const ResultView = ({ result, capturedImg, recommendations, onReset }) => {
    const [filter, setFilter] = useState('All');

    // 3. Performance: Only calculate visible cards
    const filteredItems = useMemo(() => 
        filter === 'All' ? recommendations : recommendations.filter(h => h.hairLength === filter),
    [recommendations, filter]);

    return (
        <div className="results-wrapper animate-fade-in">
            <section className="analysis-hero">
                <div className="user-scan-card">
                    <div className="captured-image-container">
                        <img src={capturedImg} alt="User scan" className="user-face-print" />
                    </div>
                    <div className="result-details">
                        <h3 className="detected-shape">{result.detected_shape}</h3>
                        <p className="confidence-text">Match: {result.confidence}</p>
                        <button onClick={onReset} className="reset-btn">New Scan</button>
                    </div>
                </div>
            </section>

            <div className="filter-section">
                <div className="chips-container">
                    {LENGTH_FILTERS.map(f => (
                        <button key={f} onClick={() => setFilter(f)} className={`chip ${filter === f ? 'active' : ''}`}>{f}</button>
                    ))}
                </div>
            </div>

            <section className="recommendations-section">
                <div className="cards-grid">
                    {filteredItems.map((h) => (
                        <Card key={h._id} id={h._id} imageUrl={h.imageUrl} name={h.name} description={h.style} />
                    ))}
                </div>
            </section>
        </div>
    );
};

const FaceScanPage = ({ currentUser, authLoading }) => {
    const navigate = useNavigate();
    const { phase, result, recommendations, capturedImg, error, videoRef, canvasRef, fileInputRef, startCamera, stopCamera, captureFromCamera, handleAnalysis, reset, setError } = useFaceScan(currentUser);

    // 4. Optimization: Logic check
    useEffect(() => {
        if (!authLoading && !currentUser) {
            navigate('/login');
        }
    }, [currentUser, authLoading, navigate]);

    if (authLoading) return <Loader />;

    return (
        <div className="facescan-page">
            {phase === 'idle' && (
                <section className="hero-section">
                    <h1 className="hero-title">AI Face Analysis</h1>
                    <div className="action-buttons">
                        <button className="btn-outline" onClick={() => fileInputRef.current?.click()}>Upload</button>
                        <button className="btn-primary" onClick={startCamera}>Camera</button>
                    </div>
                    <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={(e) => e.target.files[0] && handleAnalysis(e.target.files[0])} />
                </section>
            )}

            {phase === 'camera' && (
                <div className="scanner-container">
                    <video ref={videoRef} autoPlay playsInline className="camera-video" />
                    <div className="scanner-actions">
                        <button onClick={captureFromCamera} className="capture-btn" />
                        <button onClick={reset} className="text-btn">Cancel</button>
                    </div>
                </div>
            )}

            {phase === 'loading' && <Loader />}
            {phase === 'result' && <ResultView result={result} capturedImg={capturedImg} recommendations={recommendations} onReset={reset} />}
            {error && <div className="error-toast">{error}</div>}
            <canvas ref={canvasRef} style={{ display: 'none' }} />
        </div>
    );
};

export default FaceScanPage;