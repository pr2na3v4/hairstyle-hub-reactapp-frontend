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

// ─── Constants ────────────────────────────────────────────────────────────────
const AI_API = import.meta.env.VITE_FACE_SCAN_API_URL;
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const LENGTH_FILTERS = ['All', 'Short', 'Medium', 'Long'];
const SIMILAR_COUNT = 4;

const CENTER_TOLERANCE = 0.25;
const FACE_MIN_RATIO = 0.10;
const FACE_MAX_RATIO = 0.40;
const COUNTDOWN_START = 3;
const DETECTION_INTERVAL = 120;

// ─── Helpers ──────────────────────────────────────────────────────────────────
const toDbShape = (shape) => (shape === 'Oblong' ? 'Oval' : shape);

const isFacePositionOk = (detection, videoW, videoH) => {
    if (!detection) return false;
    const { x, y, width, height } = detection.boundingBox;
    const cx = x + width / 2;
    const cy = y + height / 2;
    const ratio = width / videoW;
    return (
        Math.abs(cx / videoW - 0.5) < CENTER_TOLERANCE &&
        Math.abs(cy / videoH - 0.5) < CENTER_TOLERANCE &&
        ratio > FACE_MIN_RATIO && ratio < FACE_MAX_RATIO
    );
};

const FACE_DETECTOR_SUPPORTED = typeof window !== 'undefined' && 'FaceDetector' in window;

// ─── API ──────────────────────────────────────────────────────────────────────
const analyzeFace = async (blob) => {
    const body = new FormData();
    body.append('file', blob);
    const res = await fetch(`${AI_API}/analyze-face`, { method: 'POST', body });
    if (!res.ok) throw new Error('AI server error');
    return res.json();
};

const fetchAllHaircuts = async () => {
    const res = await fetch(`${API_BASE_URL}/haircuts`);
    if (!res.ok) throw new Error('Failed to fetch haircuts');
    return res.json();
};

const checkHasBackCamera = async () => {
    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        return devices.filter((d) => d.kind === 'videoinput').length > 1;
    } catch {
        return false;
    }
};

