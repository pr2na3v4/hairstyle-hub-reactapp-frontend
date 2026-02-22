import React, { useState, useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import ReactGA from "react-ga4";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from './firebase-config'; 
import Home from './pages/home';
import Categories from './pages/categories';
import About from './pages/about';
import HairDetail from './pages/hairdetail';  
import Navbar from './components/navbar';
import Login from './components/Login';
import Profile from './pages/Profile';
import { useRegisterSW } from 'virtual:pwa-register/react';

function App() {
  const location = useLocation();
  const [currentUser, setCurrentUser] = useState(null);
  
  // PWA Service Worker Register
  useRegisterSW({ immediate: true });

  // 1. Google Analytics Page Tracking
  useEffect(() => {
    ReactGA.send({ 
      hitType: "pageview", 
      page: location.pathname + location.search 
    });
  }, [location]);

  // 2. Firebase Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe(); 
  }, []);

  const navData = [
    { label: 'Home', path: '/', icon: 'ri-home-5-line' },
    { label: 'Styles', path: '/categories', icon: 'ri-layout-grid-line' },
    { label: 'About', path: '/about', icon: 'ri-user-smile-line' }
  ];

  return (
    <>
      <Navbar links={navData} currentUser={currentUser} />
      <Routes>
        <Route path="/" element={<Home currentUser={currentUser} />} />
        <Route path="/categories" element={<Categories currentUser={currentUser} />} />
        <Route path="/about" element={<About currentUser={currentUser} />} />
        <Route path="/login" element={<Login currentUser={currentUser} />} />
        <Route path="/profile" element={<Profile currentUser={currentUser} />} />
        <Route path="/haircut/:id" element={<HairDetail currentUser={currentUser} />} />        
      </Routes>
    </>
  );
}

export default App;