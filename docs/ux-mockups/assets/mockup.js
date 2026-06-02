/* LivePulse UX 목업 공통 스크립트 */
(function () {
  // index.html까지의 상대 경로 계산
  var path = location.pathname.replace(/\\/g, '/');
  var inSub = /\/(admin|audience|shared)\//.test(path);
  var home = inSub ? '../index.html' : 'index.html';

  // 시안 홈 플로팅 버튼 주입 (index.html 자체에는 표시 안 함)
  if (!/index\.html?$/.test(path) && !path.match(/ux-mockups\/?$/)) {
    var a = document.createElement('a');
    a.className = 'mockup-home';
    a.href = home;
    a.innerHTML = '&#8962; 시안 홈';
    document.body.appendChild(a);
  }

  // Lucide 아이콘 초기화
  function initIcons() {
    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons();
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initIcons);
  } else {
    initIcons();
  }
  window.refreshIcons = initIcons;
})();
