import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card } from '../components/cards';
import Loader from '../components/Loader';
import Footer from '../components/footer';
import './home.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// 1. Move Skeleton to a separate file later, but for now, let's keep it clean
const SkeletonCard = () => (
  <div className="skeleton-card shimmer">
    <div className="skeleton-img"></div>
    <div className="skeleton-content">
      <div className="skeleton-line"></div>
      <div className="skeleton-line short"></div>
    </div>
  </div>
);

const fetchHaircuts = async () => {
  const response = await fetch(`${API_BASE_URL}/haircuts`);
  if (!response.ok) throw new Error('Network response was not ok');
  return response.json();
};

const Home = ({ currentUser }) => {
  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = useState(0);

  const { data: haircuts = [], isLoading } = useQuery({
    queryKey: ['haircuts'],
    queryFn: fetchHaircuts,
    staleTime: 1000 * 60 * 60, 
    gcTime: 1000 * 60 * 60 * 24,
  });

  // 2. Memoize Hero Slides so they don't re-calculate on every state change
  const heroSlides = useMemo(() => haircuts.slice(0, 5), [haircuts]);

  useEffect(() => {
    if (heroSlides.length === 0) return;
    const slideInterval = setInterval(() => {
      setCurrentSlide((prev) => (prev === heroSlides.length - 1 ? 0 : prev + 1));
    }, 4000);
    return () => clearInterval(slideInterval);
  }, [heroSlides.length]);

  const handleHeroClick = (id) => {
    if (id) navigate(`/haircut/${id}`);
  };

  if (isLoading) return <Loader />;

  return (
    <div className="home-container">
      {/* 3. Hero Section with Preloading for only the first image */}
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
          {/* Hidden preloader for the next slide image to prevent white flicker */}
          <link rel="prefetch" href={heroSlides[(currentSlide + 1) % heroSlides.length]?.imageUrl} />
          
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
              Discover your ideal hairstyle using advanced face shape detection.
            </p>
            <div className="cta-buttons">
              <button className="cta-btn-black" onClick={() => navigate('/face-scan')}>Start AI Scan Now</button>
              <button className="cta-btn-link" onClick={() => navigate('/categories')}>Browse Gallery →</button>
            </div>
          </div>
          <div className="cta-visual">
            <div className="cta-image-frame">
              {/* Added loading="lazy" for the non-critical CTA image */}
              <img 
                src="https://images.unsplash.com/photo-1599351431202-1e0f0137899a?q=80&w=1000&auto=format&fit=crop" 
                alt="Hairstyle Preview" 
                loading="lazy" 
              />
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
          {/* Render only first 8 items for faster initial paint */}
          {haircuts.slice(0, 8).map((item) => (
            <Card 
              key={item._id?.$oid || item._id} 
              id={item._id?.$oid || item._id}
              name={item.name}
              imageUrl={item.imageUrl}
              description={item.haircutType || item.style}
            />
          ))}
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Home;
