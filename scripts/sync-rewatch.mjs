/* ─── scripts/sync-rewatch.mjs — Auto-Sync rewatch.cc/@ansh -> js/data.js ─── */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_PATH = path.resolve(__dirname, '..', 'js', 'data.js');
const PROFILE_URL = 'https://rewatch.cc/@ansh';

const decodeHtml = s => s
  .replace(/&#x27;/g, "'")
  .replace(/&amp;/g, '&')
  .replace(/&quot;/g, '"')
  .replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>')
  .trim();

const fetchSongPreview = async (name, meta) => {
  const artist = meta.includes('·') ? meta.split('·').slice(1).join(' ').trim() : meta;
  const q = `${name} ${artist}`.trim();
  try {
    const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(q)}&country=IN&media=music&entity=song&limit=3`);
    if (!res.ok) return null;
    const json = await res.json();
    const hit = json.results?.[0];
    return hit?.previewUrl || null;
  } catch {
    return null;
  }
};

const fetchAlbumAppleUrl = async (name, meta) => {
  const artist = meta.includes('·') ? meta.split('·').slice(1).join(' ').trim() : meta;
  const q = `${name} ${artist}`.trim();
  try {
    const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(q)}&country=IN&media=music&entity=album&limit=3`);
    if (!res.ok) return null;
    const json = await res.json();
    const hit = json.results?.find(r =>
      r.collectionName?.toLowerCase().includes(name.toLowerCase()) ||
      r.artistName?.toLowerCase().includes(artist.toLowerCase())
    );
    return hit?.collectionViewUrl || null;
  } catch {
    return null;
  }
};

