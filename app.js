// app.js

// ═══════════════════════════════════════════
// 설정
// ═══════════════════════════════════════════
const CONFIG = {
  cacheKey:    'epg_cache_v3',
  cacheAgeMin: 12 * 60,           // 12시간
  windowStart: 21 * 60 + 30,      // 21:30
  windowEnd:   22 * 60,           // 22:00
  targetChannels: new Set([
    'KBS1', 'KBS2', 'MBC', 'SBS',
    'tvN', 'OCN', 'OCN Movies', 'OCN Movies2',
    'CGV', '채널CGV',
  ]),
  // CORS 프록시: Wavve API를 브라우저에서 직접 호출하기 위해 필요
  // allorigins는 무료 오픈소스 프록시
  proxyUrl: (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  wavveKey: 'E5F3E0D30947AA5440556471321BB6D9',
};

// ═══════════════════════════════════════════
// 유틸
// ═══════════════════════════════════════════
const pad2 = (n) => String(n).padStart(2, '0');
const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
};
const todayCompact = () => todayIso().replace(/-/g, '');
const timeToMin = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};
const inWindow = (start) => {
  if (!start) return false;
  const m = timeToMin(start);
  return m >= CONFIG.windowStart && m < CONFIG.windowEnd;
};
const parseTime = (raw = '') => {
  const m = raw.match(/(\d{1,2}):(\d{2})/);
  if (m) return `${pad2(Number(m[1]))}:${m[2]}`;
  if (/^\d{4}$/.test(raw)) return `${raw.slice(0,2)}:${raw.slice(2,4)}`;
  return '';
};
const calcRuntime = (start, end) => {
  try {
    const sm = timeToMin(start), em = timeToMin(end);
    const diff = em >= sm ? em - sm : em + 24*60 - sm;
    return diff > 0 ? diff : null;
  } catch { return null; }
};
const parseRating = (raw='') => {
  if (/19|adult/i.test(raw)) return '19세';
  if (/15/i.test(raw)) return '15세';
  if (/12/i.test(raw)) return '12세';
  if (/7|all|^0$/i.test(raw)) return '전체';
  return raw || '';
};

// ═══════════════════════════════════════════
// 캐시
// ═══════════════════════════════════════════
function loadCache() {
  try {
    const raw = localStorage.getItem(CONFIG.cacheKey);
    if (!raw) return null;
    const obj = JSON.parse(raw);
    const ageOk = Date.now() - obj.fetchedAt < CONFIG.cacheAgeMin * 60000;
    const today = todayIso();
    const hasToday = (obj.items || []).some(x => x.date === today);
    if (!ageOk || !hasToday) return null;
    return obj.items;
  } catch { return null; }
}

function saveCache(items) {
  try {
    localStorage.setItem(CONFIG.cacheKey, JSON.stringify({
      fetchedAt: Date.now(),
      items,
    }));
  } catch {}
}

// ═══════════════════════════════════════════
// Wavve API
// ═══════════════════════════════════════════
async function fetchWavveChannels() {
  const url = `https://api.wavve.com/v4/live/channels?apikey=${CONFIG.wavveKey}&credential=none&device=mobile&drm=none&formattype=json&partnerId=P-CH&prdtype=2`;
  const res  = await fetch(CONFIG.proxyUrl(url));
  const body = await res.json();
  const items = body?.data?.items ?? body?.items ?? [];

  const map = {};
  for (const ch of items) {
    const code = ch.channelcode ?? ch.channel_code ?? '';
    const name = ch.channelname ?? ch.channel_name ?? '';
    if (code && name) map[code] = name;
  }
  return map;
}

async function fetchChannelEpg(channelCode, channelName, date) {
  const url = `https://api.wavve.com/v4/live/epgs?apikey=${CONFIG.wavveKey}&credential=none&device=mobile&drm=none&formattype=json&limit=500&offset=0&partnerId=P-CH&prdtype=2&startdate=${date}&enddate=${date}&channelcode=${channelCode}`;
  try {
    const res  = await fetch(CONFIG.proxyUrl(url));
    const body = await res.json();
    const items = body?.data?.items ?? body?.items ?? [];
    return items.map(item => mapItem(item, channelName)).filter(Boolean);
  } catch { return []; }
}

function mapItem(item, channelName) {
  const start = parseTime(item.starttime ?? item.start_time ?? '');
  const end   = parseTime(item.endtime   ?? item.end_time   ?? '');
  if (!start) return null;

  const genres = [];
  if (item.category_name) genres.push(item.category_name);
  if (item.genre && item.genre !== item.category_name) genres.push(item.genre);

  const runtime = item.runtime
    ? parseInt(item.runtime)
    : calcRuntime(start, end);

  return {
    date:       todayIso(),
    channel:    channelName,
    start,
    end,
    title:      item.title ?? item.program_name ?? '(제목 없음)',
    genres,
    runtimeMin: runtime || null,
    age:        parseRating(String(item.ratings ?? item.age ?? '')),
    plot:       item.synopsis ?? item.description ?? '',
  };
}

