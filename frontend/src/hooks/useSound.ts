import { useCallback, useEffect, useState } from 'react';
import { isSoundEnabled, playSound, setSoundEnabled, subscribeSound } from '../lib/sound';
import type { SoundName } from '../lib/sound';

export function useSound() {
  const [enabled, setEnabled] = useState<boolean>(isSoundEnabled);

  useEffect(() => subscribeSound(setEnabled), []);

  const play = useCallback((name: SoundName) => {
    if (isSoundEnabled()) playSound(name);
  }, []);

  const toggle = useCallback(() => {
    setSoundEnabled(!isSoundEnabled());
  }, []);

  return { enabled, play, toggle };
}
