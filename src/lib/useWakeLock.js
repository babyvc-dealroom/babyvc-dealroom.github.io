import { useEffect } from 'react';
import { net } from './net.js';

// Keeps the screen on while the game runs, so a phone left on the table does not go to sleep and drop out.
// Re-acquired when the page comes back to the front; some browsers grant it only after a tap.
export function useWakeLock(active) {
  useEffect(() => {
    if (!active || typeof navigator === 'undefined' || !('wakeLock' in navigator)) return;
    let lock = null, stop = false;
    const get = async () => {
      if (stop || lock || document.visibilityState !== 'visible') return;
      try {
        lock = await navigator.wakeLock.request('screen');
        net.set({ wake: true });
        lock.addEventListener?.('release', () => { lock = null; net.set({ wake: false }); });
      } catch { net.set({ wake: false }); }
    };
    get();
    const again = () => get();
    document.addEventListener('visibilitychange', again);
    addEventListener('pointerdown', again);
    return () => {
      stop = true;
      document.removeEventListener('visibilitychange', again); removeEventListener('pointerdown', again);
      lock?.release?.().catch(() => {}); net.set({ wake: false });
    };
  }, [active]);
}
