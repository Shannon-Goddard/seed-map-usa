const menuBtn = document.getElementById('menu-btn');
const menuPanel = document.getElementById('menu-panel');
const menuOverlay = document.getElementById('menu-overlay');
const menuClose = document.getElementById('menu-close');
menuBtn.addEventListener('click', () => { menuPanel.classList.add('open'); menuOverlay.classList.add('open'); });
menuOverlay.addEventListener('click', () => { menuPanel.classList.remove('open'); menuOverlay.classList.remove('open'); });
menuClose.addEventListener('click', () => { menuPanel.classList.remove('open'); menuOverlay.classList.remove('open'); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') { menuPanel.classList.remove('open'); menuOverlay.classList.remove('open'); } });
