// app.js - Wavve API 직접 호출 (브라우저 = 한국 IP)

const CONFIG = {
  wavveKey: 'E5F3E0D30947AA5440556471321BB6D9',
  cacheKey: 'epg_cache_v7',
  cacheAgeMin: 60,
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
function todayCompact() { return todayIso().replace(/-/g, ''); }

const WINDOW_START = 21 * 60 + 30;
const WINDOW_END   = 22 * 60;

function inWindow(start) {
  if (!start) return false;
  const [h, m] = start.split(':').map(Number);
  return WINDOW_START <= h * 60 + m && h * 60 + m < WINDOW_END;
}

function parseTime(raw) {
  if (!raw) return '';
  const m = String(raw).match(/(\d{1,2}):(\d{2})/);
  if (m) return `${m[1].padStart(2,'0')}:${m[2]}`;
  if (/^\d{4}$/.test(String(raw))) return `${String(raw).slice(0,2)}:${String(raw).slice(2,4)}`;
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

// ── Wavve API (브라우저에서 직접 호출) ───────────
const WAVVE_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
  'Accept': 'application/json',
  'Origin': 'https://www.wavve.com',
  'Referer': 'https://www.wavve.com/',
};

const CHANNEL_MAP = {
  'KBS1': 'KBS1', 'KBS2': 'KBS2', 'MBC': 'MBC', 'SBS': 'SBS',
  'C01': 'tvN', 'C23': 'OCN', 'OCN_MOVIES': 'OCN Movies',
  'CGV': 'CGV', 'CH_CGV': '채널CGV',
};

async function fetchWavveChannels() {
  const url = `https://api.wavve.com/v4/live/channels?apikey=${CONFIG.wavveKey}&credential=none&device=mobile&drm=none&formattype=json&partnerId=P-CH&prdtype=2`;
  const res = await fetch(url, { headers: WAVVE_HEADERS });
  if (!res.ok) throw new Error(`채널 API ${res.status}`);
  const data = await res.json();
  const items = data?.data?.items || data?.items || [];
  const map = {};
  items.forEach(ch => {
    const code = ch.channelcode || ch.channel_code || '';
    const name = ch.channelname || ch.channel_name || '';
    if (code && name) map[code] = name;
  });
  return Object.keys(map).length > 0 ? map : CHANNEL_MAP;
}

async function fetchWavveEPG(channelCode, channelName, dateCompact) {
  const url = `https://api.wavve.com/v4/live/epgs?apikey=${CONFIG.wavveKey}&credential=none&device=mobile&drm=none&formattype=json&limit=500&offset=0&partnerId=P-CH&prdtype=2&startdate=${dateCompact}&enddate=${dateCompact}&channelcode=${channelCode}`;
  try {
    const res = await fetch(url, { headers: WAVVE_HEADERS });
    if (!res.ok) return [];
    const data = await res.json();
    const items = data?.data?.items || data?.items || [];
    return items
      .map(item => {
        const start = parseTime(item.starttime || item.start_time || '');
        const end   = parseTime(item.endtime   || item.end_time   || '');
        if (!inWindow(start)) return null;
        const genres = [];
        if (item.category_name) genres.push(item.category_name);
        return {
          date: todayIso(),
          channel: channelName,
          start, end,
          title: item.title || item.program_name || '(제목 없음)',
          genres,
          runtimeMin: item.runtime ? parseInt(item.runtime) : null,
          age: item.ratings || item.age || '',
          plot: item.synopsis || item.description || '',
        };
      })
      .filter(Boolean);
  } catch { return []; }
}

async function fetchAllEPG() {
  const dateCompact = todayCompact();
  let channelMap;
  try { channelMap = await fetchWavveChannels(); }
  catch { channelMap = CHANNEL_MAP; }

  const TARGET = new Set(['KBS1','KBS2','MBC','SBS','tvN','OCN','OCN Movies','CGV','채널CGV']);
  const promises = Object.entries(channelMap)
    .filter(([, name]) => TARGET.has(name))
    .map(([code, name]) => fetchWavveEPG(code, name, dateCompact));

  const results = await Promise.all(promises);
  return results.flat().sort((a, b) => a.start.localeCompare(b.start));
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
function saveCache(items) {
  try {
    localStorage.setItem(CONFIG.cacheKey, JSON.stringify({
      fetchedAt: Date.now(),
      date: todayIso(),
      updatedAt: new Date().toISOString(),
      items,
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
  const list = $('list');
  list.innerHTML = '';
  if (!items || items.length === 0) {
    list.innerHTML = `
      <div class="empty-panel">
        <div class="empty-icon">📭</div>
        <div class="empty-title">오늘 21:30~22:00 시작 영화가 없어요</div>
        <div class="empty-desc">새로고침을 눌러 다시 시도해보세요.</div>
      </div>`;
    return;
  }
  items.forEach((p, i) => {
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
      $('summary').textContent = `21:30~22:00 시작 · ${cached.items.length}개 · 캐시`;
      renderPrograms(cached.items);
      renderUpdateBadge(cached.updatedAt);
      return;
    }
  }

  try {
    const items = await fetchAllEPG();
    const updatedAt = new Date().toISOString();
    saveCache(items);
    setLoading(false);
    $('summary').textContent = `21:30~22:00 시작 · ${items.length}개`;
    renderPrograms(items);
    renderUpdateBadge(updatedAt);
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