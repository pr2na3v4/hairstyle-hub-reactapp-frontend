import React, { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query'; 
import { Card } from '../components/cards';
import Loader from '../components/Loader';
import './categories.css';

// Move fetcher out to keep component body clean
const fetchHaircuts = async () => {
  const response = await fetch('https://hairstyle-hub-backend.onrender.com/api/haircuts');
  if (!response.ok) throw new Error('Network response was not ok');
  return response.json();
};

const Categories = () => {
  const location = useLocation();
  
  // --- States ---
  const [searchTerm, setSearchTerm] = useState('');
  // 1. Optimization: Debounced search term to prevent excessive filtering while typing
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filters, setFilters] = useState({ length: '', face: '', tag: '' });

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const { data: haircuts = [], isLoading } = useQuery({
    queryKey: ['haircuts'], 
    queryFn: fetchHaircuts,
    staleTime: 1000 * 60 * 60, 
  });

  useEffect(() => {
    if (location.state?.selectedShape) {
      setFilters(prev => ({ ...prev, face: location.state.selectedShape }));
    }
  }, [location.state]);

  const filteredData = useMemo(() => {
    return haircuts.filter(item => {
      const searchLower = debouncedSearch.toLowerCase();
      
      const matchSearch = !searchLower || 
        item.name?.toLowerCase().includes(searchLower) || 
        item.tags?.some(tag => tag.toLowerCase().includes(searchLower));

      const matchLength = !filters.length || item.hairLength === filters.length;
      const matchFace = !filters.face || (item.faceShape && item.faceShape.includes(filters.face));
      const matchTag = !filters.tag || (item.tags && item.tags.includes(filters.tag));
      
      return matchSearch && matchLength && matchFace && matchTag;
    });
  }, [debouncedSearch, filters, haircuts]);

  const updateFilter = (type, value) => {
    setFilters(prev => ({ ...prev, [type]: prev[type] === value ? '' : value }));
  };

  if (isLoading && haircuts.length === 0) return <Loader />;

  return (
    <div className="categories-page">
      <div className="search-section">
        <div className="search-bar">
          <i className="ri-search-line"></i>
          <input 
            type="text" 
            placeholder="Search hairstyles..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* 2. UI Improvement: Dynamic Filter list */}
      <div className="filter-scroll">
        {[
          { key: 'tag', value: 'professional', label: 'Professional' },
          { key: 'length', value: 'Short', label: 'Short' },
          { key: 'length', value: 'Medium', label: 'Medium' },
          { key: 'length', value: 'Long', label: 'Long' },
          { key: 'face', value: 'Oval', label: 'Oval Face' },
          { key: 'face', value: 'Square', label: 'Square Face' },
          { key: 'face', value: 'Round', label: 'Round Face' },
          { key: 'face', value: 'Diamond', label: 'Diamond Face' },
        ].map((btn) => (
          <button 
            key={btn.label}
            className={filters[btn.key] === btn.value ? 'active' : ''} 
            onClick={() => updateFilter(btn.key, btn.value)}
          >
            {btn.label}
          </button>
        ))}
      </div>

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
                // 3. Tip: Ensure your Card component uses loading="lazy" inside!
              />
            ))}
          </div>
        ) : (
          <div className="no-results animate-fade-in">
            <i className="ri-find-replace-line"></i>
            <p>No hairstyles match your search.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Categories;