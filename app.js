// app.js

const CONFIG = {
  cacheKey:    'epg_cache_v6',
  cacheAgeMin: 30, // 30분 캐시 (하루 4번 갱신되므로 짧게)

  // 업데이트 기준 시간 (KST) - 이 시간이 지나면 "최신 아님" 표시
  updateSchedule: [0, 6, 12, 18], // 00시, 06시, 12시, 18시
};

const pad2 = (n) => String(n).padStart(2, '0');
const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
};

// ── 최신 여부 판단 ──────────────────────────────
// updatedAt(ISO)과 현재 시각을 비교해서
// "마지막 업데이트 예정 시간" 이후에 갱신됐는지 확인
function getUpdateStatus(updatedAtIso) {
  if (!updatedAtIso) return { fresh: false, label: '업데이트 정보 없음', nextLabel: '' };

  const now       = new Date();
  const updatedAt = new Date(updatedAtIso);
  const diffMin   = Math.floor((now - updatedAt) / 60000);

  // 현재 KST 시각 기준으로 "가장 최근 업데이트 예정 시간" 계산
  const kstOffset  = 9 * 60; // KST = UTC+9
  const kstNow     = new Date(now.getTime() + kstOffset * 60000);
  const kstHour    = kstNow.getUTCHours();

  // 현재 시각보다 작거나 같은 가장 큰 스케줄 시간 찾기
  const passed = CONFIG.updateSchedule.filter(h => h <= kstHour);
  const lastScheduledHour = passed.length > 0 ? Math.max(...passed) : 18; // 없으면 전날 18시

  // 마지막 스케줄 시간 (KST → UTC Date 객체)
  const lastScheduledDate = new Date(kstNow);
  lastScheduledDate.setUTCHours(lastScheduledHour - 9, 5, 0, 0); // +5분 여유 (Actions 실행시간)
  if (lastScheduledHour < 9) {
    // 자정(00시)은 전날 UTC 15시
    lastScheduledDate.setUTCDate(lastScheduledDate.getUTCDate() - 1);
    lastScheduledDate.setUTCHours(24 - 9 + lastScheduledHour, 5, 0, 0);
  }

  const fresh = updatedAt >= lastScheduledDate;

  // 다음 업데이트 시간 계산
  const next = CONFIG.updateSchedule.find(h => h > kstHour) ?? CONFIG.updateSchedule[0];
  const nextLabel = `다음 업데이트: 오늘 ${pad2(next)}:05`;

  // 표시용 라벨
  let timeLabel;
  if (diffMin < 60) {
    timeLabel = `${diffMin}분 전`;
  } else if (diffMin < 60 * 24) {
    const h = Math.floor(diffMin / 60);
    timeLabel = `${h}시간 전`;
  } else {
    timeLabel = updatedAt.toLocaleString('ko-KR', { month:'numeric', day:'numeric', hour:'2-digit', minute:'2-digit' });
  }

  return { fresh, label: `마지막 업데이트: ${timeLabel}`, nextLabel };
}

function renderUpdateBadge(updatedAtIso) {
  const { fresh, label, nextLabel } = getUpdateStatus(updatedAtIso);
  const badge = document.getElementById('update-badge');
  if (!badge) return;

  badge.className = `update-badge ${fresh ? 'fresh' : 'stale'}`;
  badge.innerHTML = `
    <span class="update-dot"></span>
    <span class="update-text">${label}</span>
    ${!fresh ? `<span class="update-next"> · ${nextLabel}</span>` : ''}
  `;
}

// ── 캐시 ──────────────────────────────────────────
function loadCache() {
  try {
    const raw = localStorage.getItem(CONFIG.cacheKey);
    if (!raw) return null;
    const obj = JSON.parse(raw);
    const ageOk = Date.now() - obj.fetchedAt < CONFIG.cacheAgeMin * 60000;
    if (!ageOk) return null;
    return obj;
  } catch { return null; }
}
function saveCache(data) {
  try {
    localStorage.setItem(CONFIG.cacheKey, JSON.stringify({
      fetchedAt: Date.now(),
      ...data,
    }));
  } catch {}
}

// ── data.json 읽기 ──────────────────────────────
async function fetchDataJson() {
  const res = await fetch(`./data.json?t=${Date.now()}`);
  if (!res.ok) throw new Error(`data.json 로드 실패 (${res.status})`);
  const obj = await res.json();
  if (!Array.isArray(obj.items)) throw new Error('data.json 형식 오류');
  return obj;
}

// ── 렌더링 ─────────────────────────────────────
const $ = (id) => document.getElementById(id);

function renderSummary(count, source) {
  const now = new Date();
  $('summary').textContent =
    `21:30~22:00 시작 · ${count}개 · ${pad2(now.getHours())}:${pad2(now.getMinutes())} 기준 · ${source}`;
}

function renderPrograms(items) {
  const list = $('list');
  list.innerHTML = '';
  const today = todayIso();
  const todayItems = (items || []).filter(p => p.date === today);

  if (!todayItems.length) {
    list.innerHTML = `
      <div class="empty-panel">
        <div class="empty-icon">📭</div>
        <div class="empty-title">오늘 편성 데이터가 없어요</div>
        <div class="empty-desc">
          편성표는 매일 00시·06시·12시·18시에 자동 업데이트됩니다.<br>
          새로고침 버튼을 눌러보거나 잠시 후 다시 확인해보세요.
        </div>
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
  const d = new Date(), days = ['일','월','화','수','목','금','토'];
  $('date-label').textContent =
    `${d.getFullYear()}년 ${d.getMonth()+1}월 ${d.getDate()}일 (${days[d.getDay()]})`;
}

// ── 앱 시작 ────────────────────────────────────
async function start(forceRefresh = false) {
  setLoading(true);
  setDateLabel();

  if (!forceRefresh) {
    const cached = loadCache();
    if (cached) {
      setLoading(false);
      const todayCount = (cached.items||[]).filter(p => p.date === todayIso()).length;
      renderSummary(todayCount, '캐시');
      renderPrograms(cached.items);
      renderUpdateBadge(cached.updatedAt);
      return;
    }
  }

  try {
    const data = await fetchDataJson();
    saveCache(data);
    setLoading(false);
    const todayCount = (data.items||[]).filter(p => p.date === todayIso()).length;
    renderSummary(todayCount, 'data.json');
    renderPrograms(data.items);
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