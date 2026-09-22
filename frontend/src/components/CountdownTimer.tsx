import React, { useState, useEffect } from 'react';

interface CountdownTimerProps {
  expiresAt: string;
  onExpire?: () => void;
  className?: string;
}

export const CountdownTimer: React.FC<CountdownTimerProps> = ({ expiresAt, onExpire, className = '' }) => {
  const [timeLeft, setTimeLeft] = useState<string>('--:--');
  const [isWarning, setIsWarning] = useState<boolean>(false);

  useEffect(() => {
    const targetTime = new Date(expiresAt).getTime();

    const updateTimer = () => {
      const now = new Date().getTime();
      const difference = targetTime - now;

      if (difference <= 0) {
        setTimeLeft('00:00');
        if (onExpire) onExpire();
        return;
      }

      const totalSeconds = Math.floor(difference / 1000);
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;

      setIsWarning(minutes < 5);

      const formattedMinutes = String(minutes).padStart(2, '0');
      const formattedSeconds = String(seconds).padStart(2, '0');
      setTimeLeft(`${formattedMinutes}:${formattedSeconds}`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [expiresAt, onExpire]);

  return (
    <span className={`terminal-timer-display font-mono ${isWarning ? 'timer-warning' : 'timer-normal'} ${className}`}>
      <span className="timer-symbol">◷</span>
      <span className="timer-digits">{timeLeft}</span>
    </span>
  );
};
