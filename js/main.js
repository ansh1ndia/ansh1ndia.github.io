/* ─── js/main.js — Game Loop, Integrated HUD, Inputs & Settings ─── */
(() => {
  const canvas      = document.getElementById('cityCanvas');
  const ctx         = canvas.getContext('2d');
  const miniCanvas  = document.getElementById('minimapCanvas');
  const miniCtx     = miniCanvas.getContext('2d');

  const hudContext  = document.getElementById('hudContext');
  const ctxToggle   = document.getElementById('ctxToggle');
  const zoneTitle   = document.getElementById('hudZoneTitle');
  const contextMsg  = document.getElementById('hudContextMsg');
  const contextHint = document.getElementById('hudContextHint');
  const miniPanel   = document.getElementById('minimapPanel');
  const miniToggle  = document.getElementById('minimapToggle');

  const soundBtn    = document.getElementById('btnSound');
  const settingsBtn = document.getElementById('btnSettings');
  const fullBtn     = document.getElementById('btnFullscreen');
  const projBtn     = document.getElementById('navProjects');
  const projMenu    = document.getElementById('projectsDropdown');
  const settingsEl  = document.getElementById('settingsPanel');
  const interactBtn = document.getElementById('cityInteract');

  const W      = window.AnshWorld;
  const P      = window.AnshPlayer;
  const R      = window.AnshRenderer;
  const S      = window.AnshScenes;
  const Audio  = window.AnshAudio;

  if (typeof lucide !== 'undefined') lucide.createIcons();

  const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const settings = {
    rain: prefersReduced ? 'off' : 'normal',
    bloom: true,
    reducedMotion: prefersReduced
  };

  const inputKeys = { up: false, down: false, left: false, right: false };
  let activeObj = null;
  let minimapOpen = true;
  let settingsOpen = false;
  let projMenuOpen = false;

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

  updateViewportResolution();
  window.addEventListener('resize', updateViewportResolution);

  if (hudContext && isTouchOrNarrow()) {
    hudContext.classList.add('is-collapsed');
  }
  if (ctxToggle && hudContext) {
    ctxToggle.addEventListener('click', e => {
      e.stopPropagation();
      Audio.playUI(520);
      hudContext.classList.toggle('is-collapsed');
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
    Audio.playUI(Audio.isEnabled() ? 660 : 380);
    syncSoundUI();
  });

  /* Resume sound on first user gesture ONLY if user had enabled it earlier in this browser session */
  if (Audio.hadSessionPref()) {
    const resumeOnce = () => {
      Audio.setEnabled(true);
      syncSoundUI();
      window.removeEventListener('pointerdown', resumeOnce);
      window.removeEventListener('keydown', resumeOnce);
    };
    window.addEventListener('pointerdown', resumeOnce, { once: true });
    window.addEventListener('keydown', resumeOnce, { once: true });
  }

  /* ── Top Navigation Actions ── */
  const closeMenus = () => {
    projMenuOpen = false;
    projMenu.classList.remove('open');
    projBtn.setAttribute('aria-expanded', 'false');
    settingsOpen = false;
    settingsEl.classList.remove('open');
    settingsBtn.setAttribute('aria-expanded', 'false');
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
    projMenuOpen = !projMenuOpen;
    projMenu.classList.toggle('open', projMenuOpen);
    projBtn.setAttribute('aria-expanded', String(projMenuOpen));
    settingsOpen = false;
    settingsEl.classList.remove('open');
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

  /* ── Settings Panel ── */
  settingsBtn.addEventListener('click', e => {
    e.stopPropagation();
    Audio.playUI(520);
    settingsOpen = !settingsOpen;
    settingsEl.classList.toggle('open', settingsOpen);
    settingsBtn.setAttribute('aria-expanded', String(settingsOpen));
    projMenuOpen = false;
    projMenu.classList.remove('open');
  });

  document.getElementById('closeSettings').addEventListener('click', () => {
    Audio.playUI(440);
    settingsOpen = false;
    settingsEl.classList.remove('open');
  });

  document.querySelectorAll('[data-set-rain]').forEach(btn => {
    btn.addEventListener('click', () => {
      Audio.playUI(580);
      settings.rain = btn.dataset.setRain;
      document.querySelectorAll('[data-set-rain]').forEach(b => b.classList.toggle('active', b === btn));
    });
  });

  const bloomToggle = document.getElementById('optBloom');
  bloomToggle.checked = settings.bloom;
  bloomToggle.addEventListener('change', () => {
    Audio.playUI(560);
    settings.bloom = bloomToggle.checked;
  });

  const motionToggle = document.getElementById('optReducedMotion');
  motionToggle.checked = settings.reducedMotion;
  motionToggle.addEventListener('change', () => {
    Audio.playUI(560);
    settings.reducedMotion = motionToggle.checked;
  });

  document.addEventListener('click', e => {
    if (!e.target.closest('.hud-dropdown-wrap') && !e.target.closest('#settingsPanel') && !e.target.closest('#btnSettings')) {
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

  /* ── Touch D-Pad & Action Button ── */
  interactBtn.addEventListener('click', () => {
    if (S.isDialogOpen()) S.closeDialog();
    else if (activeObj) S.handleInteractable(activeObj);
  });

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

  /* ── Keyboard Controls (Safe around Inputs & Accessibility) ── */
  const onKeyDown = e => {
    const tag = document.activeElement?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
      if (e.key === 'Escape' && S.isSceneOpen()) S.closeScene();
      return;
    }

    if (e.key === 'Escape') {
      if (settingsOpen || projMenuOpen) { closeMenus(); return; }
      if (S.isSceneOpen()) { S.closeScene(); return; }
      if (S.isDialogOpen()) { S.closeDialog(); return; }
    }

    if (e.key === 'm' || e.key === 'M') {
      if (!S.isSceneOpen()) {
        e.preventDefault();
        toggleMinimap();
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
    if (e.key === 'w' || e.key === 'W' || e.key === 'ArrowUp')    inputKeys.up = false;
    if (e.key === 's' || e.key === 'S' || e.key === 'ArrowDown')  inputKeys.down = false;
    if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft')  inputKeys.left = false;
    if (e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') inputKeys.right = false;
  };

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', () => {
    inputKeys.up = inputKeys.down = inputKeys.left = inputKeys.right = false;
  });

  /* ── Contextual HUD Panel Updater ── */
  let lastZone = '';
  let lastObjId = '';
  const updateHUDContext = () => {
    const zone = activeObj ? activeObj.zone : W.getZoneName(P.state.x, P.state.y);
    const objId = activeObj ? activeObj.id : '';

    if (zone !== lastZone) {
      lastZone = zone;
      zoneTitle.textContent = zone;
    }

    if (objId !== lastObjId) {
      lastObjId = objId;
      if (activeObj) {
        contextMsg.textContent = `Nearby: ${activeObj.label} — press [E] to ${activeObj.prompt.toLowerCase()}.`;
        contextHint.textContent = `[E] ${activeObj.prompt.toLowerCase()}   [WASD] move   [M] map`;
        interactBtn.disabled = false;
        interactBtn.textContent = `E · ${activeObj.label}`;
      } else {
        contextMsg.textContent = 'a digital town built around my projects. explore, interact and know my work.';
        contextHint.textContent = '[E] interact   [WASD] move   [M] map';
        interactBtn.disabled = true;
        interactBtn.textContent = 'E · Interact';
      }
    }
  };

  /* ── Single Unified 60FPS Render Loop ── */
  let rafId = 0;
  let lastTs = performance.now();
  let elapsed = 0;

  const tick = now => {
    const dt = Math.min(0.05, (now - lastTs) / 1000);
    lastTs = now;
    elapsed += dt;

    const blocked = S.isSceneOpen() || S.isDialogOpen() || settingsOpen;
    activeObj = P.update(dt, inputKeys, blocked, arrivedObj => {
      S.handleInteractable(arrivedObj);
    });

    R.updateCamera(P.state.x, P.state.y, canvas.width, canvas.height);
    R.renderWorld(ctx, dt, elapsed, P, activeObj, settings);

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
