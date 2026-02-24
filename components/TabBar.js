// components/TabBar.js

export function TabBar(activeTab, onTabChange) {
  const wrap = document.createElement('div');
  wrap.className = 'tab-bar';
  wrap.innerHTML = `
    <button class="tab-btn ${activeTab === 'today' ? 'active' : ''}" data-tab="today">오늘</button>
    <button class="tab-btn ${activeTab === 'tomorrow' ? 'active' : ''}" data-tab="tomorrow">내일</button>
  `;

  wrap.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      wrap.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      onTabChange(btn.dataset.tab);
    });
  });

  return wrap;
}
