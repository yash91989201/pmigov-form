import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';

// Self-hosted document typefaces (no CDN — works in the offline Docker build).
// Spectral: engraved serif for the letterhead & section headings.
import '@fontsource/spectral/500.css';
import '@fontsource/spectral/600.css';
import '@fontsource/spectral/600-italic.css';
// IBM Plex Sans: institutional body & form labels.
import '@fontsource/ibm-plex-sans/400.css';
import '@fontsource/ibm-plex-sans/500.css';
import '@fontsource/ibm-plex-sans/600.css';
// IBM Plex Mono: reference numbers, amounts, transaction refs (the ledger signal).
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/500.css';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
