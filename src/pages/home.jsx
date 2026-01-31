import React from 'react';
import { Cards } from '../components/cards';
import { Link } from 'react-router-dom';
import './home.css';

const Home = () => {
  return (
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
          <div className="chip">Oval</div>
          <div className="chip">Square</div>
          <div className="chip">Round</div>
          <div className="chip">Diamond</div>
        </div>
      </section>

      {/* 3. The Main Content */}
     
<section className="main-feed">
  <div className="feed-header">
    <h2>Top 10 Trending Styles</h2>
    <Link to="/categories">See All</Link>
  </div>
  
  {/* Pass the limit here */}
  <Cards limit={10} /> 
</section>
    </div>
  );
};

export default Home;