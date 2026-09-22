import React from 'react';
import { Link } from 'react-router-dom';
import './RetroButton.css';

interface RetroButtonProps {
  to?: string;
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
}

export const RetroButton: React.FC<RetroButtonProps> = ({ to, onClick, children, className = '' }) => {
  const content = (
    <>
      <span className="retro-button__brackets">[</span>
      <span className="retro-button__label">{children}</span>
      <span className="retro-button__brackets">]</span>
    </>
  );

  if (to) {
    return (
      <Link to={to} className={`retro-button ${className}`}>
        {content}
      </Link>
    );
  }

  return (
    <button onClick={onClick} className={`retro-button ${className}`}>
      {content}
    </button>
  );
};
