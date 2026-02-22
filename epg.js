// epg.js - 편성표 데이터 로드 및 캐시

import { CONFIG } from './config.js';
import { todayIso } from './utils.js';

export function loadCache() {
  try {
    const raw = localStorage.getItem(CONFIG.cacheKey);
    if (!raw) return null;
    const obj = JSON.parse(raw);
    if (Date.now() - obj.fetchedAt > CONFIG.cacheAgeMin * 60000) return null;
    if (obj.date !== todayIso()) return null;
    return obj;
  } catch { return null; }
}

export function saveCache(data) {
  try {
    localStorage.setItem(CONFIG.cacheKey, JSON.stringify({
      fetchedAt: Date.now(),
      date: todayIso(),
      ...data,
    }));
  } catch {}
}

export async function fetchEpg() {
  const res = await fetch(CONFIG.dataUrl + '?t=' + Date.now());
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json();
}
