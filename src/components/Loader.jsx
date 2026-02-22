import React, { useState, useEffect } from 'react';
import './Loader.css';

const Loader = ({ onFinished }) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(onFinished, 500);
          return 100;
        }
        return prev + 2; // Slightly faster for mobile snappiness
      });
    }, 40);

    return () => clearInterval(interval);
  }, [onFinished]);

  return (
    <div className="loader-container">
      <div className="loader-content">
        <div className="text-wrapper">
          <h1 className="loader-title" data-text="HAIRSTYLEHUB">
            HAIRSTYLEHUB
          </h1>
          <p className="loader-subtitle">AI STYLING ENGINE</p>
        </div>
        
        <div className="progress-container">
          <div className="progress-bar" style={{ width: `${progress}%` }}></div>
        </div>
        
        <div className="status-row">
          <span className="status-text">INITIALIZING</span>
          <span className="progress-number">{progress}%</span>
        </div>
      </div>
    </div>
  );
};

export default Loader;