let audioCtx: AudioContext | null = null;
let isMuted = false;

function getAudioContext(): AudioContext | null {
  if (isMuted) return null;
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export const setMuted = (muted: boolean) => {
  isMuted = muted;
  if (muted && audioCtx) {
    audioCtx.close().then(() => {
      audioCtx = null;
    });
  }
};

export const getMuted = (): boolean => {
  return isMuted;
};

export const playMove = () => {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(120, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.08);

    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);

    osc.start();
    osc.stop(ctx.currentTime + 0.08);
  } catch (e) {
    console.warn('Audio failed to play', e);
  }
};

export const playRotate = () => {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(250, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(500, ctx.currentTime + 0.1);

    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);

    osc.start();
    osc.stop(ctx.currentTime + 0.15);
  } catch (e) {
    console.warn('Audio failed to play', e);
  }
};

export const playDrop = () => {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(80, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 0.12);

    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);

    osc.start();
    osc.stop(ctx.currentTime + 0.12);
  } catch (e) {
    console.warn('Audio failed to play', e);
  }
};

export const playHold = () => {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, ctx.currentTime);
    osc.frequency.setValueAtTime(450, ctx.currentTime + 0.05);

    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);

    osc.start();
    osc.stop(ctx.currentTime + 0.15);
  } catch (e) {
    console.warn('Audio failed to play', e);
  }
};

export const playLineClear = (lines: number) => {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const isTetris = lines >= 4;
    const now = ctx.currentTime;

    // We play a joyful chord (Major or Major 7th arpeggio)
    // C Major: C4 (261.63), E4 (329.63), G4 (392.00), C5 (523.25)
    // Tetris plays C Major 7th arpeggio rising up rapidly
    const notes = isTetris 
      ? [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50] // Gorgeous rainbow roll
      : [261.63, 329.63, 392.00, 523.25].slice(0, lines);

    const noteDuration = isTetris ? 0.06 : 0.1;

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = isTetris ? 'sawtooth' : 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * noteDuration);

      const startTime = now + idx * noteDuration;
      const duration = 0.3;

      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(isTetris ? 0.1 : 0.15, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

      osc.start(startTime);
      osc.stop(startTime + duration);
    });

    // For Tetris clear, add a sub-bass rumble for impact
    if (isTetris) {
      const subOsc = ctx.createOscillator();
      const subGain = ctx.createGain();
      subOsc.connect(subGain);
      subGain.connect(ctx.destination);

      subOsc.type = 'triangle';
      subOsc.frequency.setValueAtTime(60, now);
      subOsc.frequency.linearRampToValueAtTime(40, now + 0.5);

      subGain.gain.setValueAtTime(0.3, now);
      subGain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);

      subOsc.start(now);
      subOsc.stop(now + 0.5);
    }
  } catch (e) {
    console.warn('Audio failed to play', e);
  }
};

export const playLevelUp = () => {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    // Fanfare rising notes: G4 (392.00) -> C5 (523.25) -> E5 (659.25) -> G5 (783.99)
    const notes = [392.00, 523.25, 659.25, 783.99];
    const duration = 0.15;

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, now + idx * 0.1);

      const startTime = now + idx * 0.1;

      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.08, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.25);

      osc.start(startTime);
      osc.stop(startTime + 0.25);
    });
  } catch (e) {
    console.warn('Audio failed to play', e);
  }
};

export const playGameOver = () => {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.linearRampToValueAtTime(60, now + 1.2);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.linearRampToValueAtTime(0.15, now + 0.3);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

    osc.start(now);
    osc.stop(now + 1.2);

    // Add a dissonant secondary sweep to feel retro-sad
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.connect(gain2);
    gain2.connect(ctx.destination);

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(290, now);
    osc2.frequency.linearRampToValueAtTime(55, now + 1.2);

    gain2.gain.setValueAtTime(0.15, now);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

    osc2.start(now);
    osc2.stop(now + 1.2);
  } catch (e) {
    console.warn('Audio failed to play', e);
  }
};
