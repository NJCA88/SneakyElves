import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { GoogleOAuthProvider } from '@react-oauth/google';
import './index.css'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary';

import axios from 'axios';

// Set default base URL for axios
if (import.meta.env.VITE_API_URL) {
  axios.defaults.baseURL = import.meta.env.VITE_API_URL;
}

const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
console.log('Using Google Client ID:', clientId);

createRoot(document.getElementById('root')).render(
  <ErrorBoundary>
    <GoogleOAuthProvider clientId={clientId}>
      <App />
    </GoogleOAuthProvider>
  </ErrorBoundary>
)
