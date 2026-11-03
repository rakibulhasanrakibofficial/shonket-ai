import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('SHONKET UI render error:', error, info?.componentStack || '');
  }

  render() {
    if (this.state.hasError) {
      return (
        <main style={{ minHeight: '100vh', background: '#080914', color: '#f8fafc', display: 'grid', placeItems: 'center', padding: '24px', fontFamily: 'system-ui, sans-serif' }}>
          <section role="alert" style={{ maxWidth: '520px', border: '1px solid #334155', borderRadius: '18px', background: '#111827', padding: '28px', textAlign: 'center' }}>
            <h1 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '12px' }}>SHONKET AI is still here</h1>
            <p style={{ color: '#cbd5e1', lineHeight: 1.6, marginBottom: '20px' }}>A display error interrupted this page. Your typed message may not have been saved. Reload the page and try again.</p>
            <button type="button" onClick={() => window.location.reload()} style={{ borderRadius: '999px', background: '#67e8f9', color: '#082f49', padding: '11px 20px', fontWeight: 800, cursor: 'pointer' }}>Reload SHONKET AI</button>
          </section>
        </main>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </React.StrictMode>
);