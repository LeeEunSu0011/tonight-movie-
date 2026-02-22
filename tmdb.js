// tmdb.js - TMDB 포스터 검색 및 캐시

import { CONFIG } from './config.js';

const memCache = {};

function loadDiskCache() {
  try { return JSON.parse(localStorage.getItem(CONFIG.posterCacheKey) || '{}'); } catch { return {}; }
}

function saveDiskCache(cache) {
  try { localStorage.setItem(CONFIG.posterCacheKey, JSON.stringify(cache)); } catch {}
}

export async function fetchPoster(title) {
  if (memCache[title] !== undefined) return memCache[title];

  const disk = loadDiskCache();
  if (disk[title] !== undefined) {
    memCache[title] = disk[title];
    return disk[title];
  }

  try {
    const q = encodeURIComponent(title);
    const url = `https://api.themoviedb.org/3/search/movie?api_key=${CONFIG.tmdbKey}&query=${q}&language=ko-KR&page=1`;
    const res = await fetch(url);
    if (!res.ok) throw new Error();
    const data = await res.json();
    const path = data.results?.[0]?.poster_path || null;
    memCache[title] = path;
    disk[title] = path;
    saveDiskCache(disk);
    return path;
  } catch {
    memCache[title] = null;
    return null;
  }
}

export async function loadPosterToCard(cardEl, title) {
  const imgEl = cardEl.querySelector('.poster-img');
  const placeholderEl = cardEl.querySelector('.poster-placeholder');
  if (!imgEl) return;

  const path = await fetchPoster(title);
  if (path) {
    imgEl.src = CONFIG.tmdbImg + path;
    imgEl.style.display = 'block';
    if (placeholderEl) placeholderEl.style.display = 'none';
  }
}
