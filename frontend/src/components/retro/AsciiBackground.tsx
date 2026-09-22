import React, { useEffect, useRef } from 'react';
import { useReducedMotion } from '../../hooks/useReducedMotion';

// Helper for Overlay Blend Mode
const overlayBlend = (base: number, blend: number, opacity: number) => {
  const result = base < 128
    ? (2 * base * blend) / 255
    : 255 - (2 * (255 - base) * (255 - blend)) / 255;
  return base * (1 - opacity) + result * opacity;
};

export const AsciiBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false, willReadFrequently: true });
    if (!ctx) return;

    let rafId: number;
    let effectCanvas = document.createElement('canvas');
    let effectCtx = effectCanvas.getContext('2d', { willReadFrequently: true });

    const img = new Image();
    img.onload = () => {
      startEffect();
    };
    img.src = '/cityscape.png';

    let width = 0;
    let height = 0;

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
      effectCanvas.width = width;
      effectCanvas.height = height;
      generateEffect();
    };

    const generateEffect = () => {
      if (!effectCtx || !img.complete || width === 0) return;

      const imgRatio = img.width / img.height;
      const canvasRatio = width / height;
      let drawW = width;
      let drawH = height;
      let drawX = 0;
      let drawY = 0;

      if (imgRatio > canvasRatio) {
        drawW = height * imgRatio;
        drawX = (width - drawW) / 2;
      } else {
        drawH = width / imgRatio;
        drawY = (height - drawH) / 2;
      }

      // Draw original image to sample from
      effectCtx.fillStyle = '#000';
      effectCtx.fillRect(0, 0, width, height);
      effectCtx.drawImage(img, drawX, drawY, drawW, drawH);

      const imgData = effectCtx.getImageData(0, 0, width, height).data;

      // Clear for drawing Binary Characters
      effectCtx.fillStyle = '#000';
      effectCtx.fillRect(0, 0, width, height);

      const cellSize = 3;
      const contrast = 1.15;
      const grayscale = 0.92;

      // Tint "#000000" -> rgb(0, 0, 0), opacity 0.45
      const tr = 0;
      const tg = 0;
      const tb = 0;
      const topac = 0.45;

      effectCtx.font = `${cellSize * 1.5}px monospace`;
      effectCtx.textAlign = 'center';
      effectCtx.textBaseline = 'middle';

      for (let y = 0; y < height; y += cellSize) {
        for (let x = 0; x < width; x += cellSize) {
          const i = (Math.floor(y) * width + Math.floor(x)) * 4;
          let r = imgData[i];
          let g = imgData[i + 1];
          let b = imgData[i + 2];

          // 1. Contrast
          r = ((r / 255 - 0.5) * contrast + 0.5) * 255;
          g = ((g / 255 - 0.5) * contrast + 0.5) * 255;
          b = ((b / 255 - 0.5) * contrast + 0.5) * 255;

          // 2. Grayscale (92%)
          const gray = r * 0.299 + g * 0.587 + b * 0.114;
          r = r * (1 - grayscale) + gray * grayscale;
          g = g * (1 - grayscale) + gray * grayscale;
          b = b * (1 - grayscale) + gray * grayscale;

          // 3. Tint (Overlay Blend)
          r = overlayBlend(Math.max(0, Math.min(255, r)), tr, topac);
          g = overlayBlend(Math.max(0, Math.min(255, g)), tg, topac);
          b = overlayBlend(Math.max(0, Math.min(255, b)), tb, topac);

          r = Math.floor(Math.min(255, Math.max(0, r)));
          g = Math.floor(Math.min(255, Math.max(0, g)));
          b = Math.floor(Math.min(255, Math.max(0, b)));

          const lum = (r * 0.299 + g * 0.587 + b * 0.114) / 255;

          // Only render characters if there's enough brightness (creates negative space)
          if (lum > 0.05) {
            const char = Math.random() > 0.5 ? '0' : '1';
            effectCtx.fillStyle = `rgb(${r},${g},${b})`;
            effectCtx.fillText(char, x + cellSize / 2, y + cellSize / 2);
          }
        }
      }
    };

    let frame = 0;
    const render = () => {
      frame++;

      // bgMode: solid (black)
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, width, height);

      // Flicker animation
      let globalAlpha = 1;
      if (!reduced) {
        if (Math.random() > 0.98) {
          // Extremely subtle brightness fluctuation
          globalAlpha = 0.9 + Math.random() * 0.1;
        }
      }
      ctx.globalAlpha = globalAlpha;

      // Base Render
      ctx.drawImage(effectCanvas, 0, 0);

      if (!reduced) {
        // Glitch (intensity: 20) -> Occasional horizontal displacement
        if (Math.random() > 0.99) {
          const sliceY = Math.random() * height;
          const sliceH = Math.random() * 40 + 5;
          const shiftX = (Math.random() - 0.5) * 10; // tiny displacement
          ctx.drawImage(effectCanvas, 0, sliceY, width, sliceH, shiftX, sliceY, width, sliceH);
        }

        // Chromatic Aberration (intensity: 40)
        ctx.globalCompositeOperation = 'screen';
        ctx.globalAlpha = 0.4;
        ctx.drawImage(effectCanvas, -2, 0);
        ctx.drawImage(effectCanvas, 2, 0);
        ctx.globalAlpha = 1;

        // Bloom (intensity: 60)
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.6;
        ctx.drawImage(effectCanvas, -1, -1, width + 2, height + 2);
        ctx.globalAlpha = 1;
      }

      // ScanLines (intensity: 28)
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
      for (let y = 0; y < height; y += 4) {
        ctx.fillRect(0, y, width, 1);
      }

      // Vignette (intensity: 38)
      const gradient = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, Math.max(width, height) * 0.8);
      gradient.addColorStop(0, 'rgba(0,0,0,0)');
      gradient.addColorStop(1, 'rgba(0,0,0,0.6)'); // slightly increased from 0.38 for readability
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      // Film Grain (intensity: 40)
      if (!reduced) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
        for (let i = 0; i < 600; i++) {
          ctx.fillRect(Math.random() * width, Math.random() * height, 2, 2);
        }
      }

      rafId = requestAnimationFrame(render);
    };

    const startEffect = () => {
      resize();
      render();
    };

    if (img.complete) {
      startEffect();
    }

    window.addEventListener('resize', resize);

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(rafId);
    };
  }, [reduced]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 0,
        pointerEvents: 'none',
        opacity: 0.85 // Keeps it subtle behind UI
      }}
      aria-hidden="true"
    />
  );
};
