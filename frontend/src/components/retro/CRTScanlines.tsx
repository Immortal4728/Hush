import React from 'react';
import './CRTScanlines.css';

export const CRTScanlines: React.FC = () => (
  <div className="crt-scan" aria-hidden="true">
    <div className="crt-scan__lines" />
    <div className="crt-scan__pixel-grid" />
    <div className="crt-scan__band" />
    <div className="crt-scan__glitch-bar" />
    <div className="crt-scan__flicker" />
    <div className="crt-scan__noise" />
    <div className="crt-scan__vignette" />
    <div className="crt-scan__tube" />
  </div>
);

