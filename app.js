// app.js - 메인 진입점

import { CONFIG } from './config.js';
import { todayIso, setDateLabel } from './utils/date.js';
import { loadCache, saveCache, fetchEpg } from './epg.js';
import { setLoading, renderPrograms, renderUpdateBadge, showError } from './ui.js';

async function start(forceRefresh = false) {
  setLoading(true);
  setDateLabel();

  if (!forceRefresh) {
    const cached = loadCache();
    if (cached) {
      setLoading(false);
      renderPrograms(cached.items || []);
      renderUpdateBadge(cached.updatedAt);
      return;
    }
  }

  try {
    const data = await fetchEpg();
    saveCache(data);
    setLoading(false);
    renderPrograms(data.items || []);
    renderUpdateBadge(data.updatedAt);
  } catch (e) {
    showError(e.message || '네트워크 오류');
  }
}

window.appStart = start;

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('refresh-btn').addEventListener('click', () => start(true));
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(console.warn);
  }
  start();
});
