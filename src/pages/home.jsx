import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query'; // Import Hook
import { Card } from '../components/cards';
import Loader from '../components/Loader';
import Footer from '../components/footer';
import './home.css';

const SkeletonCard = () => (
  <div className="skeleton-card shimmer">
    <div className="skeleton-img"></div>
    <div className="skeleton-content">
      <div className="skeleton-line"></div>
      <div className="skeleton-line short"></div>
    </div>
  </div>
);

// Fetch function
const fetchHaircuts = async () => {
  const response = await fetch('https://hairstyle-hub-backend.onrender.com/api/haircuts');
  if (!response.ok) throw new Error('Network response was not ok');
  return response.json();
};

const Home = ({ currentUser }) => {
  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = useState(0);

  // --- TanStack Query Implementation ---
  const { data: haircuts = [], isLoading, isFetching } = useQuery({
    queryKey: ['haircuts'],
    queryFn: fetchHaircuts,
    staleTime: 1000 * 60 * 60, // Consider data "fresh" for 1 hour
    gcTime: 1000 * 60 * 60 * 24, // Keep in cache for 24 hours
  });

  // --- Hero Slider Logic ---
  useEffect(() => {
    if (haircuts.length === 0) return;
    const maxSlides = Math.min(haircuts.length, 5);
    const slideInterval = setInterval(() => {
      setCurrentSlide((prev) => (prev === maxSlides - 1 ? 0 : prev + 1));
    }, 4000);
    return () => clearInterval(slideInterval);
  }, [haircuts.length]);

  const handleHeroClick = (id) => {
    if (id) navigate(`/haircut/${id}`);
  };

  // Only show the full-screen loader on the very first "hard" load
  if (isLoading) return <Loader />;

  const heroSlides = haircuts.slice(0, 5);

  return (
    <div className="home-container">
      {/* Hero Section */}
      {heroSlides.length > 0 ? (
        <header 
          className="hero clickable-hero" 
          onClick={() => handleHeroClick(heroSlides[currentSlide]._id?.$oid || heroSlides[currentSlide]._id)}
          style={{ 
            backgroundImage: `linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.6)), url(${heroSlides[currentSlide].imageUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            transition: 'background-image 0.8s ease-in-out',
            cursor: 'pointer'
          }}
        >
          <div className="hero-overlay">
            <h1>{heroSlides[currentSlide].name}</h1>
            <p>{heroSlides[currentSlide].haircutType || heroSlides[currentSlide].style}</p>
            <div className="hero-indicators">
              {heroSlides.map((_, idx) => (
                <button 
                  key={idx}
                  className={`indicator ${currentSlide === idx ? 'active' : ''}`}
                  onClick={(e) => { e.stopPropagation(); setCurrentSlide(idx); }}
                />
              ))}
            </div>
          </div>
        </header>
      ) : (
        <div className="hero-skeleton shimmer"></div>
      )}

      {/* AI Face Scan Section */}
      <section className="cta-container">
        <div className="cta-content">
          <div className="cta-text-wrapper">
            <span className="cta-overline">AI-Powered Analysis</span>
            <h2 className="cta-title">Ready to find your perfect look?</h2>
            <p className="cta-description">
              Join thousands of users who have discovered their ideal hairstyle using our 
              advanced face shape detection technology.
            </p>
            <div className="cta-buttons">
              <button className="cta-btn-black" onClick={() => navigate('/face-scan')}>Start AI Scan Now</button>
              <button className="cta-btn-link" onClick={() => navigate('/all-styles')}>Browse Gallery →</button>
            </div>
          </div>
          <div className="cta-visual">
            <div className="cta-image-frame">
              <img src="https://images.unsplash.com/photo-1599351431202-1e0f0137899a?q=80&w=1000&auto=format&fit=crop" alt="Hairstyle Preview" />
              <div className="cta-floating-badge">98% Match</div>
            </div>
          </div>
        </div>
      </section>

      {/* Popular Shapes */}
      <section className="quick-filter">
        <h3>Popular Face Shapes</h3>
        <div className="chip-group">
          {['Oval', 'Square', 'Round', 'Diamond', 'Heart'].map((shape) => (
            <div key={shape} className="chip" onClick={() => navigate('/categories', { state: { selectedShape: shape } })}>
              {shape}
            </div>
          ))}
        </div>
      </section>

      {/* Trending Feed */}
      <section className="main-feed">
        <div className="feed-header">
          <h2>Top Trending Styles</h2>
          <Link to="/categories" className="see-all">View All Styles</Link>
        </div>

        <div className="cards-grid">
          {/* If loading and no data exists yet, show skeletons */}
          {isLoading ? (
            Array(8).fill(0).map((_, i) => <SkeletonCard key={i} />)
          ) : (
            haircuts.slice(0, 8).map((item) => (
              <Card 
                key={item._id?.$oid || item._id} 
                id={item._id?.$oid || item._id}
                name={item.name}
                imageUrl={item.imageUrl}
                description={item.haircutType || item.style}
              />
            ))
          )}
        </div>
      </section>

      {/* How it Works */}
      <section className="how-it-works">
        <div className="section-header"><h2>Your Path to a New Look</h2></div>
        <div className="steps-container">
          <div className="step-card" onClick={() => navigate('/categories')}>
            <div className="step-icon"><i className="ri-compass-3-line"></i></div>
            <h3>Step 01</h3>
            <h4>Discover Styles</h4>
            <p>Browse through collection of trending cuts.</p>
          </div>
          <div className="step-card" onClick={() => navigate('/categories')}>
            <div className="step-icon"><i className="ri-heart-3-line"></i></div>
            <h3>Step 02</h3>
            <h4>Save Favorites</h4>
            <p>Save looks to show your barber later.</p>
          </div>
          <div className="step-card" onClick={() => currentUser ? navigate('/profile') : navigate('/login')}>
            <div className="step-icon"><i className="ri-smartphone-line"></i></div>
            <h3>Step 03</h3>
            <h4>Show Your Barber</h4>
            <p>Access saved styles on your mobile device.</p>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Home;