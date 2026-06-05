/* ============================================================
   카이앤컴퍼니 — stayweb.dev 인터랙션 액션 복제
   1) 텍스트 마스크 슬라이드업 리빌 (overflow-hidden + translateY(110%) rotate(2deg) → 0)
   2) 카드 마우스 스포트라이트 (radial-gradient 가 커서를 따라감)
   순수 vanilla JS, 라이브러리 의존 없음
   ============================================================ */
(function () {
  'use strict';

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(pointer: fine)').matches;

  /* ---------- 1) 마스크 슬라이드업 리빌 ---------- */
  // srv-hero__tag(::before/::after 대시 플렉스) 등 레이아웃 민감 요소는 제외
  const RISE_SELECTOR =
    '.eyebrow, .section__title, .section__lead, .srv-hero__title, .srv-hero__lead, .about__catch, .outro__statement';

  const risers = Array.prototype.slice.call(document.querySelectorAll(RISE_SELECTOR));

  risers.forEach((el) => {
    if (el.dataset.rise) return;
    el.dataset.rise = '1';
    // 내용을 inner 스팬으로 이동 (gradient/br/em 등 그대로 보존)
    const inner = document.createElement('span');
    inner.className = 'sw-rise__inner';
    while (el.firstChild) inner.appendChild(el.firstChild);
    el.appendChild(inner);
    el.classList.add('sw-rise');
  });

  function showAll() {
    risers.forEach((el) => el.classList.add('is-in'));
  }

  if (reduce) {
    showAll();
  } else if ('IntersectionObserver' in window && risers.length) {
    const io = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-in');
            obs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
    );
    const vh = window.innerHeight || document.documentElement.clientHeight;
    risers.forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.top < vh * 0.92) el.classList.add('is-in'); // 첫 화면 내는 즉시
      else io.observe(el);
    });
  } else {
    showAll();
  }

  /* ---------- 2) 카드 마우스 스포트라이트 ---------- */
  const SPOT_SELECTOR =
    '.service-card, .pillar, .why-card, .ccard, .process-step, .sys-card, .mall-mini, .problem-card';

  if (!reduce && finePointer) {
    Array.prototype.slice.call(document.querySelectorAll(SPOT_SELECTOR)).forEach((card) => {
      card.classList.add('sw-spot');
      card.addEventListener(
        'pointermove',
        (e) => {
          const r = card.getBoundingClientRect();
          const lx = e.clientX - r.left;
          const ly = e.clientY - r.top;
          // 스포트라이트 위치(커서 따라감)
          card.style.setProperty('--mx', lx + 'px');
          card.style.setProperty('--my', ly + 'px');
          // 마우스 따라 3D 틸트 (stayweb perspective 카드)
          const ry = (lx / r.width - 0.5) * 8;   // 좌우 → rotateY
          const rx = -(ly / r.height - 0.5) * 8; // 상하 → rotateX
          card.style.transform =
            'perspective(900px) rotateX(' + rx + 'deg) rotateY(' + ry + 'deg) translateY(-4px)';
        },
        { passive: true }
      );
      // 벗어나면 원위치 (CSS hover/기본 transform 복귀)
      card.addEventListener('pointerleave', () => {
        card.style.transform = '';
      }, { passive: true });
    });
  }
})();
