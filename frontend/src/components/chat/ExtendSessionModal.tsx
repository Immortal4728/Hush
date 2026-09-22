import React, { useState } from 'react';
import { CountdownTimer } from '../CountdownTimer';

interface ExtendSessionModalProps {
  isOpen: boolean;
  expiresAt: string;
  onClose: () => void;
  onExtend: (minutes: number) => Promise<void>;
}

export const ExtendSessionModal: React.FC<ExtendSessionModalProps> = ({
  isOpen,
  expiresAt,
  onClose,
  onExtend,
}) => {
  const [selectedMinutes, setSelectedMinutes] = useState<number>(30);
  const [isCustomMode, setIsCustomMode] = useState<boolean>(false);
  const [customMinutesText, setCustomMinutesText] = useState<string>('45');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const quickOptions = [
    { label: '+15 MIN', minutes: 15 },
    { label: '+30 MIN', minutes: 30 },
    { label: '+1 HOUR', minutes: 60 },
  ];

  const handleSelectQuick = (mins: number) => {
    setIsCustomMode(false);
    setSelectedMinutes(mins);
    setErrorMessage(null);
  };

  const handleSelectCustom = () => {
    setIsCustomMode(true);
    setErrorMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    let finalMinutes = selectedMinutes;
    if (isCustomMode) {
      const parsed = parseInt(customMinutesText.trim(), 10);
      if (isNaN(parsed) || parsed <= 0 || parsed > 1440) {
        setErrorMessage('Enter a valid duration between 1 and 1440 minutes.');
        return;
      }
      finalMinutes = parsed;
    }

    setIsSubmitting(true);
    try {
      await onExtend(finalMinutes);
      onClose();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to extend room session.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="extend-modal-overlay font-mono">
      <div className="extend-modal-backdrop" onClick={onClose} />

      <div className="extend-modal-content font-mono">
        <div className="extend-modal-header">
          <span className="extend-title">[ EXTEND SESSION ]</span>
          <button
            onClick={onClose}
            className="terminal-close-btn"
            type="button"
            disabled={isSubmitting}
          >
            [ × ]
          </button>
        </div>

        <form onSubmit={handleSubmit} className="extend-modal-body">
          <div className="current-exp-block">
            <span className="exp-label">CURRENT EXPIRATION</span>
            <div className="exp-val font-mono">
              <CountdownTimer expiresAt={expiresAt} />
            </div>
          </div>

          <div className="extend-section-label">QUICK EXTENSIONS</div>

          <div className="quick-btn-grid">
            {quickOptions.map((opt) => (
              <button
                key={opt.minutes}
                type="button"
                className={`quick-opt-btn ${!isCustomMode && selectedMinutes === opt.minutes ? 'active' : ''}`}
                onClick={() => handleSelectQuick(opt.minutes)}
                disabled={isSubmitting}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div className="custom-mode-toggle mt-3">
            <button
              type="button"
              className={`custom-toggle-btn ${isCustomMode ? 'active' : ''}`}
              onClick={handleSelectCustom}
              disabled={isSubmitting}
            >
              CUSTOM TIME
            </button>
          </div>

          {isCustomMode && (
            <div className="custom-input-box mt-2">
              <label className="custom-label">DURATION (MINUTES)</label>
              <div className="flex items-center gap-2 mt-1">
                <input
                  type="number"
                  min="1"
                  max="1440"
                  value={customMinutesText}
                  onChange={(e) => setCustomMinutesText(e.target.value)}
                  className="custom-time-input font-mono"
                  placeholder="e.g. 45"
                  disabled={isSubmitting}
                  autoFocus
                />
                <span className="time-unit">MINUTES</span>
              </div>
            </div>
          )}

          {errorMessage && (
            <div className="extend-error-msg sys-error mt-2">
              [ ERROR ] {errorMessage}
            </div>
          )}

          <div className="extend-modal-footer mt-4">
            <button
              type="button"
              onClick={onClose}
              className="terminal-modal-cancel-btn"
              disabled={isSubmitting}
            >
              [ CANCEL ]
            </button>
            <button
              type="submit"
              className="terminal-modal-submit-btn"
              disabled={isSubmitting}
            >
              {isSubmitting ? '[ EXTENDING... ]' : '[ EXTEND SESSION ]'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
