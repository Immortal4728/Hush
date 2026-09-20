import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

interface CountdownTimerProps {
  expiresAt: string;
  onExpire?: () => void;
}

export const CountdownTimer: React.FC<CountdownTimerProps> = ({ expiresAt, onExpire }) => {
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
    <div
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded text-xs font-mono border transition-colors ${
        isWarning
          ? 'border-white text-white bg-zinc-900 animate-pulse'
          : 'border-[#27272a] text-[#a1a1aa] bg-[#09090b]'
      }`}
    >
      <Clock className="w-3.5 h-3.5" />
      <span>{timeLeft}</span>
    </div>
  );
};
