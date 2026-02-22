// utils.js - 공통 유틸리티

export const pad2 = n => String(n).padStart(2, '0');

const KST_OFFSET = 9 * 60 * 60 * 1000;
export function nowKST() { return new Date(Date.now() + KST_OFFSET); }

export function todayIso() {
  const d = nowKST();
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth()+1)}-${pad2(d.getUTCDate())}`;
}

export function setDateLabel(elementId = 'date-label') {
  const d = new Date();
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  const el = document.getElementById(elementId);
  if (el) el.textContent =
    `${d.getFullYear()}년 ${d.getMonth()+1}월 ${d.getDate()}일 (${days[d.getDay()]})`;
}
