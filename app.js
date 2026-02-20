// app.js - data.json에서 편성표 로드

const CONFIG = {
  dataUrl: './data.json',
  cacheKey: 'epg_cache_v8',
  cacheAgeMin: 30,
  updateSchedule: [0, 6, 12, 18],
};

const pad2 = n => String(n).padStart(2, '0');
const $ = id => document.getElementById(id);

const KST_OFFSET = 9 * 60 * 60 * 1000;
function nowKST() { return new Date(Date.now() + KST_OFFSET); }
function todayIso() {
  const d = nowKST();
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth()+1)}-${pad2(d.getUTCDate())}`;
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
  let timeLabel = diffMin < 60 ? `${diffMin}분 전`
    : diffMin < 1440 ? `${Math.floor(diffMin/60)}시간 전`
    : updatedAt.toLocaleString('ko-KR', {month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'});
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

// ── 렌더링 ──────────────────────────────────────
function setLoading(on) {
  $('loading').style.display      = on ? 'flex'  : 'none';
  $('main-content').style.display = on ? 'none'  : 'block';
}

function setDateLabel() {
  const d = new Date(), days = ['일','월','화','수','목','금','토'];
  $('date-label').textContent =
    `${d.getFullYear()}년 ${d.getMonth()+1}월 ${d.getDate()}일 (${days[d.getDay()]})`;
}

function renderPrograms(items) {
  const today = todayIso();
  const todayItems = items.filter(p => p.date === today);
  const list = $('list');
  list.innerHTML = '';
  if (!todayItems || todayItems.length === 0) {
    list.innerHTML = `
      <div class="empty-panel">
        <div class="empty-icon">📭</div>
        <div class="empty-title">오늘 21:30~22:00 시작 영화가 없어요</div>
        <div class="empty-desc">새로고침을 눌러 다시 시도해보세요.</div>
      </div>`;
    return;
  }
  todayItems.forEach((p, i) => {
    const card = document.createElement('div');
    card.className = 'card';
    card.style.animationDelay = `${i * 60}ms`;
    const tags = [...(p.genres||[]).slice(0,3), p.age, p.runtimeMin ? `${p.runtimeMin}분` : null]
      .filter(Boolean).map(t => `<span class="tag">${t}</span>`).join('');
    card.innerHTML = `
      <div class="time-row">
        <span class="time">${p.start}${p.end ? ` ~ ${p.end}` : ''}</span>
        <span class="channel-badge">${p.channel}</span>
      </div>
      <div class="title">${p.title}</div>
      ${tags ? `<div class="tags">${tags}</div>` : ''}
      ${p.plot ? `<div class="plot">${p.plot}</div>` : ''}`;
    list.appendChild(card);
  });
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
  $('summary').textContent = '로드 실패';
}

// ── 앱 시작 ──────────────────────────────────────
async function start(forceRefresh = false) {
  setLoading(true);
  setDateLabel();

  if (!forceRefresh) {
    const cached = loadCache();
    if (cached) {
      setLoading(false);
      const todayItems = (cached.items || []).filter(p => p.date === todayIso());
      $('summary').textContent = `21:30~22:00 시작 · ${todayItems.length}개 · 캐시`;
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
    const todayItems = (data.items || []).filter(p => p.date === todayIso());
    setLoading(false);
    $('summary').textContent = `21:30~22:00 시작 · ${todayItems.length}개`;
    renderPrograms(data.items || []);
    renderUpdateBadge(data.updatedAt);
  } catch(e) {
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