// fallback 채널맵 (API 실패 시)
function fallbackChannelMap() {
  return {
    'KBS1': 'KBS1', 'KBS2': 'KBS2',
    'MBC': 'MBC',   'SBS': 'SBS',
    'C01': 'tvN',   'C23': 'OCN',
    'OCN_MOVIES': 'OCN Movies',
    'CGV': 'CGV',   'CH_CGV': '채널CGV',
  };
}

async function fetchAllPrograms() {
  const date = todayCompact();
  let channelMap;

  try {
    channelMap = await fetchWavveChannels();
    if (!Object.keys(channelMap).length) throw new Error('empty');
  } catch {
    channelMap = fallbackChannelMap();
  }

  const targets = Object.entries(channelMap)
    .filter(([, name]) => CONFIG.targetChannels.has(name));

  const results = await Promise.allSettled(
    targets.map(([code, name]) => fetchChannelEpg(code, name, date))
  );

  const all = results.flatMap(r => r.status === 'fulfilled' ? r.value : []);
  return all
    .filter(p => inWindow(p.start))
    .sort((a, b) => a.start.localeCompare(b.start));
}

// ═══════════════════════════════════════════
// 렌더링
// ═══════════════════════════════════════════
const $ = (id) => document.getElementById(id);

function renderSummary(count, source) {
  const now = new Date();
  const timeStr = `${pad2(now.getHours())}:${pad2(now.getMinutes())}`;
  $('summary').textContent =
    `21:30~22:00 시작 · ${count}개 · ${timeStr} 기준 · 출처: ${source}`;
}

function renderPrograms(programs) {
  const list = $('list');
  list.innerHTML = '';

  if (!programs.length) {
    list.innerHTML = `
      <div class="empty-panel">
        <div class="empty-icon">📭</div>
        <div class="empty-title">조건에 맞는 영화가 없어요</div>
        <div class="empty-desc">21:30~22:00 시작 편성이 없습니다.<br>새로고침하거나 나중에 다시 확인해보세요.</div>
      </div>`;
    return;
  }

  programs.forEach((p, i) => {
    const card = document.createElement('div');
    card.className = 'card';
    card.style.animationDelay = `${i * 60}ms`;

    const tags = [
      ...p.genres.slice(0, 3),
      p.age,
      p.runtimeMin ? `${p.runtimeMin}분` : null,
    ].filter(Boolean).map(t => `<span class="tag">${t}</span>`).join('');

    card.innerHTML = `
      <div class="card-top">
        <div class="time-row">
          <span class="time">${p.start}${p.end ? ` ~ ${p.end}` : ''}</span>
          <span class="channel-badge">${p.channel}</span>
        </div>
        <div class="title">${p.title}</div>
        ${tags ? `<div class="tags">${tags}</div>` : ''}
        ${p.plot ? `<div class="plot">${p.plot}</div>` : ''}
      </div>`;

    list.appendChild(card);
  });
}

function setLoading(on) {
  $('loading').style.display   = on ? 'flex' : 'none';
  $('main-content').style.display = on ? 'none' : 'block';
}

function showError(msg) {
  setLoading(false);
  $('list').innerHTML = `
    <div class="error-panel">
      <div class="error-icon">🌐</div>
      <div class="error-title">데이터를 불러오지 못했어요</div>
      <div class="error-desc">${msg}</div>
      <button class="retry-btn" onclick="start(true)">다시 시도</button>
    </div>`;
  $('summary').textContent = '데이터 로드 실패';
}

// ═══════════════════════════════════════════
// 날짜 레이블
// ═══════════════════════════════════════════
function setDateLabel() {
  const d = new Date();
  const days = ['일','월','화','수','목','금','토'];
  $('date-label').textContent =
    `${d.getFullYear()}년 ${d.getMonth()+1}월 ${d.getDate()}일 (${days[d.getDay()]})`;
}

// ═══════════════════════════════════════════
// 앱 시작
// ═══════════════════════════════════════════
async function start(forceRefresh = false) {
  setLoading(true);
  setDateLabel();

  // 캐시 확인
  if (!forceRefresh) {
    const cached = loadCache();
    if (cached) {
      setLoading(false);
      renderSummary(cached.length, '캐시');
      renderPrograms(cached);
      return;
    }
  }

  try {
    const programs = await fetchAllPrograms();
    saveCache(programs);
    setLoading(false);
    renderSummary(programs.length, 'Wavve EPG');
    renderPrograms(programs);
  } catch (e) {
    showError(e.message || '네트워크 오류');
  }
}

// 새로고침 버튼
document.addEventListener('DOMContentLoaded', () => {
  $('refresh-btn').addEventListener('click', () => start(true));

  // Service Worker 등록
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }

  start();
});
