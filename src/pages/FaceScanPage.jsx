import React, {
    useState,
    useRef,
    useEffect,
    useCallback,
    useMemo,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card } from '../components/cards';
import Loader from '../components/Loader';
import './FaceScanPage.css';

// --- Configuration & Constants ---
const AI_API = import.meta.env.VITE_FACE_SCAN_API_URL;
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const LENGTH_FILTERS = ['All', 'Short', 'Medium', 'Long'];
const FACE_CONFIDENCE_THRESHOLD = 0.8;
const CENTER_TOLERANCE = 0.15;

/**
 * Normalizes face shape strings for database compatibility.
 */
const toDbShape = (shape) => (shape === 'Oblong' ? 'Oval' : shape);

/**
 * Validates if the detected face is centered and sized correctly.
 */
const checkPosition = (detection, videoWidth, videoHeight) => {
    if (!detection) return false;

    const { x, y, width, height } = detection.box;
    const centerX = x + width / 2;
    const centerY = y + height / 2;

    const isCenteredX = Math.abs(centerX / videoWidth - 0.5) < CENTER_TOLERANCE;
    const isCenteredY = Math.abs(centerY / videoHeight - 0.5) < CENTER_TOLERANCE;
    
    const faceSizeRatio = width / videoWidth;
    const isGoodSize = faceSizeRatio > 0.3 && faceSizeRatio < 0.7;

    return isCenteredX && isCenteredY && isGoodSize;
};

// --- Fetchers ---
const analyzeFace = async (fileSource) => {
    const body = new FormData();
    body.append('file', fileSource);
    const res = await fetch(`${AI_API}/analyze-face`, { method: 'POST', body });
    if (!res.ok) throw new Error(`AI server error`);
    return res.json();
};

const fetchAllHaircuts = async () => {
    const res = await fetch(`${API_BASE_URL}/haircuts`);
    if (!res.ok) throw new Error('Failed to fetch haircuts');
    return res.json();
};

// --- Custom Hook ---
/**
 * Manages the state and logic for the face scanning process.
 */
const useFaceScan = (currentUser) => {
    const [phase, setPhase] = useState('idle'); // idle, camera, loading, result
    const [result, setResult] = useState(null);
    const [capturedImg, setCapturedImg] = useState(null);
    const [error, setError] = useState(null);
    const [facingMode, setFacingMode] = useState('user');

    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const fileInputRef = useRef(null);
    const streamRef = useRef(null);
    const detectionLoopRef = useRef(null);

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

    const startCamera = useCallback(async () => {
        if (!currentUser) return;
        setError(null);
        setPhase('camera');
        stopCamera();

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { 
                    facingMode, 
                    width: { ideal: 720 }, 
                    height: { ideal: 1280 } 
                },
            });
            streamRef.current = stream;
            if (videoRef.current) videoRef.current.srcObject = stream;
        } catch (err) {
            setError('Camera access denied.');
            setPhase('idle');
        }
    }, [currentUser, facingMode, stopCamera]);

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
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas) return;

        const ctx = canvas.getContext('2d');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        if (facingMode === 'user') {
            ctx.translate(canvas.width, 0);
            ctx.scale(-1, 1);
        }

        ctx.drawImage(video, 0, 0);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        setCapturedImg(dataUrl);
        canvas.toBlob((blob) => handleAnalysis(blob), 'image/jpeg', 0.8);
    }, [handleAnalysis, facingMode]);

    const handleAutoCapture = useCallback(() => {
        if ('vibrate' in navigator) navigator.vibrate(200);
        captureFromCamera();
    }, [captureFromCamera]);

    const runDetection = useCallback(async () => {
        if (phase !== 'camera' || !videoRef.current) return;

        // Placeholder for face detection logic
        const detection = null; 

        if (detection && checkPosition(detection, videoRef.current.videoWidth, videoRef.current.videoHeight)) {
            handleAutoCapture();
        } else {
            detectionLoopRef.current = requestAnimationFrame(runDetection);
        }
    }, [phase, handleAutoCapture]);

    // Side Effects
    useEffect(() => {
        if (phase === 'camera') runDetection();
        return () => cancelAnimationFrame(detectionLoopRef.current);
    }, [phase, runDetection]);

    useEffect(() => {
        if (phase === 'camera') startCamera();
    }, [facingMode, startCamera, phase]);

    useEffect(() => {
        return () => stopCamera();
    }, [stopCamera]);

    const reset = useCallback(() => {
        setPhase('idle');
        setResult(null);
        setCapturedImg(null);
        setError(null);
        setFacingMode('user');
    }, []);

    const recommendations = useMemo(() => {
        if (!result) return [];
        const dbShape = toDbShape(result.detected_shape);
        return allHaircuts.filter(h => Array.isArray(h.faceShape) && h.faceShape.includes(dbShape));
    }, [result, allHaircuts]);

    return { 
        phase, result, recommendations, capturedImg, error, 
        videoRef, canvasRef, fileInputRef, startCamera, 
        captureFromCamera, handleAnalysis, reset, setError,
        facingMode, setFacingMode 
    };
};

// --- Sub-Components ---

const CameraView = ({ videoRef, onCapture, onCancel, onToggle, facingMode }) => (
    <div className="scanner-container">
        <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            className={`camera-video ${facingMode === 'user' ? 'mirrored' : ''}`} 
        />
        <div className="scanner-actions">
            <button onClick={onCancel} className="text-btn">Cancel</button>
            <button onClick={onCapture} className="capture-btn" aria-label="Capture" />
            <button onClick={onToggle} className="toggle-btn">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                    <path d="M3 3v5h5M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16M16 16h5v5" />
                </svg>
            </button>
        </div>
    </div>
);

const ResultView = ({ result, capturedImg, recommendations, onReset }) => {
    const [filter, setFilter] = useState('All');

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
                        <button 
                            key={f} 
                            onClick={() => setFilter(f)} 
                            className={`chip ${filter === f ? 'active' : ''}`}
                        >
                            {f}
                        </button>
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

// --- Main Page Component ---

const FaceScanPage = ({ currentUser, authLoading }) => {
    const navigate = useNavigate();
    const { 
        phase, result, recommendations, capturedImg, error, 
        videoRef, canvasRef, fileInputRef, startCamera, 
        captureFromCamera, handleAnalysis, reset, 
        facingMode, setFacingMode 
    } = useFaceScan(currentUser);

    useEffect(() => {
        if (!authLoading && !currentUser) navigate('/login');
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
                <CameraView 
                    videoRef={videoRef} 
                    onCapture={captureFromCamera} 
                    onCancel={reset} 
                    facingMode={facingMode}
                    onToggle={() => setFacingMode(prev => prev === 'user' ? 'environment' : 'user')}
                />
            )}

            {phase === 'loading' && <Loader />}
            
            {phase === 'result' && (
                <ResultView 
                    result={result} 
                    capturedImg={capturedImg} 
                    recommendations={recommendations} 
                    onReset={reset} 
                />
            )}

            {error && <div className="error-toast">{error}</div>}
            {/* Utility canvas for processing images */}
            <canvas ref={canvasRef} style={{ display: 'none' }} />
        </div>
    );
};

export default FaceScanPage;