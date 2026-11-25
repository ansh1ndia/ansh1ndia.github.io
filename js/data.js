/* ─── js/data.js — Verified Profile & Repository Data ─── */
window.ANSH_DATA = {
  owner: {
    name: 'Ansh',
    town: 'Ansh Town',
    region: 'Lucknow, India',
    role: 'Developer & Builder',
    bio: 'Independent developer and builder based in Lucknow, India. Building fast, functional web apps and privacy-first desktop tools, using AI alongside modern engineering to stay product-focused.',
    github: 'https://github.com/ansh1ndia',
    instagram: 'https://instagram.com/ansh1ndia',
    rewatch: 'https://rewatch.cc/@ansh',
    rewatchBio: 'I MADE A STEAK 🥩 MARK!!!!!!',
    stack: {
      languages: 'TypeScript, C#, Python, JavaScript, HTML, CSS, PL/pgSQL',
      frameworks: 'Next.js 15, React 19, .NET 10 WPF (MVVM), Tailwind CSS',
      backend: 'PostgreSQL (Portways), Supabase, IndexedDB, Node.js',
      tools: 'Cursor, Claude, ChatGPT, Git, GitHub, Vercel'
    }
  },

  glyphlens: {
    id: 'glyphlens',
    name: 'GlyphLens',
    subtitle: 'Privacy-First Offline Windows Screen Translator',
    status: 'Phase 2b + Local Chinese OCR / Translation Pipeline',
    repoUrl: 'https://github.com/ansh1ndia/glyphlens',
    logo: 'assets/glyphlens-logo.svg',
    overview:
      'GlyphLens is a universal offline screen translator for Windows designed to detect and translate text across native desktop applications, browsers, PDF readers, and media without sending screen frames to the cloud. Frames and recognized text remain strictly in memory.',
    architectureNote:
      'Modular .NET 10 WPF desktop shell communicating with an isolated Python 3.12 worker process over length-prefixed UTF-8 JSON Named Pipes secured with Windows ACLs and a per-session token.',
    features: [
      {
        title: 'Windows Graphics Capture & Live Preview',
        detail: 'Direct3D 11 (Vortice.Direct3D11) capture of displays or target windows with self-capture exclusion.'
      },
      {
        title: 'Dual Offline OCR Pipeline',
        detail: 'Built-in Windows.Media.Ocr (Phase 2b) alongside local PaddleOCR PP-OCRv5 on ONNX Runtime (measured 1.2% CER on 10 real window captures, 0.4–1.3s per window).'
      },
      {
        title: 'Local Neural Translation',
        detail: 'Offline Chinese-to-English (zh/zt) translation running Argos Translate packages via CTranslate2 with script-based language identification and paragraph grouping.'
      },
      {
        title: 'Floating Click-Through Overlay',
        detail: 'Always-on-top WPF translation overlay supporting interactive and pass-through modes plus worker diagnostics & one-click hash-locked setup.'
      }
    ],
    stack: [
      { label: 'Desktop Shell', value: 'C#, .NET 10 (LTS), WPF, MVVM' },
      { label: 'Screen Capture', value: 'Windows Graphics Capture, Direct3D 11 (Vortice)' },
      { label: 'OCR Engines', value: 'Windows.Media.Ocr + PaddleOCR PP-OCRv5 (ONNX)' },
      { label: 'Translation', value: 'Argos Translate + CTranslate2 (Offline)' },
      { label: 'IPC & Security', value: 'Windows Named Pipes (ACL + Session Token)' },
      { label: 'Testing & CI', value: 'xUnit (.NET), unittest (Python), GitHub Actions' }
    ],
    structure: [
      'src/GlyphLens.App — WPF MVVM UI & composition root',
      'src/GlyphLens.Core — Contracts, state machine & frame mailbox',
      'src/GlyphLens.Windows — WGC, Windows OCR & Pipe launcher',
      'src/GlyphLens.Infrastructure — IPC framing, cache & config',
      'worker/glyphlens_worker — Python OCR & CTranslate2 worker'
    ],
    ocrSamples: [
      {
        id: 'jp_ui',
        label: 'JP Settings',
        target: 'Target: Desktop Window (D3D11 Capture)',
        tag: 'Windows.Media.Ocr · Local Cache Hit',
        sourceText: '設定 · ローカル翻訳モード',
        translation: 'Settings · Local translation mode',
        latency: '0.38s · 0% Cloud'
      },
      {
        id: 'zh_app',
        label: 'ZH Dialogue',
        target: 'Target: RPG Client (Named Pipe Frame)',
        tag: 'PaddleOCR PP-OCRv5 · 1.2% CER',
        sourceText: '正在离线识别屏幕文字，无需上传云端。',
        translation: 'Recognizing screen text offline without uploading frames to the cloud.',
        latency: '0.64s · CTranslate2'
      },
      {
        id: 'zh_hud',
        label: 'ZH Spec Sheet',
        target: 'Target: PDF Technical Datasheet',
        tag: 'Paragraph Grouping · CTranslate2 Int8',
        sourceText: '帧缓存仅保存在内存中 · 会话令牌已验证',
        translation: 'Frame buffers stay in memory only · Session token verified',
        latency: '0.51s · Named Pipe ACL'
      }
    ]
  },

  arcus: {
    id: 'arcus',
    name: 'Arcus',
    subtitle: 'Local-First Workout & Training Log',
    status: 'Active Development (Next.js + IndexedDB + Supabase)',
    repoUrl: 'https://github.com/ansh1ndia/arcus',
    banner: 'assets/arcus-share.png',
    mark: 'assets/arcus-mark.svg',
    overview:
      'Arcus is a local-first training log built for distraction-free workout tracking. Active drafts stay responsive on your device via IndexedDB, while completed workouts, training programs, bodyweight logs, and custom exercises sync to Supabase / PostgreSQL when online.',
    architectureNote:
      'Built on Next.js 15 App Router and React 19 with encrypted WebSocket PostgreSQL access via Portways, offline installable PWA shell, WebAuthn passkeys, TOTP MFA, and Apple Health export.xml local import.',
    features: [
      {
        title: 'IndexedDB-Backed Workout Logger',
        detail: 'Fast exercise search, set/rep logging, built-in rest timer, and completion summaries that work offline.'
      },
      {
        title: 'Strength & Volume Analytics',
        detail: 'Training programs with progression settings plus bodyweight, measurement, and volume charts powered by Recharts.'
      },
      {
        title: 'Passkeys, TOTP MFA & Owner Console',
        detail: 'Supabase email/password auth, WebAuthn passkey login, encrypted TOTP MFA (otplib + QR), and /admin management portal.'
      },
      {
        title: 'Local Apple Health XML Import',
        detail: 'Parses Apple Health export.xml locally for workout session summaries and bodyweight records with duplicate detection & per-import undo.'
      }
    ],
    stack: [
      { label: 'Framework', value: 'Next.js 15.5.3, React 19.1.1, TypeScript 5.9.2' },
      { label: 'Styling & Motion', value: 'Tailwind CSS 4.1, Framer Motion 14, Lucide' },
      { label: 'State & Offline', value: 'Zustand 5, IndexedDB, Installable Offline Shell' },
      { label: 'Database & Auth', value: 'PostgreSQL (Portways WS), Supabase SSR' },
      { label: 'Security', value: 'WebAuthn Passkeys, TOTP MFA (otplib + qrcode)' },
      { label: 'Visualizations', value: 'Recharts 3.10.1, date-fns 4.1.0, Zod 4.1' }
    ],
    volumeHistory: [
      { wk: 'W1', kg: 11400 },
      { wk: 'W2', kg: 12150 },
      { wk: 'W3', kg: 12800 },
      { wk: 'W4', kg: 12450 },
      { wk: 'W5', kg: 13600 },
      { wk: 'W6', kg: 14480 }
    ],
    defaultSets: [
      { id: 'bench', name: 'Barbell Bench Press', target: '4 × 6 · 80 kg', done: true },
      { id: 'pullups', name: 'Weighted Pull-Ups', target: '4 × 8 · +15 kg', done: false },
      { id: 'rdl', name: 'Romanian Deadlift', target: '3 × 8 · 105 kg', done: false },
      { id: 'ohp', name: 'Standing Overhead Press', target: '3 × 8 · 52.5 kg', done: false }
    ]
  },

  // <REWATCH_DATA_START>
  rewatchCorners: {
    "rewatch_films": {
      "id": "rewatch_films",
      "badge": "PLAZA NW CORNER // REWATCH.CC/@ANSH",
      "title": "Favourite Films",
      "subtitle": "Curated Cinema · Ansh (@ansh) · \"I MADE A STEAK 🥩 MARK!!!!!!\"",
      "accent": "crimson",
      "aspect": "poster",
      "actionLabel": "Trailer",
      "items": [
        {
          "name": "Superman",
          "meta": "2025 · James Gunn",
          "img": "https://image.tmdb.org/t/p/w500/ldyfo0BKmz5rWtJJKCvwaNS4cJT.jpg",
          "rewatchUrl": "https://rewatch.cc/film/superman",
          "mediaUrl": "https://www.youtube.com/results?search_query=Superman%202025%20official%20trailer"
        },
        {
          "name": "Your Name.",
          "meta": "2016 · Makoto Shinkai",
          "img": "https://image.tmdb.org/t/p/w500/vfJFJPepRKapMd5G2ro7klIRysq.jpg",
          "rewatchUrl": "https://rewatch.cc/film/your-name",
          "mediaUrl": "https://www.youtube.com/results?search_query=Your%20Name.%202016%20official%20trailer"
        },
        {
          "name": "Incendies",
          "meta": "2010 · Denis Villeneuve",
          "img": "https://image.tmdb.org/t/p/w500/yH6DAQVgbyj72S66gN4WWVoTjuf.jpg",
          "rewatchUrl": "https://rewatch.cc/film/incendies",
          "mediaUrl": "https://www.youtube.com/results?search_query=Incendies%202010%20official%20trailer"
        },
        {
          "name": "Project Hail Mary",
          "meta": "2026 · Phil Lord, Christopher Miller",
          "img": "https://image.tmdb.org/t/p/w500/iOb2fjXLbpJgyQXe46n1WtGCnaa.jpg",
          "rewatchUrl": "https://rewatch.cc/film/project-hail-mary",
          "mediaUrl": "https://www.youtube.com/results?search_query=Project%20Hail%20Mary%202026%20official%20trailer"
        },
        {
          "name": "Good Will Hunting",
          "meta": "1997 · Gus Van Sant",
          "img": "https://image.tmdb.org/t/p/w500/z2FnLKpFi1HPO7BEJxdkv6hpJSU.jpg",
          "rewatchUrl": "https://rewatch.cc/film/good-will-hunting",
          "mediaUrl": "https://www.youtube.com/results?search_query=Good%20Will%20Hunting%201997%20official%20trailer"
        }
      ],
      "recentLabel": "Recent Film Diary",
      "recent": [
        {
          "name": "Ramayana: Rise of a Legend",
          "meta": "23 November 2026 · 80%",
          "img": "https://image.tmdb.org/t/p/w500/vBQ7wks68OhJKlb3RnXSl2yXBXK.jpg",
          "rewatchUrl": "https://rewatch.cc/film/ramayana-rise-of-a-legend",
          "mediaUrl": "https://www.youtube.com/results?search_query=Ramayana%3A%20Rise%20of%20a%20Legend%20official%20trailer"
        },
        {
          "name": "Home Alone",
          "meta": "20 November 2026 · 90%",
          "img": "https://image.tmdb.org/t/p/w500/onTSipZ8R3bliBdKfPtsDuHTdlL.jpg",
          "rewatchUrl": "https://rewatch.cc/film/home-alone",
          "mediaUrl": "https://www.youtube.com/results?search_query=Home%20Alone%20official%20trailer"
        },
        {
          "name": "Clayface",
          "meta": "23 October 2026 · 90%",
          "img": "https://image.tmdb.org/t/p/w500/9l1NuFjel2j89hiuiJbsxfblqjy.jpg",
          "rewatchUrl": "https://rewatch.cc/film/clayface",
          "mediaUrl": "https://www.youtube.com/results?search_query=Clayface%20official%20trailer"
        },
        {
          "name": "Drishyam: The Conclusion",
          "meta": "18 October 2026 · 40%",
          "img": "https://image.tmdb.org/t/p/w500/67FsF2kpgEZ1T5Qos4adgqm9dLf.jpg",
          "rewatchUrl": "https://rewatch.cc/film/drishyam-the-conclusion",
          "mediaUrl": "https://www.youtube.com/results?search_query=Drishyam%3A%20The%20Conclusion%20official%20trailer"
        },
        {
          "name": "My Girl",
          "meta": "14 October 2026 · 80%",
          "img": "https://image.tmdb.org/t/p/w500/qyJJNHteA7BUwQSey05t7qP4vRV.jpg",
          "rewatchUrl": "https://rewatch.cc/film/my-girl",
          "mediaUrl": "https://www.youtube.com/results?search_query=My%20Girl%20official%20trailer"
        }
      ]
    },
    "rewatch_series": {
      "id": "rewatch_series",
      "badge": "PLAZA NE CORNER // REWATCH.CC/@ANSH",
      "title": "Favourite Series",
      "subtitle": "Shows & Animation · Ansh (@ansh)",
      "accent": "blue",
      "aspect": "poster",
      "actionLabel": "Trailer",
      "items": [
        {
          "name": "BoJack Horseman",
          "meta": "2014 · Raphael Bob-Waksberg",
          "img": "https://image.tmdb.org/t/p/w500/6JFWzlChcGgLiIUo2COgNlWGFKy.jpg",
          "rewatchUrl": "https://rewatch.cc/series/bojack-horseman",
          "mediaUrl": "https://www.youtube.com/results?search_query=BoJack%20Horseman%20official%20trailer"
        },
        {
          "name": "Game of Thrones",
          "meta": "2011 · David Benioff, D. B. Weiss",
          "img": "https://image.tmdb.org/t/p/w500/1XS1oqL89opfnbLl8WnZY1O1uJx.jpg",
          "rewatchUrl": "https://rewatch.cc/series/game-of-thrones",
          "mediaUrl": "https://www.youtube.com/results?search_query=Game%20of%20Thrones%20official%20trailer"
        },
        {
          "name": "Marvel's Daredevil",
          "meta": "2015 · Drew Goddard",
          "img": "https://image.tmdb.org/t/p/w500/QWbPaDxiB6LW2LjASknzYBvjMj.jpg",
          "rewatchUrl": "https://rewatch.cc/series/marvels-daredevil",
          "mediaUrl": "https://www.youtube.com/results?search_query=Marvel's%20Daredevil%20official%20trailer"
        },
        {
          "name": "INVINCIBLE",
          "meta": "2021",
          "img": "https://image.tmdb.org/t/p/w500/4tblBrslcKSifMVZ3TmtT2ukMor.jpg",
          "rewatchUrl": "https://rewatch.cc/series/invincible",
          "mediaUrl": "https://www.youtube.com/results?search_query=INVINCIBLE%20official%20trailer"
        },
        {
          "name": "Hannibal",
          "meta": "2013 · Bryan Fuller",
          "img": "https://image.tmdb.org/t/p/w500/pbV2eLnKSIm1epSZt473UYfqaeZ.jpg",
          "rewatchUrl": "https://rewatch.cc/series/hannibal",
          "mediaUrl": "https://www.youtube.com/results?search_query=Hannibal%20official%20trailer"
        }
      ],
      "recentLabel": "Recent Series Diary",
      "recent": [
        {
          "name": "Lanterns",
          "meta": "5 October 2026 · 100%",
          "img": "https://image.tmdb.org/t/p/w500/rb94rKVIzLyfWufIN7WqLvadBDH.jpg",
          "rewatchUrl": "https://rewatch.cc/series/lanterns",
          "mediaUrl": "https://www.youtube.com/results?search_query=Lanterns%20official%20trailer"
        }
      ]
    },
    "rewatch_albums": {
      "id": "rewatch_albums",
      "badge": "PLAZA SW CORNER // REWATCH.CC/@ANSH",
      "title": "Favourite Albums",
      "subtitle": "Records on Rotation · Ansh (@ansh)",
      "accent": "amber",
      "aspect": "square",
      "actionLabel": "Listen / Trailer",
      "items": [
        {
          "name": "One Wayne G",
          "meta": "2023 · Mac DeMarco",
          "img": "https://coverartarchive.org/release-group/55177a25-8a36-420d-97c4-6a1ef87301fc/front-500",
          "rewatchUrl": "https://rewatch.cc/album/one-wayne-g",
          "mediaUrl": "https://www.youtube.com/results?search_query=One%20Wayne%20G%20%20Mac%20DeMarco%20full%20album"
        },
        {
          "name": "Blonde",
          "meta": "2016 · Frank Ocean",
          "img": "https://coverartarchive.org/release-group/0da340a0-6ad7-4fc2-a272-6f94393a7831/front-500",
          "rewatchUrl": "https://rewatch.cc/album/blonde",
          "mediaUrl": "https://music.apple.com/in/album/provider-single/1276055312?uo=4"
        },
        {
          "name": "Son of Spergy",
          "meta": "2025 · Daniel Caesar",
          "img": "https://coverartarchive.org/release-group/6ac79a31-8873-4fe5-83ae-7407e6a97cb2/front-500",
          "rewatchUrl": "https://rewatch.cc/album/son-of-spergy",
          "mediaUrl": "https://music.apple.com/in/album/son-of-spergy/1861540133?uo=4"
        },
        {
          "name": "Tadipaar",
          "meta": "2020 · MC STAN",
          "img": "https://coverartarchive.org/release-group/abcf60d1-a1ff-4f0a-9633-098090c655b8/front-500",
          "rewatchUrl": "https://rewatch.cc/album/tadipaar",
          "mediaUrl": "https://www.youtube.com/results?search_query=Tadipaar%20%20MC%20STAN%20full%20album"
        },
        {
          "name": "The Queen Is Dead",
          "meta": "1986 · The Smiths",
          "img": "https://coverartarchive.org/release-group/d8dde278-482c-3cc8-a530-fea70476f3a5/front-500",
          "rewatchUrl": "https://rewatch.cc/album/the-queen-is-dead",
          "mediaUrl": "https://music.apple.com/in/album/the-queen-is-dead-deluxe-edition/1257810218?uo=4"
        }
      ]
    },
    "rewatch_songs": {
      "id": "rewatch_songs",
      "badge": "PLAZA SE CORNER // REWATCH.CC/@ANSH",
      "title": "Favourite Songs",
      "subtitle": "All Top 5 Playable · Favourite Artist: The Smiths · Ansh (@ansh)",
      "accent": "pink",
      "aspect": "square",
      "items": [
        {
          "name": "20191009 I Like Her",
          "meta": "2023 · Mac DeMarco",
          "img": "https://coverartarchive.org/release-group/55177a25-8a36-420d-97c4-6a1ef87301fc/front-500",
          "rewatchUrl": "https://rewatch.cc/track/20191009-i-like-her",
          "previewUrl": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/c3/fe/bd/c3febde4-ecb7-d7b1-f9f6-2080ca8e4030/mzaf_5845193301829521882.plus.aac.p.m4a"
        },
        {
          "name": "There Is a Light That Never Goes Out",
          "meta": "1986 · The Smiths",
          "img": "https://coverartarchive.org/release-group/d8dde278-482c-3cc8-a530-fea70476f3a5/front-500",
          "rewatchUrl": "https://rewatch.cc/track/there-is-a-light-that-never-goes-out",
          "previewUrl": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/4e/c9/1d/4ec91df8-8524-b6ac-812c-fb38054be09d/mzaf_3253228293752173874.plus.aac.p.m4a"
        },
        {
          "name": "Ivy",
          "meta": "2016 · Frank Ocean",
          "img": "https://coverartarchive.org/release-group/0da340a0-6ad7-4fc2-a272-6f94393a7831/front-500",
          "rewatchUrl": "https://rewatch.cc/track/ivy",
          "previewUrl": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/b6/94/4d/b6944d5f-b66c-ef53-6fd5-8f0aaa92846c/mzaf_16355860049074950110.plus.aac.p.m4a"
        },
        {
          "name": "Chamber of Reflection",
          "meta": "2014 · Mac DeMarco",
          "img": "https://coverartarchive.org/release-group/99c195d6-0247-48d0-83ab-640ecca7a74f/front-500",
          "rewatchUrl": "https://rewatch.cc/track/chamber-of-reflection",
          "previewUrl": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/6e/8b/6b/6e8b6b9d-0881-6810-11d9-fa081cf37d81/mzaf_15689875906597339969.plus.aac.p.m4a"
        },
        {
          "name": "Linger",
          "meta": "1993 · The Cranberries",
          "img": "https://coverartarchive.org/release-group/e6b486b3-68e7-331c-a078-94fd71d61877/front-500",
          "rewatchUrl": "https://rewatch.cc/track/linger",
          "previewUrl": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/8c/00/ae/8c00aefb-f188-c3fc-16c9-10903bbf4ab7/mzaf_6940564345659969386.plus.aac.p.m4a"
        }
      ]
    }
  },
  // <REWATCH_DATA_END>

  dialogs: {
    sign_plaza: {
      speaker: 'TOWN DIRECTORY SIGN',
      text: 'ANSH TOWN PLAZA // North across Bridge: GlyphLens Lab (West) & Arcus Studio (East). Plaza: Intro Board (Left) · Mail Terminal (Right) · 4 Rewatch Taste Corners · Press [V] for 3D Mode!'
    },
    sign_bridge: {
      speaker: 'CANAL BRIDGE SIGN',
      text: 'CENTRAL CANAL BRIDGE // Cross north to explore GLYPHLENS (C# / Python OCR) on the west wing and ARCUS (Next.js / PostgreSQL) on the east wing. Hold [SHIFT] to sprint.'
    },
    sign_glyphlens: {
      speaker: 'GLYPHLENS LAB SIGN',
      text: 'HOUSE 01: GLYPHLENS — Privacy-first offline Windows screen translator (WGC + Windows OCR + PaddleOCR + CTranslate2). Press [E] at the red door to enter.'
    },
    sign_arcus: {
      speaker: 'ARCUS STUDIO SIGN',
      text: 'HOUSE 02: ARCUS — Local-first workout & training log (Next.js 15, IndexedDB, Supabase, Recharts). Press [E] at the blue door to enter.'
    },
    sign_shrine: {
      speaker: 'NORTH PROMENADE SIGN',
      text: 'SAKURA SHRINE // Step north to visit the torii monument & shrine cat, or take the wet avenue west to GlyphLens and east to Arcus.'
    },
    npc_guide: {
      speaker: 'TOWN GUIDE · REN',
      text: 'Rain never stops in Ansh Town, but the neon keeps the streets alive. Hold [SHIFT] to sprint, press [V] to switch between 2D Pixel & 3D WebGL, and collect all 10 Passport Stamps!'
    },
    shrine_stone: {
      speaker: 'SAKURA SHRINE // OMIKUJI',
      text: '"Build tools that stay out of your way." — Ansh, Lucknow. May your builds compile cleanly and your IndexedDB drafts never drop.'
    }
  },

  vendingDrinks: [
    'MATCHA ZERO // Cold-brew Uji matcha in a matte crimson can. (+10% Focus)',
    'SAKURA SODA // Sparkling white peach with pink neon fizz. (+15% Aesthetic)',
    'LUCKNOW CHAI-X // Cardamom-spiced espresso tonic, midnight edition. (+20% Shipping Speed)',
    'YUZU SPARK // Crisp citrus electrolyte fuel for late-night commits. (+12% Clarity)'
  ],

  shrineFortunes: [
    'GREAT BLESSING // Zero regression builds & sub-second OCR latency await you today.',
    'RISING STAR // The code you simplify tonight becomes your cleanest architecture tomorrow.',
    'QUIET FOCUS // Turn on Rain Audio, mute distractions, and ship one meaningful slice.',
    'CURATED TASTE // Take a break at the SE Song Corner — The Smiths never miss in the rain.'
  ],

  passportIds: [
    'glyphlens',
    'arcus',
    'about',
    'contact',
    'shrine_stone',
    'npc_guide',
    'rewatch_films',
    'rewatch_series',
    'rewatch_albums',
    'rewatch_songs'
  ]
};
