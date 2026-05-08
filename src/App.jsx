import React, { useState, useEffect, Suspense, lazy } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import ReactGA from "react-ga4";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from './firebase-config'; 
import { useRegisterSW } from 'virtual:pwa-register/react';

// --- Static Imports (Keep these in the main bundle) ---
import Navbar from './components/navbar';
import Loader from './components/Loader'; // Use your existing Loader for Suspense

// --- Lazy Imports (Split these into separate chunks) ---
const Home          = lazy(() => import('./pages/home'));
const Categories    = lazy(() => import('./pages/categories'));
const About         = lazy(() => import('./pages/about'));
const HairDetail    = lazy(() => import('./pages/hairdetail'));  
const Login         = lazy(() => import('./components/Login'));
const Profile       = lazy(() => import('./pages/Profile'));
const FaceScanPage  = lazy(() => import('./pages/FaceScanPage'));

function App() {
  const location = useLocation();
  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true); // Track auth state
  
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
      setAuthLoading(false); // Auth check is done
    });
    return () => unsubscribe(); 
  }, []);

  const navData = [
    { label: 'Home', path: '/', icon: 'ri-home-5-line' },
    { label: 'Styles', path: '/categories', icon: 'ri-layout-grid-line' },
    { label: 'Face Scan', path: '/face-scan', icon: 'ri-camera-lens-line' },
  ];

  return (
    <>
      <Navbar links={navData} currentUser={currentUser} />
      
      {/* Suspense handles the 'wait' while the browser downloads the small 
          page chunks. It shows your Loader component in the meantime.
      */}
      <Suspense fallback={<Loader />}>
        <Routes>
          <Route path="/" element={<Home currentUser={currentUser} />} />
          <Route path="/categories" element={<Categories currentUser={currentUser} />} />
          <Route path="/about" element={<About currentUser={currentUser} />} />
          <Route path="/login" element={<Login currentUser={currentUser} />} />
          <Route path="/profile" element={<Profile currentUser={currentUser} authLoading={authLoading} />} />
          <Route path="/haircut/:id" element={<HairDetail currentUser={currentUser} />} />
          <Route path="/face-scan" element={<FaceScanPage currentUser={currentUser} authLoading={authLoading} />} />        
        </Routes>
      </Suspense>
    </>
  );
}

export default App;