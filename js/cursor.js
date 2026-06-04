/* ============================================================
   카이앤컴퍼니 — 커스텀 커서 (stayweb.dev 동일 사양)
   - 32px 흰 원 + mix-blend-mode: difference (아래 콘텐츠 색 반전)
   - lerp 기반 부드러운 추적 (requestAnimationFrame)
   - 인터랙티브 요소 위에서 확대, 클릭 시 축소
   - 네이티브 커서 숨김 (pointer:fine 에서만, JS 동작 시에만)
   - 필름 그레인 오버레이 (4% opacity, blend difference)
   - 터치/모션 최소화 환경에서는 비활성
   순수 vanilla JS, 라이브러리 의존 없음
   ============================================================ */
(function () {
  'use strict';

  const finePointer = window.matchMedia('(pointer: fine)').matches;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- 필름 그레인 오버레이 (stayweb 텍스처) ---------- */
  if (!document.querySelector('.grain')) {
    const grain = document.createElement('div');
    grain.className = 'grain';
    grain.setAttribute('aria-hidden', 'true');
    document.body.appendChild(grain);
  }

  /* ---------- 커스텀 커서 ---------- */
  // 터치 전용 기기에서는 커서 없음 (네이티브 유지)
  if (!finePointer) return;

  const dot = document.createElement('div');
  dot.className = 'cursor-dot';
  dot.setAttribute('aria-hidden', 'true');
  document.body.appendChild(dot);

  // 커스텀 커서 렌더 실패 시 네이티브 커서를 되살리는 폴백
  function disableCustomCursor() {
    document.documentElement.classList.remove('has-custom-cursor');
    if (dot && dot.isConnected) dot.remove();
  }

  const HOVER_SELECTOR =
    'a, button, [role="button"], input, textarea, select, label, .filter-btn, .work-card, [data-card], .float-cta';

  let x = window.innerWidth / 2;
  let y = window.innerHeight / 2;
  let tx = x;
  let ty = y;

  // 로드 시점부터 항상 표시 + 중앙에 위치 (즉시 추적 시작)
  dot.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
  dot.classList.add('is-visible');

  // 커스텀 커서가 실제로 렌더된 것을 확인한 뒤에만 네이티브 커서를 숨김
  // (렌더 실패 시 네이티브 커서를 그대로 두어 "포인터 사라짐" 방지)
  requestAnimationFrame(() => {
    if (dot.isConnected && dot.offsetWidth >= 1 && dot.offsetHeight >= 1) {
      document.documentElement.classList.add('has-custom-cursor');
    } else {
      disableCustomCursor();
    }
  });

  window.addEventListener(
    'pointermove',
    (e) => {
      if (e.pointerType === 'touch') return;
      tx = e.clientX;
      ty = e.clientY;
      dot.classList.add('is-visible');
    },
    { passive: true }
  );

  // 인터랙티브 요소 호버 → 확대 (이벤트 위임)
  document.addEventListener(
    'pointerover',
    (e) => {
      if (e.target.closest && e.target.closest(HOVER_SELECTOR)) dot.classList.add('is-hover');
    },
    { passive: true }
  );
  document.addEventListener(
    'pointerout',
    (e) => {
      if (e.target.closest && e.target.closest(HOVER_SELECTOR)) dot.classList.remove('is-hover');
    },
    { passive: true }
  );

  // 클릭 → 축소
  document.addEventListener('pointerdown', () => dot.classList.add('is-down'), { passive: true });
  document.addEventListener('pointerup', () => dot.classList.remove('is-down'), { passive: true });

  // 창 밖으로 나가면 숨김, 다시 들어오면 표시
  document.addEventListener('mouseleave', () => dot.classList.remove('is-visible'));
  document.addEventListener('mouseenter', () => dot.classList.add('is-visible'));

  if (reduceMotion) {
    // 모션 최소화: lerp 없이 즉시 추적
    window.addEventListener(
      'pointermove',
      (e) => {
        if (e.pointerType === 'touch') return;
        dot.style.transform = `translate(${e.clientX}px, ${e.clientY}px) translate(-50%, -50%)`;
      },
      { passive: true }
    );
    return;
  }

  // lerp 부드러운 추적 (값이 작을수록 더 느리게/지연되며 따라옴)
  const ease = 0.16;
  function frame() {
    x += (tx - x) * ease;
    y += (ty - y) * ease;
    dot.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
