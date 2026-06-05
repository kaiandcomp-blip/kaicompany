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

  // 커스텀 커서(따라다니는 원)가 렌더됐는지만 확인.
  // ※ 네이티브 마우스 화살표는 숨기지 않는다 → 실제 커서 + 뒤따라오는 원이 함께 보임.
  requestAnimationFrame(() => {
    if (!(dot.isConnected && dot.offsetWidth >= 1 && dot.offsetHeight >= 1)) {
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
  // 단, 메뉴바(헤더) 안에서는 너무 커지지 않도록 작은 사이즈(is-hover-sm)로 분기
  document.addEventListener(
    'pointerover',
    (e) => {
      const t = e.target.closest && e.target.closest(HOVER_SELECTOR);
      if (!t) return;
      if (t.closest('[data-header]')) {
        dot.classList.add('is-hover-sm');
        dot.classList.remove('is-hover');
      } else {
        dot.classList.add('is-hover');
        dot.classList.remove('is-hover-sm');
      }
    },
    { passive: true }
  );
  document.addEventListener(
    'pointerout',
    (e) => {
      if (e.target.closest && e.target.closest(HOVER_SELECTOR)) {
        dot.classList.remove('is-hover', 'is-hover-sm');
      }
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

  // stayweb.dev 동일 스프링 추적 (framer-motion useSpring 재현)
  // 원본: stiffness 300, damping 25, mass 0.5
  // → 요청대로 "조금 천천히" 따라오게 stiffness를 낮추고 mass를 키움.
  //   (튕김 없이 부드럽게 안착하도록 damping은 임계감쇠 이상으로 유지)
  const STIFFNESS = 220; // 낮을수록 더 느긋하게(천천히) 따라옴
  const DAMPING = 30;    // 높을수록 출렁임 없이 정돈됨
  const MASS = 0.85;     // 클수록 관성이 커져 더 천천히 따라옴
  let vx = 0;
  let vy = 0;
  let last = performance.now();
  function frame(now) {
    let dt = (now - last) / 1000;
    last = now;
    if (dt > 0.05) dt = 0.05; // 탭 전환 등으로 dt가 튀는 것 방지(안정성)
    // x축 스프링 적분
    vx += ((-STIFFNESS * (x - tx) - DAMPING * vx) / MASS) * dt;
    x += vx * dt;
    // y축 스프링 적분
    vy += ((-STIFFNESS * (y - ty) - DAMPING * vy) / MASS) * dt;
    y += vy * dt;
    dot.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
