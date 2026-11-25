/* ─── js/audio.js — Procedural Web Audio Engine (Muted by Default) ─── */
window.AnshAudio = (() => {
  const SESSION_KEY = 'ansh_town_sound_pref';
  let ctx = null;
  let rainGain = null;
  let rainSource = null;
  let enabled = false; // Always starts muted until explicit user action

  const savedPref = sessionStorage.getItem(SESSION_KEY) === 'on';

  const ensureContext = () => {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    return ctx;
  };

  const startRain = () => {
    const ac = ensureContext();
    if (!ac || rainSource) return;

    /* Filtered noise loop for gentle cyberpunk night rain */
    const bufSize = ac.sampleRate * 2;
    const buffer = ac.createBuffer(1, bufSize, ac.sampleRate);
    const data = buffer.getChannelData(0);
    let lastOut = 0;
    for (let i = 0; i < bufSize; i++) {
      const white = Math.random() * 2 - 1;
      data[i] = (lastOut + 0.04 * white) / 1.04;
      lastOut = data[i];
      data[i] *= 1.8;
    }

    rainSource = ac.createBufferSource();
    rainSource.buffer = buffer;
    rainSource.loop = true;

    const bandpass = ac.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.value = 1150;
    bandpass.Q.value = 0.55;

    const lowpass = ac.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 2800;

    rainGain = ac.createGain();
    rainGain.gain.setValueAtTime(0.0001, ac.currentTime);
    rainGain.gain.exponentialRampToValueAtTime(0.055, ac.currentTime + 0.8);

    rainSource.connect(bandpass);
    bandpass.connect(lowpass);
    lowpass.connect(rainGain);
    rainGain.connect(ac.destination);
    rainSource.start();
  };

  const stopRain = () => {
    if (!ctx || !rainGain || !rainSource) return;
    const src = rainSource;
    const g = rainGain;
    rainSource = null;
    rainGain = null;
    try {
      g.gain.setValueAtTime(Math.max(0.0001, g.gain.value), ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);
      setTimeout(() => { try { src.stop(); } catch (_) {} }, 380);
    } catch (_) {}
  };

  const setEnabled = val => {
    enabled = Boolean(val);
    sessionStorage.setItem(SESSION_KEY, enabled ? 'on' : 'off');
    if (enabled) {
      startRain();
    } else {
      stopRain();
    }
    return enabled;
  };

  const toggle = () => setEnabled(!enabled);
  const isEnabled = () => enabled;
  const hadSessionPref = () => savedPref;

  /* Subtle wet footstep tap */
  const playStep = (onWater = false) => {
    if (!enabled) return;
    const ac = ensureContext();
    if (!ac) return;
    const now = ac.currentTime;
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(onWater ? 260 : 140, now);
    osc.frequency.exponentialRampToValueAtTime(65, now + 0.055);
    g.gain.setValueAtTime(0.028, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);
    osc.connect(g);
    g.connect(ac.destination);
    osc.start(now);
    osc.stop(now + 0.065);
  };

  /* Subtle UI blip */
  const playUI = (freq = 540) => {
    if (!enabled) return;
    const ac = ensureContext();
    if (!ac) return;
    const now = ac.currentTime;
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.28, now + 0.06);
    g.gain.setValueAtTime(0.032, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.075);
    osc.connect(g);
    g.connect(ac.destination);
    osc.start(now);
    osc.stop(now + 0.08);
  };

  /* Building entrance / exit chime */
  const playDoor = (entering = true) => {
    if (!enabled) return;
    const ac = ensureContext();
    if (!ac) return;
    const notes = entering ? [330, 440, 659] : [523, 392, 293];
    notes.forEach((f, idx) => {
      const t = ac.currentTime + idx * 0.055;
      const osc = ac.createOscillator();
      const g = ac.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, t);
      g.gain.setValueAtTime(0.035, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
      osc.connect(g);
      g.connect(ac.destination);
      osc.start(t);
      osc.stop(t + 0.17);
    });
  };

  return {
    toggle,
    setEnabled,
    isEnabled,
    hadSessionPref,
    playStep,
    playUI,
    playDoor
  };
})();