// ─── useFaceScan Hook ─────────────────────────────────────────────────────────
// ─── useFaceScan Hook with Persistence ─────────────────────────────────────────
const useFaceScan = (currentUser) => {
    // 1. Initialize state from SessionStorage to handle page refreshes
    const [phase, setPhase] = useState(() => {
        const saved = sessionStorage.getItem('face_scan_result');
        return saved ? 'result' : 'idle';
    });

    const [result, setResult] = useState(() => {
        const saved = sessionStorage.getItem('face_scan_result');
        return saved ? JSON.parse(saved) : null;
    });

    const [capturedImg, setCapturedImg] = useState(() => {
        return sessionStorage.getItem('face_scan_image') || null;
    });

    const [error, setError] = useState(null);
    const [facingMode, setFacingMode] = useState('user');
    const [hasBackCam, setHasBackCam] = useState(false);
    const [countdown, setCountdown] = useState(null);

    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const fileInputRef = useRef(null);
    const streamRef = useRef(null);
    const intervalRef = useRef(null);
    const countdownRef = useRef(null);
    const countdownValRef = useRef(null);
    const captureReadyRef = useRef(false);
    const isSwitchingRef = useRef(false);
    const faceDetRef = useRef(null);
    const captureRef = useRef(null);

    const { data: allHaircuts = [] } = useQuery({
        queryKey: ['haircuts'],
        queryFn: fetchAllHaircuts,
        staleTime: 1000 * 60 * 60,
    });

    useEffect(() => { checkHasBackCamera().then(setHasBackCam); }, []);

    // Clear error after 5s
    useEffect(() => {
        if (!error) return;
        const id = setTimeout(() => setError(null), 5000);
        return () => clearTimeout(id);
    }, [error]);

    const stopAll = useCallback(() => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        if (countdownRef.current) clearInterval(countdownRef.current);
        intervalRef.current = null;
        countdownRef.current = null;
        captureReadyRef.current = false;
        countdownValRef.current = null;
        setCountdown(null);

        if (streamRef.current) {
            streamRef.current.getTracks().forEach((t) => t.stop());
            streamRef.current = null;
        }
        if (videoRef.current) videoRef.current.srcObject = null;
    }, []);

    const startDetection = useCallback(() => {
        if (!FACE_DETECTOR_SUPPORTED) return;

        if (!faceDetRef.current) {
            // eslint-disable-next-line no-undef
            faceDetRef.current = new FaceDetector({ fastMode: true, maxDetectedFaces: 1 });
        }

        intervalRef.current = setInterval(async () => {
            const video = videoRef.current;
            if (!video || video.readyState < 2) return;

            let detection = null;
            try {
                const faces = await faceDetRef.current.detect(video);
                detection = faces[0] ?? null;
            } catch { return; }

            const ok = isFacePositionOk(detection, video.videoWidth, video.videoHeight);

            if (ok && !captureReadyRef.current) {
                captureReadyRef.current = true;
                countdownValRef.current = COUNTDOWN_START;
                setCountdown(COUNTDOWN_START);

                countdownRef.current = setInterval(() => {
                    countdownValRef.current -= 1;
                    setCountdown(countdownValRef.current);

                    if (countdownValRef.current <= 0) {
                        const currentCapture = captureRef.current;
                        stopAll();
                        if ('vibrate' in navigator) navigator.vibrate(150);
                        currentCapture?.();
                    }
                }, 1000);

            } else if (!ok && captureReadyRef.current) {
                captureReadyRef.current = false;
                countdownValRef.current = null;
                setCountdown(null);
                if (countdownRef.current) clearInterval(countdownRef.current);
                countdownRef.current = null;
            }
        }, DETECTION_INTERVAL);
    }, [stopAll]);

    const startCamera = useCallback(async (mode = 'user') => {
        if (!currentUser) return;
        stopAll();
        setError(null);
        setFacingMode(mode);
        setPhase('camera');

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { 
                    facingMode: mode, 
                    aspectRatio: { ideal: 1.7777777778 },
                    width: { ideal: 1280 }, 
                    height: { ideal: 720 } 
                },
            });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.onloadedmetadata = () => startDetection();
            }
        } catch {
            setError('Camera access denied — please allow camera permission.');
            setPhase('idle');
        }
    }, [currentUser, stopAll, startDetection]);

    const toggleCamera = useCallback(async () => {
        if (isSwitchingRef.current) return;
        isSwitchingRef.current = true;
        const next = facingMode === 'user' ? 'environment' : 'user';
        await startCamera(next);
        setTimeout(() => { isSwitchingRef.current = false; }, 500);
    }, [facingMode, startCamera]);

    const captureFromCamera = useCallback(() => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas) return;

        const ctx = canvas.getContext('2d');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        ctx.save();
        if (facingMode === 'user') {
            ctx.translate(canvas.width, 0);
            ctx.scale(-1, 1);
        }
        ctx.drawImage(video, 0, 0);
        ctx.restore();

        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        
        // Save to state and storage
        setCapturedImg(dataUrl);
        sessionStorage.setItem('face_scan_image', dataUrl);

        canvas.toBlob((blob) => {
            stopAll();
            setPhase('loading');
            analyzeFace(blob)
                .then((aiData) => {
                    if (aiData.status === 'success') {
                        setResult(aiData);
                        // Save AI results to storage
                        sessionStorage.setItem('face_scan_result', JSON.stringify(aiData));
                        setPhase('result');
                    } else {
                        throw new Error(aiData.message || 'Face not detected');
                    }
                })
                .catch((err) => {
                    setError(err.message);
                    setPhase('idle');
                });
        }, 'image/jpeg', 0.8);
    }, [facingMode, stopAll]);

    useEffect(() => { captureRef.current = captureFromCamera; }, [captureFromCamera]);

    const handleFileAnalysis = useCallback(async (file) => {
        setPhase('loading');
        try {
            const aiData = await analyzeFace(file);
            if (aiData.status === 'success') {
                const imgUrl = URL.createObjectURL(file);
                setCapturedImg(imgUrl);
                setResult(aiData);
                
                // Persist
                sessionStorage.setItem('face_scan_image', imgUrl);
                sessionStorage.setItem('face_scan_result', JSON.stringify(aiData));
                
                setPhase('result');
            } else {
                throw new Error(aiData.message || 'Face not detected');
            }
        } catch (err) {
            setError(err.message);
            setPhase('idle');
        }
    }, []);

    const reset = useCallback(() => {
        stopAll();
        // Clear all persistent data
        sessionStorage.removeItem('face_scan_result');
        sessionStorage.removeItem('face_scan_image');
        
        setPhase('idle');
        setResult(null);
        setCapturedImg(null);
        setError(null);
        setFacingMode('user');
    }, [stopAll]);

    const recommendations = useMemo(() => {
        if (!result) return [];
        const dbShape = toDbShape(result.detected_shape);
        return allHaircuts.filter((h) => Array.isArray(h.faceShape) && h.faceShape.includes(dbShape));
    }, [result, allHaircuts]);

    return {
        phase, result, recommendations, capturedImg, error,
        facingMode, hasBackCam, countdown,
        autoSupported: FACE_DETECTOR_SUPPORTED,
        videoRef, canvasRef, fileInputRef,
        startCamera, captureFromCamera, handleFileAnalysis,
        toggleCamera, reset, setError, stopAll,
    };
};

