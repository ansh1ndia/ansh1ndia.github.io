/* ─── js/scenes.js — In-World Location Transitions, Project Interiors & Dialogs ─── */
window.AnshScenes = (() => {
  const DATA = window.ANSH_DATA;
  const curtain    = document.getElementById('sceneCurtain');
  const sceneEl    = document.getElementById('sceneOverlay');
  const sceneBody  = document.getElementById('sceneContent');
  const rpgDialog  = document.getElementById('rpgDialog');
  const rpgSpeaker = document.getElementById('rpgSpeaker');
  const rpgText    = document.getElementById('rpgText');

  let activeSceneId = null;
  let dialogOpen = false;
  let dialogTimer = null;
  let timerInterval = null;
  let topAudio = null;
  let activePlayerBox = null;

  const resetPlayerUI = box => {
    if (!box) return;
    const btn = box.querySelector('.play-btn');
    const fill = box.querySelector('.song-fill');
    const tm = box.querySelector('.song-time');
    if (btn) {
      btn.classList.remove('is-playing');
      btn.innerHTML = '<i class="fas fa-play"></i> <span>Play</span>';
    }
    if (fill) fill.style.width = '0%';
    if (tm) tm.textContent = '0:30';
  };

  const stopTopAudio = () => {
    if (topAudio) {
      try {
        topAudio.pause();
        topAudio.currentTime = 0;
      } catch (_) {}
      topAudio = null;
    }
    resetPlayerUI(activePlayerBox);
    activePlayerBox = null;
  };

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
    let idx = 0;
    dialogTimer = setInterval(() => {
      idx++;
      rpgText.textContent = text.slice(0, idx);
      if (idx >= text.length) clearInterval(dialogTimer);
    }, 15);
  };

  const closeDialog = () => {
    if (!dialogOpen) return;
    dialogOpen = false;
    clearInterval(dialogTimer);
    rpgDialog.classList.remove('open');
    rpgDialog.setAttribute('aria-hidden', 'true');
    window.AnshAudio.playUI(420);
  };

  const renderGlyphLensInterior = () => {
    const g = DATA.glyphlens;
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
              <img src="${g.logo}" alt="GlyphLens Logo" class="loc-logo" />
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
                <i class="fab fa-github"></i> View GlyphLens on GitHub
              </a>
              <a href="${g.repoUrl}/releases" target="_blank" rel="noopener" class="loc-btn">
                Releases (v0.1.1-preview)
              </a>
            </div>
          </div>

          <aside class="loc-side">
            <div class="sim-panel">
              <div class="sim-head">
                <span>INTERACTIVE PIPELINE PREVIEW</span>
                <button type="button" class="sim-toggle" id="glOverlayBtn">Overlay: ON</button>
              </div>
              <div class="sim-stage">
                <div class="sim-window-bar">Target: Desktop Window (D3D11 Capture)</div>
                <div class="sim-capture-box">
                  <span class="sim-tag">PaddleOCR PP-OCRv5 · 1.2% CER</span>
                  <div class="sim-ocr-text">設定 · ローカル翻訳モード</div>
                </div>
                <div class="sim-translation" id="glOverlayPill">
                  <span class="sim-pill-k">CTranslate2 · Named Pipe IPC · Offline</span>
                  <span class="sim-pill-v">Settings · Local translation mode</span>
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

  const renderArcusInterior = () => {
    const a = DATA.arcus;
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
              <img src="${a.mark}" alt="Arcus Mark" class="loc-logo" />
              <div>
                <h1 class="loc-title">${a.name}</h1>
                <p class="loc-tagline">${a.subtitle}</p>
              </div>
            </div>

            <div class="loc-banner-wrap">
              <img src="${a.banner}" alt="Arcus Share Banner" class="loc-banner" />
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
                <i class="fab fa-github"></i> View Arcus on GitHub
              </a>
            </div>
          </div>

          <aside class="loc-side">
            <div class="sim-panel">
              <div class="sim-head">
                <span>LOCAL LOGGER &amp; REST TIMER PREVIEW</span>
                <span id="arcusDoneStat">1 / 3 Logged</span>
              </div>
              <div class="sim-stage">
                <div class="timer-row">
                  <span class="sim-tag">Rest Timer</span>
                  <span class="timer-val" id="arcusTimerVal">01:30</span>
                  <button type="button" class="sim-toggle" id="arcusTimerBtn">Start</button>
                </div>
                <div class="arcus-sets" id="arcusSets">
                  <button type="button" class="arcus-set done">
                    <span>Barbell Bench Press</span><span class="set-meta">IndexedDB Draft</span><span class="set-chk">✓</span>
                  </button>
                  <button type="button" class="arcus-set">
                    <span>Weighted Pull-Ups</span><span class="set-meta">Tap to Log</span><span class="set-chk">○</span>
                  </button>
                  <button type="button" class="arcus-set">
                    <span>Romanian Deadlift</span><span class="set-meta">Tap to Log</span><span class="set-chk">○</span>
                  </button>
                </div>
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
            <span class="loc-sub">${o.region}</span>
          </div>
          <button type="button" class="loc-exit-btn" data-exit-scene>
            <span>[ESC] Back to Plaza</span>
          </button>
        </header>

        <div class="loc-single">
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
            <a href="${o.github}" target="_blank" rel="noopener" class="loc-btn loc-btn-primary">
              <i class="fab fa-github"></i> GitHub @ansh1ndia
            </a>
            <a href="${o.instagram}" target="_blank" rel="noopener" class="loc-btn">
              <i class="fab fa-instagram"></i> Instagram @ansh1ndia
            </a>
            <a href="${o.rewatch}" target="_blank" rel="noopener" class="loc-btn">
              <i class="fas fa-film"></i> Rewatch @ansh
            </a>
          </div>
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

        <div class="loc-single">
          <h1 class="loc-title">Transmit Message</h1>
          <p class="loc-tagline">Direct terminal to Ansh · Lucknow, India</p>

          <form class="term-form" id="townContactForm">
            <div class="term-row">
              <label>Sender Name <input type="text" required placeholder="Your name" /></label>
              <label>Return Address <input type="email" required placeholder="you@domain.com" /></label>
            </div>
            <label>Transmission <textarea rows="4" required placeholder="Project inquiry, collaboration, or feedback..."></textarea></label>
            <div class="term-foot">
              <button type="submit" class="loc-btn loc-btn-primary" id="termSubmitBtn">Send Transmission</button>
              <span class="term-status" id="termStatus"></span>
            </div>
          </form>

          <div class="loc-actions" style="margin-top:1.4rem">
            <a href="${o.github}" target="_blank" rel="noopener" class="loc-btn"><i class="fab fa-github"></i> github.com/ansh1ndia</a>
            <a href="${o.instagram}" target="_blank" rel="noopener" class="loc-btn"><i class="fab fa-instagram"></i> @ansh1ndia</a>
          </div>
        </div>
      </div>`;
  };

  const renderMediaActions = (item, actionLabel) => {
    const playerHtml = item.previewUrl ? `
      <div class="song-player" data-preview="${item.previewUrl}">
        <button type="button" class="play-btn">
          <i class="fas fa-play"></i> <span>Play</span>
        </button>
        <div class="song-bar"><div class="song-fill"></div></div>
        <span class="song-time">0:30</span>
      </div>` : '';

    const links = [];
    if (item.mediaUrl) {
      links.push(`<a href="${item.mediaUrl}" target="_blank" rel="noopener" class="media-link media-link-accent"><i class="fas fa-play-circle"></i> ${actionLabel || 'Trailer'}</a>`);
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

    /* Top 3 Pedestal order: #2 left, #1 center tallest, #3 right */
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
          <div class="rw-tabs">
            ${tabs.map(([tid, label]) => `
              <button type="button" class="rw-tab ${tid === id ? 'active' : ''}" data-rw-switch="${tid}">${label}</button>
            `).join('')}
          </div>

          <h1 class="loc-title">${rw.title}</h1>
          <p class="loc-tagline">${rw.subtitle}</p>

          <!-- Top 3 Stepped Pedestal -->
          <div class="podium-grid">
            ${podiumOrder.map(p => `
              <div class="podium-slot ${p.tier}">
                <div class="podium-art ${artCls}">
                  <img src="${p.item.img}" alt="${p.item.name}" loading="lazy" />
                  <span class="podium-rank">#0${p.rank}</span>
                </div>
                <div class="podium-base">
                  <div class="podium-title">${p.item.name}</div>
                  <div class="podium-meta">${p.item.meta}</div>
                  ${renderMediaActions(p.item, rw.actionLabel)}
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
                    ${renderMediaActions(item, rw.actionLabel)}
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

  const wireInteriorEvents = id => {
    sceneBody.querySelectorAll('[data-exit-scene]').forEach(btn => {
      btn.addEventListener('click', closeScene);
    });

    sceneBody.querySelectorAll('[data-rw-switch]').forEach(btn => {
      btn.addEventListener('click', () => {
        stopTopAudio();
        window.AnshAudio.playUI(580);
        const nextId = btn.dataset.rwSwitch;
        activeSceneId = nextId;
        sceneBody.innerHTML = renderRewatchInterior(nextId);
        wireInteriorEvents(nextId);
      });
    });

    /* Playable Preview Controller for All Top 5 Songs */
    sceneBody.querySelectorAll('.song-player[data-preview]').forEach(box => {
      const btn  = box.querySelector('.play-btn');
      const fill = box.querySelector('.song-fill');
      const tm   = box.querySelector('.song-time');
      const url  = box.dataset.preview;
      if (!btn || !url) return;

      btn.addEventListener('click', () => {
        if (activePlayerBox === box && topAudio) {
          if (topAudio.paused) {
            topAudio.play().then(() => {
              btn.classList.add('is-playing');
              btn.innerHTML = '<i class="fas fa-pause"></i> <span>Pause</span>';
            }).catch(() => {});
          } else {
            topAudio.pause();
            btn.classList.remove('is-playing');
            btn.innerHTML = '<i class="fas fa-play"></i> <span>Play</span>';
          }
          return;
        }

        stopTopAudio();
        activePlayerBox = box;
        topAudio = new Audio(url);
        topAudio.volume = 0.72;

        topAudio.addEventListener('timeupdate', () => {
          if (!topAudio || !topAudio.duration || activePlayerBox !== box) return;
          const pct = (topAudio.currentTime / topAudio.duration) * 100;
          if (fill) fill.style.width = `${pct.toFixed(1)}%`;
          const rem = Math.max(0, Math.ceil(topAudio.duration - topAudio.currentTime));
          if (tm) tm.textContent = `0:${String(rem).padStart(2, '0')}`;
        });

        topAudio.addEventListener('ended', () => {
          if (activePlayerBox === box) resetPlayerUI(box);
        });

        topAudio.play().then(() => {
          btn.classList.add('is-playing');
          btn.innerHTML = '<i class="fas fa-pause"></i> <span>Pause</span>';
        }).catch(() => {
          if (tm) tm.textContent = 'Unavailable';
        });
      });
    });

    if (id === 'glyphlens') {
      const ovBtn  = document.getElementById('glOverlayBtn');
      const ovPill = document.getElementById('glOverlayPill');
      if (ovBtn && ovPill) {
        ovBtn.addEventListener('click', () => {
          window.AnshAudio.playUI(620);
          const off = ovPill.classList.toggle('off');
          ovBtn.textContent = off ? 'Overlay: OFF' : 'Overlay: ON';
        });
      }
      sceneBody.querySelectorAll('[data-gl-mode]').forEach(mBtn => {
        mBtn.addEventListener('click', () => {
          window.AnshAudio.playUI(540);
          sceneBody.querySelectorAll('[data-gl-mode]').forEach(b => b.classList.remove('active'));
          mBtn.classList.add('active');
          if (ovPill) {
            const isPanel = mBtn.dataset.glMode === 'panel';
            ovPill.querySelector('.sim-pill-k').textContent = isPanel
              ? 'Side Panel Feed · History & Copy Mode'
              : 'CTranslate2 · Named Pipe IPC · Offline';
          }
        });
      });
    }

    if (id === 'arcus') {
      const setsWrap = document.getElementById('arcusSets');
      const statEl   = document.getElementById('arcusDoneStat');
      if (setsWrap && statEl) {
        const sets = setsWrap.querySelectorAll('.arcus-set');
        sets.forEach(btn => {
          btn.addEventListener('click', () => {
            window.AnshAudio.playUI(680);
            const done = btn.classList.toggle('done');
            btn.querySelector('.set-chk').textContent = done ? '✓' : '○';
            btn.querySelector('.set-meta').textContent = done ? 'IndexedDB Draft' : 'Tap to Log';
            statEl.textContent = `${setsWrap.querySelectorAll('.arcus-set.done').length} / ${sets.length} Logged`;
          });
        });
      }

      const tBtn = document.getElementById('arcusTimerBtn');
      const tVal = document.getElementById('arcusTimerVal');
      let secs = 90;
      let tRunning = false;
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
              secs = secs > 0 ? secs - 1 : 90;
              const m = String(Math.floor(secs / 60)).padStart(2, '0');
              const s = String(secs % 60).padStart(2, '0');
              tVal.textContent = `${m}:${s}`;
            }, 1000);
          }
        });
      }
    }

    if (id === 'contact') {
      const form = document.getElementById('townContactForm');
      const status = document.getElementById('termStatus');
      const submitBtn = document.getElementById('termSubmitBtn');
      if (form) {
        form.addEventListener('submit', e => {
          e.preventDefault();
          window.AnshAudio.playUI(640);
          submitBtn.disabled = true;
          submitBtn.textContent = 'Transmitting…';
          setTimeout(() => {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Send Transmission';
            status.textContent = '✓ Message queued locally (demo terminal).';
            form.reset();
            setTimeout(() => { status.textContent = ''; }, 4500);
          }, 900);
        });
      }
    }
  };

  const openScene = id => {
    closeDialog();
    clearInterval(timerInterval);
    stopTopAudio();
    window.AnshAudio.playDoor(true);

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
    }, 220);
  };

  const closeScene = () => {
    if (!activeSceneId) return;
    clearInterval(timerInterval);
    stopTopAudio();
    window.AnshAudio.playDoor(false);
    curtain.classList.add('active');
    setTimeout(() => {
      activeSceneId = null;
      sceneEl.classList.remove('open');
      sceneEl.setAttribute('aria-hidden', 'true');
      curtain.classList.remove('active');
    }, 200);
  };

  const handleInteractable = obj => {
    if (!obj) return;
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
    isDialogOpen
  };
})();
