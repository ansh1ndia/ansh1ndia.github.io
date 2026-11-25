/* ─── js/scenes.js — Elevated In-World Interiors, R3F 3D Showcases, Continuous Audio & Passport ─── */
window.AnshScenes = (() => {
  const DATA = window.ANSH_DATA;
  const curtain    = document.getElementById('sceneCurtain');
  const sceneEl    = document.getElementById('sceneOverlay');
  const sceneBody  = document.getElementById('sceneContent');
  const rpgDialog  = document.getElementById('rpgDialog');
  const rpgSpeaker = document.getElementById('rpgSpeaker');
  const rpgText    = document.getElementById('rpgText');

  const nowPlayingBar = document.getElementById('nowPlayingBar');
  const npTitle       = document.getElementById('npTitle');
  const npMeta        = document.getElementById('npMeta');
  const npPlayBtn     = document.getElementById('npPlayBtn');
  const npNextBtn     = document.getElementById('npNextBtn');
  const npCloseBtn    = document.getElementById('npCloseBtn');

  const PASSPORT_KEY = 'ansh_town_passport_v1';
  const ARCUS_SETS_KEY = 'ansh_arcus_sets_v1';

  let activeSceneId = null;
  let dialogOpen = false;
  let dialogTimer = null;
  let timerInterval = null;
  let clockInterval = null;
  let topAudio = null;
  let currentSongIndex = -1;
  let reducedMotion = false;
  let passportCallback = null;

  /* ── Explorer Passport State ── */
  const loadPassport = () => {
    try {
      const parsed = JSON.parse(localStorage.getItem(PASSPORT_KEY) || '[]');
      return new Set(Array.isArray(parsed) ? parsed : []);
    } catch {
      return new Set();
    }
  };
  const discovered = loadPassport();

  const markDiscovered = id => {
    if (!DATA.passportIds.includes(id) || discovered.has(id)) return false;
    discovered.add(id);
    try {
      localStorage.setItem(PASSPORT_KEY, JSON.stringify([...discovered]));
    } catch {}
    window.AnshAudio.playUnlock?.();
    if (typeof passportCallback === 'function') {
      passportCallback(id, discovered.size, DATA.passportIds.length);
    }
    if (discovered.size === DATA.passportIds.length && window.AnshFX?.confetti) {
      window.AnshFX.confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.72 },
        colors: ['#ef4444', '#38bdf8', '#f472b6', '#f59e0b']
      });
    }
    return true;
  };

  /* ── Continuous Top-5 Audio Controller (Persists Across Scenes) ── */
  const getSongs = () => DATA.rewatchCorners?.rewatch_songs?.items || [];

  const syncMusicVisuals = () => {
    const songs = getSongs();
    const current = currentSongIndex >= 0 ? songs[currentSongIndex] : null;
    const isPlaying = Boolean(topAudio && !topAudio.paused && current);

    window.AnshAudio.setMusicDucking?.(isPlaying);
    window.AnshShowcase3D?.updateProps?.({ audioPlaying: isPlaying });

    if (nowPlayingBar) {
      nowPlayingBar.classList.toggle('visible', Boolean(current));
      nowPlayingBar.classList.toggle('playing', isPlaying);
      nowPlayingBar.setAttribute('aria-hidden', String(!current));
      if (current) {
        npTitle.textContent = current.name;
        npMeta.textContent = current.meta;
        npPlayBtn.innerHTML = isPlaying
          ? '<i class="fas fa-pause" aria-hidden="true"></i>'
          : '<i class="fas fa-play" aria-hidden="true"></i>';
      }
    }

    sceneBody.querySelectorAll('.song-player[data-song-idx]').forEach(box => {
      const idx = Number(box.dataset.songIdx);
      const isMe = idx === currentSongIndex && Boolean(topAudio);
      const btn = box.querySelector('.play-btn');
      const fill = box.querySelector('.song-fill');
      const tm = box.querySelector('.song-time');
      if (btn) {
        const playingMe = isMe && !topAudio.paused;
        btn.classList.toggle('is-playing', playingMe);
        btn.innerHTML = playingMe
          ? '<i class="fas fa-pause" aria-hidden="true"></i> <span>Pause</span>'
          : '<i class="fas fa-play" aria-hidden="true"></i> <span>Play</span>';
      }
      if (!isMe) {
        if (fill) fill.style.width = '0%';
        if (tm) tm.textContent = '0:30';
      }
    });
  };

  const stopTopAudio = () => {
    if (topAudio) {
      try {
        topAudio.pause();
        topAudio.currentTime = 0;
      } catch (_) {}
      topAudio = null;
    }
    currentSongIndex = -1;
    syncMusicVisuals();
  };

  const playSongAtIndex = idx => {
    const songs = getSongs();
    const song = songs[idx];
    if (!song?.previewUrl) return;

    if (currentSongIndex === idx && topAudio) {
      if (topAudio.paused) {
        topAudio.play().then(syncMusicVisuals).catch(() => {});
      } else {
        topAudio.pause();
        syncMusicVisuals();
      }
      return;
    }

    if (topAudio) {
      try { topAudio.pause(); } catch (_) {}
    }

    currentSongIndex = idx;
    topAudio = new Audio(song.previewUrl);
    topAudio.volume = 0.75;

    topAudio.addEventListener('timeupdate', () => {
      if (!topAudio || !topAudio.duration || currentSongIndex !== idx) return;
      const pct = (topAudio.currentTime / topAudio.duration) * 100;
      const rem = Math.max(0, Math.ceil(topAudio.duration - topAudio.currentTime));
      const box = sceneBody.querySelector(`.song-player[data-song-idx="${idx}"]`);
      if (box) {
        const fill = box.querySelector('.song-fill');
        const tm = box.querySelector('.song-time');
        if (fill) fill.style.width = `${pct.toFixed(1)}%`;
        if (tm) tm.textContent = `0:${String(rem).padStart(2, '0')}`;
      }
    });

    topAudio.addEventListener('ended', () => {
      if (currentSongIndex !== idx) return;
      const next = (idx + 1) % songs.length;
      if (songs[next]?.previewUrl) playSongAtIndex(next);
      else stopTopAudio();
    });

    topAudio.play().then(syncMusicVisuals).catch(() => {
      const box = sceneBody.querySelector(`.song-player[data-song-idx="${idx}"]`);
      const tm = box?.querySelector('.song-time');
      if (tm) tm.textContent = 'Unavailable';
    });
  };

  if (npPlayBtn) {
    npPlayBtn.addEventListener('click', () => {
      if (currentSongIndex >= 0) playSongAtIndex(currentSongIndex);
    });
  }
  if (npNextBtn) {
    npNextBtn.addEventListener('click', () => {
      const songs = getSongs();
      if (!songs.length) return;
      const next = (currentSongIndex + 1) % songs.length;
      playSongAtIndex(next);
    });
  }
  if (npCloseBtn) npCloseBtn.addEventListener('click', stopTopAudio);

  const isSceneOpen = () => activeSceneId !== null;
  const isDialogOpen = () => dialogOpen;

  const openDialog = (speaker, text) => {
    dialogOpen = true;
    rpgSpeaker.textContent = speaker;
    rpgText.textContent = '';
    rpgDialog.classList.add('open');
    rpgDialog.setAttribute('aria-hidden', 'false');
    clearInterval(dialogTimer);
    window.AnshAudio.playUI(560);
    if (reducedMotion) {
      rpgText.textContent = text;
      return;
    }
    let idx = 0;
    dialogTimer = setInterval(() => {
      idx++;
      rpgText.textContent = text.slice(0, idx);
      if (idx >= text.length) clearInterval(dialogTimer);
    }, 13);
  };

  const closeDialog = () => {
    if (!dialogOpen) return;
    dialogOpen = false;
    clearInterval(dialogTimer);
    rpgDialog.classList.remove('open');
    rpgDialog.setAttribute('aria-hidden', 'true');
    window.AnshAudio.playUI(420);
  };

  const renderShowcaseBox = (title, hint = 'Drag 3D Artifact to Inspect') => `
    <div class="r3f-stage">
      <div class="r3f-stage-head">
        <span>3D INTERACTIVE // ${title}</span>
        <small>${hint}</small>
      </div>
      <div class="r3f-canvas-mount" id="r3fShowcaseMount"></div>
    </div>`;

  const renderGlyphLensInterior = () => {
    const g = DATA.glyphlens;
    const s0 = g.ocrSamples[0];
    return `
      <div class="loc-shell loc-crimson">
        <header class="loc-header">
          <div class="loc-crumb">
            <span class="loc-badge">INTERIOR // WEST WING</span>
            <span class="loc-sub">${g.status}</span>
          </div>
          <button type="button" class="loc-exit-btn" data-exit-scene>
            <span>[ESC] Exit to Street</span>
          </button>
        </header>

        <div class="loc-grid">
          <div class="loc-main">
            <div class="loc-hero">
              <img src="${g.logo}" alt="GlyphLens Logo" class="loc-logo" width="58" height="58" />
              <div>
                <h1 class="loc-title">${g.name}</h1>
                <p class="loc-tagline">${g.subtitle}</p>
              </div>
            </div>

            <p class="loc-copy">${g.overview}</p>
            <p class="loc-note"><strong>Architecture:</strong> ${g.architectureNote}</p>

            <h2 class="loc-h2">Implemented Features</h2>
            <div class="loc-cards">
              ${g.features.map(f => `
                <div class="loc-card">
                  <h3>${f.title}</h3>
                  <p>${f.detail}</p>
                </div>
              `).join('')}
            </div>

            <div class="loc-actions">
              <a href="${g.repoUrl}" target="_blank" rel="noopener" class="loc-btn loc-btn-primary">
                <i class="fab fa-github" aria-hidden="true"></i> View GlyphLens on GitHub
              </a>
              <a href="${g.repoUrl}/releases" target="_blank" rel="noopener" class="loc-btn">
                Releases (v0.1.1-preview)
              </a>
            </div>
          </div>

          <aside class="loc-side">
            ${renderShowcaseBox('OPTICAL OCR SCANNER CORE', 'R3F WebGL · Drag to Orbit')}

            <div class="sim-panel">
              <div class="sim-head">
                <span>INTERACTIVE PIPELINE PREVIEW</span>
                <button type="button" class="sim-toggle" id="glOverlayBtn">Overlay: ON</button>
              </div>
              <div class="sim-stage">
                <div class="gl-samples">
                  ${g.ocrSamples.map((smp, i) => `
                    <button type="button" class="gl-sample-btn ${i === 0 ? 'active' : ''}" data-gl-sample="${i}">${smp.label}</button>
                  `).join('')}
                </div>
                <div class="sim-window-bar" id="glTargetBar">${s0.target}</div>
                <div class="sim-capture-box">
                  <span class="sim-tag" id="glCaptureTag">${s0.tag}</span>
                  <div class="sim-ocr-text" id="glSourceText">${s0.sourceText}</div>
                </div>
                <div class="sim-translation" id="glOverlayPill">
                  <span class="sim-pill-k" id="glTransMeta">CTranslate2 · ${s0.latency}</span>
                  <span class="sim-pill-v" id="glTransText">${s0.translation}</span>
                </div>
                <div class="sim-modes">
                  <button type="button" class="sim-mode active" data-gl-mode="overlay">Overlay Mode</button>
                  <button type="button" class="sim-mode" data-gl-mode="panel">Side Panel Mode</button>
                </div>
              </div>
            </div>

            <div class="spec-panel">
              <h3 class="spec-title">Technology Stack</h3>
              <dl class="spec-list">
                ${g.stack.map(s => `<div><dt>${s.label}</dt><dd>${s.value}</dd></div>`).join('')}
              </dl>
            </div>

            <div class="spec-panel">
              <h3 class="spec-title">Repository Modules</h3>
              <ul class="struct-list">
                ${g.structure.map(line => `<li>${line}</li>`).join('')}
              </ul>
            </div>
          </aside>
        </div>
      </div>`;
  };

  const renderVolumeChartSVG = history => {
    const maxKg = Math.max(...history.map(h => h.kg));
    const minKg = Math.min(...history.map(h => h.kg)) * 0.88;
    const W = 320, H = 92, padX = 16, padY = 14;
    const pts = history.map((h, i) => {
      const x = padX + (i / (history.length - 1)) * (W - padX * 2);
      const y = H - padY - ((h.kg - minKg) / (maxKg - minKg)) * (H - padY * 2);
      return { ...h, x, y };
    });
    const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
    const areaPath = `${linePath} L ${pts[pts.length - 1].x.toFixed(1)} ${H - padY} L ${pts[0].x.toFixed(1)} ${H - padY} Z`;

    return `
      <div class="arcus-chart-box">
        <div class="arcus-chart-head">
          <span>VOLUME PROGRESSION (KG)</span>
          <strong>+27.0% 6-Wk Trend</strong>
        </div>
        <svg viewBox="0 0 ${W} ${H}" class="arcus-svg" role="img" aria-label="Training volume rising from 11,400 kg in Week 1 to 14,480 kg in Week 6">
          <defs>
            <linearGradient id="arcusFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.38" />
              <stop offset="100%" stop-color="#38bdf8" stop-opacity="0.02" />
            </linearGradient>
          </defs>
          <path d="${areaPath}" fill="url(#arcusFill)" />
          <path d="${linePath}" fill="none" stroke="#38bdf8" stroke-width="2" />
          ${pts.map(p => `
            <circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="3" fill="#e0f2fe" stroke="#38bdf8" stroke-width="1.5">
              <title>${p.wk}: ${p.kg.toLocaleString()} kg</title>
            </circle>
            <text x="${p.x.toFixed(1)}" y="${H - 2}" text-anchor="middle" fill="#64748b" font-size="8" font-family="JetBrains Mono">${p.wk}</text>
          `).join('')}
        </svg>
      </div>`;
  };

  const loadArcusSets = () => {
    try {
      const saved = JSON.parse(localStorage.getItem(ARCUS_SETS_KEY) || 'null');
      if (Array.isArray(saved) && saved.length) return saved;
    } catch {}
    return DATA.arcus.defaultSets;
  };

  const renderArcusInterior = () => {
    const a = DATA.arcus;
    const sets = loadArcusSets();
    const doneCount = sets.filter(s => s.done).length;
    return `
      <div class="loc-shell loc-blue">
        <header class="loc-header">
          <div class="loc-crumb">
            <span class="loc-badge">INTERIOR // EAST WING</span>
            <span class="loc-sub">${a.status}</span>
          </div>
          <button type="button" class="loc-exit-btn" data-exit-scene>
            <span>[ESC] Exit to Street</span>
          </button>
        </header>

        <div class="loc-grid">
          <div class="loc-main">
            <div class="loc-hero">
              <img src="${a.mark}" alt="Arcus Mark" class="loc-logo" width="58" height="58" />
              <div>
                <h1 class="loc-title">${a.name}</h1>
                <p class="loc-tagline">${a.subtitle}</p>
              </div>
            </div>

            <div class="loc-banner-wrap">
              <img src="${a.banner}" alt="Arcus Share Banner" class="loc-banner" width="900" height="472" />
            </div>

            <p class="loc-copy">${a.overview}</p>
            <p class="loc-note"><strong>Architecture:</strong> ${a.architectureNote}</p>

            <h2 class="loc-h2">Verified Capabilities</h2>
            <div class="loc-cards">
              ${a.features.map(f => `
                <div class="loc-card">
                  <h3>${f.title}</h3>
                  <p>${f.detail}</p>
                </div>
              `).join('')}
            </div>

            <div class="loc-actions">
              <a href="${a.repoUrl}" target="_blank" rel="noopener" class="loc-btn loc-btn-primary">
                <i class="fab fa-github" aria-hidden="true"></i> View Arcus on GitHub
              </a>
            </div>
          </div>

          <aside class="loc-side">
            ${renderShowcaseBox('BIOMETRIC BARBELL RIG', 'Plates Scale With Logged Sets')}

            <div class="sim-panel">
              <div class="sim-head">
                <span>LOCAL LOGGER &amp; REST TIMER</span>
                <span id="arcusDoneStat">${doneCount} / ${sets.length} Logged</span>
              </div>
              <div class="sim-stage">
                <div class="timer-row">
                  <span class="sim-tag">Rest Timer</span>
                  <div class="timer-controls">
                    <button type="button" class="timer-nudge" id="arcusTimerMinus" aria-label="Subtract 15 seconds">-15s</button>
                    <span class="timer-val" id="arcusTimerVal">01:30</span>
                    <button type="button" class="timer-nudge" id="arcusTimerPlus" aria-label="Add 15 seconds">+15s</button>
                  </div>
                  <button type="button" class="sim-toggle" id="arcusTimerBtn">Start</button>
                </div>
                <div class="arcus-sets" id="arcusSets">
                  ${sets.map((s, idx) => `
                    <button type="button" class="arcus-set ${s.done ? 'done' : ''}" data-set-idx="${idx}">
                      <span>${s.name}<small class="set-sub">${s.target}</small></span>
                      <span class="set-meta">${s.done ? 'Saved Local' : 'Tap to Log'}</span>
                      <span class="set-chk">${s.done ? '✓' : '○'}</span>
                    </button>
                  `).join('')}
                </div>
                ${renderVolumeChartSVG(a.volumeHistory)}
              </div>
            </div>

            <div class="spec-panel">
              <h3 class="spec-title">Verified Repository Stack</h3>
              <dl class="spec-list">
                ${a.stack.map(s => `<div><dt>${s.label}</dt><dd>${s.value}</dd></div>`).join('')}
              </dl>
            </div>
          </aside>
        </div>
      </div>`;
  };

  const renderAboutInterior = () => {
    const o = DATA.owner;
    return `
      <div class="loc-shell loc-amber">
        <header class="loc-header">
          <div class="loc-crumb">
            <span class="loc-badge">PLAZA BOARD // ABOUT ANSH</span>
            <span class="loc-sub">${o.region} · <span id="lucknowClock">--:--:-- IST</span></span>
          </div>
          <button type="button" class="loc-exit-btn" data-exit-scene>
            <span>[ESC] Back to Plaza</span>
          </button>
        </header>

        <div class="loc-grid">
          <div class="loc-main">
            <h1 class="loc-title">${o.name}<span class="red">.</span></h1>
            <p class="loc-tagline">${o.role} · ${o.region}</p>
            <p class="loc-copy">${o.bio}</p>

            <div class="spec-panel" style="margin-top:1.5rem">
              <h3 class="spec-title">Core Engineering Stack</h3>
              <dl class="spec-list">
                <div><dt>Languages</dt><dd>${o.stack.languages}</dd></div>
                <div><dt>Frameworks &amp; UI</dt><dd>${o.stack.frameworks}</dd></div>
                <div><dt>Data &amp; Offline</dt><dd>${o.stack.backend}</dd></div>
                <div><dt>Tools &amp; Workflow</dt><dd>${o.stack.tools}</dd></div>
              </dl>
            </div>

            <div class="loc-actions" style="margin-top:1.6rem">
              <button type="button" class="loc-btn loc-btn-primary" data-jump-scene="glyphlens">Explore GlyphLens ↗</button>
              <button type="button" class="loc-btn" data-jump-scene="arcus">Explore Arcus ↗</button>
              <a href="${o.github}" target="_blank" rel="noopener" class="loc-btn">
                <i class="fab fa-github" aria-hidden="true"></i> GitHub @ansh1ndia
              </a>
              <a href="${o.rewatch}" target="_blank" rel="noopener" class="loc-btn">
                <i class="fas fa-film" aria-hidden="true"></i> Rewatch @ansh
              </a>
            </div>
          </div>

          <aside class="loc-side">
            ${renderShowcaseBox('STACK CONSTELLATION', 'Drag to Orbit Orbitals')}
            <div class="spec-panel">
              <h3 class="spec-title">Explore Town Landmarks</h3>
              <div class="quick-jump-grid">
                <button type="button" class="qjump-btn" data-jump-scene="rewatch_films">Films Top 5</button>
                <button type="button" class="qjump-btn" data-jump-scene="rewatch_series">Series Top 5</button>
                <button type="button" class="qjump-btn" data-jump-scene="rewatch_albums">Albums Top 5</button>
                <button type="button" class="qjump-btn" data-jump-scene="rewatch_songs">Songs Top 5</button>
              </div>
            </div>
          </aside>
        </div>
      </div>`;
  };

  const renderContactInterior = () => {
    const o = DATA.owner;
    return `
      <div class="loc-shell loc-pink">
        <header class="loc-header">
          <div class="loc-crumb">
            <span class="loc-badge">COMMS TERMINAL // CONTACT</span>
            <span class="loc-sub">${o.region}</span>
          </div>
          <button type="button" class="loc-exit-btn" data-exit-scene>
            <span>[ESC] Exit Terminal</span>
          </button>
        </header>

        <div class="loc-grid">
          <div class="loc-main">
            <h1 class="loc-title">Transmit Message</h1>
            <p class="loc-tagline">Direct terminal to Ansh · Lucknow, India</p>

            <form class="term-form" id="townContactForm">
              <div class="term-row">
                <label for="termName">Sender Name <input id="termName" name="name" type="text" required autocomplete="name" placeholder="Ansh…" /></label>
                <label for="termEmail">Return Address <input id="termEmail" name="email" type="email" required autocomplete="email" spellcheck="false" placeholder="you@domain.com…" /></label>
              </div>
              <label for="termMsg">Transmission <textarea id="termMsg" name="message" rows="4" required placeholder="Project inquiry, collaboration, or feedback…"></textarea></label>
              <div class="term-foot">
                <button type="submit" class="loc-btn loc-btn-primary" id="termSubmitBtn">Encode &amp; Copy Packet</button>
                <span class="term-status" id="termStatus" role="status" aria-live="polite"></span>
              </div>
            </form>

            <div class="loc-actions" style="margin-top:1.4rem">
              <a href="${o.github}" target="_blank" rel="noopener" class="loc-btn"><i class="fab fa-github" aria-hidden="true"></i> github.com/ansh1ndia</a>
              <a href="${o.instagram}" target="_blank" rel="noopener" class="loc-btn"><i class="fab fa-instagram" aria-hidden="true"></i> @ansh1ndia</a>
              <a href="${o.rewatch}" target="_blank" rel="noopener" class="loc-btn"><i class="fas fa-film" aria-hidden="true"></i> rewatch.cc/@ansh</a>
            </div>
          </div>

          <aside class="loc-side">
            ${renderShowcaseBox('ENCRYPTED DATA PRISM', 'Interactive Comms Core')}
          </aside>
        </div>
      </div>`;
  };

  const renderMediaActions = (item, actionLabel, songIdx = -1) => {
    const playerHtml = item.previewUrl && songIdx >= 0 ? `
      <div class="song-player" data-preview="${item.previewUrl}" data-song-idx="${songIdx}">
        <button type="button" class="play-btn">
          <i class="fas fa-play" aria-hidden="true"></i> <span>Play</span>
        </button>
        <div class="song-bar"><div class="song-fill"></div></div>
        <span class="song-time">0:30</span>
      </div>` : '';

    const links = [];
    if (item.mediaUrl) {
      links.push(`<a href="${item.mediaUrl}" target="_blank" rel="noopener" class="media-link media-link-accent"><i class="fas fa-play-circle" aria-hidden="true"></i> ${actionLabel || 'Trailer'}</a>`);
    }
    if (item.rewatchUrl) {
      links.push(`<a href="${item.rewatchUrl}" target="_blank" rel="noopener" class="media-link">Rewatch ↗</a>`);
    }
    const linksHtml = links.length ? `<div class="media-links">${links.join('')}</div>` : '';
    return playerHtml + linksHtml;
  };

  const renderRewatchInterior = id => {
    const rw = DATA.rewatchCorners[id];
    const o = DATA.owner;
    const accentCls = rw.accent === 'blue' ? 'loc-blue' : rw.accent === 'amber' ? 'loc-amber' : rw.accent === 'pink' ? 'loc-pink' : 'loc-crimson';
    const isPoster = rw.aspect === 'poster';
    const artCls = isPoster ? 'art-poster' : 'art-square';
    const tabs = [
      ['rewatch_films', 'Films'],
      ['rewatch_series', 'Series'],
      ['rewatch_albums', 'Albums'],
      ['rewatch_songs', 'Songs']
    ];

    const idxOfItem = it => rw.id === 'rewatch_songs' ? rw.items.indexOf(it) : -1;

    const podiumOrder = [
      { rank: 2, item: rw.items[1], tier: 'podium-2' },
      { rank: 1, item: rw.items[0], tier: 'podium-1' },
      { rank: 3, item: rw.items[2], tier: 'podium-3' }
    ].filter(p => p.item);

    const restItems = rw.items.slice(3);

    return `
      <div class="loc-shell ${accentCls}">
        <header class="loc-header">
          <div class="loc-crumb">
            <span class="loc-badge">${rw.badge}</span>
            <span class="loc-sub">${o.rewatchBio}</span>
          </div>
          <button type="button" class="loc-exit-btn" data-exit-scene>
            <span>[ESC] Back to Plaza</span>
          </button>
        </header>

        <div class="loc-wide">
          <div class="rw-top-hero">
            <div class="rw-hero-copy">
              <div class="rw-tabs">
                ${tabs.map(([tid, label]) => `
                  <button type="button" class="rw-tab ${tid === id ? 'active' : ''}" data-rw-switch="${tid}">${label}</button>
                `).join('')}
              </div>

              <h1 class="loc-title">${rw.title}</h1>
              <p class="loc-tagline">${rw.subtitle}</p>
              ${id === 'rewatch_songs' ? `
                <div class="rw-song-bar-actions">
                  <button type="button" class="loc-btn loc-btn-primary" id="playAllSongsBtn">
                    <i class="fas fa-headphones" aria-hidden="true"></i> Play All Top 5 Queue
                  </button>
                </div>
              ` : ''}
            </div>

            <div class="rw-hero-3d">
              ${renderShowcaseBox(rw.title.toUpperCase() + ' 3D STAGE', id === 'rewatch_songs' ? 'Reacts to Audio Playback' : 'Drag 3D Artifact')}
            </div>
          </div>

          <div class="podium-grid">
            ${podiumOrder.map(p => `
              <div class="podium-slot ${p.tier}">
                <div class="podium-art ${artCls}">
                  <img src="${p.item.img}" alt="${p.item.name}" decoding="async" />
                  <span class="podium-rank">#0${p.rank}</span>
                </div>
                <div class="podium-base">
                  <div class="podium-title">${p.item.name}</div>
                  <div class="podium-meta">${p.item.meta}</div>
                  ${renderMediaActions(p.item, rw.actionLabel, idxOfItem(p.item))}
                </div>
              </div>
            `).join('')}
          </div>

          ${restItems.length ? `
            <h2 class="loc-h2" style="margin-top:2.2rem">Also in Top 5</h2>
            <div class="rw-thumbs">
              ${restItems.map((item, idx) => `
                <div class="rw-thumb-card">
                  <div class="rw-thumb-art ${artCls}">
                    <img src="${item.img}" alt="${item.name}" loading="lazy" />
                    <span class="podium-rank">#0${idx + 4}</span>
                  </div>
                  <div class="rw-thumb-info">
                    <div class="rw-name">${item.name}</div>
                    <div class="rw-meta">${item.meta}</div>
                    ${renderMediaActions(item, rw.actionLabel, idxOfItem(item))}
                  </div>
                </div>
              `).join('')}
            </div>
          ` : ''}

          ${rw.recent ? `
            <h2 class="loc-h2" style="margin-top:2.2rem">${rw.recentLabel}</h2>
            <div class="rw-thumbs">
              ${rw.recent.map(r => `
                <div class="rw-thumb-card">
                  <div class="rw-thumb-art ${artCls}">
                    <img src="${r.img}" alt="${r.name}" loading="lazy" />
                  </div>
                  <div class="rw-thumb-info">
                    <div class="rw-name">${r.name}</div>
                    <div class="rw-meta">${r.meta}</div>
                    ${renderMediaActions(r, rw.actionLabel)}
                  </div>
                </div>
              `).join('')}
            </div>
          ` : ''}

          <div class="loc-actions" style="margin-top:2.2rem">
            <a href="${o.rewatch}" target="_blank" rel="noopener" class="loc-btn loc-btn-primary">
              Open rewatch.cc/@ansh
            </a>
          </div>
        </div>
      </div>`;
  };

  const animateEntrance = () => {
    if (reducedMotion || !window.AnshFX?.gsap) return;
    const cards = sceneBody.querySelectorAll('.loc-card, .podium-slot, .rw-thumb-card, .spec-panel');
    if (cards.length) {
      window.AnshFX.gsap.from(cards, {
        opacity: 0,
        y: 16,
        duration: 0.36,
        stagger: 0.035,
        ease: 'power2.out',
        clearProps: 'transform,opacity'
      });
    }
  };

  const wireInteriorEvents = id => {
    sceneBody.querySelectorAll('[data-exit-scene]').forEach(btn => {
      btn.addEventListener('click', closeScene);
    });

    sceneBody.querySelectorAll('[data-jump-scene]').forEach(btn => {
      btn.addEventListener('click', () => openScene(btn.dataset.jumpScene));
    });

    sceneBody.querySelectorAll('[data-rw-switch]').forEach(btn => {
      btn.addEventListener('click', () => {
        window.AnshAudio.playUI(580);
        const nextId = btn.dataset.rwSwitch;
        markDiscovered(nextId);
        activeSceneId = nextId;
        sceneBody.innerHTML = renderRewatchInterior(nextId);
        wireInteriorEvents(nextId);
      });
    });

    /* Mount Single Shared R3F 3D Showcase into #r3fShowcaseMount */
    const mount3d = document.getElementById('r3fShowcaseMount');
    if (mount3d) {
      const sets = loadArcusSets();
      window.AnshShowcase3D?.mountInto?.(mount3d, id, {
        reducedMotion,
        audioPlaying: Boolean(topAudio && !topAudio.paused),
        arcusDoneCount: sets.filter(s => s.done).length,
        transmitting: false
      });
    }

    /* Rewatch Songs Players */
    sceneBody.querySelectorAll('.song-player[data-preview]').forEach(box => {
      const btn = box.querySelector('.play-btn');
      const idx = Number(box.dataset.songIdx);
      if (btn && idx >= 0) {
        btn.addEventListener('click', () => playSongAtIndex(idx));
      }
    });

    const playAllBtn = document.getElementById('playAllSongsBtn');
    if (playAllBtn) {
      playAllBtn.addEventListener('click', () => playSongAtIndex(0));
    }
    syncMusicVisuals();

    /* GlyphLens Interactive OCR Pipeline */
    if (id === 'glyphlens') {
      const ovBtn = document.getElementById('glOverlayBtn');
      const ovPill = document.getElementById('glOverlayPill');
      const targetBar = document.getElementById('glTargetBar');
      const capTag = document.getElementById('glCaptureTag');
      const srcTxt = document.getElementById('glSourceText');
      const transMeta = document.getElementById('glTransMeta');
      const transTxt = document.getElementById('glTransText');

      if (ovBtn && ovPill) {
        ovBtn.addEventListener('click', () => {
          window.AnshAudio.playUI(620);
          const off = ovPill.classList.toggle('off');
          ovBtn.textContent = off ? 'Overlay: OFF' : 'Overlay: ON';
        });
      }

      sceneBody.querySelectorAll('[data-gl-sample]').forEach(btn => {
        btn.addEventListener('click', () => {
          window.AnshAudio.playUI(590);
          const smp = DATA.glyphlens.ocrSamples[Number(btn.dataset.glSample)];
          if (!smp) return;
          sceneBody.querySelectorAll('[data-gl-sample]').forEach(b => b.classList.toggle('active', b === btn));
          if (targetBar) targetBar.textContent = smp.target;
          if (capTag) capTag.textContent = smp.tag;
          if (srcTxt) srcTxt.textContent = smp.sourceText;
          if (transMeta) transMeta.textContent = `CTranslate2 · ${smp.latency}`;
          if (transTxt) transTxt.textContent = smp.translation;
        });
      });

      sceneBody.querySelectorAll('[data-gl-mode]').forEach(mBtn => {
        mBtn.addEventListener('click', () => {
          window.AnshAudio.playUI(540);
          sceneBody.querySelectorAll('[data-gl-mode]').forEach(b => b.classList.remove('active'));
          mBtn.classList.add('active');
          if (transMeta) {
            const isPanel = mBtn.dataset.glMode === 'panel';
            transMeta.textContent = isPanel
              ? 'Side Panel Feed · History & Copy Mode'
              : 'CTranslate2 · Named Pipe IPC · Offline';
          }
        });
      });
    }

    /* Arcus Logger + Timer + Live R3F Plate Coupling */
    if (id === 'arcus') {
      const setsWrap = document.getElementById('arcusSets');
      const statEl   = document.getElementById('arcusDoneStat');
      const setsState = loadArcusSets();

      if (setsWrap && statEl) {
        setsWrap.querySelectorAll('.arcus-set').forEach(btn => {
          btn.addEventListener('click', () => {
            const idx = Number(btn.dataset.setIdx);
            window.AnshAudio.playUI(680);
            const done = btn.classList.toggle('done');
            btn.querySelector('.set-chk').textContent = done ? '✓' : '○';
            btn.querySelector('.set-meta').textContent = done ? 'Saved Local' : 'Tap to Log';
            if (setsState[idx]) setsState[idx].done = done;
            try { localStorage.setItem(ARCUS_SETS_KEY, JSON.stringify(setsState)); } catch {}
            const doneCount = setsState.filter(s => s.done).length;
            statEl.textContent = `${doneCount} / ${setsState.length} Logged`;
            window.AnshShowcase3D?.updateProps?.({ arcusDoneCount: doneCount });
          });
        });
      }

      const tBtn   = document.getElementById('arcusTimerBtn');
      const tVal   = document.getElementById('arcusTimerVal');
      const tMinus = document.getElementById('arcusTimerMinus');
      const tPlus  = document.getElementById('arcusTimerPlus');
      let secs = 90;
      let tRunning = false;
      const paintTimer = () => {
        const m = String(Math.floor(secs / 60)).padStart(2, '0');
        const s = String(secs % 60).padStart(2, '0');
        if (tVal) tVal.textContent = `${m}:${s}`;
      };

      if (tMinus) tMinus.addEventListener('click', () => { secs = Math.max(15, secs - 15); paintTimer(); window.AnshAudio.playUI(480); });
      if (tPlus) tPlus.addEventListener('click', () => { secs = Math.min(300, secs + 15); paintTimer(); window.AnshAudio.playUI(620); });

      if (tBtn && tVal) {
        tBtn.addEventListener('click', () => {
          window.AnshAudio.playUI(580);
          if (tRunning) {
            clearInterval(timerInterval);
            tRunning = false;
            tBtn.textContent = 'Resume';
          } else {
            tRunning = true;
            tBtn.textContent = 'Pause';
            timerInterval = setInterval(() => {
              if (secs > 1) {
                secs--;
                paintTimer();
              } else {
                secs = 90;
                paintTimer();
                clearInterval(timerInterval);
                tRunning = false;
                tBtn.textContent = 'Start';
                window.AnshAudio.playTimerDone?.();
              }
            }, 1000);
          }
        });
      }
    }

    /* About Live IST Clock */
    if (id === 'about') {
      const clockEl = document.getElementById('lucknowClock');
      const updateClock = () => {
        if (!clockEl) return;
        clockEl.textContent = new Intl.DateTimeFormat('en-IN', {
          timeZone: 'Asia/Kolkata',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        }).format(new Date()) + ' IST';
      };
      updateClock();
      clockInterval = setInterval(updateClock, 1000);
    }

    /* Contact Terminal + Clipboard Copy + 3D Speed Boost + Confetti */
    if (id === 'contact') {
      const form = document.getElementById('townContactForm');
      const status = document.getElementById('termStatus');
      const submitBtn = document.getElementById('termSubmitBtn');
      if (form) {
        form.addEventListener('submit', async e => {
          e.preventDefault();
          window.AnshAudio.playUI(640);
          submitBtn.disabled = true;
          submitBtn.textContent = 'Encoding…';
          window.AnshShowcase3D?.updateProps?.({ transmitting: true });

          const fd = new FormData(form);
          const packet = `FROM: ${fd.get('name')} <${fd.get('email')}>\nMSG: ${fd.get('message')}`;
          let copied = false;
          try {
            await navigator.clipboard?.writeText(packet);
            copied = true;
          } catch {}

          setTimeout(() => {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Encode & Copy Packet';
            window.AnshShowcase3D?.updateProps?.({ transmitting: false });
            window.AnshAudio.playUnlock?.();
            status.textContent = copied
              ? '✓ Packet copied to clipboard — paste via GitHub or Instagram DM.'
              : '✓ Packet formatted — reach Ansh via @ansh1ndia below.';
            if (window.AnshFX?.confetti && !reducedMotion) {
              window.AnshFX.confetti({ particleCount: 45, spread: 55, origin: { y: 0.7 } });
            }
            form.reset();
            setTimeout(() => { status.textContent = ''; }, 5500);
          }, 700);
        });
      }
    }

    animateEntrance();
  };

  const openScene = id => {
    closeDialog();
    clearInterval(timerInterval);
    clearInterval(clockInterval);
    window.AnshAudio.playDoor(true);
    markDiscovered(id);

    curtain.classList.add('active');
    setTimeout(() => {
      activeSceneId = id;
      if (id === 'glyphlens') sceneBody.innerHTML = renderGlyphLensInterior();
      else if (id === 'arcus') sceneBody.innerHTML = renderArcusInterior();
      else if (id === 'about') sceneBody.innerHTML = renderAboutInterior();
      else if (id === 'contact') sceneBody.innerHTML = renderContactInterior();
      else if (DATA.rewatchCorners[id]) sceneBody.innerHTML = renderRewatchInterior(id);

      wireInteriorEvents(id);
      sceneEl.classList.add('open');
      sceneEl.setAttribute('aria-hidden', 'false');
      sceneEl.scrollTop = 0;
      curtain.classList.remove('active');
      sceneBody.querySelector('[data-exit-scene]')?.focus({ preventScroll: true });
    }, 200);
  };

  const closeScene = () => {
    if (!activeSceneId) return;
    clearInterval(timerInterval);
    clearInterval(clockInterval);
    window.AnshShowcase3D?.park?.();
    window.AnshAudio.playDoor(false);
    curtain.classList.add('active');
    setTimeout(() => {
      activeSceneId = null;
      sceneEl.classList.remove('open');
      sceneEl.setAttribute('aria-hidden', 'true');
      curtain.classList.remove('active');
      document.getElementById('cityCanvas')?.focus({ preventScroll: true });
    }, 180);
  };

  const handleInteractable = obj => {
    if (!obj) return;
    markDiscovered(obj.id);
    if (obj.kind === 'vending') {
      const drinks = DATA.vendingDrinks || [];
      const drink = drinks[Math.floor(Math.random() * drinks.length)] || 'CYBER DRINK // Crisp & Cold.';
      window.AnshAudio.playVend?.();
      openDialog(obj.label, drink);
      return;
    }
    if (obj.id === 'shrine_stone') {
      const fortunes = DATA.shrineFortunes || [];
      const pick = fortunes[Math.floor(Math.random() * fortunes.length)];
      openDialog('SAKURA SHRINE // OMIKUJI', pick || DATA.dialogs.shrine_stone.text);
      return;
    }
    if (obj.kind === 'dialog' || obj.kind === 'npc') {
      const d = DATA.dialogs[obj.id];
      if (d) openDialog(d.speaker, d.text);
    } else {
      openScene(obj.id);
    }
  };

  rpgDialog.addEventListener('click', closeDialog);

  return {
    openScene,
    closeScene,
    openDialog,
    closeDialog,
    handleInteractable,
    isSceneOpen,
    isDialogOpen,
    getDiscoveredIds: () => new Set(discovered),
    markDiscovered,
    onPassportUpdate: cb => { passportCallback = cb; },
    setReducedMotion: val => {
      reducedMotion = Boolean(val);
      window.AnshShowcase3D?.updateProps?.({ reducedMotion });
    }
  };
})();
