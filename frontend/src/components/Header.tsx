import React, { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Menu, X, Radio } from 'lucide-react';
import './Header.css';

export const Header: React.FC = () => {
  const [mobileOpen, setMobileOpen] = useState(false);

  const closeMobile = () => setMobileOpen(false);


  return (
    <header className="header">
      <div className="header-inner">
        <Link to="/" className="header-brand" onClick={closeMobile} aria-label="Hush home">
          <span className="header-logo">H</span>
          <div className="header-brand-text">
            <span className="header-name">HUSH</span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="header-nav desktop-only">
          <NavLink
            to="/"
            end
            className={({ isActive }) => `header-link ${isActive ? 'active' : ''}`}
          >
            <span className="nav-text">HOME</span>
            <span className="nav-indicator" aria-hidden="true" />
          </NavLink>

          <NavLink
            to="/create"
            className={({ isActive }) => `header-link ${isActive ? 'active' : ''}`}
          >
            <span className="nav-text">CREATE</span>
            <span className="nav-indicator" aria-hidden="true" />
          </NavLink>

          <NavLink
            to="/join"
            className={({ isActive }) => `header-link ${isActive ? 'active' : ''}`}
          >
            <span className="nav-text">JOIN</span>
            <span className="nav-indicator" aria-hidden="true" />
          </NavLink>

          <NavLink
            to="/stranger"
            className={({ isActive }) => `header-link ${isActive ? 'active' : ''}`}
          >
            <span className="nav-text nav-highlight">
              <Radio className="nav-icon-sm" size={13} />
              STRANGER
            </span>
            <span className="nav-indicator" aria-hidden="true" />
          </NavLink>

          <NavLink
            to="/how-it-works"
            className={({ isActive }) => `header-link ${isActive ? 'active' : ''}`}
          >
            <span className="nav-text">HOW IT WORKS</span>
            <span className="nav-indicator" aria-hidden="true" />
          </NavLink>

          <NavLink
            to="/about"
            className={({ isActive }) => `header-link ${isActive ? 'active' : ''}`}
          >
            <span className="nav-text">ABOUT</span>
            <span className="nav-indicator" aria-hidden="true" />
          </NavLink>
        </nav>

        {/* Mobile Toggle Button */}
        <button
          className="mobile-menu-btn mobile-only"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle navigation menu"
        >
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="mobile-drawer mobile-only">
          <nav className="mobile-nav">
            <NavLink to="/" end className="mobile-link" onClick={closeMobile}>
              HOME
            </NavLink>
            <NavLink to="/create" className="mobile-link" onClick={closeMobile}>
              CREATE ROOM
            </NavLink>
            <NavLink to="/join" className="mobile-link" onClick={closeMobile}>
              JOIN ROOM
            </NavLink>
            <NavLink to="/stranger" className="mobile-link highlight" onClick={closeMobile}>
              <Radio size={16} /> TALK TO A STRANGER
            </NavLink>
            <NavLink to="/how-it-works" className="mobile-link" onClick={closeMobile}>
              HOW IT WORKS
            </NavLink>
            <NavLink to="/about" className="mobile-link" onClick={closeMobile}>
              ABOUT HUSH
            </NavLink>
          </nav>
        </div>
      )}
    </header>
  );
};

