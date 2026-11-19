import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { loadTheme } from './utils/storage.js';
import './styles/app.css';

// Apply the saved theme before the first render so the page doesn't flash.
document.documentElement.setAttribute('data-theme', loadTheme());

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
