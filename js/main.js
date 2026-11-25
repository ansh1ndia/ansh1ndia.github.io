/* ─── js/main.js — Unified 2D/3D Game Loop, Integrated HUD, Passport, Audio & Inputs ─── */
(() => {
  const gameRoot    = document.getElementById('gameRoot');
  const canvas      = document.getElementById('cityCanvas');
  const ctx         = canvas.getContext('2d');
  const miniCanvas  = document.getElementById('minimapCanvas');
  const miniCtx     = miniCanvas.getContext('2d');

  const world3dMount = document.getElementById('world3dMount');
  const world3dChip  = document.getElementById('world3dHudChip');
  const world3dPrompt = document.getElementById('world3dPrompt');
  const btn3dCam     = document.getElementById('btn3dCam');
  const camModeLabel = document.getElementById('camModeLabel');

  const hudContext  = document.getElementById('hudContext');
  const ctxToggle   = document.getElementById('ctxToggle');
  const zoneTitle   = document.getElementById('hudZoneTitle');
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

  const zoneBanner  = document.getElementById('zoneBanner');
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

  /* Reactive prefers-reduced-motion media query listener */
  const motionMQ = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  const settings = {
    rain: motionMQ?.matches ? 'off' : 'normal',
    bloom: true,
    lightning: true,
    ambience: true,
    reducedMotion: Boolean(motionMQ?.matches)
  };
  S.setReducedMotion(settings.reducedMotion);

  const inputKeys = { up: false, down: false, left: false, right: false, shift: false };
  let touchSprint = false;
  let activeObj = null;
  let minimapOpen = true;
  let settingsOpen = false;
  let projMenuOpen = false;
  let passportOpen = false;
  let is3DMode = false;
  let stampTimer = null;
  let bannerTimer = null;

  /* ── Responsive Zoomed Viewport + Collapsible [i] Info on Phones ── */
  const isTouchOrNarrow = () => window.innerWidth <= 900 || (window.matchMedia && window.matchMedia('(hover: none)').matches);

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

  const syncDimLabel = () => {
    const lbl = dimBtn.querySelector('.hud-btn-lbl');
    if (!lbl) return;
    if (isTouchOrNarrow()) lbl.textContent = is3DMode ? '2D' : '3D';
    else lbl.textContent = is3DMode ? '2D Pixel' : '3D View';
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

  if (hudContext && isTouchOrNarrow()) {
    hudContext.classList.add('is-collapsed');
  }
  if (ctxToggle && hudContext) {
    ctxToggle.addEventListener('click', e => {
      e.stopPropagation();
      Audio.playUI(520);
      userToggledCtx = true;
      hudContext.classList.toggle('is-collapsed');
    });
  }

  /* ── Explorer Passport Rendering ── */
  const PASSPORT_META = {
    glyphlens:      { name: 'GlyphLens Lab',    dir: 'NW across bridge' },
    arcus:          { name: 'Arcus Studio',     dir: 'NE across bridge' },
    about:          { name: 'Intro Board ANSH.',dir: 'Central Plaza West' },
    contact:        { name: 'Mail Terminal',    dir: 'Central Plaza East' },
    shrine_stone:   { name: 'Sakura Shrine',    dir: 'Far North Promenade' },
    npc_guide:      { name: 'Guide Ren',        dir: 'Central Plaza' },
    rewatch_films:  { name: 'Rewatch · Films',  dir: 'Plaza NW Corner' },
    rewatch_series: { name: 'Rewatch · Series', dir: 'Plaza NE Corner' },
    rewatch_albums: { name: 'Rewatch · Albums', dir: 'Plaza SW Corner' },
    rewatch_songs:  { name: 'Rewatch · Songs',  dir: 'Plaza SE Corner' }
  };

  const renderPassport = () => {
    const disc = S.getDiscoveredIds();
    const total = DATA.passportIds.length;
    const count = disc.size;
    passBadge.textContent = `${count}/${total}`;
    passCountTx.textContent = `${count} / ${total} Landmarks Discovered`;
    passFill.style.width = `${Math.round((count / total) * 100)}%`;
    passList.innerHTML = DATA.passportIds.map(id => {
      const m = PASSPORT_META[id] || { name: id, dir: 'Ansh Town' };
      const done = disc.has(id);
      return `
        <li class="pass-item ${done ? 'done' : ''}">
          <span class="pass-chk" aria-hidden="true">${done ? '✓' : '○'}</span>
          <div>
            <strong>${m.name}</strong>
            <small>${m.dir}</small>
          </div>
        </li>`;
    }).join('');
  };

  renderPassport();
  S.onPassportUpdate((id, count, total) => {
    renderPassport();
    const m = PASSPORT_META[id];
    if (stampToast && stampToastTx) {
      stampToastTx.textContent = count === total
        ? `ALL ${total}/${total} LANDMARKS DISCOVERED!`
        : `Passport Stamp: ${m?.name || id} (${count}/${total})`;
      stampToast.classList.add('show');
      clearTimeout(stampTimer);
      stampTimer = setTimeout(() => stampToast.classList.remove('show'), 3400);
    }
  });

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
      window.Ansh3D?.syncSettings?.(settings);
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

  /* ── Sound UI Sync (Starts Muted) ── */
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
    passBtn.setAttribute('aria-expanded', 'false');
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

  passBtn.addEventListener('click', e => {
    e.stopPropagation();
    Audio.playUI(540);
    const next = !passportOpen;
    closeMenus();
    passportOpen = next;
    passDrawer.classList.toggle('open', passportOpen);
    passBtn.setAttribute('aria-expanded', String(passportOpen));
  });
  document.getElementById('closePassport').addEventListener('click', () => {
    Audio.playUI(440);
    closeMenus();
  });

  /* ── Settings Panel ── */
  settingsBtn.addEventListener('click', e => {
    e.stopPropagation();
    Audio.playUI(520);
    const next = !settingsOpen;
    closeMenus();
    settingsOpen = next;
    settingsEl.classList.toggle('open', settingsOpen);
    settingsBtn.setAttribute('aria-expanded', String(settingsOpen));
  });

  document.getElementById('closeSettings').addEventListener('click', () => {
    Audio.playUI(440);
    closeMenus();
  });

  document.querySelectorAll('[data-set-rain]').forEach(btn => {
    btn.addEventListener('click', () => {
      Audio.playUI(580);
      settings.rain = btn.dataset.setRain;
      Audio.setRainLevel?.(settings.rain);
      window.Ansh3D?.syncSettings?.(settings);
      document.querySelectorAll('[data-set-rain]').forEach(b => b.classList.toggle('active', b === btn));
    });
  });

  const bloomToggle = document.getElementById('optBloom');
  bloomToggle.checked = settings.bloom;
  bloomToggle.addEventListener('change', () => {
    Audio.playUI(560);
    settings.bloom = bloomToggle.checked;
    window.Ansh3D?.syncSettings?.(settings);
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
    window.Ansh3D?.syncSettings?.(settings);
  };
  motionToggle.addEventListener('change', () => {
    Audio.playUI(560);
    applyReducedMotion(motionToggle.checked);
  });
  motionMQ?.addEventListener('change', e => applyReducedMotion(e.matches));

  document.addEventListener('click', e => {
    if (!e.target.closest('.hud-dropdown-wrap') && !e.target.closest('#settingsPanel') && !e.target.closest('#btnSettings') && !e.target.closest('#passportDrawer') && !e.target.closest('#btnPassport')) {
      closeMenus();
    }
  });

  /* ── Fullscreen Toggle ── */
  const syncFullscreenUI = () => {
    const isFs = Boolean(document.fullscreenElement);
    fullBtn.classList.toggle('is-active', isFs);
    fullBtn.querySelector('.hud-btn-lbl').textContent = isFs ? 'Exit FS' : 'Fullscreen';
  };
  fullBtn.addEventListener('click', () => {
    Audio.playUI(580);
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  });
  document.addEventListener('fullscreenchange', syncFullscreenUI);

  /* ── Minimap Toggle ── */
  const toggleMinimap = () => {
    minimapOpen = !minimapOpen;
    miniPanel.classList.toggle('collapsed', !minimapOpen);
    miniToggle.textContent = minimapOpen ? '[M]' : '[M] Map';
    Audio.playUI(500);
  };
  miniToggle.addEventListener('click', toggleMinimap);

  /* ── World Canvas Click (Focus / Dismiss Dialog — movement is controls-only) ── */
  canvas.addEventListener('click', () => {
    canvas.focus({ preventScroll: true });
    if (S.isDialogOpen()) S.closeDialog();
  });

  /* ── Touch D-Pad, Sprint & Action Button ── */
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
    const tag = document.activeElement?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
      if (e.key === 'Escape' && S.isSceneOpen()) S.closeScene();
      return;
    }

    if (e.key === 'Shift') inputKeys.shift = true;

    if (e.key === 'Escape') {
      if (settingsOpen || projMenuOpen || passportOpen) { closeMenus(); return; }
      if (S.isSceneOpen()) { S.closeScene(); return; }
      if (S.isDialogOpen()) { S.closeDialog(); return; }
    }

    if (e.key === 'm' || e.key === 'M') {
      if (!S.isSceneOpen()) { e.preventDefault(); toggleMinimap(); }
      return;
    }

    if (e.key === 'v' || e.key === 'V') {
      if (!S.isSceneOpen() && !S.isDialogOpen()) { e.preventDefault(); setDimension(!is3DMode); }
      return;
    }

    if (e.key === 'p' || e.key === 'P') {
      if (!S.isSceneOpen()) {
        e.preventDefault();
        Audio.playUI(540);
        const next = !passportOpen;
        closeMenus();
        passportOpen = next;
        passDrawer.classList.toggle('open', passportOpen);
        passBtn.setAttribute('aria-expanded', String(passportOpen));
      }
      return;
    }

    if (S.isSceneOpen()) return;

    if (S.isDialogOpen()) {
      if (e.key === 'e' || e.key === 'E' || e.key === 'Enter' || e.code === 'Space') {
        e.preventDefault();
        S.closeDialog();
      }
      return;
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

  /* ── Contextual HUD Panel & District Banner Updater ── */
  let lastZone = '';
  let lastDistrict = '';
  let lastObjId = '';

  const showDistrictBanner = district => {
    if (!zoneBanner || !zoneBannerTitle) return;
    zoneBannerTitle.textContent = district.toUpperCase();
    zoneBanner.classList.add('show');
    clearTimeout(bannerTimer);
    bannerTimer = setTimeout(() => zoneBanner.classList.remove('show'), 2300);
  };

  const updateHUDContext = () => {
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
        contextHint.textContent = `[E] ${activeObj.prompt.toLowerCase()}   [SHIFT] sprint   [V] 3D`;
        interactBtn.disabled = false;
        interactBtn.textContent = `E · ${activeObj.label}`;
        if (world3dPrompt) world3dPrompt.textContent = `[E] ${activeObj.prompt}`;
      } else {
        contextMsg.textContent = 'a digital town built around my projects. explore, interact and know my work.';
        contextHint.textContent = '[E] interact   [WASD] move   [SHIFT] sprint   [V] 3D';
        interactBtn.disabled = true;
        interactBtn.textContent = 'E · Interact';
        if (world3dPrompt) world3dPrompt.textContent = 'Drag to orbit · Scroll to zoom';
      }
    }
  };

  /* ── Single Unified 60FPS Render Loop ── */
  let rafId = 0;
  let lastTs = performance.now();
  let elapsed = 0;
  const combinedKeys = { up: false, down: false, left: false, right: false, shift: false };

  const tick = now => {
    const dt = Math.min(0.05, (now - lastTs) / 1000);
    lastTs = now;
    elapsed += dt;

    combinedKeys.up = inputKeys.up;
    combinedKeys.down = inputKeys.down;
    combinedKeys.left = inputKeys.left;
    combinedKeys.right = inputKeys.right;
    combinedKeys.shift = inputKeys.shift || touchSprint;

    const blocked = S.isSceneOpen() || S.isDialogOpen() || settingsOpen || passportOpen;
    activeObj = P.update(dt, combinedKeys, blocked);

    if (!is3DMode) {
      R.updateCamera(P.state.x, P.state.y, canvas.width, canvas.height);
      R.renderWorld(ctx, dt, elapsed, P, activeObj, settings);
    }

    if (minimapOpen) {
      R.renderMinimap(miniCtx, miniCanvas, P.state, elapsed);
    }

    updateHUDContext();
    rafId = requestAnimationFrame(tick);
  };

  /* Initialize camera immediately at player spawn */
  R.camera.x = Math.max(0, Math.min(W.WIDTH - canvas.width, P.state.x - canvas.width / 2));
  R.camera.y = Math.max(0, Math.min(W.HEIGHT - canvas.height, P.state.y - canvas.height / 2));
  rafId = requestAnimationFrame(tick);

  window.addEventListener('beforeunload', () => {
    cancelAnimationFrame(rafId);
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
  });
})();
