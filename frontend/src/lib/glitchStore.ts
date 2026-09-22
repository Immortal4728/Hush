/* HUSH · global glitch intensity store.
   Pages (e.g. the chat room) raise intensity as the room life runs out;
   the single GlitchOverlay mounted in App consumes it. */

type Listener = (intensity: number) => void;
const listeners = new Set<Listener>();

export const GLITCH_BASE_INTENSITY = 0.12;

let current = GLITCH_BASE_INTENSITY;

export function getGlitchIntensity(): number {
  return current;
}

export function setGlitchIntensity(value: number): void {
  const clamped = Math.min(1, Math.max(0, value));
  if (clamped === current) return;
  current = clamped;
  listeners.forEach((listener) => listener(clamped));
}

export function subscribeGlitch(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
