import React from 'react';
import { Link } from 'react-router-dom';
import './Header.css';

export const Header: React.FC = () => {
  return (
    <header className="header">
      <div className="header-inner">
        <Link to="/" className="header-brand" aria-label="Hush home">
          <span className="header-logo">H</span>
          <span className="header-name">Hush</span>
        </Link>

        <nav className="header-nav">
          <a href="#how-it-works" className="header-link">How it works</a>
        </nav>
      </div>
    </header>
  );
};
