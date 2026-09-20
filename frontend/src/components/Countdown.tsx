import React, { useState, useEffect } from 'react';

interface CountdownProps {
  expiresAt: string;
  onExpire?: () => void;
}

export const Countdown: React.FC<CountdownProps> = ({ expiresAt, onExpire }) => {
  const [timeLeft, setTimeLeft] = useState('--:--');
  const [isWarning, setIsWarning] = useState(false);

  useEffect(() => {
    const target = new Date(expiresAt).getTime();

    const tick = () => {
      const diff = target - Date.now();
      if (diff <= 0) {
        setTimeLeft('00:00');
        onExpire?.();
        return;
      }

      const totalSecs = Math.floor(diff / 1000);
      const hrs = Math.floor(totalSecs / 3600);
      const mins = Math.floor((totalSecs % 3600) / 60);
      const secs = totalSecs % 60;

      setIsWarning(totalSecs < 300); // < 5 min

      if (hrs > 0) {
        setTimeLeft(
          `${String(hrs)}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`,
        );
      } else {
        setTimeLeft(`${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`);
      }
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [expiresAt, onExpire]);

  return (
    <span
      className="font-mono"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.375rem',
        padding: '0.25rem 0.625rem',
        borderRadius: 'var(--radius-sm)',
        border: `1px solid ${isWarning ? 'var(--danger)' : 'var(--border)'}`,
        background: isWarning ? 'rgba(255,92,108,0.06)' : 'transparent',
        color: isWarning ? 'var(--danger)' : 'var(--text-secondary)',
        fontSize: '0.75rem',
        fontWeight: 500,
        transition: 'all 0.3s ease',
      }}
      aria-live="polite"
      aria-label={`Time remaining: ${timeLeft}`}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
      {timeLeft}
    </span>
  );
};
