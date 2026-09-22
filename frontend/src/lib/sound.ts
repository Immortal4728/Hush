/* HUSH · synthesized analog sound engine.
   Opt-in only (muted by default) — preference persisted in localStorage.
   No audio assets: all sounds are generated with WebAudio. */

export type SoundName = 'click' | 'connect' | 'glitch' | 'leave' | 'alert';

const STORAGE_KEY = 'hush_sound_enabled';

type Listener = (enabled: boolean) => void;
const listeners = new Set<Listener>();

function readStored(): boolean {
  try {
    return typeof window !== 'undefined' && window.localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

let enabled = readStored();

export function isSoundEnabled(): boolean {
  return enabled;
}

export function setSoundEnabled(value: boolean): void {
  enabled = value;
  try {
    window.localStorage.setItem(STORAGE_KEY, value ? '1' : '0');
  } catch {
    // storage unavailable — keep in-memory only
  }
  listeners.forEach((listener) => listener(value));
}

export function subscribeSound(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

let ctx: AudioContext | null = null;

function ensureCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AC =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  if (!ctx) ctx = new AC();
  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => undefined);
  }
  return ctx;
}

function tone(
  ac: AudioContext,
  type: OscillatorType,
  from: number,
  to: number,
  duration: number,
  gainValue: number,
  delay = 0,
): void {
  const t0 = ac.currentTime + delay;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(from, t0);
  if (to !== from) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), t0 + duration);
  }
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(gainValue, t0 + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(gain).connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.02);
}

function noiseBurst(ac: AudioContext, duration: number, gainValue: number): void {
  const frames = Math.max(1, Math.floor(ac.sampleRate * duration));
  const buffer = ac.createBuffer(1, frames, ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < frames; i += 1) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / frames);
  }
  const src = ac.createBufferSource();
  src.buffer = buffer;
  const filter = ac.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 1400;
  filter.Q.value = 0.8;
  const gain = ac.createGain();
  gain.gain.value = gainValue;
  src.connect(filter).connect(gain).connect(ac.destination);
  src.start(ac.currentTime);
}

export function playSound(name: SoundName): void {
  const ac = ensureCtx();
  if (!ac) return;
  switch (name) {
    case 'click':
      tone(ac, 'square', 190, 70, 0.05, 0.06);
      break;
    case 'connect':
      tone(ac, 'sine', 420, 420, 0.09, 0.05);
      tone(ac, 'sine', 640, 640, 0.1, 0.05, 0.09);
      break;
    case 'glitch':
      noiseBurst(ac, 0.09, 0.05);
      break;
    case 'leave':
      tone(ac, 'sawtooth', 300, 60, 0.32, 0.05);
      noiseBurst(ac, 0.2, 0.03);
      break;
    case 'alert':
      tone(ac, 'sawtooth', 210, 210, 0.08, 0.05);
      tone(ac, 'sawtooth', 210, 210, 0.08, 0.05, 0.14);
      break;
  }
}
