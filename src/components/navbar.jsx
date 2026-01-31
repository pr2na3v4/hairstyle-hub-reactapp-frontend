import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import './navbar.css';

// Added currentUser to props
const Navbar = ({ links, currentUser }) => {
  const location = useLocation();

  return (
    <nav className="bottom-nav">
      {/* 1. Standard Links (Home, Categories, etc.) */}
      {links.map((link, index) => (
        <Link 
          key={index} 
          to={link.path} 
          className={`nav-item ${location.pathname === link.path ? 'active' : ''}`}
        >
          <i className={link.icon}></i>
          <span>{link.label}</span>
        </Link>
      ))}

      {/* 3. Auth Section (Profile or Login) - Moved OUTSIDE the map */}
      {currentUser ? (
        <Link 
          to="/profile" 
          className={`nav-item ${location.pathname === '/profile' ? 'active' : ''} nav-profile`}
        >
          <img src={currentUser.photoURL} alt="Profile" className="nav-avatar" />
          <span>Profile</span>
        </Link>
      ) : (
        <Link 
          to="/login" 
          className={`nav-item ${location.pathname === '/login' ? 'active' : ''}`}
        >
          <i className="ri-user-line"></i>
          <span>Login</span>
        </Link>
      )}
    </nav>
  );
};

export default Navbar;