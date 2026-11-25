/* ─── js/renderer.js — High-Craft Rainy Cyberpunk Pixel Renderer (42x26 World) ─── */
window.AnshRenderer = (() => {
  const W = window.AnshWorld;
  const T = W.T;

  /* Pooled atmospheric particles (zero GC churn) */
  const MAX_RAIN = 200;
  const rain = Array.from({ length: MAX_RAIN }, (_, i) => ({
    x: (i * 83) % 1200,
    y: (i * 59) % 900,
    len: 8 + (i % 6),
    spd: 400 + (i % 6) * 45
  }));

  const splashes = Array.from({ length: 32 }, (_, i) => ({
    x: (i * 107) % W.WIDTH,
    y: (i * 73) % W.HEIGHT,
    t: (i * 0.11) % 1
  }));

  const petals = Array.from({ length: 40 }, (_, i) => ({
    x: (i * 97) % W.WIDTH,
    y: (i * 61) % W.HEIGHT,
    vx: 14 + (i % 5) * 4,
    vy: 16 + (i % 4) * 5,
    phase: i * 0.7
  }));

  const camera = { x: 0, y: 0, w: 896, h: 504 };

  const updateCamera = (px, py, vw, vh) => {
    camera.w = vw;
    camera.h = vh;
    const tx = Math.max(0, Math.min(W.WIDTH - vw, px - vw / 2));
    const ty = Math.max(0, Math.min(W.HEIGHT - vh, py - vh / 2));
    camera.x += (tx - camera.x) * 0.14;
    camera.y += (ty - camera.y) * 0.14;
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

  const drawTileTerrain = (ctx, time, settings) => {
    const cStart = Math.max(0, Math.floor(camera.x / T) - 1);
    const cEnd   = Math.min(W.COLS - 1, Math.ceil((camera.x + camera.w) / T) + 1);
    const rStart = Math.max(0, Math.floor(camera.y / T) - 1);
    const rEnd   = Math.min(W.ROWS - 1, Math.ceil((camera.y + camera.h) / T) + 1);

    const stoneShades = ['#181924', '#1b1d2a', '#151621', '#1e202e'];

    for (let r = rStart; r <= rEnd; r++) {
      for (let c = cStart; c <= cEnd; c++) {
        const ch = W.MAP[r][c];
        const x = c * T;
        const y = r * T;
        const h = hash(c, r);

        /* Base dark mossy turf */
        ctx.fillStyle = (r + c) % 2 === 0 ? '#0a0e13' : '#0c1117';
        ctx.fillRect(x, y, T, T);

        if (ch === '.' || ch === 'T' || ch === 'K') {
          ctx.fillStyle = 'rgba(255,255,255,0.025)';
          if (h > 0.4) ctx.fillRect(x + 7, y + 10, 2, 3);
          if (h > 0.7) ctx.fillRect(x + 21, y + 22, 2, 3);
        }

        if (ch === 'P' || ch === 'U' || ch === 'N' || ch === 'V' || ch === 'L' || ch === 'S' || ch === 'M' || ch === 'G' || ch === 'Z' || ch === 'Y' || ch === 'X' || ch === 'J' || ch === 'Q' || ch === 'I' || ch === 'O' || ch === '3' || ch === '4' || ch === '5' || ch === '6') {
          /* Beveled wet flagstone plaza (4 sub-stones per 32px tile) */
          for (let sy = 0; sy < 2; sy++) {
            for (let sx = 0; sx < 2; sx++) {
              const bx = x + sx * 16;
              const by = y + sy * 16;
              const idx = Math.floor(hash(c * 2 + sx, r * 2 + sy) * stoneShades.length);
              ctx.fillStyle = stoneShades[idx];
              ctx.fillRect(bx, by, 16, 16);
              ctx.fillStyle = 'rgba(255,255,255,0.05)';
              ctx.fillRect(bx, by, 15, 1);
              ctx.fillRect(bx, by, 1, 15);
              ctx.fillStyle = 'rgba(0,0,0,0.45)';
              ctx.fillRect(bx, by + 15, 16, 1);
              ctx.fillRect(bx + 15, by, 1, 16);
            }
          }
          if (h > 0.72) {
            ctx.fillStyle = 'rgba(244,114,182,0.5)';
            ctx.fillRect(x + 6, y + 12, 3, 2);
            ctx.fillRect(x + 22, y + 24, 2, 2);
          }
        }

        if (ch === 'R') {
          /* Wet asphalt street with specular neon streaks */
          ctx.fillStyle = '#0e1017';
          ctx.fillRect(x, y, T, T);
          ctx.fillStyle = 'rgba(255,255,255,0.025)';
          ctx.fillRect(x, y, T, 1);
          if (c % 2 === 0) {
            ctx.fillStyle = 'rgba(251,191,36,0.2)';
            ctx.fillRect(x + 6, y + 15, 18, 2);
          }
          ctx.fillStyle = c < 17 ? 'rgba(239,68,68,0.08)' : c > 23 ? 'rgba(56,189,248,0.08)' : 'rgba(244,114,182,0.05)';
          ctx.fillRect(x + 3, y + 6, 22, 2);
        }

        if (ch === 'U') {
          /* Wet Puddle Pool + Rain Ripple */
          ctx.fillStyle = '#080c15';
          ctx.fillRect(x + 3, y + 5, 26, 22);
          ctx.fillStyle = c < 17 ? 'rgba(239,68,68,0.3)' : c > 23 ? 'rgba(56,189,248,0.3)' : 'rgba(245,158,11,0.26)';
          const shim = Math.sin(time * 3.5 + c) > 0 ? 1 : 0;
          ctx.fillRect(x + 6 + shim, y + 9, 14, 3);
          ctx.fillRect(x + 11 - shim, y + 18, 12, 2);
          if (!settings.reducedMotion) {
            const rp = ((time * 1.2 + h) % 1);
            const rad = 2 + rp * 8;
            ctx.strokeStyle = `rgba(255,255,255,${((1 - rp) * 0.25).toFixed(2)})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.ellipse(x + 16, y + 16, rad, rad * 0.55, 0, 0, Math.PI * 2);
            ctx.stroke();
          }
        }

        if (ch === 'W') {
          /* Canal Water with Shimmering Neon Reflections */
          ctx.fillStyle = '#050a14';
          ctx.fillRect(x, y, T, T);
          const wave = Math.round(Math.sin(time * 2.2 + r * 0.9 + c * 0.4) * 3);
          if (c >= 16 && c <= 23) {
            ctx.fillStyle = (c === 17 || c === 21) ? 'rgba(239,68,68,0.4)' : 'rgba(245,158,11,0.24)';
            ctx.fillRect(x + 4 + wave, y + 6, 20, 3);
            ctx.fillRect(x + 8 - wave, y + 20, 14, 2);
          } else {
            ctx.fillStyle = c < 17 ? 'rgba(239,68,68,0.18)' : 'rgba(56,189,248,0.18)';
            ctx.fillRect(x + 6 + wave, y + 9, 14, 2);
            ctx.fillStyle = 'rgba(244,114,182,0.12)';
            ctx.fillRect(x + 10 - wave, y + 21, 10, 2);
          }
        }

        if (ch === '=') {
          /* Central Stone Bridge Deck */
          ctx.fillStyle = '#252736';
          ctx.fillRect(x, y, T, T);
          ctx.fillStyle = '#2e3144';
          ctx.fillRect(x + 1, y + 2, T - 2, 12);
          ctx.fillRect(x + 1, y + 18, T - 2, 12);
          ctx.fillStyle = 'rgba(255,255,255,0.06)';
          ctx.fillRect(x + 1, y + 2, T - 2, 2);
          ctx.fillRect(x + 1, y + 18, T - 2, 2);
        }

        if (ch === '|') {
          /* Bridge Side Balustrades + Glowing Crimson Lanterns */
          ctx.fillStyle = '#050a14';
          ctx.fillRect(x, y, T, T);
          ctx.fillStyle = '#2b2d3e';
          ctx.fillRect(x + 8, y, 16, T);
          ctx.fillStyle = '#3c3f54';
          ctx.fillRect(x + 10, y, 4, T);
          if (r === 11 || r === 13) {
            ctx.fillStyle = '#181a24';
            ctx.fillRect(x + 6, y + 4, 20, 24);
            ctx.fillStyle = '#ef4444';
            ctx.fillRect(x + 10, y + 8, 12, 14);
            ctx.fillStyle = '#fecaca';
            ctx.fillRect(x + 13, y + 11, 6, 8);
          }
        }

        if (ch === 'F') {
          /* Low Wooden/Iron Railing */
          ctx.fillStyle = 'rgba(0,0,0,0.45)';
          ctx.fillRect(x, y + 21, T, 5);
          ctx.fillStyle = '#3b2b27';
          ctx.fillRect(x, y + 11, T, 4);
          ctx.fillRect(x, y + 18, T, 3);
          ctx.fillStyle = '#272732';
          ctx.fillRect(x + 1, y + 8, 5, 16);
          ctx.fillRect(x + 26, y + 8, 5, 16);
          ctx.fillStyle = 'rgba(255,255,255,0.12)';
          ctx.fillRect(x + 1, y + 8, 5, 2);
          ctx.fillRect(x + 26, y + 8, 5, 2);
        }
      }
    }
  };

  /* ── Wet Ground Reflections under Buildings & Intro Board ── */
  const drawWetGroundReflections = (ctx, time) => {
    const drawStreaks = (cx, topY, spanW, rgb) => {
      for (let i = 0; i < 12; i++) {
        const y = topY + i * 7;
        const alpha = Math.max(0.03, 0.3 - i * 0.022);
        const w = spanW * (0.85 - i * 0.04) + Math.sin(time * 2.5 + i) * 7;
        ctx.fillStyle = `rgba(${rgb}, ${alpha.toFixed(2)})`;
        ctx.fillRect(Math.round(cx - w / 2), Math.round(y), Math.round(w), 4);
      }
    };

    const gObj = W.INTERACTABLES.find(i => i.id === 'glyphlens');
    const aObj = W.INTERACTABLES.find(i => i.id === 'arcus');
    const bObj = W.INTERACTABLES.find(i => i.id === 'about');

    if (gObj) drawStreaks((gObj.hitBox.x1 + gObj.hitBox.x2) / 2, gObj.hitBox.y2 + 4, 140, '239, 68, 68');
    if (aObj) drawStreaks((aObj.hitBox.x1 + aObj.hitBox.x2) / 2, aObj.hitBox.y2 + 4, 140, '56, 189, 248');
    if (bObj) drawStreaks((bObj.hitBox.x1 + bObj.hitBox.x2) / 2, bObj.hitBox.y2 + 4, 96, '245, 158, 11');
  };

  /* ── Props, Foliage, Benches, Vending Machines & Streetlamps ── */
  const drawTreesAndProps = (ctx, time, activeObj) => {
    const sakuraPalette = ['#500724', '#9d174d', '#ec4899', '#fbcfe8'];
    const pinePalette   = ['#071412', '#0f2621', '#183b33', '#2d5c50'];

    for (let r = 0; r < W.ROWS; r++) {
      for (let c = 0; c < W.COLS; c++) {
        const ch = W.MAP[r][c];
        const x = c * T;
        const y = r * T;

        if (ch === 'N') {
          ctx.fillStyle = 'rgba(0,0,0,0.5)';
          ctx.fillRect(x + 3, y + 22, 26, 6);
          ctx.fillStyle = '#45231b';
          ctx.fillRect(x + 2, y + 8, 28, 12);
          ctx.fillStyle = '#7c3f2c';
          ctx.fillRect(x + 2, y + 8, 28, 4);
          ctx.fillStyle = '#18181f';
          ctx.fillRect(x + 4, y + 19, 4, 6);
          ctx.fillRect(x + 24, y + 19, 4, 6);
        }

        if (ch === 'V') {
          ctx.fillStyle = 'rgba(0,0,0,0.5)';
          ctx.fillRect(x + 6, y + 25, 22, 5);
          ctx.fillStyle = '#181b26';
          ctx.fillRect(x + 5, y + 3, 22, 24);
          ctx.strokeStyle = 'rgba(244,114,182,0.55)';
          ctx.strokeRect(x + 5.5, y + 3.5, 21, 23);
          ctx.fillStyle = c < 20 ? '#ef4444' : '#38bdf8';
          ctx.fillRect(x + 8, y + 6, 16, 10);
          ctx.fillStyle = '#f472b6';
          ctx.fillRect(x + 9, y + 8, 4, 3);
          ctx.fillRect(x + 15, y + 8, 4, 3);
          ctx.fillStyle = '#09090d';
          ctx.fillRect(x + 9, y + 20, 14, 4);
        }

        if (ch === 'T') {
          ctx.fillStyle = 'rgba(0,0,0,0.48)';
          ctx.fillRect(x + 4, y + 24, 24, 6);
          ctx.fillStyle = '#1e1614';
          ctx.fillRect(x + 12, y + 18, 8, 12);
          drawOrganicCluster(ctx, x + 16, y + 13, [
            [0, -4, 11], [-8, 2, 9], [8, 2, 9], [0, 4, 10]
          ], pinePalette);
        }

        if (ch === 'K') {
          const sway = Math.sin(time * 1.4 + c * 0.8) * 1.2;
          ctx.fillStyle = 'rgba(0,0,0,0.48)';
          ctx.fillRect(x + 4, y + 25, 26, 6);
          ctx.fillStyle = '#2e1d1b';
          ctx.fillRect(x + 12, y + 17, 8, 13);
          drawOrganicCluster(ctx, x + 16 + sway, y + 10, [
            [-2, -6, 12], [7, -3, 10], [-10, 1, 10], [8, 4, 9], [0, 4, 11]
          ], sakuraPalette);
        }

        if (ch === 'L') {
          ctx.fillStyle = 'rgba(0,0,0,0.5)';
          ctx.fillRect(x + 11, y + 25, 10, 4);
          ctx.fillStyle = '#1e202c';
          ctx.fillRect(x + 14, y + 8, 4, 20);
          ctx.fillStyle = '#2d3042';
          ctx.fillRect(x + 11, y + 2, 10, 4);
          ctx.fillStyle = '#f59e0b';
          ctx.fillRect(x + 11, y + 6, 10, 8);
          ctx.fillStyle = '#fef3c7';
          ctx.fillRect(x + 13, y + 7, 6, 6);
        }

        if (ch === 'S' || ch === 'G' || ch === 'Z' || ch === 'Y' || ch === 'X') {
          const signMeta = {
            S: { id: 'sign_plaza',     color: '#f59e0b', tag: 'DIR' },
            G: { id: 'sign_glyphlens', color: '#ef4444', tag: '01'  },
            Z: { id: 'sign_arcus',     color: '#38bdf8', tag: '02'  },
            Y: { id: 'sign_bridge',    color: '#f59e0b', tag: 'BRG' },
            X: { id: 'sign_shrine',    color: '#f472b6', tag: 'SHR' }
          }[ch];
          const near = activeObj?.id === signMeta.id;
          ctx.fillStyle = 'rgba(0,0,0,0.48)';
          ctx.fillRect(x + 8, y + 26, 16, 4);
          ctx.fillStyle = '#272732';
          ctx.fillRect(x + 14, y + 18, 4, 11);
          ctx.fillStyle = '#11131b';
          ctx.fillRect(x + 3, y + 4, 26, 16);
          ctx.strokeStyle = near ? '#ffffff' : signMeta.color;
          ctx.lineWidth = near ? 1.5 : 1;
          ctx.strokeRect(x + 3.5, y + 4.5, 25, 15);
          ctx.fillStyle = signMeta.color;
          ctx.fillRect(x + 6, y + 7, 20, 2);
          ctx.fillStyle = '#e2e8f0';
          ctx.font = '500 7px "JetBrains Mono", monospace';
          ctx.textAlign = 'center';
          ctx.fillText(signMeta.tag, x + 16, y + 17);
        }

        if (ch === 'J' || ch === 'Q' || ch === 'I' || ch === 'O') {
          /* Non-interactive Visual Direction Poster Board */
          const dirMeta = {
            J: { color: '#ef4444', line1: '← GLYPHLENS', line2: '↑ SHRINE' },
            Q: { color: '#38bdf8', line1: 'ARCUS →',     line2: '↑ SHRINE' },
            I: { color: '#f59e0b', line1: '↑ INTRO',     line2: 'BRIDGE ↗' },
            O: { color: '#f472b6', line1: '↑ MAIL',      line2: '← BRIDGE' }
          }[ch];

          ctx.fillStyle = 'rgba(0,0,0,0.48)';
          ctx.fillRect(x + 10, y + 26, 12, 4);
          ctx.fillStyle = '#272734';
          ctx.fillRect(x + 14, y + 4, 4, 24);

          const pw = 54, ph = 22;
          const px = x + 16 - pw / 2;
          const py = y - 2;

          ctx.fillStyle = '#090b12';
          ctx.fillRect(px, py, pw, ph);
          ctx.strokeStyle = dirMeta.color;
          ctx.lineWidth = 1;
          ctx.strokeRect(px + 0.5, py + 0.5, pw - 1, ph - 1);

          ctx.fillStyle = dirMeta.color;
          ctx.fillRect(px + 2, py + 2, pw - 4, 2);

          ctx.textAlign = 'center';
          ctx.fillStyle = '#f8fafc';
          ctx.font = '500 6.5px "JetBrains Mono", monospace';
          ctx.fillText(dirMeta.line1, x + 16, py + 11);
          ctx.fillStyle = '#94a3b8';
          ctx.font = '500 6px "JetBrains Mono", monospace';
          ctx.fillText(dirMeta.line2, x + 16, py + 19);
        }

        if (ch === '3' || ch === '4' || ch === '5' || ch === '6') {
          /* Rewatch.cc/@ansh Corner Taste Kiosks */
          const rwMeta = {
            '3': { id: 'rewatch_films',  color: '#ef4444', label: 'FILMS',  kind: 'cinema' },
            '4': { id: 'rewatch_series', color: '#38bdf8', label: 'SERIES', kind: 'screen' },
            '5': { id: 'rewatch_albums', color: '#f59e0b', label: 'ALBUMS', kind: 'vinyl'  },
            '6': { id: 'rewatch_songs',  color: '#f472b6', label: 'SONGS',  kind: 'eq'     }
          }[ch];
          const near = activeObj?.id === rwMeta.id;

          ctx.fillStyle = 'rgba(0,0,0,0.52)';
          ctx.fillRect(x + 3, y + 25, 26, 6);

          ctx.fillStyle = '#12141e';
          ctx.fillRect(x + 3, y + 2, 26, 25);
          ctx.strokeStyle = near ? '#ffffff' : rwMeta.color;
          ctx.lineWidth = near ? 1.8 : 1.2;
          ctx.strokeRect(x + 3.5, y + 2.5, 25, 24);

          /* Kiosk specific pixel art icon inside */
          ctx.fillStyle = '#07090f';
          ctx.fillRect(x + 6, y + 5, 20, 13);

          if (rwMeta.kind === 'cinema') {
            ctx.fillStyle = '#ef4444';
            ctx.fillRect(x + 8, y + 7, 7, 9);
            ctx.fillStyle = '#fca5a5';
            ctx.fillRect(x + 17, y + 7, 7, 9);
          } else if (rwMeta.kind === 'screen') {
            ctx.fillStyle = '#38bdf8';
            ctx.fillRect(x + 8, y + 7, 16, 9);
            ctx.fillStyle = '#bae6fd';
            ctx.fillRect(x + 10, y + 9, 10, 2);
            ctx.fillRect(x + 10, y + 12, 6, 2);
          } else if (rwMeta.kind === 'vinyl') {
            const ang = time * 3;
            ctx.fillStyle = '#f59e0b';
            ctx.beginPath(); ctx.arc(x + 16, y + 11.5, 5, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#07090f';
            ctx.fillRect(x + 15, y + 10.5, 2, 2);
            ctx.fillStyle = '#fef3c7';
            ctx.fillRect(Math.round(x + 16 + Math.cos(ang) * 3), Math.round(y + 11.5 + Math.sin(ang) * 3), 1, 1);
          } else if (rwMeta.kind === 'eq') {
            ctx.fillStyle = '#f472b6';
            for (let b = 0; b < 4; b++) {
              const bh = 3 + Math.round((0.5 + 0.5 * Math.sin(time * 6 + b * 1.4)) * 7);
              ctx.fillRect(x + 9 + b * 4, y + 16 - bh, 2, bh);
            }
          }

          /* Top label badge */
          ctx.textAlign = 'center';
          ctx.fillStyle = rwMeta.color;
          ctx.font = '500 6.5px "JetBrains Mono", monospace';
          ctx.fillText(rwMeta.label, x + 16, y + 24);
        }

        if (ch === 'M') {
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
    }
  };

  /* ── Shrine, Intro Board with Portrait, & Detailed Cyberpunk Hero Buildings ── */
  const drawBuildingsAndBoards = (ctx, time, activeObj) => {
    /* 1. North Sakura Shrine (H) */
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
    }

    /* 2. Intro Billboard ("INTRO BOARD / ANSH. ->" with Pixel Portrait) */
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

      /* Side-profile pixel portrait */
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

    /* 3. Detailed Hero Buildings (GlyphLens & Arcus) */
    const drawHeroBuilding = (obj, cfg) => {
      const hx = obj.hitBox.x1;
      const hy = obj.hitBox.y1;
      const hw = obj.hitBox.x2 - obj.hitBox.x1;
      const hh = obj.hitBox.y2 - obj.hitBox.y1;
      const near = activeObj?.id === obj.id;
      const flicker = Math.sin(time * 10 + (cfg.isBlue ? 2.1 : 0)) > -0.94;

      ctx.fillStyle = 'rgba(0,0,0,0.58)';
      ctx.fillRect(hx + 8, hy + hh, hw + 6, 12);
      ctx.fillRect(hx + hw, hy + 10, 10, hh - 4);

      /* Roof Deck & AC Units */
      ctx.fillStyle = '#161824';
      ctx.fillRect(hx - 4, hy + 4, hw + 8, 66);
      ctx.fillStyle = '#1f2233';
      ctx.fillRect(hx + 4, hy + 8, hw - 8, 28);
      ctx.strokeStyle = 'rgba(255,255,255,0.12)';
      ctx.lineWidth = 1;
      ctx.strokeRect(hx - 4, hy + 4, hw + 8, 66);

      const fanAngle = time * 4;
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

      /* Neon Marquee Signboard */
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

      /* Facade Wall */
      const fy = hy + 70;
      const fh = hh - 70;
      ctx.fillStyle = '#151724';
      ctx.fillRect(hx, fy, hw, fh);
      ctx.strokeStyle = 'rgba(255,255,255,0.14)';
      ctx.lineWidth = 1;
      ctx.strokeRect(hx, fy, hw, fh);

      /* Cross-Paned Shop Windows */
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

      /* Recessed Entrance Door + Threshold */
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

  const drawGuideNPC = (ctx, time, activeObj) => {
    const npc = W.INTERACTABLES.find(i => i.id === 'npc_guide');
    if (!npc) return;
    const nx = Math.round(npc.x);
    const ny = Math.round(npc.y);
    const bob = Math.round(Math.sin(time * 2.5) * 0.8);

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
    if (settings.bloom) {
      const gObj = W.INTERACTABLES.find(i => i.id === 'glyphlens');
      if (gObj) {
        const cx = (gObj.hitBox.x1 + gObj.hitBox.x2) / 2;
        const gGrad = ctx.createRadialGradient(cx, gObj.hitBox.y2 - 12, 16, cx, gObj.hitBox.y2 + 30, 220);
        gGrad.addColorStop(0, 'rgba(239,68,68,0.26)');
        gGrad.addColorStop(0.5, 'rgba(239,68,68,0.08)');
        gGrad.addColorStop(1, 'rgba(239,68,68,0)');
        ctx.fillStyle = gGrad;
        ctx.fillRect(cx - 220, gObj.hitBox.y1, 440, 340);
      }

      const aObj = W.INTERACTABLES.find(i => i.id === 'arcus');
      if (aObj) {
        const cx = (aObj.hitBox.x1 + aObj.hitBox.x2) / 2;
        const aGrad = ctx.createRadialGradient(cx, aObj.hitBox.y2 - 12, 16, cx, aObj.hitBox.y2 + 30, 220);
        aGrad.addColorStop(0, 'rgba(56,189,248,0.26)');
        aGrad.addColorStop(0.5, 'rgba(56,189,248,0.08)');
        aGrad.addColorStop(1, 'rgba(56,189,248,0)');
        ctx.fillStyle = aGrad;
        ctx.fillRect(cx - 220, aObj.hitBox.y1, 440, 340);
      }

      W.PROPS.lamps.forEach(l => {
        const lg = ctx.createRadialGradient(l.x, l.y - 14, 4, l.x, l.y + 4, 84);
        lg.addColorStop(0, 'rgba(245,158,11,0.26)');
        lg.addColorStop(0.55, 'rgba(245,158,11,0.08)');
        lg.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = lg;
        ctx.beginPath(); ctx.arc(l.x, l.y + 4, 84, 0, Math.PI * 2); ctx.fill();
      });
    }

    if (!settings.reducedMotion) {
      petals.forEach(p => {
        p.x = (p.x + p.vx * dt) % W.WIDTH;
        p.y = (p.y + p.vy * dt) % W.HEIGHT;
        const sway = Math.sin(time * 2.5 + p.phase) * 5;
        ctx.fillStyle = 'rgba(244,114,182,0.65)';
        ctx.fillRect(Math.round(p.x + sway), Math.round(p.y), 3, 2);
      });
    }

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    const rainCount = settings.reducedMotion || settings.rain === 'off'
      ? 0
      : settings.rain === 'light'
        ? 80
        : MAX_RAIN;

    if (rainCount > 0) {
      ctx.strokeStyle = 'rgba(203, 213, 225, 0.22)';
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

      splashes.forEach(s => {
        s.t += dt * 2.8;
        if (s.t >= 1) {
          s.t = 0;
          s.x = camera.x + Math.random() * camera.w;
          s.y = camera.y + Math.random() * camera.h;
        }
        const sx = s.x - camera.x;
        const sy = s.y - camera.y;
        ctx.fillStyle = `rgba(226,232,240,${((1 - s.t) * 0.35).toFixed(2)})`;
        const w = 2 + s.t * 4;
        ctx.fillRect(Math.round(sx - w / 2), Math.round(sy), Math.round(w), 1);
      });
    }

    const vig = ctx.createRadialGradient(camera.w / 2, camera.h / 2, camera.h * 0.36, camera.w / 2, camera.h / 2, camera.w * 0.72);
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(1, 'rgba(3,5,10,0.58)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, camera.w, camera.h);

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
    ctx.strokeStyle = activeObj.accent === 'blue' ? '#38bdf8' : activeObj.accent === 'pink' ? '#f472b6' : '#ef4444';
    ctx.lineWidth = 1.2;
    ctx.strokeRect(rx, py - 14, tw, 18);
    ctx.fillStyle = '#f8fafc';
    ctx.textAlign = 'center';
    ctx.fillText(txt, rx + tw / 2, py - 2);
  };

  const renderWorld = (ctx, dt, time, player, activeObj, settings) => {
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, camera.w, camera.h);
    ctx.save();
    ctx.translate(-Math.round(camera.x), -Math.round(camera.y));

    drawTileTerrain(ctx, time, settings);
    drawWetGroundReflections(ctx, time);
    drawTreesAndProps(ctx, time, activeObj);
    drawBuildingsAndBoards(ctx, time, activeObj);
    drawGuideNPC(ctx, time, activeObj);
    player.draw(ctx);
    drawPrompt(ctx, activeObj);

    ctx.restore();
    drawLightingAndAtmosphere(ctx, dt, time, settings);
  };

  const renderMinimap = (mCtx, mCanvas, playerState, time) => {
    if (!mCtx || !mCanvas) return;
    const mw = mCanvas.width;
    const mh = mCanvas.height;
    const sx = mw / W.COLS;
    const sy = mh / W.ROWS;

    mCtx.fillStyle = '#06080e';
    mCtx.fillRect(0, 0, mw, mh);

    for (let r = 0; r < W.ROWS; r++) {
      for (let c = 0; c < W.COLS; c++) {
        const ch = W.MAP[r][c];
        if (ch === 'W') mCtx.fillStyle = '#0f283d';
        else if (ch === '=' || ch === '|') mCtx.fillStyle = '#64748b';
        else if (ch === 'P' || ch === 'U' || ch === 'R') mCtx.fillStyle = '#1c202c';
        else if (ch === '1' || ch === 'A') mCtx.fillStyle = '#ef4444';
        else if (ch === '2' || ch === 'D') mCtx.fillStyle = '#38bdf8';
        else if (ch === 'B' || ch === 'S' || ch === 'Y' || ch === 'I' || ch === '5') mCtx.fillStyle = '#f59e0b';
        else if (ch === 'G' || ch === 'J' || ch === '3') mCtx.fillStyle = '#ef4444';
        else if (ch === 'Z' || ch === 'Q' || ch === '4') mCtx.fillStyle = '#38bdf8';
        else if (ch === 'M' || ch === 'X' || ch === 'O' || ch === '6') mCtx.fillStyle = '#f472b6';
        else if (ch === 'K') mCtx.fillStyle = '#9d174d';
        else if (ch === 'T') mCtx.fillStyle = '#0b1215';
        else continue;
        mCtx.fillRect(Math.floor(c * sx), Math.floor(r * sy), Math.ceil(sx), Math.ceil(sy));
      }
    }

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
