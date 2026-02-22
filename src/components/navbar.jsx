// components/Navbar.jsx
import { Link, useLocation } from 'react-router-dom';
import './navbar.css';

const Navbar = ({ links, currentUser }) => {
  const location = useLocation();

  return (
    <nav className="main-navbar">
      <div className="nav-container">
        {/* Desktop Logo - Only visible on desktop */}
        <Link to="/" className="nav-logo desktop-only">
         <div className="nav-logo"> Hairstyle<span>Hub</span></div>
        </Link>

        <div className="nav-menu">
          {links.map((link) => (
            <Link 
              key={link.path} 
              to={link.path} 
              className={`nav-item ${location.pathname === link.path ? 'active' : ''}`}
            >
              <i className={link.icon}></i>
              <span>{link.label}</span>
            </Link>
          ))}
          
          {/* Profile/Login Icon */}
          <Link to={currentUser ? "/profile" : "/login"} className="nav-item">
            {currentUser?.photoURL ? (
              <img src={currentUser.photoURL} alt="User" className="nav-avatar" />
            ) : (
              <i className="ri-user-line"></i>
            )}
            <span>{currentUser ? "Profile" : "Login"}</span>
          </Link>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;