import React, { useState, useEffect } from 'react';
import './CRTPowerOnOverlay.css';

export const CRTPowerOnOverlay: React.FC = () => {
  const [active, setActive] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setActive(false);
    }, 850);
    return () => clearTimeout(timer);
  }, []);

  if (!active) return null;

  return <div className="crt-power-overlay" aria-hidden="true" />;
};
