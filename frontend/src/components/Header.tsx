import React from 'react';
import { Link, NavLink } from 'react-router-dom';
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
          <NavLink
            to="/how-it-works"
            className={({ isActive }) =>
              `header-link ${isActive ? 'active' : ''}`
            }
          >
            <span className="nav-text">How it works</span>
            <span className="nav-indicator" aria-hidden="true" />
          </NavLink>

          <NavLink
            to="/about"
            className={({ isActive }) =>
              `header-link ${isActive ? 'active' : ''}`
            }
          >
            <span className="nav-text">About</span>
            <span className="nav-indicator" aria-hidden="true" />
          </NavLink>
        </nav>
      </div>
    </header>
  );
};
