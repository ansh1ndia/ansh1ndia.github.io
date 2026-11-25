/* ─── js/main.js — Adaptive 60fps Unified Loop, HUD, Command Palette, Snap & Settings ─── */
(() => {
  const gameRoot    = document.getElementById('gameRoot');
  const canvas      = document.getElementById('cityCanvas');
  const ctx         = canvas.getContext('2d');
  const miniCanvas  = document.getElementById('minimapCanvas');
  const miniCtx     = miniCanvas.getContext('2d');

  const world3dMount  = document.getElementById('world3dMount');
  const world3dChip   = document.getElementById('world3dHudChip');
  const world3dPrompt = document.getElementById('world3dPrompt');
  const btn3dCam      = document.getElementById('btn3dCam');
  const camModeLabel  = document.getElementById('camModeLabel');

  const hudContext  = document.getElementById('hudContext');
  const ctxToggle   = document.getElementById('ctxToggle');
  const zoneTitle   = document.getElementById('hudZoneTitle');
  const hudCoords   = document.getElementById('hudCoords');
  const contextMsg  = document.getElementById('hudContextMsg');
  const contextHint = document.getElementById('hudContextHint');
  const miniPanel   = document.getElementById('minimapPanel');
  const miniToggle  = document.getElementById('minimapToggle');

  const dimBtn      = document.getElementById('btnDimension');
  const passBtn     = document.getElementById('btnPassport');
  const passDrawer  = document.getElementById('passportDrawer');
  const passBadge   = document.getElementById('passportBadge');
  const passCountTx = document.getElementById('passportCountText');
  const passFill    = document.getElementById('passportFill');
  const passList    = document.getElementById('passportList');
  const stampToast  = document.getElementById('stampToast');
  const stampToastTx = document.getElementById('stampToastText');

  const snapBtn     = document.getElementById('btnSnap');
  const snapFlash   = document.getElementById('snapFlash');

  const cmdBackdrop = document.getElementById('cmdBackdrop');
  const cmdInput    = document.getElementById('cmdInput');
  const cmdList     = document.getElementById('cmdList');
  const cmdClose    = document.getElementById('cmdClose');

  const zoneBanner      = document.getElementById('zoneBanner');
  const zoneBannerTitle = document.getElementById('zoneBannerTitle');

  const soundBtn    = document.getElementById('btnSound');
  const settingsBtn = document.getElementById('btnSettings');
  const fullBtn     = document.getElementById('btnFullscreen');
  const projBtn     = document.getElementById('navProjects');
  const projMenu    = document.getElementById('projectsDropdown');
  const settingsEl  = document.getElementById('settingsPanel');
  const interactBtn = document.getElementById('cityInteract');
  const sprintBtn   = document.getElementById('touchSprintBtn');

  const W      = window.AnshWorld;
  const P      = window.AnshPlayer;
  const R      = window.AnshRenderer;
  const S      = window.AnshScenes;
  const Audio  = window.AnshAudio;
  const DATA   = window.ANSH_DATA;

  if (typeof lucide !== 'undefined') lucide.createIcons();

  /* Hardware + Battery-Friendly Quality Auto-Detection */
  const motionMQ = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  const hardwareLow = (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) ||
    (navigator.deviceMemory && navigator.deviceMemory <= 4);

  const settings = {
    quality: 'auto', // 'auto' | 'high' | 'eco'
    effectiveEco: Boolean(hardwareLow),
    mood: 'midnight',
    rain: motionMQ?.matches ? 'off' : 'normal',
    bloom: true,
    lightning: true,
    ambience: true,
    reducedMotion: Boolean(motionMQ?.matches)
  };
  S.setReducedMotion(settings.reducedMotion);
  S.setEcoMode(settings.effectiveEco);

  const inputKeys = { up: false, down: false, left: false, right: false, shift: false };
  let touchSprint = false;
  let activeObj = null;
  let minimapOpen = true;
  let settingsOpen = false;
  let projMenuOpen = false;
  let passportOpen = false;
  let cmdOpen = false;
  let cmdIdx = 0;
  let is3DMode = false;
  let stampTimer = null;
  let bannerTimer = null;
  let autoEcoLatched = Boolean(hardwareLow);

  const isTouchOrNarrow = () => window.innerWidth <= 900 || (window.matchMedia && window.matchMedia('(hover: none)').matches);

  const syncEffectiveEco = () => {
    settings.effectiveEco = settings.quality === 'eco' || (settings.quality === 'auto' && autoEcoLatched);
    S.setEcoMode(settings.effectiveEco);
    window.Ansh3D?.syncSettings?.({ ...settings, onAutoEco: triggerAutoEco });
  };

  function triggerAutoEco() {
    if (settings.quality !== 'auto' || autoEcoLatched) return;
    autoEcoLatched = true;
    syncEffectiveEco();
  }

  const syncDimLabel = () => {
    const lbl = dimBtn.querySelector('.hud-btn-lbl');
    if (!lbl) return;
    lbl.textContent = is3DMode ? '2D' : '3D';
  };

  const updateViewportResolution = () => {
    const ww = Math.max(320, window.innerWidth);
    const wh = Math.max(240, window.innerHeight);
    if (isTouchOrNarrow()) {
      const aspect = ww / wh;
      let vw, vh;
      if (aspect < 1) {
        vw = 300;
        vh = Math.min(W.HEIGHT, Math.round(vw / aspect));
      } else {
        vh = 280;
        vw = Math.min(W.WIDTH, Math.round(vh * aspect));
      }
      canvas.width = vw;
      canvas.height = vh;
    } else {
      canvas.width = 896;
      canvas.height = 504;
    }
    R.camera.w = canvas.width;
    R.camera.h = canvas.height;
  };

  let userToggledCtx = false;
  updateViewportResolution();
  syncDimLabel();
  window.addEventListener('resize', () => {
    updateViewportResolution();
    syncDimLabel();
    if (hudContext && !userToggledCtx) {
      hudContext.classList.toggle('is-collapsed', isTouchOrNarrow());
    }
  });

  if (hudContext && isTouchOrNarrow()) hudContext.classList.add('is-collapsed');
  if (ctxToggle && hudContext) {
    ctxToggle.addEventListener('click', e => {
      e.stopPropagation();
      Audio.playUI(520);
      userToggledCtx = true;
      hudContext.classList.toggle('is-collapsed');
    });
  }

  /* ── Explorer Passport ── */
  const PASSPORT_META = {
    glyphlens:      { name: 'GlyphLens Lab',     dir: 'NW across bridge' },
    arcus:          { name: 'Arcus Studio',      dir: 'NE across bridge' },
    about:          { name: 'Intro Board ANSH.', dir: 'Central Plaza West' },
    contact:        { name: 'Mail Terminal',     dir: 'Central Plaza East' },
    shrine_stone:   { name: 'Sakura Shrine',     dir: 'Far North Promenade' },
    npc_guide:      { name: 'Guide Ren',         dir: 'Central Plaza' },
    rewatch_films:  { name: 'Rewatch · Films',   dir: 'Plaza NW Corner' },
    rewatch_series: { name: 'Rewatch · Series',  dir: 'Plaza NE Corner' },
    rewatch_albums: { name: 'Rewatch · Albums',  dir: 'Plaza SW Corner' },
    rewatch_songs:  { name: 'Rewatch · Songs',   dir: 'Plaza SE Corner' }
  };

  const showToast = msg => {
    if (!stampToast || !stampToastTx) return;
    stampToastTx.textContent = msg;
    stampToast.classList.add('show');
    clearTimeout(stampTimer);
    stampTimer = setTimeout(() => stampToast.classList.remove('show'), 3000);
  };

  const renderPassport = () => {
    const disc = S.getDiscoveredIds();
    const total = DATA.passportIds.length;
    const count = disc.size;
    if (passBadge) passBadge.textContent = `${count}/${total}`;
    if (passCountTx) passCountTx.textContent = `${count} / ${total} Landmarks Discovered`;
    if (passFill) passFill.style.width = `${Math.round((count / total) * 100)}%`;
    if (passList) {
      passList.innerHTML = DATA.passportIds.map(id => {
        const m = PASSPORT_META[id] || { name: id, dir: 'Ansh Town' };
        const done = disc.has(id);
        return `
          <li class="pass-item ${done ? 'done' : ''}">
            <span class="pass-chk" aria-hidden="true">${done ? '✓' : '○'}</span>
            <div><strong>${m.name}</strong><small>${m.dir}</small></div>
          </li>`;
      }).join('');
    }
  };

  renderPassport();
  S.onPassportUpdate((id, count, total) => {
    renderPassport();
    const m = PASSPORT_META[id];
    showToast(count === total
      ? `ALL ${total}/${total} LANDMARKS DISCOVERED!`
      : `Passport Stamp: ${m?.name || id} (${count}/${total})`);
  });

  /* ── Photo Mode Postcard PNG Snapshot [C] ── */
  const capturePostcard = () => {
    Audio.playUI(720);
    if (snapFlash) {
      snapFlash.classList.remove('active');
      void snapFlash.offsetWidth;
      snapFlash.classList.add('active');
    }

    try {
      const out = document.createElement('canvas');
      let srcDataUrl = null;
      if (is3DMode && window.Ansh3D?.capturePNG) {
        srcDataUrl = window.Ansh3D.capturePNG();
      }
      if (srcDataUrl) {
        const img = new Image();
        img.onload = () => {
          out.width = img.width;
          out.height = img.height;
          const octx = out.getContext('2d');
          octx.drawImage(img, 0, 0);
          octx.fillStyle = 'rgba(5,7,12,0.84)';
          octx.fillRect(18, out.height - 46, 330, 30);
          octx.strokeStyle = 'rgba(239,68,68,0.65)';
          octx.strokeRect(18, out.height - 46, 330, 30);
          octx.fillStyle = '#f1f5f9';
          octx.font = '600 13px "JetBrains Mono", monospace';
          octx.fillText('ANSH TOWN // LUCKNOW · ANSH1NDIA.GITHUB.IO', 28, out.height - 27);
          const a = document.createElement('a');
          a.href = out.toDataURL('image/png');
          a.download = `ansh-town-3d-${Date.now()}.png`;
          a.click();
          showToast('Saved 3D Postcard PNG');
        };
        img.src = srcDataUrl;
      } else {
        out.width = canvas.width;
        out.height = canvas.height;
        const octx = out.getContext('2d');
        octx.imageSmoothingEnabled = false;
        octx.drawImage(canvas, 0, 0);
        octx.fillStyle = 'rgba(5,7,12,0.88)';
        octx.fillRect(10, out.height - 26, 250, 18);
        octx.fillStyle = '#f1f5f9';
        octx.font = '500 9px "JetBrains Mono", monospace';
        octx.fillText('ANSH TOWN // ANSH1NDIA.GITHUB.IO', 16, out.height - 14);
        const a = document.createElement('a');
        a.href = out.toDataURL('image/png');
        a.download = `ansh-town-2d-${Date.now()}.png`;
        a.click();
        showToast('Saved 2D Postcard PNG');
      }
    } catch {
      showToast('Snapshot unavailable in restricted mode');
    }
  };

  /* ── 2D / 3D Dimension Mode Switch ── */
  const setDimension = target3D => {
    const want3D = Boolean(target3D);
    if (want3D === is3DMode) return;
    is3DMode = want3D;
    gameRoot.classList.toggle('is-3d', is3DMode);
    dimBtn.classList.toggle('is-active', is3DMode);
    dimBtn.setAttribute('aria-pressed', String(is3DMode));
    syncDimLabel();
    world3dChip.setAttribute('aria-hidden', String(!is3DMode));
    world3dMount.setAttribute('aria-hidden', String(!is3DMode));

    document.querySelectorAll('[data-set-dim]').forEach(b => {
      b.classList.toggle('active', (b.dataset.setDim === '3d') === is3DMode);
    });

    if (is3DMode) {
      window.Ansh3D?.mount?.(world3dMount);
      window.Ansh3D?.syncSettings?.({ ...settings, onAutoEco: triggerAutoEco });
      window.Ansh3D?.setActive?.(true);
    } else {
      window.Ansh3D?.setActive?.(false);
    }
    Audio.playUI(is3DMode ? 680 : 480);
  };

  dimBtn.addEventListener('click', () => setDimension(!is3DMode));
  document.querySelectorAll('[data-set-dim]').forEach(btn => {
    btn.addEventListener('click', () => setDimension(btn.dataset.setDim === '3d'));
  });
  if (btn3dCam) {
    btn3dCam.addEventListener('click', () => {
      Audio.playUI(560);
      const mode = window.Ansh3D?.toggleCameraMode?.();
      if (mode && camModeLabel) {
        camModeLabel.textContent = mode === 'overview' ? 'Aerial Cam' : 'Chase Cam';
      }
    });
  }

  /* ── Sound UI Sync ── */
  const syncSoundUI = () => {
    const on = Audio.isEnabled();
    soundBtn.classList.toggle('is-active', on);
    soundBtn.setAttribute('aria-pressed', String(on));
    soundBtn.querySelector('.hud-btn-lbl').textContent = on ? 'Rain: ON' : 'Muted';
  };
  syncSoundUI();

  soundBtn.addEventListener('click', () => {
    Audio.toggle();
    Audio.setRainLevel?.(settings.rain);
    Audio.setAmbienceEnabled?.(settings.ambience);
    Audio.playUI(Audio.isEnabled() ? 660 : 380);
    syncSoundUI();
  });

  if (Audio.hadSessionPref()) {
    const resumeOnce = () => {
      Audio.setEnabled(true);
      Audio.setRainLevel?.(settings.rain);
      Audio.setAmbienceEnabled?.(settings.ambience);
      syncSoundUI();
    };
    window.addEventListener('pointerdown', resumeOnce, { once: true });
    window.addEventListener('keydown', resumeOnce, { once: true });
  }

  /* ── Top Navigation & Drawers ── */
  const closeMenus = () => {
    projMenuOpen = false;
    projMenu.classList.remove('open');
    projBtn.setAttribute('aria-expanded', 'false');
    settingsOpen = false;
    settingsEl.classList.remove('open');
    settingsBtn.setAttribute('aria-expanded', 'false');
    passportOpen = false;
    passDrawer.classList.remove('open');
  };

  document.getElementById('navExplore').addEventListener('click', () => {
    Audio.playUI(500);
    closeMenus();
    S.closeScene();
    S.closeDialog();
    canvas.focus({ preventScroll: true });
  });

  document.getElementById('brandHome').addEventListener('click', () => {
    Audio.playUI(500);
    closeMenus();
    S.closeScene();
    S.closeDialog();
  });

  projBtn.addEventListener('click', e => {
    e.stopPropagation();
    Audio.playUI(520);
    const next = !projMenuOpen;
    closeMenus();
    projMenuOpen = next;
    projMenu.classList.toggle('open', projMenuOpen);
    projBtn.setAttribute('aria-expanded', String(projMenuOpen));
  });

  projMenu.querySelectorAll('[data-open-loc]').forEach(item => {
    item.addEventListener('click', () => {
      const id = item.dataset.openLoc;
      closeMenus();
      const target = W.INTERACTABLES.find(i => i.id === id);
      if (target?.spawn) {
        P.state.x = target.spawn.x;
        P.state.y = target.spawn.y;
        P.state.dir = 'up';
      }
      S.openScene(id);
    });
  });

  document.getElementById('navAbout').addEventListener('click', () => {
    closeMenus();
    const target = W.INTERACTABLES.find(i => i.id === 'about');
    if (target?.spawn) { P.state.x = target.spawn.x; P.state.y = target.spawn.y; P.state.dir = 'up'; }
    S.openScene('about');
  });

  document.getElementById('navContact').addEventListener('click', () => {
    closeMenus();
    const target = W.INTERACTABLES.find(i => i.id === 'contact');
    if (target?.spawn) { P.state.x = target.spawn.x; P.state.y = target.spawn.y; P.state.dir = 'up'; }
    S.openScene('contact');
  });

  const openPassportDrawer = () => {
    closeMenus();
    passportOpen = true;
    passDrawer.classList.add('open');
  };
  if (passBtn) passBtn.addEventListener('click', e => { e.stopPropagation(); Audio.playUI(540); openPassportDrawer(); });
  document.getElementById('closePassport').addEventListener('click', () => { Audio.playUI(440); closeMenus(); });
  if (snapBtn) snapBtn.addEventListener('click', () => { closeMenus(); capturePostcard(); });

  /* ── Settings Panel Controls ── */
  settingsBtn.addEventListener('click', e => {
    e.stopPropagation();
    Audio.playUI(520);
    const next = !settingsOpen;
    closeMenus();
    settingsOpen = next;
    settingsEl.classList.toggle('open', settingsOpen);
    settingsBtn.setAttribute('aria-expanded', String(settingsOpen));
  });
  document.getElementById('closeSettings').addEventListener('click', () => { Audio.playUI(440); closeMenus(); });

  document.querySelectorAll('[data-set-quality]').forEach(btn => {
    btn.addEventListener('click', () => {
      Audio.playUI(600);
      settings.quality = btn.dataset.setQuality;
      document.querySelectorAll('[data-set-quality]').forEach(b => b.classList.toggle('active', b === btn));
      syncEffectiveEco();
    });
  });

  const setMood = mood => {
    settings.mood = mood || 'midnight';
    document.querySelectorAll('[data-set-mood]').forEach(b => b.classList.toggle('active', b.dataset.setMood === settings.mood));
    window.Ansh3D?.syncSettings?.({ ...settings, onAutoEco: triggerAutoEco });
  };
  document.querySelectorAll('[data-set-mood]').forEach(btn => {
    btn.addEventListener('click', () => { Audio.playUI(600); setMood(btn.dataset.setMood); });
  });

  document.querySelectorAll('[data-set-rain]').forEach(btn => {
    btn.addEventListener('click', () => {
      Audio.playUI(580);
      settings.rain = btn.dataset.setRain;
      Audio.setRainLevel?.(settings.rain);
      window.Ansh3D?.syncSettings?.({ ...settings, onAutoEco: triggerAutoEco });
      document.querySelectorAll('[data-set-rain]').forEach(b => b.classList.toggle('active', b === btn));
    });
  });

  const volInput = document.getElementById('optVolume');
  if (volInput) {
    volInput.addEventListener('input', () => Audio.setMasterVolume?.(Number(volInput.value) / 100));
  }

  const bloomToggle = document.getElementById('optBloom');
  bloomToggle.checked = settings.bloom;
  bloomToggle.addEventListener('change', () => {
    Audio.playUI(560);
    settings.bloom = bloomToggle.checked;
    window.Ansh3D?.syncSettings?.({ ...settings, onAutoEco: triggerAutoEco });
  });

  const lightningToggle = document.getElementById('optLightning');
  if (lightningToggle) {
    lightningToggle.checked = settings.lightning;
    lightningToggle.addEventListener('change', () => {
      Audio.playUI(560);
      settings.lightning = lightningToggle.checked;
    });
  }

  const ambienceToggle = document.getElementById('optAmbience');
  if (ambienceToggle) {
    ambienceToggle.checked = settings.ambience;
    ambienceToggle.addEventListener('change', () => {
      Audio.playUI(560);
      settings.ambience = ambienceToggle.checked;
      Audio.setAmbienceEnabled?.(settings.ambience);
    });
  }

  const motionToggle = document.getElementById('optReducedMotion');
  motionToggle.checked = settings.reducedMotion;
  const applyReducedMotion = val => {
    settings.reducedMotion = Boolean(val);
    motionToggle.checked = settings.reducedMotion;
    S.setReducedMotion(settings.reducedMotion);
    window.Ansh3D?.syncSettings?.({ ...settings, onAutoEco: triggerAutoEco });
  };
  motionToggle.addEventListener('change', () => { Audio.playUI(560); applyReducedMotion(motionToggle.checked); });
  motionMQ?.addEventListener('change', e => applyReducedMotion(e.matches));

  document.addEventListener('click', e => {
    if (!e.target.closest('.hud-dropdown-wrap') && !e.target.closest('#settingsPanel') && !e.target.closest('#btnSettings') && !e.target.closest('#passportDrawer')) {
      closeMenus();
    }
  });

  /* ── Fullscreen Toggle ── */
  fullBtn.addEventListener('click', () => {
    Audio.playUI(580);
    if (!document.fullscreenElement) document.documentElement.requestFullscreen?.().catch(() => {});
    else document.exitFullscreen?.().catch(() => {});
  });
  document.addEventListener('fullscreenchange', () => {
    const isFs = Boolean(document.fullscreenElement);
    fullBtn.textContent = isFs ? 'Exit FS' : 'Fullscreen';
  });

  /* ── Command Palette (Ctrl+K) ── */
  const COMMANDS = [
    { label: 'Enter GlyphLens Lab',         tag: 'PROJECT · 01', run: () => S.openScene('glyphlens') },
    { label: 'Enter Arcus Studio',          tag: 'PROJECT · 02', run: () => S.openScene('arcus') },
    { label: 'Read Intro Board ANSH.',      tag: 'ABOUT',        run: () => S.openScene('about') },
    { label: 'Open Mail Terminal',          tag: 'CONTACT',      run: () => S.openScene('contact') },
    { label: 'Rewatch · Favourite Films',   tag: 'CURATION',     run: () => S.openScene('rewatch_films') },
    { label: 'Rewatch · Favourite Series',  tag: 'CURATION',     run: () => S.openScene('rewatch_series') },
    { label: 'Rewatch · Favourite Albums',  tag: 'CURATION',     run: () => S.openScene('rewatch_albums') },
    { label: 'Rewatch · Favourite Songs',   tag: 'MUSIC PLAYER', run: () => S.openScene('rewatch_songs') },
    { label: 'Toggle 2D Pixel / 3D WebGL',  tag: 'DIMENSION [V]', run: () => setDimension(!is3DMode) },
    { label: 'Open Explorer Passport',      tag: 'PASSPORT [P]', run: () => openPassportDrawer() },
    { label: 'Switch Quality: Eco 60fps',   tag: 'PERFORMANCE',  run: () => { settings.quality = 'eco'; syncEffectiveEco(); } },
    { label: 'Switch Mood: Sakura Mist',    tag: 'ATMOSPHERE',   run: () => setMood('sakura') },
    { label: 'Switch Mood: Crimson Storm',  tag: 'ATMOSPHERE',   run: () => setMood('bloodmoon') },
    { label: 'Switch Mood: Midnight Rain',  tag: 'ATMOSPHERE',   run: () => setMood('midnight') },
    { label: 'Save Town Postcard PNG',      tag: 'SNAPSHOT [C]', run: () => capturePostcard() }
  ];

  const renderCommands = () => {
    const q = (cmdInput?.value || '').trim().toLowerCase();
    const list = COMMANDS.filter(c => !q || c.label.toLowerCase().includes(q) || c.tag.toLowerCase().includes(q));
    cmdIdx = Math.max(0, Math.min(list.length - 1, cmdIdx));
    cmdList.innerHTML = list.map((c, i) => `
      <li role="option" aria-selected="${i === cmdIdx}">
        <button type="button" class="cmd-item ${i === cmdIdx ? 'active' : ''}" data-cmd-idx="${i}">
          <span>${c.label}</span>
          <small>${c.tag}</small>
        </button>
      </li>
    `).join('');
    cmdList.querySelectorAll('[data-cmd-idx]').forEach(btn => {
      btn.addEventListener('click', () => {
        const chosen = list[Number(btn.dataset.cmdIdx)];
        closeCmd();
        chosen?.run();
      });
    });
  };

  const openCmd = () => {
    closeMenus();
    cmdOpen = true;
    cmdIdx = 0;
    if (cmdInput) cmdInput.value = '';
    renderCommands();
    cmdBackdrop.classList.add('open');
    cmdBackdrop.setAttribute('aria-hidden', 'false');
    cmdInput?.focus();
    Audio.playUI(600);
  };

  const closeCmd = () => {
    if (!cmdOpen) return;
    cmdOpen = false;
    cmdBackdrop.classList.remove('open');
    cmdBackdrop.setAttribute('aria-hidden', 'true');
  };

  if (cmdInput) {
    cmdInput.addEventListener('input', () => { cmdIdx = 0; renderCommands(); });
    cmdInput.addEventListener('keydown', e => {
      const q = cmdInput.value.trim().toLowerCase();
      const list = COMMANDS.filter(c => !q || c.label.toLowerCase().includes(q) || c.tag.toLowerCase().includes(q));
      if (e.key === 'ArrowDown') { e.preventDefault(); cmdIdx = (cmdIdx + 1) % Math.max(1, list.length); renderCommands(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); cmdIdx = (cmdIdx - 1 + Math.max(1, list.length)) % Math.max(1, list.length); renderCommands(); }
      else if (e.key === 'Enter' && list[cmdIdx]) { e.preventDefault(); closeCmd(); list[cmdIdx].run(); }
    });
  }
  if (cmdClose) cmdClose.addEventListener('click', closeCmd);
  if (cmdBackdrop) cmdBackdrop.addEventListener('click', e => { if (e.target === cmdBackdrop) closeCmd(); });

  /* ── Minimap Toggle ── */
  const toggleMinimap = () => {
    minimapOpen = !minimapOpen;
    miniPanel.classList.toggle('collapsed', !minimapOpen);
    miniToggle.textContent = minimapOpen ? '[M]' : '[M] Map';
    Audio.playUI(500);
  };
  miniToggle.addEventListener('click', toggleMinimap);

  /* ── Canvas Click (Focus / Dismiss Dialog — controls-only movement) ── */
  canvas.addEventListener('click', () => {
    canvas.focus({ preventScroll: true });
    if (S.isDialogOpen()) S.closeDialog();
  });

  /* ── Touch D-Pad, Sprint & Interact ── */
  interactBtn.addEventListener('click', () => {
    if (S.isDialogOpen()) S.closeDialog();
    else if (activeObj) S.handleInteractable(activeObj);
  });

  if (sprintBtn) {
    sprintBtn.addEventListener('click', () => {
      touchSprint = !touchSprint;
      sprintBtn.classList.toggle('active', touchSprint);
      sprintBtn.setAttribute('aria-pressed', String(touchSprint));
      Audio.playUI(touchSprint ? 640 : 480);
    });
  }

  document.querySelectorAll('.dpad-btn').forEach(btn => {
    const dir = btn.dataset.dir;
    const down = e => { e.preventDefault(); if (dir) inputKeys[dir] = true; };
    const up   = () => { if (dir) inputKeys[dir] = false; };
    btn.addEventListener('mousedown', down);
    btn.addEventListener('touchstart', down, { passive: false });
    window.addEventListener('mouseup', up);
    window.addEventListener('touchend', up);
    window.addEventListener('touchcancel', up);
  });

  /* ── Keyboard Controls ── */
  const onKeyDown = e => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      if (cmdOpen) closeCmd();
      else openCmd();
      return;
    }

    if (e.key === 'Escape') {
      if (cmdOpen) { closeCmd(); return; }
      if (settingsOpen || projMenuOpen || passportOpen) { closeMenus(); return; }
      if (S.isSceneOpen()) { S.closeScene(); return; }
      if (S.isDialogOpen()) { S.closeDialog(); return; }
    }

    const tag = document.activeElement?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

    if (e.key === 'Shift') inputKeys.shift = true;

    if (e.key === 'm' || e.key === 'M') {
      if (!S.isSceneOpen()) { e.preventDefault(); toggleMinimap(); }
      return;
    }

    if (e.key === 'v' || e.key === 'V') {
      if (!S.isSceneOpen() && !S.isDialogOpen()) { e.preventDefault(); setDimension(!is3DMode); }
      return;
    }

    if (e.key === 'c' || e.key === 'C') {
      if (!S.isSceneOpen()) { e.preventDefault(); capturePostcard(); }
      return;
    }

    if (e.key === 'p' || e.key === 'P') {
      if (!S.isSceneOpen()) { e.preventDefault(); Audio.playUI(540); openPassportDrawer(); }
      return;
    }

    if (S.isSceneOpen() || cmdOpen) return;

    if (S.isDialogOpen()) {
      if (e.key === 'e' || e.key === 'E' || e.key === 'Enter' || e.code === 'Space') {
        e.preventDefault();
        S.closeDialog();
        return;
      }
      if (P.state.sitting && ['w','W','a','A','s','S','d','D','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)) {
        S.closeDialog();
      } else {
        return;
      }
    }

    if (e.key === 'w' || e.key === 'W' || e.key === 'ArrowUp')    { e.preventDefault(); inputKeys.up = true; }
    if (e.key === 's' || e.key === 'S' || e.key === 'ArrowDown')  { e.preventDefault(); inputKeys.down = true; }
    if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft')  { e.preventDefault(); inputKeys.left = true; }
    if (e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') { e.preventDefault(); inputKeys.right = true; }

    if ((e.key === 'e' || e.key === 'E' || e.key === 'Enter' || e.code === 'Space') && activeObj) {
      e.preventDefault();
      S.handleInteractable(activeObj);
    }
  };

  const onKeyUp = e => {
    if (e.key === 'Shift') inputKeys.shift = false;
    if (e.key === 'w' || e.key === 'W' || e.key === 'ArrowUp')    inputKeys.up = false;
    if (e.key === 's' || e.key === 'S' || e.key === 'ArrowDown')  inputKeys.down = false;
    if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft')  inputKeys.left = false;
    if (e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') inputKeys.right = false;
  };

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', () => {
    inputKeys.up = inputKeys.down = inputKeys.left = inputKeys.right = inputKeys.shift = false;
  });

  /* ── Contextual HUD Panel, Telemetry Coords & District Banner ── */
  let lastZone = '';
  let lastDistrict = '';
  let lastObjId = '';
  let lastCoordStr = '';

  const showDistrictBanner = district => {
    if (!zoneBanner || !zoneBannerTitle) return;
    zoneBannerTitle.textContent = district.toUpperCase();
    zoneBanner.classList.add('show');
    clearTimeout(bannerTimer);
    bannerTimer = setTimeout(() => zoneBanner.classList.remove('show'), 2200);
  };

  const updateHUDContext = () => {
    const cx = Math.floor(P.state.x / W.T);
    const cy = Math.floor(P.state.y / W.T);
    const coordStr = `(${cx}, ${cy})`;
    if (hudCoords && coordStr !== lastCoordStr) {
      lastCoordStr = coordStr;
      hudCoords.textContent = coordStr;
    }

    const district = W.getZoneName(P.state.x, P.state.y);
    if (lastDistrict && district !== lastDistrict && !S.isSceneOpen()) {
      showDistrictBanner(district);
    }
    lastDistrict = district;

    const zone = activeObj ? activeObj.zone : district;
    const objId = activeObj ? activeObj.id : '';

    if (zone !== lastZone) {
      lastZone = zone;
      zoneTitle.textContent = zone;
    }

    if (objId !== lastObjId) {
      lastObjId = objId;
      window.Ansh3D?.setActiveObj?.(activeObj);
      if (activeObj) {
        contextMsg.textContent = `Nearby: ${activeObj.label} — press [E] to ${activeObj.prompt.toLowerCase()}.`;
        contextHint.textContent = `[E] ${activeObj.prompt.toLowerCase()}   [SHIFT] sprint   [Ctrl+K] menu`;
        interactBtn.disabled = false;
        interactBtn.textContent = `E · ${activeObj.label}`;
        if (world3dPrompt) world3dPrompt.textContent = `[E] ${activeObj.prompt}`;
      } else {
        contextMsg.textContent = 'a digital town built around my projects. explore, interact and know my work.';
        contextHint.textContent = '[E] interact   [WASD] move   [SHIFT] sprint   [Ctrl+K] menu';
        interactBtn.disabled = true;
        interactBtn.textContent = 'E · Interact';
        if (world3dPrompt) world3dPrompt.textContent = 'Drag to orbit · Scroll to zoom';
      }
    }
  };

  /* ── Single Adaptive 60FPS Render Loop (Pauses When Tab Hidden!) ── */
  let rafId = 0;
  let lastTs = performance.now();
  let elapsed = 0;
  let slowFrames = 0;
  let hidden = document.hidden;
  const combinedKeys = { up: false, down: false, left: false, right: false, shift: false };

  const tick = now => {
    if (hidden) return;
    const dt = Math.min(0.05, (now - lastTs) / 1000);
    lastTs = now;
    elapsed += dt;

    /* 2D Adaptive Eco Governor (if frame > 30ms repeatedly in Auto) */
    if (settings.quality === 'auto' && !autoEcoLatched && !is3DMode && !S.isSceneOpen()) {
      if (dt > 0.032) {
        slowFrames++;
        if (slowFrames > 45) triggerAutoEco();
      } else {
        slowFrames = Math.max(0, slowFrames - 1);
      }
    }

    combinedKeys.up = inputKeys.up;
    combinedKeys.down = inputKeys.down;
    combinedKeys.left = inputKeys.left;
    combinedKeys.right = inputKeys.right;
    combinedKeys.shift = inputKeys.shift || touchSprint;

    const blocked = S.isSceneOpen() || S.isDialogOpen() || settingsOpen || passportOpen || cmdOpen;
    activeObj = P.update(dt, combinedKeys, blocked);

    if (!is3DMode && !S.isSceneOpen()) {
      R.updateCamera(P.state.x, P.state.y, canvas.width, canvas.height);
      R.renderWorld(ctx, dt, elapsed, P, activeObj, settings);
      if (minimapOpen) R.renderMinimap(miniCtx, miniCanvas, P.state, elapsed);
    } else if (is3DMode && !S.isSceneOpen() && minimapOpen) {
      R.renderMinimap(miniCtx, miniCanvas, P.state, elapsed);
    }

    updateHUDContext();
    rafId = requestAnimationFrame(tick);
  };

  document.addEventListener('visibilitychange', () => {
    hidden = document.hidden;
    if (!hidden) {
      lastTs = performance.now();
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(tick);
    } else {
      cancelAnimationFrame(rafId);
    }
  });

  R.camera.x = Math.max(0, Math.min(W.WIDTH - canvas.width, P.state.x - canvas.width / 2));
  R.camera.y = Math.max(0, Math.min(W.HEIGHT - canvas.height, P.state.y - canvas.height / 2));
  rafId = requestAnimationFrame(tick);

  window.addEventListener('beforeunload', () => {
    cancelAnimationFrame(rafId);
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
  });
})();