// ─── Sub-Components ──────────────────────────────────────────────────────────
const CameraView = ({
    videoRef, facingMode, hasBackCam,
    countdown, autoSupported,
    onCapture, onToggle, onCancel,
}) => (
    <div className="scanner-container">
        <div className="camera-viewfinder">
            <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="camera-video"
                style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }}
            />

            <div className="face-guideline">
                <div className={`oval-guide${countdown !== null ? ' oval-guide--lock' : ''}`}>
                    {countdown !== null && <div className="oval-ripple" />}
                </div>
            </div>

            {countdown !== null && (
                <div className="countdown-overlay">
                    <span className="countdown-number">{countdown}</span>
                </div>
            )}

            <p className="camera-instruction">
                {autoSupported
                    ? countdown !== null ? 'Hold still…' : 'Centre your face in the oval'
                    : 'Position your face and tap capture'}
            </p>
        </div>

        <div className="scanner-actions">
            {!autoSupported && <button onClick={onCapture} className="capture-btn" aria-label="Capture" />}
            {hasBackCam && (
                <button onClick={onToggle} className="toggle-btn" aria-label="Flip camera">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                        <path d="M3 3v5h5M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16M16 16h5v5" />
                    </svg>
                </button>
            )}
            <button onClick={onCancel} className="text-btn">Cancel</button>
        </div>
    </div>
);

const ResultView = ({ result, capturedImg, recommendations, onReset }) => {
    const [filter, setFilter] = useState('All');
    const filteredItems = useMemo(() =>
        filter === 'All' ? recommendations : recommendations.filter((h) => h.hairLength === filter),
        [recommendations, filter]
    );

    const [similarStyles, setSimilarStyles] = useState([]);
    useEffect(() => {
        const shownIds = new Set(filteredItems.map((h) => h._id));
        const pool = recommendations.filter((h) => !shownIds.has(h._id));
        setSimilarStyles([...pool].sort(() => Math.random() - 0.5).slice(0, SIMILAR_COUNT));
    }, [filteredItems, recommendations]);

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
                    {LENGTH_FILTERS.map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`chip${filter === f ? ' active' : ''}`}
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

// ─── Main Component ───────────────────────────────────────────────────────────
const FaceScanPage = ({ currentUser, authLoading }) => {
    const navigate = useNavigate();
    const {
        phase, result, recommendations, capturedImg, error,
        facingMode, hasBackCam, countdown, autoSupported,
        videoRef, canvasRef, fileInputRef,
        startCamera, captureFromCamera, handleFileAnalysis,
        toggleCamera, reset, setError, stopAll,
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
                        <button className="btn-outline" onClick={() => fileInputRef.current?.click()}>
                            <i className="ri-image-add-line" /> Upload
                        </button>
                        <button className="btn-primary" onClick={() => startCamera('user')}>
                            <i className="ri-camera-lens-line" /> Camera
                        </button>
                    </div>
                    <input
                        type="file"
                        ref={fileInputRef}
                        hidden
                        accept="image/*"
                        onChange={(e) => e.target.files[0] && handleFileAnalysis(e.target.files[0])}
                    />
                </section>
            )}

            {phase === 'camera' && (
                <CameraView
                    videoRef={videoRef}
                    facingMode={facingMode}
                    hasBackCam={hasBackCam}
                    countdown={countdown}
                    autoSupported={autoSupported}
                    onCapture={captureFromCamera}
                    onToggle={toggleCamera}
                    onCancel={reset}
                />
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