/* ============================================================
   카이앤컴퍼니 — 인터랙션 스크립트 (vanilla JS, 라이브러리 의존 없음)
   - 헤더 스크롤 변화
   - 모바일 햄버거 메뉴
   - Hero 진입 애니메이션
   - IntersectionObserver 스크롤 리빌
   - 통계 카운트업
   - 포트폴리오 필터 / 모달
   - 문의 폼 클라이언트 검증
   ============================================================ */
(function () {
  'use strict';

  /* ---------- 1. 헤더 스크롤 시 배경/그림자 변화 ---------- */
  const header = document.querySelector('[data-header]');
  const onScroll = () => {
    if (!header) return;
    header.classList.toggle('is-scrolled', window.scrollY > 24);
  };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  /* ---------- 2. 모바일 햄버거 메뉴 토글 ---------- */
  const navToggle = document.querySelector('[data-nav-toggle]');
  const nav = document.querySelector('[data-nav]');

  const closeMenu = () => {
    if (!nav || !navToggle) return;
    nav.classList.remove('is-open');
    navToggle.setAttribute('aria-expanded', 'false');
  };

  if (navToggle && nav) {
    navToggle.addEventListener('click', () => {
      const open = nav.classList.toggle('is-open');
      navToggle.setAttribute('aria-expanded', String(open));
    });
    // 메뉴 링크 클릭 시 닫기 (모바일)
    nav.querySelectorAll('a').forEach((a) => a.addEventListener('click', closeMenu));
    // ESC로 닫기
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeMenu();
    });
  }

  /* ---------- 3. Hero 진입 애니메이션 (헤드라인 줄별 페이드업) ---------- */
  const hero = document.querySelector('[data-hero]');
  if (hero) {
    // 다음 프레임에 클래스 부여 -> CSS 애니메이션 시작
    requestAnimationFrame(() => requestAnimationFrame(() => hero.classList.add('is-in')));
  }

  /* ---------- 4. 스크롤 리빌 (IntersectionObserver) ---------- */
  const revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && revealEls.length) {
    // 앵커 점프(#clients 등)로 진입 시 현재 viewport 위쪽에 있는 .reveal 요소는
    // 옵저버가 발화하지 않아 영원히 opacity: 0 으로 남는다.
    // 페이지 로드 시점에 viewport 안 또는 위쪽에 있는 요소는 즉시 표시한다.
    const vh = window.innerHeight || document.documentElement.clientHeight;
    revealEls.forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.top < vh * 0.92) el.classList.add('is-visible');
    });
    const revealObserver = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            obs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -8% 0px' }
    );
    revealEls.forEach((el) => {
      if (!el.classList.contains('is-visible')) revealObserver.observe(el);
    });
  } else {
    revealEls.forEach((el) => el.classList.add('is-visible'));
  }

  /* ---------- 4-b. 아웃트로 글자별 리빌 (진입 시 1회) ---------- */
  const outro = document.querySelector('[data-outro]');
  if (outro) {
    if ('IntersectionObserver' in window) {
      const outroObs = new IntersectionObserver(
        (entries, obs) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add('is-visible');
              obs.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.25 }
      );
      outroObs.observe(outro);
    } else {
      outro.classList.add('is-visible');
    }
  }

  /* ---------- 5. 통계 카운트업 (뷰포트 진입 시 1회) ---------- */
  const counters = document.querySelectorAll('[data-count]');

  const animateCount = (el) => {
    const target = parseFloat(el.getAttribute('data-count'));
    const decimals = parseInt(el.getAttribute('data-decimals') || '0', 10);
    const duration = 1600;
    const start = performance.now();

    const tick = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      // easeOutExpo
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      const value = target * eased;
      el.textContent = value.toLocaleString('ko-KR', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      });
      if (progress < 1) requestAnimationFrame(tick);
      else
        el.textContent = target.toLocaleString('ko-KR', {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
        });
    };
    requestAnimationFrame(tick);
  };

  if ('IntersectionObserver' in window && counters.length) {
    const countObserver = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            animateCount(entry.target);
            obs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.6 }
    );
    counters.forEach((el) => countObserver.observe(el));
  } else {
    counters.forEach((el) => (el.textContent = el.getAttribute('data-count')));
  }

  /* ---------- 6. 포트폴리오 필터 ---------- */
  const filterBtns = document.querySelectorAll('[data-filter]');
  const workCards = document.querySelectorAll('[data-card]');

  if (filterBtns.length && workCards.length) {
    filterBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const filter = btn.getAttribute('data-filter');
        filterBtns.forEach((b) => {
          const active = b === btn;
          b.classList.toggle('is-active', active);
          b.setAttribute('aria-pressed', String(active));
        });
        workCards.forEach((card) => {
          const cat = card.getAttribute('data-category');
          const show = filter === 'all' || cat === filter;
          card.classList.toggle('is-hidden', !show);
        });
      });
    });
  }

  /* ---------- 7. 포트폴리오 모달 (영상/모션 재생) ---------- */
  const modal = document.querySelector('[data-modal]');

  if (modal && workCards.length) {
    const modalMedia = modal.querySelector('[data-modal-media]');
    const modalTitle = modal.querySelector('[data-modal-title]');
    const modalCat = modal.querySelector('[data-modal-cat]');
    const modalDesc = modal.querySelector('[data-modal-desc]');
    const closeBtn = modal.querySelector('[data-modal-close]');
    const backdrop = modal.querySelector('[data-modal-backdrop]');
    let lastFocused = null;

    const buildMedia = (src, poster) => {
      if (!src) return '';
      if (/\.(mp4|webm)$/i.test(src)) {
        return (
          '<video src="' +
          src +
          '" controls autoplay playsinline ' +
          (poster ? 'poster="' + poster + '" ' : '') +
          '></video>'
        );
      }
      return '<img src="' + src + '" alt="" />';
    };

    const openModal = (card) => {
      const src = card.getAttribute('data-media');
      const poster = card.getAttribute('data-poster') || '';
      const title = card.getAttribute('data-title') || '';
      const cat = card.getAttribute('data-cat') || '';
      const desc = card.getAttribute('data-desc') || '';

      modalMedia.innerHTML = buildMedia(src, poster);
      modalTitle.textContent = title;
      modalCat.textContent = cat;
      modalDesc.textContent = desc;

      lastFocused = document.activeElement;
      modal.classList.add('is-open');
      modal.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
      if (closeBtn) closeBtn.focus();
    };

    const closeModal = () => {
      modal.classList.remove('is-open');
      modal.setAttribute('aria-hidden', 'true');
      modalMedia.innerHTML = ''; // 영상 정지 (DOM 제거)
      document.body.style.overflow = '';
      if (lastFocused) lastFocused.focus();
    };

    workCards.forEach((card) => {
      card.addEventListener('click', () => openModal(card));
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openModal(card);
        }
      });
    });

    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (backdrop) backdrop.addEventListener('click', closeModal);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal.classList.contains('is-open')) closeModal();
    });
  }

  /* ---------- 8. 문의 폼 클라이언트 검증 ---------- */
  const form = document.querySelector('[data-contact-form]');
  if (form) {
    const status = form.querySelector('[data-form-status]');

    const validators = {
      name: (v) => (v.trim().length >= 2 ? '' : '이름을 2자 이상 입력해 주세요.'),
      phone: (v) =>
        /^[0-9+\-\s()]{8,20}$/.test(v.trim()) ? '' : '올바른 연락처를 입력해 주세요.',
      email: (v) =>
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) ? '' : '올바른 이메일 형식이 아닙니다.',
      message: (v) => (v.trim().length >= 5 ? '' : '문의 내용을 5자 이상 입력해 주세요.'),
    };

    const setError = (field, msg) => {
      const wrap = field.closest('.field');
      const errEl = wrap ? wrap.querySelector('.field__error') : null;
      if (wrap) wrap.classList.toggle('invalid', !!msg);
      if (errEl) errEl.textContent = msg;
      field.setAttribute('aria-invalid', msg ? 'true' : 'false');
    };

    // 실시간 검증 (blur 시)
    Object.keys(validators).forEach((name) => {
      const field = form.elements[name];
      if (!field) return;
      field.addEventListener('blur', () => setError(field, validators[name](field.value)));
      field.addEventListener('input', () => {
        const wrap = field.closest('.field');
        if (wrap && wrap.classList.contains('invalid')) {
          setError(field, validators[name](field.value));
        }
      });
    });

    // 노션 DB 등록용 Webhook (Zapier/Make에서 발급. 비어 있으면 호출 생략)
    // 예: 'https://hooks.zapier.com/hooks/catch/XXX/YYY/'
    const NOTION_WEBHOOK_URL = form.getAttribute('data-notion-webhook') || '';

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      let valid = true;
      let firstInvalid = null;

      Object.keys(validators).forEach((name) => {
        const field = form.elements[name];
        if (!field) return;
        const msg = validators[name](field.value);
        setError(field, msg);
        if (msg) {
          valid = false;
          if (!firstInvalid) firstInvalid = field;
        }
      });

      if (!valid) {
        if (status) {
          status.style.color = '#e23a6e';
          status.textContent = '입력값을 다시 확인해 주세요.';
        }
        if (firstInvalid) firstInvalid.focus();
        return;
      }

      // 봇 트랩(honeypot) 검사
      const honey = form.elements['_honey'];
      if (honey && honey.value) return;

      const submitBtn = form.querySelector('button[type="submit"]');
      const originalBtnText = submitBtn ? submitBtn.textContent : '';
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = '전송 중...';
      }
      if (status) {
        status.style.color = '#475569';
        status.textContent = '문의를 전송하고 있습니다...';
      }

      const formData = new FormData(form);
      const interests = formData.getAll('interests'); // 체크박스 다중 선택값 배열
      const payload = {
        name: formData.get('name'),
        phone: formData.get('phone'),
        email: formData.get('email'),
        message: formData.get('message'),
        interests: interests,                     // 배열 (Make에서 multi-select 매핑용)
        interestsLabel: interests.join(', '),     // "마케팅, 디자인" 문자열 (메일 본문 가독성용)
        submittedAt: new Date().toISOString(),
        source: 'kaicompany.kr contact form'
      };

      // 1) Formsubmit (kaiandcomp@gmail.com 자동 메일 발송)
      //    * 첫 제출 시 kaiandcomp@gmail.com 으로 "Confirm your email" 메일이 옴 → 링크 클릭 후 정식 활성화
      //    * 응답을 콘솔에 출력하여 활성화 상태 확인 가능
      const mailPromise = fetch(form.action, {
        method: 'POST',
        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).then(async (r) => {
        const data = await r.json().catch(() => ({}));
        console.log('[Formsubmit response]', r.status, data);
        if (!r.ok) throw new Error('mail send failed: ' + r.status);
        return data;
      });

      // 2) 노션 DB 등록 (Webhook 설정된 경우만)
      const notionPromise = NOTION_WEBHOOK_URL
        ? fetch(NOTION_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          }).catch((err) => { console.warn('Notion webhook failed:', err); })
        : Promise.resolve();

      try {
        await Promise.all([mailPromise, notionPromise]);
        if (status) {
          status.style.color = '#1a9e54';
          status.textContent = '문의가 정상 접수되었습니다. 빠르게 연락드리겠습니다!';
        }
        form.reset();
      } catch (err) {
        console.error('Contact form submit error:', err);
        if (status) {
          status.style.color = '#e23a6e';
          status.textContent = '전송에 실패했습니다. kaiandcomp@gmail.com 으로 직접 메일 부탁드립니다.';
        }
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = originalBtnText || '문의 보내기';
        }
      }
    });
  }

  /* ---------- 9. 현재 연도 푸터 표기 ---------- */
  const yearEl = document.querySelector('[data-year]');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());
})();
