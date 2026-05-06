import React, { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query'; // Import Hook
import { Card } from '../components/cards';
import Loader from '../components/Loader';
import './categories.css';

// Fetch function (Same as Home.js to reuse the cache)
const fetchHaircuts = async () => {
  const response = await fetch('https://hairstyle-hub-backend.onrender.com/api/haircuts');
  if (!response.ok) throw new Error('Network response was not ok');
  return response.json();
};

const Categories = () => {
  const location = useLocation();
  
  // --- States ---
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({ length: '', face: '', tag: '' });

  // --- TanStack Query Implementation ---
  const { data: haircuts = [], isLoading } = useQuery({
    queryKey: ['haircuts'], // Uses same key as Home to get data from cache
    queryFn: fetchHaircuts,
    staleTime: 1000 * 60 * 60, // 1 Hour
  });

  // Handle incoming filter state from Home page (e.g., clicking 'Oval')
  useEffect(() => {
    if (location.state && location.state.selectedShape) {
      setFilters(prev => ({ ...prev, face: location.state.selectedShape }));
    }
  }, [location.state]);

  // --- Optimized Filter Logic ---
  // useMemo ensures we only re-calculate when haircuts, search, or filters change
  const filteredData = useMemo(() => {
    return haircuts.filter(item => {
      const searchLower = searchTerm.toLowerCase();
      
      const matchName = item.name?.toLowerCase().includes(searchLower);
      const matchTagsInSearch = item.tags && item.tags.some(tag => 
        tag.toLowerCase().includes(searchLower)
      );

      const matchSearch = matchName || matchTagsInSearch;
      const matchLength = filters.length ? item.hairLength === filters.length : true;
      const matchFace = filters.face ? (item.faceShape && item.faceShape.includes(filters.face)) : true;
      const matchTag = filters.tag ? (item.tags && item.tags.includes(filters.tag)) : true;
      
      return matchSearch && matchLength && matchFace && matchTag;
    });
  }, [searchTerm, filters, haircuts]);

  const updateFilter = (type, value) => {
    setFilters(prev => ({ ...prev, [type]: prev[type] === value ? '' : value }));
  };

  // If loading and no cache exists, show Loader
  if (isLoading && haircuts.length === 0) return <Loader />;

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