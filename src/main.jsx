import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import ReactGA from 'react-ga4';
import './index.css';
import { HelmetProvider } from 'react-helmet-async';
import App from './App.jsx';

// 1. Google Analytics Initialization
// .env madhe VITE_GOOGLE_ANALYTICS_ID asle pahije
const GA_ID = import.meta.env.VITE_GOOGLE_ANALYTICS_ID;

if (GA_ID) {
  ReactGA.initialize(GA_ID);
  // Initial page load track karnyasaathi
  ReactGA.send({ hitType: "pageview", page: window.location.pathname });
} else {
  console.warn("Google Analytics ID missing in .env file");
}

// 2. Rendering the App
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <HelmetProvider> {/* Ha provider asne compulsory ahe */}
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </HelmetProvider>
  </StrictMode>
);