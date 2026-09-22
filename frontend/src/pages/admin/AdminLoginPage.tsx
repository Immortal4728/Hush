import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../../components/Header';
import { adminLogin } from '../../services/adminApi';
import './AdminLoginPage.css';

export const AdminLoginPage: React.FC = () => {
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('USERNAME AND PASSWORD REQUIRED');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await adminLogin(username.trim(), password);
      navigate('/admin/dashboard', { replace: true });
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message.toUpperCase());
      } else {
        setError('AUTHENTICATION FAILED');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page page-enter">
      <Header />

      <main className="page-center">
        <div className="admin-login-card sys-panel animate-fadeIn">
          <div className="panel-corner corner-tl" />
          <div className="panel-corner corner-tr" />
          <div className="panel-corner corner-bl" />
          <div className="panel-corner corner-br" />

          <div className="admin-login-header">
            <span className="admin-console-tag font-crt">SECURITY CONSOLE</span>
            <h1 className="admin-login-title font-display">HUSH // ADMIN ACCESS</h1>
            <p className="admin-login-desc font-crt">
              RESTRICTED OPERATIONAL GATEWAY. AUTHORIZED PERSONNEL ONLY.
            </p>
          </div>

          {error && (
            <div className="terminal-alert admin-alert" role="alert">
              <span className="alert-icon">!</span> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="admin-login-form">
            <div className="field">
              <label htmlFor="admin-username" className="terminal-label">
                ADMIN IDENTITY / EMAIL
              </label>
              <input
                id="admin-username"
                type="text"
                className="retro-input"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setError(null);
                }}
                placeholder="admin"
                required
                autoComplete="username"
              />
            </div>

            <div className="field">
              <label htmlFor="admin-password" className="terminal-label">
                ACCESS PASSPHRASE
              </label>
              <input
                id="admin-password"
                type="password"
                className="retro-input"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError(null);
                }}
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !username.trim() || !password}
              className="terminal-submit-btn admin-submit-btn"
            >
              <span className="btn-bracket">[</span>
              <span className="btn-text">
                {loading ? 'AUTHENTICATING CONSOLE...' : 'LOGIN TO CONTROL CONSOLE →'}
              </span>
              <span className="btn-bracket">]</span>
            </button>
          </form>

          <div className="admin-login-footer font-crt">
            <span className="status-indicator">● SYSTEM STATUS: ONLINE</span>
            <span className="security-tag">ENCRYPTED AUTH PIPELINE</span>
          </div>
        </div>
      </main>
    </div>
  );
};
