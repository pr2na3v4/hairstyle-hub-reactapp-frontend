import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Card } from '../components/cards';
import Loader from '../components/Loader';
import './categories.css';

const Categories = () => {
  const location = useLocation();
  const [data, setData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showLoader, setShowLoader] = useState(false); // 👈 Delayed loader state
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({ length: '', face: '', tag: '' });

  // --- Delayed Loader Logic ---
  useEffect(() => {
    let timeout;
    if (loading) {
      timeout = setTimeout(() => setShowLoader(true), 800);
    } else {
      setShowLoader(false);
    }
    return () => clearTimeout(timeout);
  }, [loading]);

  // 1. Fetch data & Check for state passed from Home.jsx
  useEffect(() => {
    if (location.state && location.state.selectedShape) {
      setFilters(prev => ({ ...prev, face: location.state.selectedShape }));
    }

    setLoading(true);
    fetch('https://hairstyle-hub-backend.onrender.com/api/haircuts')
      .then(res => res.json())
      .then(json => {
        setData(json);
        setFilteredData(json);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [location.state]);

  // 2. Filter Logic
// 2. Filter Logic
useEffect(() => {
  let result = data.filter(item => {
    // Check if search term matches Name OR any of the Tags
    const searchLower = searchTerm.toLowerCase();
    
    const matchName = item.name.toLowerCase().includes(searchLower);
    
    // Tags search logic: check if search term exists in any tag
    const matchTagsInSearch = item.tags && item.tags.some(tag => 
      tag.toLowerCase().includes(searchLower)
    );

    const matchSearch = matchName || matchTagsInSearch; // Donhi paiki ek hi asel tar true

    const matchLength = filters.length ? item.hairLength === filters.length : true;
    const matchFace = filters.face ? (item.faceShape && item.faceShape.includes(filters.face)) : true;
    const matchTag = filters.tag ? (item.tags && item.tags.includes(filters.tag)) : true;
    
    return matchSearch && matchLength && matchFace && matchTag;
  });
  setFilteredData(result);
}, [searchTerm, filters, data]);

  const updateFilter = (type, value) => {
    setFilters(prev => ({ ...prev, [type]: prev[type] === value ? '' : value }));
  };

  // --- Rendering Logic with Safety Checks ---
  if (showLoader) return <Loader />;
  if (loading && !showLoader) return null;

  return (
    <div className="categories-page">
      {/* Search Input */}
      <div className="search-section">
        <div className="search-bar">
          <i className="ri-search-line"></i>
          <input 
            type="text" 
            placeholder="Search haircut name..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Filter Chips */}
      <div className="filter-scroll">
        <button className={filters.tag === 'professional' ? 'active' : ''} onClick={() => updateFilter('tag', 'professional')}>Professional</button>
        <button className={filters.length === 'Short' ? 'active' : ''} onClick={() => updateFilter('length', 'Short')}>Short</button>
        <button className={filters.length === 'Medium' ? 'active' : ''} onClick={() => updateFilter('length', 'Medium')}>Medium</button>
        <button className={filters.length === 'Long' ? 'active' : ''} onClick={() => updateFilter('length', 'Long')}>Long</button>
        <button className={filters.face === 'Oval' ? 'active' : ''} onClick={() => updateFilter('face', 'Oval')}>Oval Face</button>
        <button className={filters.face === 'Square' ? 'active' : ''} onClick={() => updateFilter('face', 'Square')}>Square Face</button>
        <button className={filters.face === 'Round' ? 'active' : ''} onClick={() => updateFilter('face', 'Round')}>Round Face</button>
        <button className={filters.face === 'Diamond' ? 'active' : ''} onClick={() => updateFilter('face', 'Diamond')}>Diamond Face</button>
      </div>

      {/* Results Section */}
      <div className="results-container">
        {filteredData.length > 0 ? (
          <div className="cards-grid">
            {filteredData.map(item => (
              <Card 
                key={item._id?.$oid || item._id}
                id={item._id?.$oid || item._id}
                name={item.name}
                imageUrl={item.imageUrl}
                description={item.style}
              />
            ))}
          </div>
        ) : (
          <div className="no-results">
            <i className="ri-find-replace-line"></i>
            <p>No hairstyles match your search.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Categories;