import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Card } from '../components/cards';
import './FaceScanPage.css';
import Loader from '../components/Loader';

// ─── Constants ───────────────────────────────────────────────────────────────
const AI_API = "https://hairstyle-hub-backend-ai.onrender.com";
const DB_API = "https://hairstyle-hub-backend.onrender.com";

// Map Oblong → Oval for DB queries (Mongoose schema uses Oval)
const toDbShape = (shape) => shape === "Oblong" ? "Oval" : shape;

// ─── FaceScanPage ─────────────────────────────────────────────────────────────
const FaceScanPage = () => {
    const [phase, setPhase]                 = useState('idle');       // idle | camera | loading | result
    const [result, setResult]               = useState(null);
    const [recommendations, setRecommendations] = useState([]);
    const [error, setError]                 = useState(null);

    const videoRef    = useRef(null);
    const canvasRef   = useRef(null);
    const fileInputRef= useRef(null);
    const streamRef   = useRef(null);   // FIX: ref instead of state — avoids stale-closure bug

    // ── Camera helpers ────────────────────────────────────────────────────────
    const stopCamera = useCallback(() => {
        // FIX: use streamRef so we always have the live stream object, not a stale state copy
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
            streamRef.current = null;
        }
        if (videoRef.current) videoRef.current.srcObject = null;
    }, []);

    // Stop camera on unmount
    useEffect(() => () => stopCamera(), [stopCamera]);

    const startCamera = async () => {
        setPhase('camera');
        setResult(null);
        setError(null);
        try {
            const userStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } }
            });
            streamRef.current = userStream;
            if (videoRef.current) videoRef.current.srcObject = userStream;
        } catch {
            setError("Camera access denied. Please allow camera permission and try again.");
            setPhase('idle');
        }
    };

    // ── Canvas capture ────────────────────────────────────────────────────────
    const captureFromCamera = () => {
        const video  = videoRef.current;
        const canvas = canvasRef.current;
        const ctx    = canvas.getContext('2d');

        canvas.width  = video.videoWidth;
        canvas.height = video.videoHeight;

        // FIX: save/restore wraps the mirror transform so it doesn't stack on repeat captures
        ctx.save();
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0);
        ctx.restore();

        canvas.toBlob((blob) => handleAnalysis(blob), 'image/jpeg', 0.9);
    };

    // ── API + DB flow ─────────────────────────────────────────────────────────
    const fetchHaircuts = async (shape) => {
        try {
            const res = await fetch(`${DB_API}/api/haircuts`);
            if (!res.ok) throw new Error(`DB error ${res.status}`);
            const all = await res.json();
            return all.filter(h => Array.isArray(h.faceShape) && h.faceShape.includes(toDbShape(shape)));
        } catch (err) {
            console.error("Database fetch failed:", err);
            return [];
        }
    };

    const handleAnalysis = async (fileSource) => {
        setPhase('loading');
        setError(null);

        // FIX: stop camera here — streamRef always has the live ref, no stale closure
        stopCamera();

        const formData = new FormData();
        formData.append('file', fileSource);

        // FIX: reset file input so the same file can be re-selected
        if (fileInputRef.current) fileInputRef.current.value = "";

        try {
            const response = await fetch(`${AI_API}/analyze-face`, {
                method: 'POST',
                body: formData
            });

            // FIX: check HTTP status before attempting JSON parse
            if (!response.ok) throw new Error(`Server error ${response.status}`);

            const aiData = await response.json();

            if (aiData.status === "success") {
                const cuts = await fetchHaircuts(aiData.detected_shape);
                setResult(aiData);
                setRecommendations(cuts);
                setPhase('result');
            } else {
                setError(aiData.message || "Analysis failed. Try a clearer, well-lit photo.");
                setPhase('idle');
            }
        } catch (err) {
            console.error("Analysis error:", err);
            setError("Server is warming up — please try again in 15 seconds.");
            setPhase('idle');
        }
    };

    const handleReset = () => {
        setResult(null);
        setRecommendations([]);
        setError(null);
        setPhase('idle');
    };

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div className="facescan-page">

            {/* ── HERO (idle) ── */}
            {phase === 'idle' && (
                <section className="hero-section">
                    <h1 className="hero-title">Know Your Face Shape</h1>
                    <p className="hero-subtitle">
                        Upload a photo or use your camera for AI-powered hairstyle recommendations.
                    </p>
                    <div className="action-buttons">
                        <button className="btn-outline" onClick={() => fileInputRef.current.click()}>
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

            {/* ── CAMERA ── */}
            {phase === 'camera' && (
                <section className="scanner-container">
                    <div className="camera-viewfinder">
                        <video ref={videoRef} autoPlay playsInline className="camera-video" />
                        <div className="face-guideline">
                            <div className="oval-guide" />
                        </div>
                    </div>
                    <div className="scanner-actions">
                        <button onClick={captureFromCamera} className="capture-btn" aria-label="Capture photo" />
                        <button onClick={() => { stopCamera(); setPhase('idle'); }} className="text-btn">
                            Cancel
                        </button>
                    </div>
                </section>
            )}

            {/* ── LOADING ── */}
            {phase === 'loading' && (
                <Loader/>
            )}

            {/* ── RESULT ── */}
            {phase === 'result' && result && (
                <div className="results-wrapper">
                    <section className="result-card">
                        <h2 className="result-label">Analysis Complete</h2>
                        <h3 className="detected-shape">{result.detected_shape}</h3>
                        <p className="confidence-text">
                            AI Confidence: <span>{result.confidence}</span>
                        </p>
                        <button className="reset-btn" onClick={handleReset}>
                            Try Another Photo
                        </button>
                    </section>

                    <section className="recommendations-section">
                        <h4 className="section-heading">Recommended Hairstyles</h4>
                        <div className="haircut-grid">
                            {recommendations.length > 0 ? (
                                recommendations.map(haircut => (
                                    <Card
                                        key={haircut._id}
                                        id={haircut._id}
                                        name={haircut.name}
                                        imageUrl={haircut.imageUrl}
                                        description={haircut.haircutType}
                                    />
                                ))
                            ) : (
                                <p className="empty-msg">No hairstyles found for {result.detected_shape} face shape.</p>
                            )}
                        </div>
                    </section>
                </div>
            )}

            {/* ── ERROR TOAST ── */}
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