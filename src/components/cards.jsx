import React, { useState, useEffect } from 'react';
import './card.css';
import { Link } from 'react-router-dom';

// FIXED: Corrected the arrow function syntax and return
export const Card = ({ id, name, imageUrl }) => { 
  return (
    <Link to={`/haircut/${id}`} className="card">
      <img src={imageUrl} alt={name} />
      <h3>{name}</h3>
      {/* You can add <p>{description}</p> here if you want it to show */}
    </Link>
  );
};

export const Cards = ({ limit }) => {
  const [haircuts, setHaircuts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHaircuts = async () => {
      try {
        const response = await fetch(import.meta.env.VITE_API_BASE_URL + '/haircuts'); 
        const data = await response.json();
        
        let trendingData = data.filter(item => item.isTrending === true);
        
        if (limit) {
          trendingData = trendingData.slice(0, limit);
        }
        
        setHaircuts(trendingData);
        setLoading(false);
      } catch (error) {
        console.error("Error:", error);
        setLoading(false);
      }
    };
    fetchHaircuts();
  }, [limit]);

  if (loading) return <div className="loader">Loading Trending...</div>;

  return (
    <div className="cards-grid">
      {haircuts.map((item) => {
        // Extract the ID safely
        const haircutId = item._id?.$oid || item._id;

        return (
          <Card 
            key={haircutId}
            id={haircutId} // FIXED: Now passing the ID prop!
            imageUrl={item.imageUrl}
            name={item.name}
            description={item.style}
          />
        );
      })}
    </div>
  );
};