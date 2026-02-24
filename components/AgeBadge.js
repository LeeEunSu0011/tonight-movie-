// components/AgeBadge.js

export function AgeBadge(age) {
  if (!age) return '';
  const a = age.replace(/\s/g, '');
  if (a.includes('19') || a.includes('청소년관람불가')) return `<span class="age-badge age19">🔞 19</span>`;
  if (a.includes('15')) return `<span class="age-badge age15">⚠️ 15</span>`;
  if (a.includes('12')) return `<span class="age-badge age12">⚠️ 12</span>`;
  if (a.includes('전체') || a.includes('ALL')) return `<span class="age-badge all">전체</span>`;
  return '';
}
