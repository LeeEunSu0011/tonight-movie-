// app.js — data.json을 읽어 화면에 표시 (프록시 불필요)

const CONFIG = {
  cacheKey:    'epg_cache_v5',
  cacheAgeMin: 60,  // 1시간 (Actions가 매일 21시에 갱신하므로 짧게)
};

const pad2 = (n) => String(n).padStart(2, '0');
const todayIso = () => { const d=new Date(); return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`; };

// ── 캐시 ──
function loadCache() {
  try {
    const raw = localStorage.getItem(CONFIG.cacheKey);
    if (!raw) return null;
    const obj = JSON.parse(raw);
    const ageOk = Date.now() - obj.fetchedAt < CONFIG.cacheAgeMin * 60000;
    const hasToday = (obj.items||[]).some(x => x.date === todayIso());
    return (ageOk && hasToday) ? obj.items : null;
  } catch { return null; }
}
function saveCache(items) {
  try { localStorage.setItem(CONFIG.cacheKey, JSON.stringify({ fetchedAt: Date.now(), items })); } catch {}
}

// ── data.json 읽기 ──
async function fetchDataJson() {
  const res = await fetch(`./data.json?t=${Date.now()}`);
  if (!res.ok) throw new Error(`data.json 로드 실패 (${res.status})`);
  const obj = await res.json();
  if (!Array.isArray(obj.items)) throw new Error('data.json 형식 오류');
  return obj.items;
}

// ── 렌더링 ──
const $ = (id) => document.getElementById(id);

function renderSummary(count, source) {
  const now = new Date();
  $('summary').textContent =
    `21:30~22:00 시작 · ${count}개 · ${pad2(now.getHours())}:${pad2(now.getMinutes())} 기준 · 출처: ${source}`;
}

function renderPrograms(programs) {
  const list = $('list');
  list.innerHTML = '';

  const today = todayIso();
  const todayItems = programs.filter(p => p.date === today);

  if (!todayItems.length) {
    list.innerHTML = `
      <div class="empty-panel">
        <div class="empty-icon">📭</div>
        <div class="empty-title">오늘 편성 데이터가 없어요</div>
        <div class="empty-desc">
          편성표는 매일 저녁 21시에 자동 업데이트됩니다.<br>
          21시 이전이라면 잠시 후 새로고침해보세요.
        </div>
      </div>`;
    return;
  }

  todayItems.forEach((p, i) => {
    const card = document.createElement('div');
    card.className = 'card';
    card.style.animationDelay = `${i * 60}ms`;
    const tags = [...(p.genres||[]).slice(0,3), p.age, p.runtimeMin?`${p.runtimeMin}분`:null]
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

function setLoading(on) {
  $('loading').style.display      = on ? 'flex'  : 'none';
  $('main-content').style.display = on ? 'none'  : 'block';
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

function setDateLabel() {
  const d = new Date(), days=['일','월','화','수','목','금','토'];
  $('date-label').textContent =
    `${d.getFullYear()}년 ${d.getMonth()+1}월 ${d.getDate()}일 (${days[d.getDay()]})`;
}

// ── 앱 시작 ──
async function start(forceRefresh = false) {
  setLoading(true);
  setDateLabel();

  if (!forceRefresh) {
    const cached = loadCache();
    if (cached) {
      setLoading(false);
      renderSummary(cached.filter(p=>p.date===todayIso()).length, '캐시');
      renderPrograms(cached);
      return;
    }
  }

  try {
    const items = await fetchDataJson();
    saveCache(items);
    setLoading(false);
    renderSummary(items.filter(p=>p.date===todayIso()).length, 'data.json');
    renderPrograms(items);
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