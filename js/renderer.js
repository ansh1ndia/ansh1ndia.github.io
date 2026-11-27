/* ─── js/renderer.js — High-Craft Baked-Buffer Cyberpunk Pixel Renderer (42x26 World) ─── */
window.AnshRenderer = (() => {
  const W = window.AnshWorld;
  const T = W.T;

  /* Pooled atmospheric particles (zero GC churn) */
  const MAX_RAIN = 160;
  const rain = Array.from({ length: MAX_RAIN }, (_, i) => ({
    x: (i * 83) % 1200,
    y: (i * 59) % 900,
    len: 8 + (i % 6),
    spd: 420 + (i % 6) * 45
  }));

  const splashes = Array.from({ length: 24 }, (_, i) => ({
    x: (i * 107) % W.WIDTH,
    y: (i * 73) % W.HEIGHT,
    t: (i * 0.11) % 1
  }));

  const petals = Array.from({ length: 34 }, (_, i) => ({
    x: (i * 97) % W.WIDTH,
    y: (i * 61) % W.HEIGHT,
    vx: 14 + (i % 5) * 4,
    vy: 16 + (i % 4) * 5,
    phase: i * 0.7
  }));

  const drone = { x: 0, speed: 68 };
  let lightningAlpha = 0;
  let nextLightningAt = 16;

  const camera = { x: 0, y: 0, w: 896, h: 504 };
  const hash = (a, b) => Math.abs(Math.sin(a * 127.1 + b * 311.7) * 43758.5453) % 1;

  const drawOrganicCluster = (ctx, cx, cy, lobes, palette) => {
    ctx.fillStyle = palette[0];
    lobes.forEach(([ox, oy, r]) => {
      ctx.fillRect(Math.round(cx + ox - r), Math.round(cy + oy - r + 2), r * 2, r * 2);
    });
    ctx.fillStyle = palette[1];
    lobes.forEach(([ox, oy, r]) => {
      ctx.fillRect(Math.round(cx + ox - r + 1), Math.round(cy + oy - r), r * 2 - 2, r * 2 - 2);
    });
    ctx.fillStyle = palette[2];
    lobes.forEach(([ox, oy, r], idx) => {
      if (idx % 2 === 0 || oy <= 0) {
        ctx.fillRect(Math.round(cx + ox - r + 2), Math.round(cy + oy - r + 1), Math.max(4, r * 1.4), Math.max(4, r * 1.1));
      }
    });
    ctx.fillStyle = palette[3];
    lobes.slice(0, 3).forEach(([ox, oy, r]) => {
      ctx.fillRect(Math.round(cx + ox - r + 3), Math.round(cy + oy - r + 2), Math.max(3, Math.round(r * 0.7)), 3);
    });
  };

  /* ── One-Time Pre-Baked Static Terrain + Static Props Canvas (O(1) per-frame blit!) ── */
  const staticCanvas = document.createElement('canvas');
  staticCanvas.width = W.WIDTH;
  staticCanvas.height = W.HEIGHT;
  const sCtx = staticCanvas.getContext('2d');

  const bakeStaticWorld = () => {
    const stoneShades = ['#181924', '#1b1d2a', '#151621', '#1e202e'];
    const pinePalette = ['#071412', '#0f2621', '#183b33', '#2d5c50'];

    for (let r = 0; r < W.ROWS; r++) {
      for (let c = 0; c < W.COLS; c++) {
        const ch = W.MAP[r][c];
        const x = c * T;
        const y = r * T;
        const h = hash(c, r);

        sCtx.fillStyle = (r + c) % 2 === 0 ? '#0a0e13' : '#0c1117';
        sCtx.fillRect(x, y, T, T);

        if (ch === '.' || ch === 'T' || ch === 'K') {
          sCtx.fillStyle = 'rgba(255,255,255,0.025)';
          if (h > 0.4) sCtx.fillRect(x + 7, y + 10, 2, 3);
          if (h > 0.7) sCtx.fillRect(x + 21, y + 22, 2, 3);
        }

        if ('PUNVLSMGZYXJQIO3456'.includes(ch)) {
          for (let sy = 0; sy < 2; sy++) {
            for (let sx = 0; sx < 2; sx++) {
              const bx = x + sx * 16;
              const by = y + sy * 16;
              const idx = Math.floor(hash(c * 2 + sx, r * 2 + sy) * stoneShades.length);
              sCtx.fillStyle = stoneShades[idx];
              sCtx.fillRect(bx, by, 16, 16);
              sCtx.fillStyle = 'rgba(255,255,255,0.05)';
              sCtx.fillRect(bx, by, 15, 1);
              sCtx.fillRect(bx, by, 1, 15);
              sCtx.fillStyle = 'rgba(0,0,0,0.45)';
              sCtx.fillRect(bx, by + 15, 16, 1);
              sCtx.fillRect(bx + 15, by, 1, 16);
            }
          }
          if (h > 0.72) {
            sCtx.fillStyle = 'rgba(244,114,182,0.5)';
            sCtx.fillRect(x + 6, y + 12, 3, 2);
            sCtx.fillRect(x + 22, y + 24, 2, 2);
          }
        }

        if (ch === 'R') {
          sCtx.fillStyle = '#0e1017';
          sCtx.fillRect(x, y, T, T);
          sCtx.fillStyle = 'rgba(255,255,255,0.025)';
          sCtx.fillRect(x, y, T, 1);
          if (c % 2 === 0) {
            sCtx.fillStyle = 'rgba(251,191,36,0.2)';
            sCtx.fillRect(x + 6, y + 15, 18, 2);
          }
          sCtx.fillStyle = c < 17 ? 'rgba(239,68,68,0.08)' : c > 23 ? 'rgba(56,189,248,0.08)' : 'rgba(244,114,182,0.05)';
          sCtx.fillRect(x + 3, y + 6, 22, 2);
        }

        if (ch === '=') {
          sCtx.fillStyle = '#252736';
          sCtx.fillRect(x, y, T, T);
          sCtx.fillStyle = '#2e3144';
          sCtx.fillRect(x + 1, y + 2, T - 2, 12);
          sCtx.fillRect(x + 1, y + 18, T - 2, 12);
          sCtx.fillStyle = 'rgba(255,255,255,0.06)';
          sCtx.fillRect(x + 1, y + 2, T - 2, 2);
          sCtx.fillRect(x + 1, y + 18, T - 2, 2);
        }

        if (ch === '|') {
          sCtx.fillStyle = '#050a14';
          sCtx.fillRect(x, y, T, T);
          sCtx.fillStyle = '#2b2d3e';
          sCtx.fillRect(x + 8, y, 16, T);
          sCtx.fillStyle = '#3c3f54';
          sCtx.fillRect(x + 10, y, 4, T);
          if (r === 11 || r === 13) {
            sCtx.fillStyle = '#181a24';
            sCtx.fillRect(x + 6, y + 4, 20, 24);
            sCtx.fillStyle = '#ef4444';
            sCtx.fillRect(x + 10, y + 8, 12, 14);
            sCtx.fillStyle = '#fecaca';
            sCtx.fillRect(x + 13, y + 11, 6, 8);
          }
        }

        if (ch === 'F') {
          sCtx.fillStyle = 'rgba(0,0,0,0.45)';
          sCtx.fillRect(x, y + 21, T, 5);
          sCtx.fillStyle = '#3b2b27';
          sCtx.fillRect(x, y + 11, T, 4);
          sCtx.fillRect(x, y + 18, T, 3);
          sCtx.fillStyle = '#272732';
          sCtx.fillRect(x + 1, y + 8, 5, 16);
          sCtx.fillRect(x + 26, y + 8, 5, 16);
          sCtx.fillStyle = 'rgba(255,255,255,0.12)';
          sCtx.fillRect(x + 1, y + 8, 5, 2);
          sCtx.fillRect(x + 26, y + 8, 5, 2);
        }

        if (ch === 'T') {
          sCtx.fillStyle = 'rgba(0,0,0,0.48)';
          sCtx.fillRect(x + 4, y + 24, 24, 6);
          sCtx.fillStyle = '#1e1614';
          sCtx.fillRect(x + 12, y + 18, 8, 12);
          drawOrganicCluster(sCtx, x + 16, y + 13, [
            [0, -4, 11], [-8, 2, 9], [8, 2, 9], [0, 4, 10]
          ], pinePalette);
        }

        if (ch === 'L') {
          sCtx.fillStyle = 'rgba(0,0,0,0.5)';
          sCtx.fillRect(x + 11, y + 25, 10, 4);
          sCtx.fillStyle = '#1e202c';
          sCtx.fillRect(x + 14, y + 8, 4, 20);
          sCtx.fillStyle = '#2d3042';
          sCtx.fillRect(x + 11, y + 2, 10, 4);
          sCtx.fillStyle = '#f59e0b';
          sCtx.fillRect(x + 11, y + 6, 10, 8);
          sCtx.fillStyle = '#fef3c7';
          sCtx.fillRect(x + 13, y + 7, 6, 6);
        }

        /* Visual directional poster signs */
        if (ch === 'J' || ch === 'Q' || ch === 'I' || ch === 'O') {
          const dirMeta = {
            J: { color: '#ef4444', line1: '← GLYPHLENS', line2: '↑ SHRINE' },
            Q: { color: '#38bdf8', line1: 'ARCUS →',     line2: '↑ SHRINE' },
            I: { color: '#f59e0b', line1: '↑ INTRO',     line2: 'BRIDGE ↗' },
            O: { color: '#f472b6', line1: '↑ MAIL',      line2: '← BRIDGE' }
          }[ch];
          sCtx.fillStyle = 'rgba(0,0,0,0.48)';
          sCtx.fillRect(x + 10, y + 26, 12, 4);
          sCtx.fillStyle = '#272734';
          sCtx.fillRect(x + 14, y + 4, 4, 24);
          const pw = 54, ph = 22;
          const px = x + 16 - pw / 2;
          const py = y - 2;
          sCtx.fillStyle = '#090b12';
          sCtx.fillRect(px, py, pw, ph);
          sCtx.strokeStyle = dirMeta.color;
          sCtx.lineWidth = 1;
          sCtx.strokeRect(px + 0.5, py + 0.5, pw - 1, ph - 1);
          sCtx.fillStyle = dirMeta.color;
          sCtx.fillRect(px + 2, py + 2, pw - 4, 2);
          sCtx.textAlign = 'center';
          sCtx.fillStyle = '#f8fafc';
          sCtx.font = '500 6.5px "JetBrains Mono", monospace';
          sCtx.fillText(dirMeta.line1, x + 16, py + 11);
          sCtx.fillStyle = '#94a3b8';
          sCtx.font = '500 6px "JetBrains Mono", monospace';
          sCtx.fillText(dirMeta.line2, x + 16, py + 19);
        }
      }
    }
  };
  bakeStaticWorld();

  /* ── Cached Radial Glow Sprites & Vignette Cache (Zero Per-Frame Gradient Allocations!) ── */
  const makeGlowSprite = (rgb, radius, peakAlpha) => {
    const c = document.createElement('canvas');
    c.width = radius * 2;
    c.height = radius * 2;
    const gctx = c.getContext('2d');
    const grad = gctx.createRadialGradient(radius, radius, 4, radius, radius, radius);
    grad.addColorStop(0, `rgba(${rgb},${peakAlpha})`);
    grad.addColorStop(0.5, `rgba(${rgb},${(peakAlpha * 0.3).toFixed(2)})`);
    grad.addColorStop(1, `rgba(${rgb},0)`);
    gctx.fillStyle = grad;
    gctx.fillRect(0, 0, c.width, c.height);
    return c;
  };
  const lampGlowSprite    = makeGlowSprite('245,158,11', 84, 0.25);
  const crimsonGlowSprite = makeGlowSprite('239,68,68', 180, 0.24);
  const blueGlowSprite    = makeGlowSprite('56,189,248', 180, 0.24);

  let vigCanvas = null;
  let lastVigKey = '';
  const getVignette = (w, h, mood) => {
    const key = `${w}x${h}:${mood || 'midnight'}`;
    if (vigCanvas && lastVigKey === key) return vigCanvas;
    lastVigKey = key;
    if (!vigCanvas) vigCanvas = document.createElement('canvas');
    vigCanvas.width = w;
    vigCanvas.height = h;
    const vctx = vigCanvas.getContext('2d');
    const moodVigMap = {
      midnight:  'rgba(3,5,10,0.58)',
      bloodmoon: 'rgba(34,4,9,0.62)',
      sakura:    'rgba(32,8,28,0.54)',
      matrix:    'rgba(3,24,14,0.6)'
    };
    const vig = vctx.createRadialGradient(w / 2, h / 2, h * 0.36, w / 2, h / 2, w * 0.72);
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(1, moodVigMap[mood] || moodVigMap.midnight);
    vctx.fillStyle = vig;
    vctx.fillRect(0, 0, w, h);
    return vigCanvas;
  };

  /* Pre-baked Static Minimap Buffer */
  let miniBgCanvas = null;
  const ensureMinimapBg = (mw, mh) => {
    if (miniBgCanvas && miniBgCanvas.width === mw && miniBgCanvas.height === mh) return miniBgCanvas;
    miniBgCanvas = document.createElement('canvas');
    miniBgCanvas.width = mw;
    miniBgCanvas.height = mh;
    const mc = miniBgCanvas.getContext('2d');
    const sx = mw / W.COLS;
    const sy = mh / W.ROWS;
    mc.fillStyle = '#06080e';
    mc.fillRect(0, 0, mw, mh);
    for (let r = 0; r < W.ROWS; r++) {
      for (let c = 0; c < W.COLS; c++) {
        const ch = W.MAP[r][c];
        if (ch === 'W') mc.fillStyle = '#0f283d';
        else if (ch === '=' || ch === '|') mc.fillStyle = '#64748b';
        else if (ch === 'P' || ch === 'U' || ch === 'R') mc.fillStyle = '#1c202c';
        else if (ch === '1' || ch === 'A' || ch === 'G' || ch === 'J' || ch === '3') mc.fillStyle = '#ef4444';
        else if (ch === '2' || ch === 'D' || ch === 'Z' || ch === 'Q' || ch === '4') mc.fillStyle = '#38bdf8';
        else if (ch === 'B' || ch === 'S' || ch === 'Y' || ch === 'I' || ch === '5') mc.fillStyle = '#f59e0b';
        else if (ch === 'M' || ch === 'X' || ch === 'O' || ch === '6') mc.fillStyle = '#f472b6';
        else if (ch === 'K') mc.fillStyle = '#9d174d';
        else if (ch === 'T') mc.fillStyle = '#0b1215';
        else continue;
        mc.fillRect(Math.floor(c * sx), Math.floor(r * sy), Math.ceil(sx), Math.ceil(sy));
      }
    }
    return miniBgCanvas;
  };

  const updateCamera = (px, py, vw, vh) => {
    camera.w = vw;
    camera.h = vh;
    const tx = Math.max(0, Math.min(W.WIDTH - vw, px - vw / 2));
    const ty = Math.max(0, Math.min(W.HEIGHT - vh, py - vh / 2));
    camera.x += (tx - camera.x) * 0.16;
    camera.y += (ty - camera.y) * 0.16;
  };

  const screenToWorld = (sx, sy, rect) => {
    const scale = Math.min(rect.width / camera.w, rect.height / camera.h);
    const ox = (rect.width - camera.w * scale) / 2;
    const oy = (rect.height - camera.h * scale) / 2;
    return {
      x: (sx - rect.left - ox) / scale + camera.x,
      y: (sy - rect.top - oy) / scale + camera.y
    };
  };

  const drawAnimatedTiles = (ctx, time, settings) => {
    const cStart = Math.max(0, Math.floor(camera.x / T) - 1);
    const cEnd   = Math.min(W.COLS - 1, Math.ceil((camera.x + camera.w) / T) + 1);
    const rStart = Math.max(0, Math.floor(camera.y / T) - 1);
    const rEnd   = Math.min(W.ROWS - 1, Math.ceil((camera.y + camera.h) / T) + 1);
    const isEco  = settings.effectiveEco;

    for (let r = rStart; r <= rEnd; r++) {
      for (let c = cStart; c <= cEnd; c++) {
        const ch = W.MAP[r][c];
        if (ch !== 'U' && ch !== 'W') continue;
        const x = c * T;
        const y = r * T;
        const h = hash(c, r);

        if (ch === 'U') {
          ctx.fillStyle = 'rgba(7,11,20,0.68)';
          ctx.fillRect(x + 4, y + 6, 24, 20);
          ctx.fillRect(x + 2, y + 9, 28, 14);
          ctx.fillStyle = c < 17 ? 'rgba(239,68,68,0.22)' : c > 23 ? 'rgba(56,189,248,0.22)' : 'rgba(245,158,11,0.18)';
          const shim = isEco ? 0 : (Math.sin(time * 3.5 + c) > 0 ? 1 : 0);
          ctx.fillRect(x + 6 + shim, y + 10, 14, 2);
          ctx.fillRect(x + 11 - shim, y + 18, 12, 2);
          if (!settings.reducedMotion && !isEco) {
            const rp = ((time * 1.2 + h) % 1);
            const rad = 2 + rp * 7;
            ctx.strokeStyle = `rgba(255,255,255,${((1 - rp) * 0.18).toFixed(2)})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.ellipse(x + 16, y + 16, rad, rad * 0.55, 0, 0, Math.PI * 2);
            ctx.stroke();
          }
        } else if (ch === 'W') {
          ctx.fillStyle = '#050a14';
          ctx.fillRect(x, y, T, T);
          const wave = settings.reducedMotion ? 0 : Math.round(Math.sin(time * 2.2 + r * 0.9 + c * 0.4) * 3);
          if (c >= 16 && c <= 23) {
            ctx.fillStyle = (c === 17 || c === 21) ? 'rgba(239,68,68,0.38)' : 'rgba(245,158,11,0.22)';
            ctx.fillRect(x + 4 + wave, y + 6, 20, 3);
            ctx.fillRect(x + 8 - wave, y + 20, 14, 2);
          } else {
            ctx.fillStyle = c < 17 ? 'rgba(239,68,68,0.18)' : 'rgba(56,189,248,0.18)';
            ctx.fillRect(x + 6 + wave, y + 9, 14, 2);
            ctx.fillStyle = 'rgba(244,114,182,0.12)';
            ctx.fillRect(x + 10 - wave, y + 21, 10, 2);
          }
        }
      }
    }
  };

  const drawWetGroundReflections = (ctx, time, settings) => {
    const gObj = W.INTERACTABLES.find(i => i.id === 'glyphlens');
    const aObj = W.INTERACTABLES.find(i => i.id === 'arcus');
    const bObj = W.INTERACTABLES.find(i => i.id === 'about');
    const step = settings.effectiveEco ? 2 : 1;

    const drawStreaks = (cx, topY, spanW, rgb) => {
      for (let i = 0; i < 12; i += step) {
        const y = topY + i * 7;
        const alpha = Math.max(0.03, 0.3 - i * 0.022);
        const w = spanW * (0.85 - i * 0.04) + (settings.reducedMotion ? 0 : Math.sin(time * 2.5 + i) * 7);
        ctx.fillStyle = `rgba(${rgb}, ${alpha.toFixed(2)})`;
        ctx.fillRect(Math.round(cx - w / 2), Math.round(y), Math.round(w), 4);
      }
    };

    if (gObj) drawStreaks((gObj.hitBox.x1 + gObj.hitBox.x2) / 2, gObj.hitBox.y2 + 4, 140, '239, 68, 68');
    if (aObj) drawStreaks((aObj.hitBox.x1 + aObj.hitBox.x2) / 2, aObj.hitBox.y2 + 4, 140, '56, 189, 248');
    if (bObj) drawStreaks((bObj.hitBox.x1 + bObj.hitBox.x2) / 2, bObj.hitBox.y2 + 4, 96, '245, 158, 11');
  };

  const drawDynamicProps = (ctx, time, activeObj, settings) => {
    const sakuraPalette = ['#500724', '#9d174d', '#ec4899', '#fbcfe8'];

    /* Benches */
    W.PROPS.benches.forEach(b => {
      if (b.x + T < camera.x || b.x > camera.x + camera.w) return;
      const near = activeObj?.kind === 'bench' && activeObj.tx === b.c && activeObj.ty === b.r;
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(b.x + 3, b.y + 22, 26, 6);
      ctx.fillStyle = '#45231b';
      ctx.fillRect(b.x + 2, b.y + 8, 28, 12);
      ctx.fillStyle = '#7c3f2c';
      ctx.fillRect(b.x + 2, b.y + 8, 28, 4);
      ctx.fillStyle = '#18181f';
      ctx.fillRect(b.x + 4, b.y + 19, 4, 6);
      ctx.fillRect(b.x + 24, b.y + 19, 4, 6);
      if (near) {
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 1.2;
        ctx.strokeRect(b.x + 1.5, b.y + 7.5, 29, 13);
      }
    });

    /* Vending machines */
    W.PROPS.vendors.forEach(v => {
      if (v.x + T < camera.x || v.x > camera.x + camera.w) return;
      const vid = v.c < 20 ? 'vending_west' : 'vending_east';
      const near = activeObj?.id === vid;
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(v.x + 6, v.y + 25, 22, 5);
      ctx.fillStyle = '#181b26';
      ctx.fillRect(v.x + 5, v.y + 3, 22, 24);
      ctx.strokeStyle = near ? '#ffffff' : 'rgba(244,114,182,0.75)';
      ctx.lineWidth = near ? 1.8 : 1;
      ctx.strokeRect(v.x + 5.5, v.y + 3.5, 21, 23);
      ctx.fillStyle = v.c < 20 ? '#ef4444' : '#38bdf8';
      ctx.fillRect(v.x + 8, v.y + 6, 16, 10);
      ctx.fillStyle = '#f472b6';
      ctx.fillRect(v.x + 9, v.y + 8, 4, 3);
      ctx.fillRect(v.x + 15, v.y + 8, 4, 3);
      ctx.fillStyle = '#09090d';
      ctx.fillRect(v.x + 9, v.y + 20, 14, 4);
    });

    /* Swaying Sakura trees */
    W.PROPS.sakuras.forEach(sk => {
      const x = sk.c * T;
      const y = sk.r * T;
      if (x + T < camera.x - 16 || x > camera.x + camera.w + 16) return;
      const sway = settings.reducedMotion ? 0 : Math.sin(time * 1.4 + sk.c * 0.8) * 1.2;
      ctx.fillStyle = 'rgba(0,0,0,0.48)';
      ctx.fillRect(x + 4, y + 25, 26, 6);
      ctx.fillStyle = '#2e1d1b';
      ctx.fillRect(x + 12, y + 17, 8, 13);
      drawOrganicCluster(ctx, x + 16 + sway, y + 10, [
        [-2, -6, 12], [7, -3, 10], [-10, 1, 10], [8, 4, 9], [0, 4, 11]
      ], sakuraPalette);
    });

    /* Interactable signs, Rewatch Kiosks, Mail */
    for (const obj of W.INTERACTABLES) {
      const x = obj.tx * T;
      const y = obj.ty * T;
      if (x + T < camera.x - 20 || x > camera.x + camera.w + 20) continue;

      if (obj.kind === 'dialog') {
        const ch = W.MAP[obj.ty]?.[obj.tx];
        const signColor = {
          S: '#f59e0b', G: '#ef4444', Z: '#38bdf8', Y: '#f59e0b', X: '#f472b6'
        }[ch] || '#f59e0b';
        const tag = { S: 'DIR', G: '01', Z: '02', Y: 'BRG', X: 'SHR' }[ch] || 'INF';
        const near = activeObj?.id === obj.id;
        ctx.fillStyle = 'rgba(0,0,0,0.48)';
        ctx.fillRect(x + 8, y + 26, 16, 4);
        ctx.fillStyle = '#272732';
        ctx.fillRect(x + 14, y + 18, 4, 11);
        ctx.fillStyle = '#11131b';
        ctx.fillRect(x + 3, y + 4, 26, 16);
        ctx.strokeStyle = near ? '#ffffff' : signColor;
        ctx.lineWidth = near ? 1.5 : 1;
        ctx.strokeRect(x + 3.5, y + 4.5, 25, 15);
        ctx.fillStyle = signColor;
        ctx.fillRect(x + 6, y + 7, 20, 2);
        ctx.fillStyle = '#e2e8f0';
        ctx.font = '500 7px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(tag, x + 16, y + 17);
      } else if (obj.kind === 'rewatch') {
        const rwMeta = {
          rewatch_films:  { color: '#ef4444', label: 'FILMS',  kind: 'cinema' },
          rewatch_series: { color: '#38bdf8', label: 'SERIES', kind: 'screen' },
          rewatch_albums: { color: '#f59e0b', label: 'ALBUMS', kind: 'vinyl'  },
          rewatch_songs:  { color: '#f472b6', label: 'SONGS',  kind: 'eq'     }
        }[obj.id];
        if (!rwMeta) continue;
        const near = activeObj?.id === obj.id;
        const rw = 44;
        const rh = 34;
        const bx = Math.round(x + 16 - rw / 2);
        const by = Math.round(y + 16 - rh / 2) - 2;

        /* Night-market floor spill & grounded shop pad */
        ctx.fillStyle = 'rgba(0,0,0,0.56)';
        ctx.fillRect(bx - 1, by + rh - 3, rw + 2, 7);
        ctx.fillStyle = '#0f121d';
        ctx.fillRect(bx, by + 2, rw, rh - 2);
        ctx.strokeStyle = near ? '#ffffff' : rwMeta.color;
        ctx.lineWidth = near ? 1.8 : 1.1;
        ctx.strokeRect(bx + 0.5, by + 2.5, rw - 1, rh - 3);

        /* Open booth backdrop & serving counter */
        ctx.fillStyle = '#070910';
        ctx.fillRect(bx + 3, by + 11, rw - 6, 14);
        ctx.fillStyle = '#5c2f22';
        ctx.fillRect(bx + 2, by + 24, rw - 4, 4);
        ctx.fillStyle = rwMeta.color;
        ctx.fillRect(bx + 2, by + 27, rw - 4, 1.5);

        /* Striped festival canopy awning & fairy bulbs */
        const stripeCount = 6;
        const stripeW = (rw - 2) / stripeCount;
        for (let si = 0; si < stripeCount; si++) {
          ctx.fillStyle = si % 2 === 0 ? rwMeta.color : '#1b2032';
          ctx.fillRect(Math.round(bx + 1 + si * stripeW), by + 1, Math.ceil(stripeW), 8);
        }
        ctx.fillStyle = '#fef08a';
        for (let fi = 0; fi < 5; fi++) {
          ctx.fillRect(bx + 5 + fi * 8, by + 9, 2, 2);
        }

        /* Bespoke shop merchandise inside booth */
        if (rwMeta.kind === 'cinema') {
          ctx.fillStyle = '#ef4444'; ctx.fillRect(bx + 6, by + 13, 8, 10);
          ctx.fillStyle = '#f59e0b'; ctx.fillRect(bx + 16, by + 13, 8, 10);
          ctx.fillStyle = '#fef2f2';
          ctx.fillRect(bx + 28, by + 15, 5, 5);
          ctx.fillRect(bx + 34, by + 15, 5, 5);
          ctx.fillStyle = '#dc2626'; ctx.fillRect(bx + 29, by + 20, 9, 4);
        } else if (rwMeta.kind === 'screen') {
          ctx.fillStyle = '#1e293b'; ctx.fillRect(bx + 6, by + 13, 20, 11);
          ctx.fillStyle = '#38bdf8'; ctx.fillRect(bx + 8, by + 15, 16, 7);
          ctx.fillStyle = '#bae6fd'; ctx.fillRect(bx + 10, by + 17, 9, 2);
          ctx.fillStyle = '#334155'; ctx.fillRect(bx + 29, by + 14, 9, 9);
          ctx.fillStyle = '#f472b6'; ctx.fillRect(bx + 30, by + 16, 7, 2);
          ctx.fillStyle = '#f59e0b'; ctx.fillRect(bx + 30, by + 19, 7, 2);
        } else if (rwMeta.kind === 'vinyl') {
          const ang = settings.reducedMotion ? 0 : time * 3;
          ctx.fillStyle = '#7c3f2c'; ctx.fillRect(bx + 5, by + 16, 10, 8);
          ctx.fillStyle = '#ef4444'; ctx.fillRect(bx + 6, by + 14, 3, 4);
          ctx.fillStyle = '#38bdf8'; ctx.fillRect(bx + 10, by + 13, 4, 5);
          ctx.fillStyle = '#f59e0b';
          ctx.beginPath(); ctx.arc(bx + 25, by + 19, 5.5, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#07090f'; ctx.fillRect(bx + 24, by + 18, 2, 2);
          ctx.fillStyle = '#fef3c7';
          ctx.fillRect(Math.round(bx + 25 + Math.cos(ang) * 3.5), Math.round(by + 19 + Math.sin(ang) * 3.5), 1.5, 1.5);
          ctx.fillStyle = '#ec4899'; ctx.fillRect(bx + 33, by + 14, 6, 8);
        } else if (rwMeta.kind === 'eq') {
          ctx.fillStyle = '#181826';
          ctx.fillRect(bx + 5, by + 13, 7, 11);
          ctx.fillRect(bx + 32, by + 13, 7, 11);
          ctx.fillStyle = '#ec4899';
          ctx.fillRect(bx + 7, by + 15, 3, 3); ctx.fillRect(bx + 7, by + 19, 3, 3);
          ctx.fillRect(bx + 34, by + 15, 3, 3); ctx.fillRect(bx + 34, by + 19, 3, 3);
          ctx.fillStyle = '#f472b6';
          for (let b = 0; b < 4; b++) {
            const bh = settings.reducedMotion ? 5 : (3 + Math.round((0.5 + 0.5 * Math.sin(time * 6 + b * 1.4)) * 7));
            ctx.fillRect(bx + 15 + b * 4, by + 23 - bh, 2.5, bh);
          }
        }

        /* Fairground signboard nameplate */
        ctx.fillStyle = '#070910';
        ctx.fillRect(bx + 6, by + 28, rw - 12, 8);
        ctx.textAlign = 'center';
        ctx.fillStyle = rwMeta.color;
        ctx.font = '600 6.5px "JetBrains Mono", monospace';
        ctx.fillText(rwMeta.label, x + 16, by + 34.5);
      } else if (obj.kind === 'terminal') {
        const near = activeObj?.id === 'contact';
        ctx.fillStyle = 'rgba(0,0,0,0.52)';
        ctx.fillRect(x + 4, y + 26, 24, 5);
        ctx.fillStyle = '#272734';
        ctx.fillRect(x + 12, y + 20, 8, 10);
        ctx.fillStyle = '#1c1218';
        ctx.fillRect(x + 4, y + 4, 24, 18);
        ctx.strokeStyle = near ? '#fff' : '#f472b6';
        ctx.lineWidth = near ? 2 : 1.2;
        ctx.strokeRect(x + 4.5, y + 4.5, 23, 17);
        ctx.strokeStyle = '#fbcfe8';
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 8.5, y + 9.5, 15, 9);
        ctx.beginPath();
        ctx.moveTo(x + 9, y + 10);
        ctx.lineTo(x + 16, y + 15);
        ctx.lineTo(x + 23, y + 10);
        ctx.stroke();
        ctx.fillStyle = '#f472b6';
        ctx.font = '500 8px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('MAIL', x + 16, y);
      }
    }
  };

  const drawBuildingsAndBoards = (ctx, time, activeObj, settings) => {
    const shObj = W.INTERACTABLES.find(i => i.id === 'shrine_stone');
    if (shObj) {
      const sx = shObj.hitBox.x1;
      const sy = shObj.hitBox.y1;
      const near = activeObj?.id === 'shrine_stone';
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.fillRect(sx + 10, sy + 24, 78, 8);
      ctx.fillStyle = '#991b1b';
      ctx.fillRect(sx + 16, sy + 2, 7, 26);
      ctx.fillRect(sx + 73, sy + 2, 7, 26);
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(sx + 8, sy - 2, 80, 6);
      ctx.fillRect(sx + 14, sy + 7, 68, 4);
      ctx.fillStyle = '#1e2028';
      ctx.fillRect(sx + 38, sy + 12, 20, 16);
      ctx.strokeStyle = near ? '#f472b6' : 'rgba(255,255,255,0.22)';
      ctx.strokeRect(sx + 38.5, sy + 12.5, 19, 15);

      const cx = sx + 84;
      const cy = sy + 24;
      const tailWag = settings.reducedMotion ? 0 : Math.round(Math.sin(time * 3.4) * 2);
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.fillRect(cx - 4, cy + 4, 10, 3);
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(cx - 3, cy - 2, 7, 6);
      ctx.fillRect(cx - 3, cy - 6, 6, 4);
      ctx.fillStyle = '#f472b6';
      ctx.fillRect(cx - 3, cy - 8, 2, 2);
      ctx.fillRect(cx + 1, cy - 8, 2, 2);
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(cx + 4, cy - 1 + Math.min(0, tailWag), 2, 4);
    }

    const abObj = W.INTERACTABLES.find(i => i.id === 'about');
    if (abObj) {
      const bx = abObj.hitBox.x1;
      const by = abObj.hitBox.y1 + 2;
      const bw = abObj.hitBox.x2 - abObj.hitBox.x1;
      const bh = (abObj.hitBox.y2 - abObj.hitBox.y1) - 10;
      const near = activeObj?.id === 'about';

      ctx.fillStyle = 'rgba(0,0,0,0.52)';
      ctx.fillRect(bx + 6, by + bh + 6, bw - 6, 8);
      ctx.fillStyle = '#272732';
      ctx.fillRect(bx + 14, by + bh, 6, 12);
      ctx.fillRect(bx + bw - 20, by + bh, 6, 12);
      ctx.fillStyle = '#090a10';
      ctx.fillRect(bx, by, bw, bh);
      ctx.strokeStyle = near ? '#fff' : '#f59e0b';
      ctx.lineWidth = near ? 2 : 1.3;
      ctx.strokeRect(bx, by, bw, bh);
      ctx.fillStyle = '#181a24';
      ctx.fillRect(bx + 6, by + 6, 26, bh - 12);
      ctx.fillStyle = '#fca5a5';
      ctx.fillRect(bx + 13, by + 11, 12, 13);
      ctx.fillStyle = '#18181b';
      ctx.fillRect(bx + 11, by + 8, 15, 7);
      ctx.fillStyle = '#e4e4e7';
      ctx.fillRect(bx + 11, by + 24, 16, 12);
      ctx.textAlign = 'left';
      ctx.fillStyle = '#f59e0b';
      ctx.font = '500 7px "JetBrains Mono", monospace';
      ctx.fillText('INTRO BOARD', bx + 38, by + 18);
      ctx.fillStyle = '#f8fafc';
      ctx.font = '400 22px "Bebas Neue", sans-serif';
      ctx.fillText('ANSH.', bx + 38, by + 40);
    }

    const drawHeroBuilding = (obj, cfg) => {
      const hx = obj.hitBox.x1;
      const hy = obj.hitBox.y1;
      const hw = obj.hitBox.x2 - obj.hitBox.x1;
      const hh = obj.hitBox.y2 - obj.hitBox.y1;
      const near = activeObj?.id === obj.id;
      const flicker = settings.reducedMotion || Math.sin(time * 10 + (cfg.isBlue ? 2.1 : 0)) > -0.94;

      ctx.fillStyle = 'rgba(0,0,0,0.58)';
      ctx.fillRect(hx + 8, hy + hh, hw + 6, 12);
      ctx.fillRect(hx + hw, hy + 10, 10, hh - 4);
      ctx.fillStyle = '#161824';
      ctx.fillRect(hx - 4, hy + 4, hw + 8, 66);
      ctx.fillStyle = '#1f2233';
      ctx.fillRect(hx + 4, hy + 8, hw - 8, 28);
      ctx.strokeStyle = 'rgba(255,255,255,0.12)';
      ctx.lineWidth = 1;
      ctx.strokeRect(hx - 4, hy + 4, hw + 8, 66);

      const fanAngle = settings.reducedMotion ? 0 : time * 4;
      [hx + 18, hx + hw - 58].forEach((ax, idx) => {
        ctx.fillStyle = '#25293d';
        ctx.fillRect(ax, hy + 11, 38, 18);
        ctx.strokeStyle = 'rgba(255,255,255,0.16)';
        ctx.strokeRect(ax, hy + 11, 38, 18);
        ctx.fillStyle = '#0d0f17';
        ctx.beginPath(); ctx.arc(ax + 12, hy + 20, 5, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.beginPath();
        ctx.moveTo(ax + 12 + Math.cos(fanAngle) * 4, hy + 20 + Math.sin(fanAngle) * 4);
        ctx.lineTo(ax + 12 - Math.cos(fanAngle) * 4, hy + 20 - Math.sin(fanAngle) * 4);
        ctx.stroke();
        if (idx === 1) {
          ctx.fillStyle = '#ef4444';
          ctx.fillRect(ax + 29, hy + 14, 3, 3);
        }
      });

      const sx = hx + 16, sy = hy + 34, sw = hw - 32, sh = 32;
      ctx.fillStyle = '#06070c';
      ctx.fillRect(sx, sy, sw, sh);
      ctx.strokeStyle = flicker ? cfg.neon : cfg.neonDim;
      ctx.lineWidth = 2;
      ctx.strokeRect(sx, sy, sw, sh);

      if (!cfg.isBlue) {
        ctx.strokeStyle = cfg.neon;
        ctx.lineWidth = 1.6;
        ctx.strokeRect(sx + 14, sy + 8, 14, 14);
        ctx.fillStyle = cfg.neon;
        ctx.fillRect(sx + 19, sy + 13, 4, 4);
      } else {
        ctx.strokeStyle = '#e0f2fe';
        ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.arc(sx + 34, sy + 20, 8, Math.PI, 0); ctx.stroke();
      }

      ctx.textAlign = 'left';
      ctx.fillStyle = cfg.isBlue ? '#f0f9ff' : '#ffe4e6';
      ctx.font = '400 22px "Bebas Neue", sans-serif';
      ctx.fillText(cfg.title, sx + (cfg.isBlue ? 56 : 38), sy + 24);

      const fy = hy + 70;
      const fh = hh - 70;
      ctx.fillStyle = '#151724';
      ctx.fillRect(hx, fy, hw, fh);
      ctx.strokeStyle = 'rgba(255,255,255,0.14)';
      ctx.lineWidth = 1;
      ctx.strokeRect(hx, fy, hw, fh);

      [hx + 14, hx + hw - 66].forEach(wx => {
        const wy = fy + 16, ww = 52, wh = 38;
        ctx.fillStyle = cfg.isBlue ? 'rgba(56,189,248,0.34)' : 'rgba(251,146,60,0.42)';
        ctx.fillRect(wx, wy, ww, wh);
        ctx.fillStyle = cfg.isBlue ? 'rgba(186,230,253,0.45)' : 'rgba(254,215,170,0.45)';
        ctx.fillRect(wx + 3, wy + 3, 21, 14);
        ctx.fillRect(wx + 28, wy + 20, 21, 14);
        ctx.fillStyle = '#0f1018';
        ctx.fillRect(wx + 24, wy, 4, wh);
        ctx.fillRect(wx, wy + 17, ww, 4);
        ctx.strokeStyle = 'rgba(255,255,255,0.28)';
        ctx.strokeRect(wx, wy, ww, wh);
      });

      const dx = obj.tx * T;
      const dy = fy + 22;
      ctx.fillStyle = cfg.isBlue ? 'rgba(56,189,248,0.45)' : 'rgba(239,68,68,0.5)';
      ctx.fillRect(dx - 4, dy - 5, T + 8, 5);
      ctx.fillStyle = near ? cfg.neon : '#101420';
      ctx.fillRect(dx, dy, T, fh - 22);
      ctx.strokeStyle = near ? '#fff' : cfg.neon;
      ctx.lineWidth = near ? 2 : 1;
      ctx.strokeRect(dx, dy, T, fh - 22);
      ctx.fillStyle = '#252838';
      ctx.fillRect(dx - 2, hy + hh, T + 4, 9);
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(dx - 2, hy + hh, 3, 9);
      ctx.fillRect(dx + T - 1, hy + hh, 3, 9);
    };

    const gObj = W.INTERACTABLES.find(i => i.id === 'glyphlens');
    const aObj = W.INTERACTABLES.find(i => i.id === 'arcus');
    if (gObj) drawHeroBuilding(gObj, { title: 'GLYPHLENS', neon: '#ef4444', neonDim: 'rgba(239,68,68,0.5)', isBlue: false });
    if (aObj) drawHeroBuilding(aObj, { title: 'ARCUS', neon: '#38bdf8', neonDim: 'rgba(56,189,248,0.5)', isBlue: true });
  };

  const drawGuideNPC = (ctx, time, activeObj, settings) => {
    const npc = W.INTERACTABLES.find(i => i.id === 'npc_guide');
    if (!npc) return;
    const nx = Math.round(npc.x);
    const ny = Math.round(npc.y);
    const bob = settings.reducedMotion ? 0 : Math.round(Math.sin(time * 2.5) * 0.8);

    ctx.fillStyle = 'rgba(0,0,0,0.48)';
    ctx.fillRect(nx - 7, ny + 7, 14, 4);
    ctx.fillStyle = '#272734';
    ctx.fillRect(nx - 7, ny - 6 + bob, 14, 13);
    ctx.fillStyle = '#f472b6';
    ctx.fillRect(nx - 7, ny - 6 + bob, 14, 3);
    ctx.fillStyle = '#e4e4e7';
    ctx.fillRect(nx - 6, ny - 16 + bob, 12, 10);
    ctx.fillStyle = '#18181b';
    ctx.fillRect(nx - 6, ny - 18 + bob, 12, 4);
    ctx.fillStyle = '#09090b';
    ctx.fillRect(nx - 4, ny - 11 + bob, 2, 2);
    ctx.fillRect(nx + 2, ny - 11 + bob, 2, 2);

    if (activeObj?.id === 'npc_guide') {
      ctx.fillStyle = '#f472b6';
      ctx.font = '500 10px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('!', nx, ny - 22 + bob);
    }
  };

  const drawLightingAndAtmosphere = (ctx, dt, time, settings) => {
    const isEco = settings.effectiveEco;

    /* Stamp cached radial glow sprites (zero gradient alloc per frame) */
    if (settings.bloom && !isEco) {
      const gObj = W.INTERACTABLES.find(i => i.id === 'glyphlens');
      if (gObj) {
        const cx = (gObj.hitBox.x1 + gObj.hitBox.x2) / 2;
        ctx.drawImage(crimsonGlowSprite, Math.round(cx - 180), Math.round(gObj.hitBox.y2 - 150));
      }
      const aObj = W.INTERACTABLES.find(i => i.id === 'arcus');
      if (aObj) {
        const cx = (aObj.hitBox.x1 + aObj.hitBox.x2) / 2;
        ctx.drawImage(blueGlowSprite, Math.round(cx - 180), Math.round(aObj.hitBox.y2 - 150));
      }
      for (const l of W.PROPS.lamps) {
        if (l.x + 84 < camera.x || l.x - 84 > camera.x + camera.w) continue;
        ctx.drawImage(lampGlowSprite, Math.round(l.x - 84), Math.round(l.y - 80));
      }
    }

    if (!settings.reducedMotion) {
      /* Canal Koi */
      [
        { base: 5.5 * T, span: 10 * T, spd: 0.45, r: 12.1 * T, col: '#f472b6', phase: 0 },
        { base: 23.5 * T, span: 12 * T, spd: 0.38, r: 12.6 * T, col: '#38bdf8', phase: 2.1 },
        { base: 8.5 * T, span: 7 * T, spd: 0.52, r: 13.0 * T, col: '#f59e0b', phase: 4.3 }
      ].forEach(k => {
        const u = Math.sin(time * k.spd + k.phase);
        const kx = Math.round(k.base + (u * 0.5 + 0.5) * k.span);
        const ky = Math.round(k.r + Math.cos(time * 2.2 + k.phase) * 3);
        const dir = Math.cos(time * k.spd + k.phase) >= 0 ? 1 : -1;
        ctx.fillStyle = k.col;
        ctx.fillRect(kx - 3, ky - 1, 6, 3);
        ctx.fillStyle = '#fff';
        ctx.fillRect(dir > 0 ? kx + 2 : kx - 3, ky, 2, 1);
      });

      /* Patrol Drone */
      drone.x = (drone.x + drone.speed * dt) % (W.WIDTH + 160);
      const dx = Math.round(drone.x - 80);
      const dy = 12.2 * T + Math.round(Math.sin(time * 2.8) * 5);
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.fillRect(dx - 7, dy + 16, 14, 3);
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(dx - 8, dy - 3, 16, 6);
      ctx.fillStyle = Math.sin(time * 12) > 0 ? '#ef4444' : '#38bdf8';
      ctx.fillRect(dx - 2, dy - 1, 4, 2);

      const petalStep = isEco ? 2 : 1;
      ctx.fillStyle = 'rgba(244,114,182,0.65)';
      for (let i = 0; i < petals.length; i += petalStep) {
        const p = petals[i];
        p.x = (p.x + p.vx * dt) % W.WIDTH;
        p.y = (p.y + p.vy * dt) % W.HEIGHT;
        const sway = Math.sin(time * 2.5 + p.phase) * 5;
        ctx.fillRect(Math.round(p.x + sway), Math.round(p.y), 3, 2);
      }
    }

    if (!settings.reducedMotion && settings.rain === 'normal' && settings.lightning !== false) {
      if (time >= nextLightningAt) {
        lightningAlpha = 0.2;
        nextLightningAt = time + 16 + Math.random() * 14;
        window.AnshAudio.playThunder?.();
      }
      if (lightningAlpha > 0) lightningAlpha = Math.max(0, lightningAlpha - dt * 0.75);
    } else {
      lightningAlpha = 0;
    }

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    if (lightningAlpha > 0.01) {
      ctx.fillStyle = `rgba(219, 234, 254, ${lightningAlpha.toFixed(2)})`;
      ctx.fillRect(0, 0, camera.w, camera.h);
    }

    const rainCount = settings.reducedMotion || settings.rain === 'off'
      ? 0
      : isEco
        ? 52
        : settings.rain === 'light'
          ? 75
          : MAX_RAIN;

    if (rainCount > 0) {
      ctx.strokeStyle = 'rgba(203, 213, 225, 0.2)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i < rainCount; i++) {
        const drop = rain[i];
        drop.x -= drop.spd * 0.2 * dt;
        drop.y += drop.spd * dt;
        if (drop.y > camera.h) {
          drop.y = -14;
          drop.x = (drop.x + camera.w * 1.3) % camera.w;
        }
        if (drop.x < 0) drop.x += camera.w;
        ctx.moveTo(drop.x, drop.y);
        ctx.lineTo(drop.x - 2.5, drop.y + drop.len);
      }
      ctx.stroke();

      if (!isEco) {
        splashes.forEach(s => {
          s.t += dt * 2.8;
          if (s.t >= 1) {
            s.t = 0;
            s.x = camera.x + Math.random() * camera.w;
            s.y = camera.y + Math.random() * camera.h;
          }
          const sx = s.x - camera.x;
          const sy = s.y - camera.y;
          ctx.fillStyle = `rgba(226,232,240,${((1 - s.t) * 0.32).toFixed(2)})`;
          const w = 2 + s.t * 4;
          ctx.fillRect(Math.round(sx - w / 2), Math.round(sy), Math.round(w), 1);
        });
      }
    }

    ctx.drawImage(getVignette(camera.w, camera.h, settings.mood), 0, 0);

    if (settings.mood && settings.mood !== 'midnight') {
      const wash = {
        bloodmoon: 'rgba(239,68,68,0.06)',
        sakura:    'rgba(244,114,182,0.065)',
        matrix:    'rgba(16,185,129,0.065)'
      }[settings.mood];
      if (wash) {
        ctx.fillStyle = wash;
        ctx.fillRect(0, 0, camera.w, camera.h);
      }
    }

    ctx.restore();
  };

  const drawPrompt = (ctx, activeObj) => {
    if (!activeObj) return;
    const px = activeObj.tx * T + 16;
    const py = activeObj.ty * T - 24;
    const txt = `[E] ${activeObj.prompt.toUpperCase()}`;
    ctx.font = '500 9px "JetBrains Mono", monospace';
    const tw = ctx.measureText(txt).width + 16;
    const rx = Math.max(8, Math.min(W.WIDTH - tw - 8, px - tw / 2));

    ctx.fillStyle = 'rgba(6, 9, 15, 0.94)';
    ctx.fillRect(rx, py - 14, tw, 18);
    ctx.strokeStyle = activeObj.accent === 'blue' ? '#38bdf8' : activeObj.accent === 'pink' ? '#f472b6' : activeObj.accent === 'amber' ? '#f59e0b' : '#ef4444';
    ctx.lineWidth = 1.2;
    ctx.strokeRect(rx, py - 14, tw, 18);
    ctx.fillStyle = '#f8fafc';
    ctx.textAlign = 'center';
    ctx.fillText(txt, rx + tw / 2, py - 2);
  };

  const renderWorld = (ctx, dt, time, player, activeObj, settings) => {
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, camera.w, camera.h);

    const cx = Math.round(camera.x);
    const cy = Math.round(camera.y);
    ctx.drawImage(staticCanvas, cx, cy, camera.w, camera.h, 0, 0, camera.w, camera.h);

    ctx.save();
    ctx.translate(-cx, -cy);

    drawAnimatedTiles(ctx, time, settings);
    drawWetGroundReflections(ctx, time, settings);
    drawDynamicProps(ctx, time, activeObj, settings);
    drawBuildingsAndBoards(ctx, time, activeObj, settings);
    drawGuideNPC(ctx, time, activeObj, settings);
    player.draw(ctx);
    drawPrompt(ctx, activeObj);

    ctx.restore();
    drawLightingAndAtmosphere(ctx, dt, time, settings);
  };

  const renderMinimap = (mCtx, mCanvas, playerState, time) => {
    if (!mCtx || !mCanvas) return;
    const mw = mCanvas.width;
    const mh = mCanvas.height;

    mCtx.drawImage(ensureMinimapBg(mw, mh), 0, 0);

    mCtx.strokeStyle = 'rgba(255,255,255,0.22)';
    mCtx.lineWidth = 1;
    mCtx.strokeRect(
      (camera.x / W.WIDTH) * mw,
      (camera.y / W.HEIGHT) * mh,
      (camera.w / W.WIDTH) * mw,
      (camera.h / W.HEIGHT) * mh
    );

    const px = (playerState.x / W.WIDTH) * mw;
    const py = (playerState.y / W.HEIGHT) * mh;
    const s = 4 + Math.sin(time * 5) * 0.5;
    mCtx.fillStyle = '#ef4444';
    mCtx.beginPath();
    mCtx.moveTo(px, py - s);
    mCtx.lineTo(px + s, py);
    mCtx.lineTo(px, py + s);
    mCtx.lineTo(px - s, py);
    mCtx.closePath();
    mCtx.fill();
    mCtx.strokeStyle = '#fff';
    mCtx.lineWidth = 1;
    mCtx.stroke();
  };

  return {
    camera,
    updateCamera,
    screenToWorld,
    renderWorld,
    renderMinimap
  };
})();
