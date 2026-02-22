import React, { useState, useEffect } from 'react';
import { Card } from '../components/cards'; // Check if it is Card or Cards in your export
import { Link, useNavigate } from 'react-router-dom';
import Loader from '../components/Loader';
import Footer from '../components/footer';
import './home.css';

// --- Internal Skeleton Component ---
const SkeletonCard = () => (
  <div className="skeleton-card">
    <div className="skeleton-img shimmer"></div>
    <div className="skeleton-content">
      <div className="skeleton-line shimmer"></div>
      <div className="skeleton-line short shimmer"></div>
    </div>
  </div>
);

const Home = ({ currentUser }) => {
  const [loading, setLoading] = useState(true);
  const [showLoader, setShowLoader] = useState(false);
  const [haircuts, setHaircuts] = useState([]); 
  const navigate = useNavigate();

  const API_BASE = "https://hairstyle-hub-backend.onrender.com/api";

  // 1. --- Delayed Loader Logic ---
  useEffect(() => {
    let timeout;
    if (loading) {
      timeout = setTimeout(() => {
        setShowLoader(true);
      }, 800);
    } else {
      setShowLoader(false);
    }
    return () => clearTimeout(timeout);
  }, [loading]);

  // 2. --- Data Fetching Logic ---
  useEffect(() => {
    const fetchStyles = async () => {
      try {
        const res = await fetch(`${API_BASE}/haircuts`);
        const data = await res.json();
        setHaircuts(data);
      } catch (err) {
        console.error("Fetch Error:", err);
      } finally {
        // Animation smoothly disnyasathi thoda delay
        setTimeout(() => setLoading(false), 500);
      }
    };
    fetchStyles();
  }, []);

  const handleChipClick = (shape) => {
    navigate('/categories', { state: { selectedShape: shape } });
  };

  const handleStep3Click = () => {
    if (currentUser) {
      navigate('/profile');
    } else {
      navigate('/login');
    }
  };

  // Rendering logic for full-page loader
  if (showLoader) return <Loader />;
  if (loading && !showLoader) return null;

  return (
    <>
      <div className="home-container">
        {/* 1. Hero Section */}
        <header className="hero">
          <div className="hero-overlay">
            <h1>Find Your Perfect Look</h1>
            <p>Exploring trending hairstyles</p>
            <Link to="/categories" className="hero-btn">Explore Now</Link>
          </div>
        </header>

        {/* 2. Quick Category Chips */}
        <section className="quick-filter">
          <h3>Popular Shapes</h3>
          <div className="chip-group">
            {['Oval', 'Square', 'Round', 'Diamond'].map((shape) => (
              <div 
                key={shape} 
                className="chip" 
                onClick={() => handleChipClick(shape)}
              >
                {shape}
              </div>
            ))}
          </div>
        </section>

        {/* 3. The Main Content (Trending Section) */}
        <section className="main-feed">
          <div className="feed-header">
            <h2>Top 10 Trending Styles</h2>
            <Link to="/categories" className="see-all">See All</Link>
          </div>

          <div className="cards-grid">
            {loading ? (
              // Loading chya veli 10 Skeleton cards dakhva
              Array(10).fill(0).map((_, i) => <SkeletonCard key={i} />)
            ) : (
              // Real data slice karun dakhva
              haircuts.slice(0, 10).map(item => (
                <Card 
                  key={item._id?.$oid || item._id} 
                  id={item._id?.$oid || item._id}
                  name={item.name}
                  imageUrl={item.imageUrl}
                  description={item.style || item.haircutType} 
                />
              ))
            )}
          </div>
        </section>

        {/* 4. How it Works Section */}
        <section className="how-it-works">
          <div className="section-header">
            <h2>Get Your Perfect Look in 3 Easy Steps</h2>
            <p>Finding a new hairstyle has never been this simple.</p>
          </div>

          <div className="steps-container">
            <div className="step-card clickable" onClick={() => navigate('/categories')}>
              <div className="step-icon"><i className="ri-compass-3-line"></i></div>
              <h3>Step 1</h3>
              <h4>Discover Styles</h4>
              <p>Browse through our curated collection of 50+ trending hairstyles.</p>
              <span className="step-link">Explore Now <i className="ri-arrow-right-line"></i></span>
            </div>

            <div className="step-card clickable" onClick={() => navigate('/haircut/694fb2e6e10513ef64fe0103')}>
              <div className="step-icon"><i className="ri-heart-3-line"></i></div>
              <h3>Step 2</h3>
              <h4>Save Your Favorites</h4>
              <p>Hit the heart icon to save the looks you love to your personal profile.</p>
              <span className="step-link">View Trending <i className="ri-arrow-right-line"></i></span>
            </div>

            <div className="step-card clickable" onClick={handleStep3Click}>
              <div className="step-icon"><i className="ri-smartphone-line"></i></div>
              <h3>Step 3</h3>
              <h4>Show Your Barber</h4>
              <p>Take your phone to the salon and show the exact style to your barber.</p>
              <span className="step-link">
                {currentUser ? "My Profile" : "Login to Save"} <i className="ri-arrow-right-line"></i>
              </span>
            </div>
          </div>
        </section>
      </div>
      <Footer />
    </>
  );
};

export default Home;