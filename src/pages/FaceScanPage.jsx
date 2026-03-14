import React, { useState, useRef, useEffect } from 'react';
import { Card } from '../components/cards';
import './FaceScanPage.css';

const FaceScanPage = () => {
    const [isScanning, setIsScanning] = useState(false);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [recommendations, setRecommendations] = useState([]);
    const [error, setError] = useState(null);
    const [stream, setStream] = useState(null);

    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const fileInputRef = useRef(null);

    const AI_API = "https://hairstyle-hub-backend-ai.onrender.com";
    const DB_API = "https://hairstyle-hub-backend.onrender.com";

    // Clean up camera on unmount
    useEffect(() => {
        return () => {
            if (stream) stream.getTracks().forEach(t => t.stop());
        };
    }, [stream]);

    const handleAnalysis = async (fileSource) => {
        setLoading(true);
        setError(null);
        const formData = new FormData();
        formData.append('file', fileSource);

        try {
            const response = await fetch(`${AI_API}/analyze-face`, {
                method: 'POST',
                body: formData
            });
            const aiData = await response.json();

            if (aiData.status === "success") {
                setResult(aiData);
                await fetchHaircuts(aiData.detected_shape);
                stopCamera();
            } else {
                setError(aiData.message || "Analysis failed. Try a clearer photo.");
            }
        } catch (err) {
            setError("Server is warming up. Please try again in 15 seconds.");
        } finally {
            setLoading(false);
        }
    };

    const fetchHaircuts = async (shape) => {
        try {
            const res = await fetch(`${DB_API}/api/haircuts`);
            const all = await res.json();
            const searchShape = shape === "Oblong" ? "Oval" : shape;
            const filtered = all.filter(h => h.faceShape && h.faceShape.includes(searchShape));
            setRecommendations(filtered);
        } catch (err) {
            console.error("Database fetch failed", err);
        }
    };

    const startCamera = async () => {
        setIsScanning(true);
        setResult(null);
        setError(null);
        try {
            const userStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: "user", width: { ideal: 1280 } }
            });
            setStream(userStream);
            if (videoRef.current) videoRef.current.srcObject = userStream;
        } catch (err) {
            setError("Camera access denied.");
            setIsScanning(false);
        }
    };

    const stopCamera = () => {
        if (stream) stream.getTracks().forEach(t => t.stop());
        setStream(null);
        setIsScanning(false);
    };

    const captureFromCamera = () => {
        const context = canvasRef.current.getContext('2d');
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.translate(canvasRef.current.width, 0);
        context.scale(-1, 1);
        context.drawImage(videoRef.current, 0, 0);
        canvasRef.current.toBlob((blob) => handleAnalysis(blob), 'image/jpeg', 0.9);
    };

    return (
        <div className="facescan-page">
            {!isScanning && !result && !loading && (
                <section className="hero-section">
                    <h1 className="hero-title">Know Your Face Shape</h1>
                    <p className="hero-subtitle">Upload a photo or use your camera for AI-driven hairstyle recommendations.</p>
                    <div className="action-buttons">
                        <button className="btn-outline" onClick={() => fileInputRef.current.click()}>
                            <i className="ri-image-add-line"></i> Upload Image
                        </button>
                        <button className="btn-primary" onClick={startCamera}>
                            <i className="ri-camera-lens-line"></i> Open Camera
                        </button>
                    </div>
                    <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={(e) => handleAnalysis(e.target.files[0])} />
                </section>
            )}

            {(isScanning || loading) && !result && (
                <section className="scanner-container">
                    <div className="camera-viewfinder">
                        {isScanning && !loading && <video ref={videoRef} autoPlay playsInline className="camera-video" />}
                        {loading && (
                            <div className="loading-overlay">
                                <div className="spinner"></div>
                                <p>Analyzing features...</p>
                            </div>
                        )}
                        <div className="face-guideline"><div className="oval-guide"></div></div>
                    </div>
                    {isScanning && !loading && (
                        <div className="scanner-actions">
                            <button onClick={captureFromCamera} className="capture-btn"></button>
                            <button onClick={stopCamera} className="text-btn">Cancel</button>
                        </div>
                    )}
                </section>
            )}

            {result && (
                <div className="results-wrapper">
                    <section className="result-card">
                        <h2 className="result-label">Analysis Complete</h2>
                        <h3 className="detected-shape">{result.detected_shape}</h3>
                        <p className="confidence-text">AI Confidence: <span>{result.confidence}</span></p>
                        <button className="reset-btn" onClick={() => {setResult(null); setRecommendations([]);}}>
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
                                <p className="empty-msg">Finding styles for your shape...</p>
                            )}
                        </div>
                    </section>
                </div>
            )}

            {error && <div className="error-toast">{error}</div>}
            <canvas ref={canvasRef} style={{ display: 'none' }} />
        </div>
    );
};

export default FaceScanPage;