async function main() {
  const res = await fetch(PROFILE_URL, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${PROFILE_URL}`);
  const html = await res.text();
  const decoded = html.replace(/\\"/g, '"');

  /* Extract clean text lines */
  const stripped = html
    .replace(/<script[\s\S]*?<\/script>/g, ' ')
    .replace(/<style[\s\S]*?<\/style>/g, ' ')
    .replace(/<[^>]+>/g, '\n')
    .split('\n')
    .map(l => decodeHtml(l))
    .filter(l => l && !l.startsWith('self.__next_f') && l.length < 220);

  /* Extract artwork & slugs from RSC payload */
  const imgByTitle = new Map();
  for (const m of decoded.matchAll(/"kind":"([^"]+)","title":"([^"]+)","src":"([^"]+)"/g)) {
    imgByTitle.set(`${m[1]}:${decodeHtml(m[2])}`, m[3]);
    imgByTitle.set(decodeHtml(m[2]), m[3]);
  }

  const hrefByTitle = new Map();
  for (const m of decoded.matchAll(/"href":"(\/(film|series|album|track)\/[^"]+)"[\s\S]{0,400}?"title":"([^"]+)"/g)) {
    hrefByTitle.set(`${m[2]}:${decodeHtml(m[3])}`, `https://rewatch.cc${m[1]}`);
    hrefByTitle.set(decodeHtml(m[3]), `https://rewatch.cc${m[1]}`);
  }

  const favStart = Math.max(0, stripped.indexOf('Favourites'));
  const sectionItems = (heading, nextHeadings) => {
    const idx = stripped.indexOf(heading, favStart);
    if (idx === -1) return [];
    const list = [];
    for (let i = idx + 1; i < stripped.length; i += 2) {
      const name = stripped[i];
      if (nextHeadings.includes(name)) break;
      const meta = stripped[i + 1] || '';
      if (nextHeadings.includes(meta)) break;
      list.push({ name, meta });
    }
    return list;
  };

  const films  = sectionItems('Films', ['Series', 'Albums', 'Songs', 'Artists', 'Recently logged']);
  const series = sectionItems('Series', ['Albums', 'Songs', 'Artists', 'Recently logged']);
  const albums = sectionItems('Albums', ['Songs', 'Artists', 'Recently logged']);
  const songs  = sectionItems('Songs', ['Artists', 'Recently logged', 'Diary']);

  /* Favourite Artist line if present */
  const artIdx = stripped.indexOf('Artists', favStart);
  const favArtist = artIdx !== -1 && stripped[artIdx + 2] && stripped[artIdx + 2] !== 'Recently logged'
    ? stripped[artIdx + 2]
    : '';

  /* Recently logged Diary (strictly after 'Recently logged' with real date lines) */
  const diary = [];
  const recentIdx = stripped.indexOf('Recently logged');
  const diaryIdx = recentIdx !== -1 ? stripped.indexOf('Diary', recentIdx) : -1;
  const dateRe = /^\d{1,2}\s+[A-Za-z]+\s+\d{4}$/;
  if (diaryIdx !== -1) {
    for (let i = diaryIdx + 1; i + 1 < stripped.length; i += 2) {
      const name = stripped[i];
      const date = stripped[i + 1];
      if (!name || !date || !dateRe.test(date)) break;
      diary.push({ name, date });
    }
  }

  if (!films.length || !series.length || !albums.length || !songs.length) {
    throw new Error('Parsed Rewatch sections came back incomplete; aborting update.');
  }

  /* Extract ratings map from RSC payload */
  const ratingByTitle = new Map();
  for (const m of decoded.matchAll(/"title":"([^"]+)"[\s\S]{0,600}?"rating":(\d+)/g)) {
    ratingByTitle.set(decodeHtml(m[1]), Number(m[2]));
  }

  const enrichFilms = items => items.map(it => ({
    name: it.name,
    meta: it.meta,
    img: imgByTitle.get(`film:${it.name}`) || imgByTitle.get(it.name) || '',
    rewatchUrl: hrefByTitle.get(`film:${it.name}`) || hrefByTitle.get(it.name) || PROFILE_URL,
    mediaUrl: `https://www.youtube.com/results?search_query=${encodeURIComponent(`${it.name} ${it.meta.split('·')[0].trim()} official trailer`)}`
  }));

  const enrichSeries = items => items.map(it => ({
    name: it.name,
    meta: it.meta,
    img: imgByTitle.get(`series:${it.name}`) || imgByTitle.get(it.name) || '',
    rewatchUrl: hrefByTitle.get(`series:${it.name}`) || hrefByTitle.get(it.name) || PROFILE_URL,
    mediaUrl: `https://www.youtube.com/results?search_query=${encodeURIComponent(`${it.name} official trailer`)}`
  }));

  const enrichAlbums = await Promise.all(albums.map(async it => {
    const apple = await fetchAlbumAppleUrl(it.name, it.meta);
    return {
      name: it.name,
      meta: it.meta,
      img: imgByTitle.get(`album:${it.name}`) || imgByTitle.get(it.name) || '',
      rewatchUrl: hrefByTitle.get(`album:${it.name}`) || hrefByTitle.get(it.name) || PROFILE_URL,
      mediaUrl: apple || `https://www.youtube.com/results?search_query=${encodeURIComponent(`${it.name} ${it.meta.split('·')[1] || ''} full album`)}`
    };
  }));

  const enrichSongs = await Promise.all(songs.map(async it => {
    const previewUrl = await fetchSongPreview(it.name, it.meta);
    return {
      name: it.name,
      meta: it.meta,
      img: imgByTitle.get(`track:${it.name}`) || imgByTitle.get(it.name) || '',
      rewatchUrl: hrefByTitle.get(`track:${it.name}`) || hrefByTitle.get(it.name) || PROFILE_URL,
      ...(previewUrl ? { previewUrl } : {})
    };
  }));

  const recentFilms = [];
  const recentSeries = [];
  for (const d of diary) {
    const pct = ratingByTitle.has(d.name) ? ` · ${ratingByTitle.get(d.name)}%` : '';
    const isSeries = imgByTitle.has(`series:${d.name}`) || hrefByTitle.has(`series:${d.name}`);
    const entry = {
      name: d.name,
      meta: `${d.date}${pct}`,
      img: imgByTitle.get(d.name) || '',
      rewatchUrl: hrefByTitle.get(d.name) || PROFILE_URL,
      mediaUrl: `https://www.youtube.com/results?search_query=${encodeURIComponent(`${d.name} official trailer`)}`
    };
    if (isSeries) recentSeries.push(entry);
    else recentFilms.push(entry);
  }

  const rewatchCorners = {
    rewatch_films: {
      id: 'rewatch_films',
      badge: 'PLAZA NW CORNER // REWATCH.CC/@ANSH',
      title: 'Favourite Films',
      subtitle: 'Curated Cinema · Ansh (@ansh) · "I MADE A STEAK 🥩 MARK!!!!!!"',
      accent: 'crimson',
      aspect: 'poster',
      actionLabel: 'Trailer',
      items: enrichFilms(films),
      ...(recentFilms.length ? { recentLabel: 'Recent Film Diary', recent: recentFilms } : {})
    },
    rewatch_series: {
      id: 'rewatch_series',
      badge: 'PLAZA NE CORNER // REWATCH.CC/@ANSH',
      title: 'Favourite Series',
      subtitle: 'Shows & Animation · Ansh (@ansh)',
      accent: 'blue',
      aspect: 'poster',
      actionLabel: 'Trailer',
      items: enrichSeries(series),
      ...(recentSeries.length ? { recentLabel: 'Recent Series Diary', recent: recentSeries } : {})
    },
    rewatch_albums: {
      id: 'rewatch_albums',
      badge: 'PLAZA SW CORNER // REWATCH.CC/@ANSH',
      title: 'Favourite Albums',
      subtitle: 'Records on Rotation · Ansh (@ansh)',
      accent: 'amber',
      aspect: 'square',
      actionLabel: 'Listen / Trailer',
      items: enrichAlbums
    },
    rewatch_songs: {
      id: 'rewatch_songs',
      badge: 'PLAZA SE CORNER // REWATCH.CC/@ANSH',
      title: 'Favourite Songs',
      subtitle: favArtist ? `All Top 5 Playable · Favourite Artist: ${favArtist} · Ansh (@ansh)` : 'All Top 5 Playable · Ansh (@ansh)',
      accent: 'pink',
      aspect: 'square',
      items: enrichSongs
    }
  };

  const currentFile = fs.readFileSync(DATA_PATH, 'utf8');
  const startMarker = '// <REWATCH_DATA_START>';
  const endMarker = '// <REWATCH_DATA_END>';
  const sIdx = currentFile.indexOf(startMarker);
  const eIdx = currentFile.indexOf(endMarker);
  if (sIdx === -1 || eIdx === -1) {
    throw new Error('Could not find REWATCH_DATA markers in js/data.js');
  }

  const block = `${startMarker}\n  rewatchCorners: ${JSON.stringify(rewatchCorners, null, 2).replace(/\n/g, '\n  ')},\n  ${endMarker}`;
  const nextFile = currentFile.slice(0, sIdx) + block + currentFile.slice(eIdx + endMarker.length);

  fs.writeFileSync(DATA_PATH, nextFile, 'utf8');
  console.log(`Synced Rewatch: ${films.length} films, ${series.length} series, ${albums.length} albums, ${songs.length} songs, ${diary.length} diary entries.`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
