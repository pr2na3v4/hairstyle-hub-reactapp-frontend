import React, { useState, useEffect } from 'react';
import { Card } from '../components/cards';// Reuse your Card component
import './categories.css';
import { Link } from 'react-router-dom'; 
const Categories = () => {
  const [data, setData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({ length: '', face: '', tag: '' });

  useEffect(() => {
    fetch('https://hairstyle-hub-backend.onrender.com/api/haircuts')
      .then(res => res.json())
      .then(json => {
        setData(json);
        setFilteredData(json);
      });
  }, []);

  // Filter Logic
  useEffect(() => {
    let result = data.filter(item => {
      const matchSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchLength = filters.length ? item.hairLength === filters.length : true;
      const matchFace = filters.face ? item.faceShape.includes(filters.face) : true;
      const matchTag = filters.tag ? item.tags.includes(filters.tag) : true;
      
      return matchSearch && matchLength && matchFace && matchTag;
    });
    setFilteredData(result);
  }, [searchTerm, filters, data]);

  const updateFilter = (type, value) => {
    setFilters(prev => ({ ...prev, [type]: prev[type] === value ? '' : value }));
  };

  return (
    <div className="categories-page">
      {/* Search Input */}
      <div className="search-section">
        <div className="search-bar">
          <i className="ri-search-line"></i>
          <input 
            type="text" 
            placeholder="Search haircut name..." 
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Filter Chips (Scrollable) */}
      <div className="filter-scroll">
        <button className={filters.tag === 'professional' ? 'active' : ''} onClick={() => updateFilter('tag', 'professional')}>Professional</button>
        <button className={filters.length === 'Short' ? 'active' : ''} onClick={() => updateFilter('length', 'Short')}>Short</button>
        <button className={filters.length === 'Medium' ? 'active' : ''} onClick={() => updateFilter('length', 'Medium')}>Medium</button>
        <button className={filters.length === 'Long' ? 'active' : ''} onClick={() => updateFilter('length', 'Long')}>Long</button>
        <button className={filters.face === 'Oval' ? 'active' : ''} onClick={() => updateFilter('face', 'Oval')}>Oval Face</button>
        <button className={filters.face === 'Square' ? 'active' : ''} onClick={() => updateFilter('face', 'Square')}>Square Face</button>
      </div>

      {/* Results Grid */}
<div className="cards-grid">
  {filteredData.map(item => (
  <Card 
     key={item._id?.$oid || item._id}
     id={item._id?.$oid || item._id} // Pass the ID here
     name={item.name}
     imageUrl={item.imageUrl}
     description={item.style}
  />
  ))}
</div>
    </div>
  );
};

export default Categories;