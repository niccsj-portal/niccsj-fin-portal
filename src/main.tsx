import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { AuthProvider } from '@/lib/auth/AuthContext';
import { Toaster } from '@/components/ui/toast';
import './i18n';
import './index.css';

const root = document.getElementById('root');
if (!root) {
  throw new Error('Root element with id="root" not found in index.html');
}

// GitHub Pages serves project pages under /<repo>/; BASE_URL carries that
// prefix in production and is "/" in local dev.
const basename = import.meta.env.BASE_URL;

createRoot(root).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter basename={basename}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
    <Toaster />
  </StrictMode>,
);
