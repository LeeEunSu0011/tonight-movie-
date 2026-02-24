// utils/date.js - 날짜 관련 유틸리티

export const pad2 = n => String(n).padStart(2, '0');

const KST_OFFSET = 9 * 60 * 60 * 1000;

export function nowKST() {
  return new Date(Date.now() + KST_OFFSET);
}

export function todayIso() {
  const d = nowKST();
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth()+1)}-${pad2(d.getUTCDate())}`;
}

export function tomorrowIso() {
  const d = new Date(Date.now() + KST_OFFSET + 24 * 60 * 60 * 1000);
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth()+1)}-${pad2(d.getUTCDate())}`;
}

export function formatDateLabel(isoDate) {
  const [y, m, d] = isoDate.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return `${y}년 ${m}월 ${d}일 (${days[date.getDay()]})`;
}

export function setDateLabel(elementId = 'date-label') {
  const el = document.getElementById(elementId);
  if (el) el.textContent = formatDateLabel(todayIso());
}
