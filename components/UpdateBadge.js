// components/UpdateBadge.js

import { CONFIG } from '../config.js';
import { nowKST, pad2 } from '../utils.js';

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
