/* ─── js/audio.js — Procedural Cyberpunk Web Audio Engine (Muted by Default) ─── */
window.AnshAudio = (() => {
  const SESSION_KEY = 'ansh_town_sound_pref';
  let ctx = null;
  let masterGain = null;
  let rainGain = null;
  let rainSource = null;
  let padGain = null;
  let padOscs = [];
  let enabled = false; // Strictly muted by default until user opts in
  let rainLevel = 'normal';
  let padEnabled = true;
  let musicDucked = false;

  const savedPref = sessionStorage.getItem(SESSION_KEY) === 'on';

  const targetRainGain = () => {
    if (!enabled || rainLevel === 'off') return 0.0001;
    const base = rainLevel === 'light' ? 0.025 : 0.055;
    return musicDucked ? base * 0.16 : base;
  };

  const targetPadGain = () => {
    if (!enabled || !padEnabled) return 0.0001;
    return musicDucked ? 0.003 : 0.014;
  };

  const ensureContext = () => {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      masterGain = ctx.createGain();
      masterGain.gain.value = 1;
      masterGain.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    return ctx;
  };

  const startRain = () => {
    const ac = ensureContext();
    if (!ac || rainSource) return;

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
    rainGain.gain.exponentialRampToValueAtTime(targetRainGain(), ac.currentTime + 0.75);

    rainSource.connect(bandpass);
    bandpass.connect(lowpass);
    lowpass.connect(rainGain);
    rainGain.connect(masterGain || ac.destination);
    rainSource.start();
  };

  const startPad = () => {
    const ac = ensureContext();
    if (!ac || padOscs.length || !padEnabled) return;

    padGain = ac.createGain();
    padGain.gain.setValueAtTime(0.0001, ac.currentTime);
    padGain.gain.exponentialRampToValueAtTime(targetPadGain(), ac.currentTime + 1.4);

    const filter = ac.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 460;
    filter.connect(padGain);
    padGain.connect(masterGain || ac.destination);

    // Warm midnight cyberpunk Em9 chord bed (very subtle atmospheric wash)
    const freqs = [82.41, 123.47, 196.0, 293.66];
    freqs.forEach((f, idx) => {
      const osc = ac.createOscillator();
      osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(f, ac.currentTime);
      osc.detune.value = (idx - 1.5) * 4;
      osc.connect(filter);
      osc.start();
      padOscs.push(osc);
    });
  };

  const stopBeds = () => {
    if (!ctx) return;
    if (rainGain && rainSource) {
      const src = rainSource;
      const g = rainGain;
      rainSource = null;
      rainGain = null;
      try {
        g.gain.setValueAtTime(Math.max(0.0001, g.gain.value), ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);
        setTimeout(() => { try { src.stop(); } catch (_) {} }, 380);
      } catch (_) {}
    }
    if (padGain && padOscs.length) {
      const oscs = padOscs.slice();
      const g = padGain;
      padOscs = [];
      padGain = null;
      try {
        g.gain.setValueAtTime(Math.max(0.0001, g.gain.value), ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.45);
        setTimeout(() => oscs.forEach(o => { try { o.stop(); } catch (_) {} }), 480);
      } catch (_) {}
    }
  };

  const syncBedsGain = () => {
    if (!ctx || !enabled) return;
    const t = ctx.currentTime;
    if (rainGain) {
      rainGain.gain.setTargetAtTime(targetRainGain(), t, 0.25);
    }
    if (padGain) {
      padGain.gain.setTargetAtTime(targetPadGain(), t, 0.3);
    }
  };

  const setEnabled = val => {
    enabled = Boolean(val);
    sessionStorage.setItem(SESSION_KEY, enabled ? 'on' : 'off');
    if (enabled) {
      startRain();
      startPad();
      syncBedsGain();
    } else {
      stopBeds();
    }
    return enabled;
  };

  const setRainLevel = level => {
    rainLevel = level || 'normal';
    syncBedsGain();
  };

  const setAmbienceEnabled = val => {
    padEnabled = Boolean(val);
    if (enabled) {
      if (padEnabled && !padOscs.length) startPad();
      syncBedsGain();
    }
  };

  const setMusicDucking = ducked => {
    musicDucked = Boolean(ducked);
    syncBedsGain();
  };

  const setMasterVolume = val => {
    const v = Math.max(0, Math.min(1, Number(val)));
    if (masterGain && ctx) {
      masterGain.gain.setTargetAtTime(v, ctx.currentTime, 0.05);
    }
  };

  const toggle = () => setEnabled(!enabled);
  const isEnabled = () => enabled;
  const hadSessionPref = () => savedPref;

  /* Subtle wet footstep tap */
  const playStep = (onWater = false, sprinting = false) => {
    if (!enabled) return;
    const ac = ensureContext();
    if (!ac) return;
    const now = ac.currentTime;
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime((onWater ? 270 : 145) * (sprinting ? 1.15 : 1), now);
    osc.frequency.exponentialRampToValueAtTime(62, now + 0.055);
    g.gain.setValueAtTime(sprinting ? 0.036 : 0.026, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);
    osc.connect(g);
    g.connect(masterGain || ac.destination);
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
    g.gain.setValueAtTime(0.03, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.075);
    osc.connect(g);
    g.connect(masterGain || ac.destination);
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
      g.gain.setValueAtTime(0.034, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
      osc.connect(g);
      g.connect(masterGain || ac.destination);
      osc.start(t);
      osc.stop(t + 0.17);
    });
  };

  /* Cyber vending machine dispense jingle */
  const playVend = () => {
    if (!enabled) return;
    const ac = ensureContext();
    if (!ac) return;
    [587.33, 880, 1174.66].forEach((f, idx) => {
      const t = ac.currentTime + idx * 0.065;
      const osc = ac.createOscillator();
      const g = ac.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(f, t);
      g.gain.setValueAtTime(0.018, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
      osc.connect(g);
      g.connect(masterGain || ac.destination);
      osc.start(t);
      osc.stop(t + 0.13);
    });
  };

  /* Landmark Discovery Passport stamp arpeggio */
  const playUnlock = () => {
    if (!enabled) return;
    const ac = ensureContext();
    if (!ac) return;
    [392, 493.88, 587.33, 783.99].forEach((f, idx) => {
      const t = ac.currentTime + idx * 0.07;
      const osc = ac.createOscillator();
      const g = ac.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, t);
      g.gain.setValueAtTime(0.032, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.24);
      osc.connect(g);
      g.connect(masterGain || ac.destination);
      osc.start(t);
      osc.stop(t + 0.26);
    });
  };

  /* Arcus Rest Timer completion alert */
  const playTimerDone = () => {
    if (!enabled) return;
    const ac = ensureContext();
    if (!ac) return;
    [660, 660, 880].forEach((f, idx) => {
      const t = ac.currentTime + idx * 0.14;
      const osc = ac.createOscillator();
      const g = ac.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, t);
      g.gain.setValueAtTime(0.045, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.11);
      osc.connect(g);
      g.connect(masterGain || ac.destination);
      osc.start(t);
      osc.stop(t + 0.12);
    });
  };

  /* Distant low thunder roll paired with lightning */
  const playThunder = () => {
    if (!enabled || rainLevel === 'off') return;
    const ac = ensureContext();
    if (!ac) return;
    const now = ac.currentTime;
    const bufSize = Math.floor(ac.sampleRate * 1.6);
    const buffer = ac.createBuffer(1, bufSize, ac.sampleRate);
    const data = buffer.getChannelData(0);
    let b = 0;
    for (let i = 0; i < bufSize; i++) {
      b = (b + 0.02 * (Math.random() * 2 - 1)) / 1.02;
      data[i] = b * 3.5;
    }
    const src = ac.createBufferSource();
    src.buffer = buffer;
    const lp = ac.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(160, now);
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(musicDucked ? 0.03 : 0.09, now + 0.18);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 1.55);
    src.connect(lp);
    lp.connect(g);
    g.connect(masterGain || ac.destination);
    src.start(now);
  };

  return {
    toggle,
    setEnabled,
    isEnabled,
    hadSessionPref,
    setRainLevel,
    setAmbienceEnabled,
    setMusicDucking,
    setMasterVolume,
    playStep,
    playUI,
    playDoor,
    playVend,
    playUnlock,
    playTimerDone,
    playThunder
  };
})();
