import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { onAuthStateChanged } from "firebase/auth"; // Import from your firebase config
import { auth } from './firebase-config'; // Adjust the path as necessary 
import Home from './pages/home';
import Categories from './pages/categories';
import About from './pages/about';
import HairDetail from './pages/hairdetail';  
import Navbar from './components/navbar';
import Footer from './components/footer'; 
import Login from './components/Login';
import Profile from './pages/Profile';

function App() {
  const [currentUser, setCurrentUser] = useState(null);

  // Listen for Auth changes globally
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe(); // Cleanup
  }, []);

  const navData = [
    { label: 'Home', path: '/', icon: 'ri-home-5-line' },
    { label: 'Styles', path: '/categories', icon: 'ri-layout-grid-line' },
    { label: 'About', path: '/about', icon: 'ri-user-smile-line' }
  ];

  return (
    <Router>
       <Navbar links={navData} currentUser={currentUser} />      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/categories" element={<Categories />} />
        <Route path="/about" element={<About />} />
       <Route path="/login" element={<Login currentUser={currentUser} />} />
       <Route path="/profile" element={<Profile currentUser={currentUser} />} />
        {/* Pass currentUser here so HairDetail can check for likes/comments */}
        <Route path="/haircut/:id" element={<HairDetail currentUser={currentUser} />} />        
      </Routes>
      <Footer links={navData} />
    </Router>
  );
}

export default App;