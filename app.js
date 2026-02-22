// app.js - 오늘 밤 영화 v3 (TMDB 포스터 지원)

const CONFIG = {
  dataUrl: './data.json',
  cacheKey: 'epg_cache_v10',
  posterCacheKey: 'poster_cache_v2',
  cacheAgeMin: 30,
  updateSchedule: [0, 6, 12, 18],
  tmdbKey: '0a3e13faef62e13445d8744883186dbb',
  tmdbImg: 'https://image.tmdb.org/t/p/w200',
};

const pad2 = n => String(n).padStart(2, '0');
const $ = id => document.getElementById(id);

const KST_OFFSET = 9 * 60 * 60 * 1000;
function nowKST() { return new Date(Date.now() + KST_OFFSET); }
function todayIso() {
  const d = nowKST();
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth()+1)}-${pad2(d.getUTCDate())}`;
}

// ── TMDB 포스터 ────────────────────────────────
const posterMemCache = {};

function loadPosterCache() {
  try { return JSON.parse(localStorage.getItem(CONFIG.posterCacheKey) || '{}'); } catch { return {}; }
}
function savePosterCache(cache) {
  try { localStorage.setItem(CONFIG.posterCacheKey, JSON.stringify(cache)); } catch {}
}

async function fetchPoster(title) {
  if (posterMemCache[title] !== undefined) return posterMemCache[title];

  const diskCache = loadPosterCache();
  if (diskCache[title] !== undefined) {
    posterMemCache[title] = diskCache[title];
    return diskCache[title];
  }

  try {
    const q = encodeURIComponent(title);
    const url = `https://api.themoviedb.org/3/search/movie?api_key=${CONFIG.tmdbKey}&query=${q}&language=ko-KR&page=1`;
    const res = await fetch(url);
    if (!res.ok) throw new Error();
    const data = await res.json();
    const path = data.results?.[0]?.poster_path || null;
    posterMemCache[title] = path;
    diskCache[title] = path;
    savePosterCache(diskCache);
    return path;
  } catch {
    posterMemCache[title] = null;
    return null;
  }
}

async function loadPosterToCard(cardEl, title) {
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

// ── 연령 배지 ──────────────────────────────────
function getAgeBadge(age) {
  if (!age) return '';
  const a = age.replace(/\s/g, '');
  if (a.includes('19') || a.includes('청소년관람불가')) return `<span class="age-badge age19">🔞 19</span>`;
  if (a.includes('15')) return `<span class="age-badge age15">⚠️ 15</span>`;
  if (a.includes('12')) return `<span class="age-badge age12">⚠️ 12</span>`;
  if (a.includes('전체') || a.includes('ALL')) return `<span class="age-badge all">전체</span>`;
  return '';
}

// ── 업데이트 뱃지 ──────────────────────────────
function getUpdateStatus(updatedAtIso) {
  if (!updatedAtIso) return { fresh: false, label: '업데이트 정보 없음', nextLabel: '' };
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
  return { fresh, label: `마지막 업데이트: ${timeLabel}`, nextLabel: `다음 업데이트: ${pad2(next)}:00` };
}

function renderUpdateBadge(updatedAtIso) {
  const badge = $('update-badge');
  if (!badge) return;
  const { fresh, label, nextLabel } = getUpdateStatus(updatedAtIso);
  badge.className = `update-badge ${fresh ? 'fresh' : 'stale'}`;
  badge.innerHTML = `
    <span class="update-dot"></span>
    <span class="update-text">${label}</span>
    ${!fresh ? `<span class="update-next"> · ${nextLabel}</span>` : ''}
  `;
}

// ── 날짜 라벨 ─────────────────────────────────
function setDateLabel() {
  const d = new Date();
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  $('date-label').textContent =
    `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 (${days[d.getDay()]})`;
}

// ── 캐시 ──────────────────────────────────────
function loadCache() {
  try {
    const raw = localStorage.getItem(CONFIG.cacheKey);
    if (!raw) return null;
    const obj = JSON.parse(raw);
    if (Date.now() - obj.fetchedAt > CONFIG.cacheAgeMin * 60000) return null;
    if (obj.date !== todayIso()) return null;
    return obj;
  } catch { return null; }
}

function saveCache(data) {
  try {
    localStorage.setItem(CONFIG.cacheKey, JSON.stringify({
      fetchedAt: Date.now(),
      date: todayIso(),
      ...data,
    }));
  } catch {}
}

// ── 렌더링 ────────────────────────────────────
function setLoading(on) {
  $('loading').style.display      = on ? 'flex' : 'none';
  $('main-content').style.display = on ? 'none' : 'block';
}

function renderPrograms(items) {
  const today = todayIso();
  const todayItems = (items || []).filter(p => p.date === today);
  const list = $('list');
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

function showError(msg) {
  setLoading(false);
  $('list').innerHTML = `
    <div class="error-panel">
      <div class="error-icon">⚠️</div>
      <div class="error-title">데이터를 불러오지 못했어요</div>
      <div class="error-desc">${msg}</div>
      <button class="retry-btn" onclick="start(true)">다시 시도</button>
    </div>`;
  $('summary').textContent = '';
}

// ── 앱 시작 ───────────────────────────────────
async function start(forceRefresh = false) {
  setLoading(true);
  setDateLabel();

  if (!forceRefresh) {
    const cached = loadCache();
    if (cached) {
      setLoading(false);
      const cnt = (cached.items || []).filter(p => p.date === todayIso()).length;
      $('summary').textContent = `21:30~22:10 시작 · 영화 ${cnt}편`;
      renderPrograms(cached.items || []);
      renderUpdateBadge(cached.updatedAt);
      return;
    }
  }

  try {
    const res = await fetch(CONFIG.dataUrl + '?t=' + Date.now());
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    saveCache(data);
    const cnt = (data.items || []).filter(p => p.date === todayIso()).length;
    setLoading(false);
    $('summary').textContent = `21:30~22:10 시작 · 영화 ${cnt}편`;
    renderPrograms(data.items || []);
    renderUpdateBadge(data.updatedAt);
  } catch (e) {
    showError(e.message || '네트워크 오류');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  $('refresh-btn').addEventListener('click', () => start(true));
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(console.warn);
  }
  start();
});
