/* ─── js/world.js — Reverted 42x26 Generous Explorable Town Map ─── */
window.AnshWorld = (() => {
  const T = 32;
  const COLS = 42;
  const ROWS = 26;
  const WIDTH = COLS * T;  // 1344
  const HEIGHT = ROWS * T; // 832

  /*
   * Tile Legend:
   * T = Cyber Pine / Border Tree (solid)
   * K = Cherry Blossom (Sakura) Tree (solid)
   * . = Dark Rain-Soaked Grass
   * P = Wet Tiled Flagstone Plaza / Sidewalk
   * R = Wet Asphalt Road / Street
   * U = Reflective Wet Puddle Tile (walkable)
   * W = Canal Water (solid, animated reflections)
   * = = Central Bridge Deck (walkable)
   * | = Bridge Railing / Crimson Lantern Edge (solid)
   * F = Courtyard Railing / Fence (solid)
   * L = Warm Amber Streetlamp (solid base)
   * N = Plaza Bench (solid)
   * V = Japanese Vending Machine (solid, glowing)
   * 1 = GlyphLens Building Footprint (solid)
   * A = GlyphLens Entrance Threshold (interactive door)
   * 2 = Arcus Building Footprint (solid)
   * D = Arcus Entrance Threshold (interactive door)
   * B = Ansh Intro Billboard (solid, interactive)
   * S = Town Directory Sign (solid, interactive)
   * M = Contact Terminal / Postbox (solid, interactive)
   * H = Sakura Shrine Monument (solid, interactive)
   */
  const RAW_MAP = [
    'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT',
    'T..K...TTTTTT..K......K..TTTTTT...K......T',
    'T......1111111...........2222222.........T',
    'T..L...1111111....K.K....2222222.....L...T',
    'T......1111111....HHH....2222222.........T',
    'T.K....1111111....PPP....2222222......K..T',
    'T......111A111...XPPP....222D222.........T',
    'T..PPPPPPPPPPGPPPPPPPPPPPZPPPPPPPPPPPPP..T',
    'T..PPUPPLPPPPPPPJPPPPPQUPPPPPPPPLPPUPPP..T',
    'T..RRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRR..T',
    'T..FF..RRRR....L..===..L.....RRRR...FF...T',
    'TWWWWWWWWWWWWWWWW|===|WWWWWWWWWWWWWWWWWWWT',
    'TWWWWWWWWWWWWWWWW|===|WWWWWWWWWWWWWWWWWWWT',
    'TWWWWWWWWWWWWWWWW|===|WWWWWWWWWWWWWWWWWWWT',
    'T..FF..K..L..PPPY=====PPPP..L...K...FF...T',
    'T.........N..PPPPPPUPPPPPP..N............T',
    'T..V..L.3....PPBBBPPSPPMPP....4.L..V.....T',
    'T.......PPPPPPPBBBPPPPPPPPPPPPPP.........T',
    'T..K...PPUPPPIPPPPPPPPPPPPOPPPPUPP....K..T',
    'T......PPPPPPPRRRRRRRRRRRPPPPPPPPP.......T',
    'T..L...PPNPPPPRRRRUPURRRRPPPPPNPPP...L...T',
    'T......5PPPPPPRRRRRRRRRRRPPPPPPPP6.......T',
    'T..FF.....K...FFFFPPPFFFF....K......FF...T',
    'T.................PPP....................T',
    'T....K....TTTTT...PPP...TTTTT....K.......T',
    'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT'
  ];

  const MAP = RAW_MAP.map(r => r.padEnd(COLS, 'T').slice(0, COLS));

  const SOLID_SET = new Set([
    'T', 'K', 'W', '|', 'F', 'L', 'N', 'V', '1', '2', 'A', 'D', 'B', 'S', 'M', 'H', 'G', 'Z', 'Y', 'X', 'J', 'Q', 'I', 'O', '3', '4', '5', '6'
  ]);

  const isSolid = (c, r) => {
    if (c < 0 || c >= COLS || r < 0 || r >= ROWS) return true;
    return SOLID_SET.has(MAP[r][c]);
  };

  const INTERACTABLES = [
    {
      id: 'glyphlens',
      kind: 'building',
      label: 'GLYPHLENS',
      zone: 'Crimson District · GlyphLens',
      prompt: 'Enter GlyphLens Lab',
      accent: 'crimson',
      tx: 10, ty: 6.4,
      hitBox: { x1: 7 * T, y1: 2 * T, x2: 14 * T, y2: 7 * T },
      spawn: { x: 10 * T + 16, y: 7 * T + 22 }
    },
    {
      id: 'arcus',
      kind: 'building',
      label: 'ARCUS',
      zone: 'Azure District · Arcus',
      prompt: 'Enter Arcus Studio',
      accent: 'blue',
      tx: 28, ty: 6.4,
      hitBox: { x1: 25 * T, y1: 2 * T, x2: 32 * T, y2: 7 * T },
      spawn: { x: 28 * T + 16, y: 7 * T + 22 }
    },
    {
      id: 'about',
      kind: 'board',
      label: 'ANSH. BOARD',
      zone: 'Central Plaza · Intro Board',
      prompt: 'Read Intro Board',
      accent: 'crimson',
      tx: 16, ty: 16.5,
      hitBox: { x1: 15 * T, y1: 16 * T, x2: 18 * T, y2: 18 * T },
      spawn: { x: 16 * T + 16, y: 18 * T + 18 }
    },
    {
      id: 'contact',
      kind: 'terminal',
      label: 'MAIL',
      zone: 'Central Plaza · Mail Terminal',
      prompt: 'Open Mail Terminal',
      accent: 'pink',
      tx: 23, ty: 16,
      hitBox: { x1: 23 * T - 4, y1: 16 * T - 4, x2: 24 * T + 4, y2: 17 * T + 4 },
      spawn: { x: 23 * T + 16, y: 17 * T + 16 }
    },
    {
      id: 'sign_plaza',
      kind: 'dialog',
      label: 'DIRECTORY',
      zone: 'Central Plaza',
      prompt: 'Read Town Directory',
      accent: 'amber',
      tx: 20, ty: 16,
      hitBox: { x1: 20 * T - 4, y1: 16 * T - 4, x2: 21 * T + 4, y2: 17 * T + 4 }
    },
    {
      id: 'npc_guide',
      kind: 'npc',
      label: 'GUIDE REN',
      zone: 'Central Plaza',
      prompt: 'Talk to Ren',
      accent: 'pink',
      tx: 21.5, ty: 18,
      x: 21.5 * T + 16,
      y: 18 * T + 16,
      hitBox: { x1: 21.2 * T, y1: 17.5 * T, x2: 22.8 * T, y2: 19 * T }
    },
    {
      id: 'shrine_stone',
      kind: 'dialog',
      label: 'SHRINE',
      zone: 'North Sakura Shrine',
      prompt: 'Inspect Shrine',
      accent: 'pink',
      tx: 19, ty: 4,
      hitBox: { x1: 18 * T, y1: 4 * T, x2: 21 * T, y2: 5 * T }
    },
    {
      id: 'sign_glyphlens',
      kind: 'dialog',
      label: 'GLYPHLENS SIGN',
      zone: 'West Wing · GlyphLens',
      prompt: 'Read House Sign',
      accent: 'crimson',
      tx: 13, ty: 7,
      hitBox: { x1: 13 * T - 4, y1: 7 * T - 4, x2: 14 * T + 4, y2: 8 * T + 4 }
    },
    {
      id: 'sign_arcus',
      kind: 'dialog',
      label: 'ARCUS SIGN',
      zone: 'East Wing · Arcus',
      prompt: 'Read House Sign',
      accent: 'blue',
      tx: 25, ty: 7,
      hitBox: { x1: 25 * T - 4, y1: 7 * T - 4, x2: 26 * T + 4, y2: 8 * T + 4 }
    },
    {
      id: 'sign_bridge',
      kind: 'dialog',
      label: 'BRIDGE SIGN',
      zone: 'Central Canal Bridge',
      prompt: 'Read Bridge Sign',
      accent: 'amber',
      tx: 16, ty: 14,
      hitBox: { x1: 16 * T - 4, y1: 14 * T - 4, x2: 17 * T + 4, y2: 15 * T + 4 }
    },
    {
      id: 'sign_shrine',
      kind: 'dialog',
      label: 'SHRINE SIGN',
      zone: 'North Promenade',
      prompt: 'Read Promenade Sign',
      accent: 'pink',
      tx: 17, ty: 6,
      hitBox: { x1: 17 * T - 4, y1: 6 * T - 4, x2: 18 * T + 4, y2: 7 * T + 4 }
    },
    {
      id: 'rewatch_films',
      kind: 'rewatch',
      label: 'REWATCH // FILMS',
      zone: 'Plaza NW · Favourite Films',
      prompt: 'View Film Taste',
      accent: 'crimson',
      tx: 8, ty: 16,
      hitBox: { x1: 8 * T - 4, y1: 16 * T - 4, x2: 9 * T + 4, y2: 17 * T + 4 }
    },
    {
      id: 'rewatch_series',
      kind: 'rewatch',
      label: 'REWATCH // SERIES',
      zone: 'Plaza NE · Favourite Series',
      prompt: 'View Series Taste',
      accent: 'blue',
      tx: 30, ty: 16,
      hitBox: { x1: 30 * T - 4, y1: 16 * T - 4, x2: 31 * T + 4, y2: 17 * T + 4 }
    },
    {
      id: 'rewatch_albums',
      kind: 'rewatch',
      label: 'REWATCH // ALBUMS',
      zone: 'Plaza SW · Favourite Albums',
      prompt: 'View Album Rotation',
      accent: 'amber',
      tx: 7, ty: 21,
      hitBox: { x1: 7 * T - 4, y1: 21 * T - 4, x2: 8 * T + 4, y2: 22 * T + 4 }
    },
    {
      id: 'rewatch_songs',
      kind: 'rewatch',
      label: 'REWATCH // SONGS',
      zone: 'Plaza SE · Favourite Songs',
      prompt: 'View Song Rotation',
      accent: 'pink',
      tx: 33, ty: 21,
      hitBox: { x1: 33 * T - 4, y1: 21 * T - 4, x2: 34 * T + 4, y2: 22 * T + 4 }
    }
  ];

  /* Auto-sync exact coordinates from RAW_MAP */
  const findSpan = ch => {
    let minC = COLS, maxC = -1, minR = ROWS, maxR = -1;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (MAP[r][c] === ch) {
          if (c < minC) minC = c;
          if (c > maxC) maxC = c;
          if (r < minR) minR = r;
          if (r > maxR) maxR = r;
        }
      }
    }
    return maxC >= 0 ? { minC, maxC, minR, maxR } : null;
  };

  const b1 = findSpan('1'), d1 = findSpan('A');
  if (b1 && d1) {
    const g = INTERACTABLES.find(i => i.id === 'glyphlens');
    g.tx = (d1.minC + d1.maxC) / 2;
    g.ty = d1.maxR + 0.4;
    g.hitBox = { x1: b1.minC * T, y1: b1.minR * T, x2: (b1.maxC + 1) * T, y2: (b1.maxR + 1) * T };
    g.spawn = { x: ((d1.minC + d1.maxC + 1) / 2) * T, y: (d1.maxR + 1) * T + 20 };
  }

  const b2 = findSpan('2'), d2 = findSpan('D');
  if (b2 && d2) {
    const a = INTERACTABLES.find(i => i.id === 'arcus');
    a.tx = (d2.minC + d2.maxC) / 2;
    a.ty = d2.maxR + 0.4;
    a.hitBox = { x1: b2.minC * T, y1: b2.minR * T, x2: (b2.maxC + 1) * T, y2: (b2.maxR + 1) * T };
    a.spawn = { x: ((d2.minC + d2.maxC + 1) / 2) * T, y: (d2.maxR + 1) * T + 20 };
  }

  const bb = findSpan('B');
  if (bb) {
    const ab = INTERACTABLES.find(i => i.id === 'about');
    ab.tx = (bb.minC + bb.maxC) / 2;
    ab.ty = bb.maxR + 0.4;
    ab.hitBox = { x1: bb.minC * T, y1: bb.minR * T, x2: (bb.maxC + 1) * T, y2: (bb.maxR + 1) * T };
    ab.spawn = { x: ((bb.minC + bb.maxC + 1) / 2) * T, y: (bb.maxR + 1) * T + 18 };
  }

  const mm = findSpan('M');
  if (mm) {
    const ct = INTERACTABLES.find(i => i.id === 'contact');
    ct.tx = mm.minC; ct.ty = mm.minR;
    ct.hitBox = { x1: mm.minC * T - 4, y1: mm.minR * T - 4, x2: (mm.maxC + 1) * T + 4, y2: (mm.maxR + 1) * T + 4 };
    ct.spawn = { x: mm.minC * T + 16, y: (mm.maxR + 1) * T + 16 };
  }

  const ss = findSpan('S');
  if (ss) {
    const sg = INTERACTABLES.find(i => i.id === 'sign_plaza');
    sg.tx = ss.minC; sg.ty = ss.minR;
    sg.hitBox = { x1: ss.minC * T - 4, y1: ss.minR * T - 4, x2: (ss.maxC + 1) * T + 4, y2: (ss.maxR + 1) * T + 4 };
  }

  const hh = findSpan('H');
  if (hh) {
    const sh = INTERACTABLES.find(i => i.id === 'shrine_stone');
    sh.tx = (hh.minC + hh.maxC) / 2; sh.ty = hh.minR;
    sh.hitBox = { x1: hh.minC * T, y1: hh.minR * T, x2: (hh.maxC + 1) * T, y2: (hh.maxR + 1) * T };
  }

  [
    ['G', 'sign_glyphlens'],
    ['Z', 'sign_arcus'],
    ['Y', 'sign_bridge'],
    ['X', 'sign_shrine'],
    ['3', 'rewatch_films'],
    ['4', 'rewatch_series'],
    ['5', 'rewatch_albums'],
    ['6', 'rewatch_songs']
  ].forEach(([ch, id]) => {
    const pos = findSpan(ch);
    const obj = INTERACTABLES.find(i => i.id === id);
    if (pos && obj) {
      obj.tx = pos.minC; obj.ty = pos.minR;
      obj.hitBox = { x1: pos.minC * T - 4, y1: pos.minR * T - 4, x2: (pos.maxC + 1) * T + 4, y2: (pos.maxR + 1) * T + 4 };
    }
  });

  const PROPS = { lamps: [], puddles: [], sakuras: [], benches: [], vendors: [] };
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const ch = MAP[r][c];
      if (ch === 'L') PROPS.lamps.push({ c, r, x: c * T + 16, y: r * T + 16 });
      if (ch === 'U') PROPS.puddles.push({ c, r, x: c * T, y: r * T });
      if (ch === 'K') PROPS.sakuras.push({ c, r, x: c * T + 16, y: r * T + 16 });
      if (ch === 'N') PROPS.benches.push({ c, r, x: c * T, y: r * T });
      if (ch === 'V') PROPS.vendors.push({ c, r, x: c * T, y: r * T });
    }
  }

  /* Register interactive vending machines from V tiles */
  PROPS.vendors.forEach((v, idx) => {
    const isWest = v.c < 20;
    INTERACTABLES.push({
      id: isWest ? 'vending_west' : 'vending_east',
      kind: 'vending',
      label: isWest ? 'DRINK UNIT 01' : 'DRINK UNIT 02',
      zone: isWest ? 'Central Plaza West · Cyber Vend' : 'Central Plaza East · Cyber Vend',
      prompt: 'Buy Midnight Drink',
      accent: isWest ? 'crimson' : 'blue',
      tx: v.c,
      ty: v.r,
      index: idx,
      hitBox: { x1: v.c * T - 4, y1: v.r * T - 4, x2: (v.c + 1) * T + 4, y2: (v.r + 1) * T + 4 }
    });
  });

  const getZoneName = (x, y) => {
    const c = x / T;
    const r = y / T;
    if (r >= 10.5 && r <= 14.5 && c >= 17 && c <= 24) return 'Central Canal Bridge';
    if (r < 11 && c < 15) return 'West Wing · GlyphLens District';
    if (r < 11 && c > 23) return 'East Wing · Arcus District';
    if (r < 11) return 'North Promenade · Sakura Shrine';
    return 'Central Plaza · Ansh Town';
  };

  return {
    T,
    COLS,
    ROWS,
    WIDTH,
    HEIGHT,
    MAP,
    PROPS,
    INTERACTABLES,
    isSolid,
    getZoneName
  };
})();
