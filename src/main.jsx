import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import ReactGA from 'react-ga4';
import './index.css';
import { HelmetProvider } from 'react-helmet-async';
import App from './App.jsx';

// --- Import TanStack Query ---
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// 1. Google Analytics Initialization
const GA_ID = import.meta.env.VITE_GOOGLE_ANALYTICS_ID;

if (GA_ID) {
  ReactGA.initialize(GA_ID);
  ReactGA.send({ hitType: "pageview", page: window.location.pathname });
} else {
  console.warn("Google Analytics ID missing in .env file");
}

// 2. Initialize the TanStack Query Client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // This ensures that when a user switches tabs and comes back, 
      // the app doesn't trigger a loading spinner if data is less than 5 mins old.
      staleTime: 1000 * 60 * 5, 
      retry: 2, // If the backend fails, try again twice automatically
    },
  },
});

// 3. Rendering the App
createRoot(document.getElementById('root')).render(
  <StrictMode>
    {/* Wrap everything with QueryClientProvider */}
    <QueryClientProvider client={queryClient}>
      <HelmetProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </HelmetProvider>
    </QueryClientProvider>
  </StrictMode>
);