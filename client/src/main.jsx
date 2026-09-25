import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './shared/context/AuthContext';
import { LanguageProvider } from './shared/context/LanguageContext';
import './index.css';
import { setMediaBase } from './utils/mediaUrl';

fetch('/api/public-config')
  .then((r) => r.json())
  .then((d) => setMediaBase(d.publicBaseUrl))
  .catch(() => {});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <LanguageProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </LanguageProvider>
    </BrowserRouter>
  </React.StrictMode>
);
