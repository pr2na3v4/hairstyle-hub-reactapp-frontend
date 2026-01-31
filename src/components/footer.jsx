import React from 'react';
import { Link } from 'react-router-dom'; // Added this import
import './footer.css';

// Changed 'footer' to 'Footer' (Capitalized)
const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-about">
          <h3>HairStyleHub</h3>
          <p>Discover trending haircuts and beard styles curated for you.</p>
        </div> 
      </div>
      <div className="footer-bottom">
        <p>© 2025 HairStyleHub. All rights reserved.</p>
      </div>
    </footer>
  );
};

export default Footer;