import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/big-shoulders-display';
import '@fontsource-variable/manrope';
import './styles/tokens.css';
import './styles/base.css';
import './styles/components.css';
import App from './App.jsx';
import { FeedbackProvider } from './components/Feedback.jsx';
import { loadTheme } from './utils/storage.js';

// Apply the saved theme before the first render so the page doesn't flash.
document.documentElement.setAttribute('data-theme', loadTheme());

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <FeedbackProvider>
      <App />
    </FeedbackProvider>
  </StrictMode>,
);
