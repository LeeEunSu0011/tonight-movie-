// ui.js - UI 렌더링

import { todayIso, tomorrowIso } from './utils/date.js';
import { MovieCard } from './components/MovieCard.js';
import { TabBar } from './components/TabBar.js';
import { renderUpdateBadge } from './components/UpdateBadge.js';

export { renderUpdateBadge };

let currentTab = 'today';
let cachedItems = [];

export function setLoading(on) {
  document.getElementById('loading').style.display      = on ? 'flex' : 'none';
  document.getElementById('main-content').style.display = on ? 'none' : 'block';
}

function renderTabBar() {
  const container = document.getElementById('tab-bar');
  if (!container) return;
  container.innerHTML = '';
  container.appendChild(TabBar(currentTab, (tab) => {
    currentTab = tab;
    renderList();
  }));
}

function renderList() {
  const dateIso = currentTab === 'today' ? todayIso() : tomorrowIso();
  const filtered = cachedItems.filter(p => p.date === dateIso);
  const list = document.getElementById('list');
  list.innerHTML = '';

  setSummary(filtered.length);

  if (filtered.length === 0) {
    list.innerHTML = `
      <div class="empty-panel">
        <div class="empty-icon">📭</div>
        <div class="empty-title">${currentTab === 'today' ? '오늘' : '내일'} 해당 시간대 영화가 없어요</div>
        <div class="empty-desc">새로고침을 눌러 다시 시도해보세요.</div>
      </div>`;
    return;
  }

  filtered.forEach((p, i) => {
    list.appendChild(MovieCard(p, i));
  });
}

export function renderPrograms(items) {
  cachedItems = items || [];
  renderTabBar();
  renderList();
}

export function showError(msg) {
  setLoading(false);
  document.getElementById('list').innerHTML = `
    <div class="error-panel">
      <div class="error-icon">⚠️</div>
      <div class="error-title">데이터를 불러오지 못했어요</div>
      <div class="error-desc">${msg}</div>
      <button class="retry-btn" onclick="window.appStart(true)">다시 시도</button>
    </div>`;
  document.getElementById('summary').textContent = '';
}

export function setSummary(cnt) {
  const label = currentTab === 'today' ? '오늘' : '내일';
  document.getElementById('summary').textContent = `${label} 21:30~22:10 시작 · 영화 ${cnt}편`;
}
