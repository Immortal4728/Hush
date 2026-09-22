import React, { useEffect, useRef } from 'react';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import './RetroBackground.css';

interface RetroBackgroundProps {
  variant?: 'landing' | 'menu' | 'room';
}

export const RetroBackground: React.FC<RetroBackgroundProps> = ({ variant = 'landing' }) => {
  const reduced = useReducedMotion();
  const rootRef = useRef<HTMLDivElement>(null);

  // subtle pointer parallax — writes CSS vars only, no React re-render
  useEffect(() => {
    if (reduced) return;
    const el = rootRef.current;
    if (!el) return;
    let raf = 0;
    let targetX = 0;
    let targetY = 0;
    const onMove = (e: MouseEvent) => {
      targetX = (e.clientX / window.innerWidth) * 2 - 1;
      targetY = (e.clientY / window.innerHeight) * 2 - 1;
      if (!raf) {
        raf = requestAnimationFrame(() => {
          raf = 0;
          el.style.setProperty('--parallax-x', (targetX * 0.1).toFixed(3));
          el.style.setProperty('--parallax-y', (targetY * 0.1).toFixed(3));
        });
      }
    };
    window.addEventListener('mousemove', onMove, { passive: true });
    return () => {
      window.removeEventListener('mousemove', onMove);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [reduced]);

  return (
    <div ref={rootRef} className={`retro-bg retro-bg--${variant}`} aria-hidden="true">
      <div className="retro-bg__layer">
        <div className="retro-bg__forest" />
      </div>
      <div className="retro-bg__noise" />
      <div className="retro-bg__scanlines" />
      <div className="retro-bg__distortion" />
      <div className="retro-bg__vignette" />
    </div>
  );
};
