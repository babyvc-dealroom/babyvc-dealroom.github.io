import confetti from 'canvas-confetti';

const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
let muted = (() => { try { return localStorage.getItem('bvc-mute') === '1'; } catch { return false; } })();
export const isMuted = () => muted;
export const setMuted = m => { muted = m; try { localStorage.setItem('bvc-mute', m ? '1' : '0'); } catch { /* ignore */ } };

let ctx;
function tone(freqs, dur = 0.12, type = 'sine', gap = 0.09, vol = 0.07) {
  if (muted) return;
  try {
    ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
    freqs.forEach((f, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain(), t = ctx.currentTime + i * gap;
      o.type = type; o.frequency.setValueAtTime(f, t);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(ctx.destination); o.start(t); o.stop(t + dur + 0.02);
    });
  } catch { /* audio unavailable */ }
}
export const sfx = {
  send: () => tone([440, 660, 880], 0.14, 'triangle', 0.06),
  receive: () => tone([880, 660], 0.18, 'sine', 0.12),
  sign: () => tone([523, 659, 784, 1047], 0.35, 'triangle', 0.1, 0.08),
  envelope: () => tone([300, 380], 0.2, 'square', 0.12, 0.03),
  reject: () => tone([300, 220], 0.2, 'sawtooth', 0.12, 0.04),
  tick: () => tone([1200], 0.05, 'square', 0, 0.02),
  score: () => tone([660, 880, 990, 1320], 0.2, 'triangle', 0.08),
};

export function celebrate(colors = ['#E4F36B', '#2E9E5B', '#0F8B8D', '#2F5FD0', '#E8743B']) {
  if (reduced()) return;
  const end = Date.now() + 900;
  (function frame() {
    confetti({ particleCount: 5, angle: 60, spread: 60, origin: { x: 0, y: 0.7 }, colors });
    confetti({ particleCount: 5, angle: 120, spread: 60, origin: { x: 1, y: 0.7 }, colors });
    if (Date.now() < end) requestAnimationFrame(frame);
  })();
  confetti({ particleCount: 90, spread: 100, origin: { y: 0.45 }, colors, scalar: 1.1 });
}
export function burst(x = 0.5, y = 0.5) { if (!reduced()) confetti({ particleCount: 40, spread: 55, origin: { x, y }, colors: ['#E4F36B', '#2E9E5B'], scalar: 0.8 }); }
