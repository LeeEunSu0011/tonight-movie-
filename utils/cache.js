// utils/cache.js - 캐시 관련 유틸리티

export function loadFromStorage(key) {
  try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch { return null; }
}

export function saveToStorage(key, data) {
  try { localStorage.setItem(key, JSON.stringify(data)); } catch {}
}
