import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error("React ErrorBoundary caught error:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '30px', color: '#fff', background: '#18181b', minHeight: '100vh', fontFamily: 'monospace' }}>
          <h2 style={{ color: '#ef4444', fontSize: '20px', marginBottom: '10px' }}>⚠️ Terjadi Kesalahan Render di Aplikasi:</h2>
          <pre style={{ background: '#27272a', padding: '16px', borderRadius: '8px', overflow: 'auto' }}>
            {this.state.error?.stack || this.state.error?.message || String(this.state.error)}
          </pre>
          <button
            onClick={() => window.location.reload()}
            style={{ marginTop: '16px', padding: '8px 16px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            Muat Ulang Halaman
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)

// Register Service Worker for mobile PWA & push notifications
if ('serviceWorker' in navigator) {
  const registerSW = () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).then(
      (reg) => {
        console.log('Life OS Service Worker registered with scope:', reg.scope);
      },
      (err) => {
        console.warn('Life OS Service Worker registration failed:', err);
      }
    );
  };

  if (document.readyState === 'complete') {
    registerSW();
  } else {
    window.addEventListener('load', registerSW);
  }
}

