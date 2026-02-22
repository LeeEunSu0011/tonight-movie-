// ui.js - UI 렌더링

import { CONFIG } from './config.js';
import { todayIso, nowKST, pad2 } from './utils.js';
import { loadPosterToCard } from './tmdb.js';

// ── 연령 배지 ──────────────────────────────────
export function getAgeBadge(age) {
  if (!age) return '';
  const a = age.replace(/\s/g, '');
  if (a.includes('19') || a.includes('청소년관람불가')) return `<span class="age-badge age19">🔞 19</span>`;
  if (a.includes('15')) return `<span class="age-badge age15">⚠️ 15</span>`;
  if (a.includes('12')) return `<span class="age-badge age12">⚠️ 12</span>`;
  if (a.includes('전체') || a.includes('ALL')) return `<span class="age-badge all">전체</span>`;
  return '';
}

// ── 업데이트 뱃지 ──────────────────────────────
export function renderUpdateBadge(updatedAtIso) {
  const badge = document.getElementById('update-badge');
  if (!badge) return;

  if (!updatedAtIso) {
    badge.className = 'update-badge stale';
    badge.innerHTML = `<span class="update-dot"></span><span class="update-text">업데이트 정보 없음</span>`;
    return;
  }

  const now = new Date();
  const updatedAt = new Date(updatedAtIso);
  const diffMin = Math.floor((now - updatedAt) / 60000);
  const kstHour = nowKST().getUTCHours();
  const passed = CONFIG.updateSchedule.filter(h => h <= kstHour);
  const lastHour = passed.length > 0 ? Math.max(...passed) : 18;
  const lastScheduled = new Date(now);
  lastScheduled.setUTCHours(lastHour - 9, 5, 0, 0);
  const fresh = updatedAt >= lastScheduled;
  const next = CONFIG.updateSchedule.find(h => h > kstHour) ?? CONFIG.updateSchedule[0];
  const timeLabel = diffMin < 60 ? `${diffMin}분 전`
    : diffMin < 1440 ? `${Math.floor(diffMin/60)}시간 전`
    : updatedAt.toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  badge.className = `update-badge ${fresh ? 'fresh' : 'stale'}`;
  badge.innerHTML = `
    <span class="update-dot"></span>
    <span class="update-text">마지막 업데이트: ${timeLabel}</span>
    ${!fresh ? `<span class="update-next"> · 다음 업데이트: ${pad2(next)}:00</span>` : ''}
  `;
}

// ── 로딩 상태 ─────────────────────────────────
export function setLoading(on) {
  document.getElementById('loading').style.display      = on ? 'flex' : 'none';
  document.getElementById('main-content').style.display = on ? 'none' : 'block';
}

// ── 카드 렌더링 ───────────────────────────────
export function renderPrograms(items) {
  const today = todayIso();
  const todayItems = (items || []).filter(p => p.date === today);
  const list = document.getElementById('list');
  list.innerHTML = '';

  if (todayItems.length === 0) {
    list.innerHTML = `
      <div class="empty-panel">
        <div class="empty-icon">📭</div>
        <div class="empty-title">오늘 해당 시간대 영화가 없어요</div>
        <div class="empty-desc">새로고침을 눌러 다시 시도해보세요.</div>
      </div>`;
    return;
  }

  const cards = [];

  todayItems.forEach((p, i) => {
    const card = document.createElement('div');
    card.className = 'card';
    card.style.animationDelay = `${i * 60}ms`;

    const hasRealPlot = p.plot && p.plot !== p.title && !p.plot.match(/^\s*\d+회\s*$/);
    const plotHtml = hasRealPlot ? `<div class="plot">${p.plot}</div>` : '';
    const runtimeHtml = p.runtimeMin ? `<div class="runtime">⏱ ${p.runtimeMin}분</div>` : '';

    const genreSkip = new Set(['Movie / Drama']);
    const genres = (p.genres || []).filter(g => !genreSkip.has(g)).slice(0, 2);
    const tagsHtml = genres.length
      ? `<div class="tags">${genres.map(g => `<span class="tag">${g}</span>`).join('')}</div>`
      : '';

    card.innerHTML = `
      <div class="card-inner">
        <div class="poster-wrap">
          <img class="poster-img" src="" alt="${p.title}" style="display:none" loading="lazy" />
          <div class="poster-placeholder">🎬</div>
        </div>
        <div class="card-body">
          <div class="time-row">
            <span class="time">${p.start}${p.end ? ` ~ ${p.end}` : ''}</span>
            <span class="channel-badge">${p.channel}</span>
          </div>
          <div class="title-row">
            <span class="title">${p.title}</span>
            ${getAgeBadge(p.age)}
          </div>
          ${tagsHtml}
          ${plotHtml}
          ${runtimeHtml}
        </div>
      </div>
    `;

    list.appendChild(card);
    cards.push({ card, title: p.title });
  });

  // 포스터 비동기 로드
  cards.forEach(({ card, title }) => loadPosterToCard(card, title));
}

// ── 에러 표시 ─────────────────────────────────
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

// ── 요약 바 ───────────────────────────────────
export function setSummary(cnt) {
  document.getElementById('summary').textContent = `21:30~22:10 시작 · 영화 ${cnt}편`;
}
