// app.js - 메인 진입점

import { CONFIG } from './config.js';
import { todayIso, setDateLabel } from './utils.js';
import { loadCache, saveCache, fetchEpg } from './epg.js';
import { setLoading, renderPrograms, renderUpdateBadge, showError, setSummary } from './ui.js';

async function start(forceRefresh = false) {
  setLoading(true);
  setDateLabel();

  if (!forceRefresh) {
    const cached = loadCache();
    if (cached) {
      setLoading(false);
      const cnt = (cached.items || []).filter(p => p.date === todayIso()).length;
      setSummary(cnt);
      renderPrograms(cached.items || []);
      renderUpdateBadge(cached.updatedAt);
      return;
    }
  }

  try {
    const data = await fetchEpg();
    saveCache(data);
    const cnt = (data.items || []).filter(p => p.date === todayIso()).length;
    setLoading(false);
    setSummary(cnt);
    renderPrograms(data.items || []);
    renderUpdateBadge(data.updatedAt);
  } catch (e) {
    showError(e.message || '네트워크 오류');
  }
}

// 에러 패널의 retry 버튼에서 접근할 수 있도록 전역 노출
window.appStart = start;

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('refresh-btn').addEventListener('click', () => start(true));
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(console.warn);
  }
  start();
});
