/* ============================================================
   카이앤컴퍼니 — Hero 3D 배경 (three.js r184)
   stayweb.dev 동일: 흰 입자 "5갈래 별/꽃" 파티클
   동작 시퀀스:
   1) 로드 시 흩어진 입자가 한곳으로 모여 별 형태를 이룸 (assemble, easeOut)
   2) 마우스 정지 시 천천히 회전 (idle swirl)
   3) 마우스 움직임을 따라 3D 틸트 + 드리프트
   성능 가드: reduced-motion / 탭 비활성 / 뷰포트 이탈 시 정지
   라이브러리: three@0.184.0 (CDN ESM) — 번들러 불필요
   ============================================================ */
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.184.0/build/three.module.js';

(function () {
  'use strict';

  const canvas = document.querySelector('[data-hero-canvas]');
  if (!canvas || !window.WebGLRenderingContext) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const BG = new THREE.Color('#0a0a0a');

  // ---- 렌더러 ----
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);

  // ---- 씬 / 카메라 ----
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(BG, 0.026);

  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
  camera.position.set(0, 0, 15);
  camera.lookAt(scene.position);

  // ---- 별/꽃 파라미터 (월드 좌표) ----
  const vw = window.innerWidth;
  const COUNT = vw < 768 ? 8000 : vw < 1200 ? 13000 : 18000;
  const CENTER_X = vw < 768 ? 0.8 : 1.8;     // 우측-중앙
  const CENTER_Y = 0.2;
  const SCALE = vw < 768 ? 0.6 : 1.0;
  const ARMS = 5;                             // 5갈래 별
  const R = 5.6 * SCALE;                      // 꽃잎(갈래) 길이
  const HALFW = 0.95 * SCALE;                 // 꽃잎 최대 반폭

  // 표준정규 (Box-Muller)
  function gaussian() {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  const positions = new Float32Array(COUNT * 3);
  const colors = new Float32Array(COUNT * 3);
  const tx = new Float32Array(COUNT);  // 목표(별 형태) 위치
  const ty = new Float32Array(COUNT);
  const tz = new Float32Array(COUNT);
  const sx = new Float32Array(COUNT);  // 시작(흩어진) 위치
  const sy = new Float32Array(COUNT);
  const sz = new Float32Array(COUNT);
  const phase = new Float32Array(COUNT);

  for (let i = 0; i < COUNT; i++) {
    const i3 = i * 3;

    // --- 목표: 5갈래 꽃잎(teardrop) 또는 헤일로 ---
    if (Math.random() < 0.12) {
      // 12% 헤일로 먼지 (별 주변으로 옅게)
      const ang = Math.random() * Math.PI * 2;
      const rr = R * (0.25 + Math.random() * 0.95);
      tx[i] = Math.cos(ang) * rr + gaussian() * 0.7;
      ty[i] = Math.sin(ang) * rr + gaussian() * 0.7;
      tz[i] = gaussian() * 1.5;
    } else {
      const a = Math.floor(Math.random() * ARMS);
      const base = a * ((Math.PI * 2) / ARMS) + Math.PI / 2; // 위쪽으로 한 갈래
      const t = Math.pow(Math.random(), 0.8);   // 갈래 길이 위치 0..1
      const along = 0.35 + t * R;                // 중심에서 약간 떨어져 시작
      const width = HALFW * Math.sin(Math.PI * t); // 중간이 가장 넓은 teardrop
      const perp = (Math.random() * 2 - 1) * width + gaussian() * 0.14;
      tx[i] = along * Math.cos(base) - perp * Math.sin(base);
      ty[i] = along * Math.sin(base) + perp * Math.cos(base);
      // 입체 깊이: 회전 시 정면(별)↔측면(컬럼) 모습이 나오도록 Z 볼륨 부여
      tz[i] = gaussian() * (0.8 + width * 0.9);
    }

    // --- 시작: 바깥쪽에 크게 흩어진 상태 (모여드는 연출) ---
    const sAng = Math.random() * Math.PI * 2;
    const sR = 11 + Math.random() * 8;
    sx[i] = Math.cos(sAng) * sR;
    sy[i] = Math.sin(sAng) * sR;
    sz[i] = gaussian() * 4;

    phase[i] = Math.random() * Math.PI * 2;

    // 시작 위치로 초기화
    positions[i3] = sx[i];
    positions[i3 + 1] = sy[i];
    positions[i3 + 2] = sz[i];

    // 흰색 위주
    const b = 0.55 + Math.random() * 0.42;
    const g = Math.random() < 0.06 ? b * 0.85 : b;
    colors[i3] = Math.min(1, b + 0.06);
    colors[i3 + 1] = g;
    colors[i3 + 2] = g;
  }

  const geometry = new THREE.BufferGeometry();
  const posAttr = new THREE.BufferAttribute(positions, 3);
  posAttr.setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute('position', posAttr);
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const material = new THREE.PointsMaterial({
    size: 0.085,
    sizeAttenuation: true,
    vertexColors: true,
    transparent: true,
    opacity: 0.95,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  // 둥근 입자 텍스처
  (function applyDotTexture() {
    const s = 64;
    const cv = document.createElement('canvas');
    cv.width = cv.height = s;
    const ctx = cv.getContext('2d');
    const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.4, 'rgba(255,255,255,0.5)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);
    const tex = new THREE.CanvasTexture(cv);
    material.map = tex;
    material.needsUpdate = true;
  })();

  const points = new THREE.Points(geometry, material);
  points.position.set(CENTER_X, CENTER_Y, 0);
  scene.add(points);

  // ---- 리사이즈 ----
  function resize() {
    const cw = canvas.clientWidth || canvas.parentElement.clientWidth;
    const ch = canvas.clientHeight || canvas.parentElement.clientHeight;
    if (!cw || !ch) return;
    renderer.setSize(cw, ch, false);
    camera.aspect = cw / ch;
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener('resize', resize, { passive: true });

  // ---- 마우스 ----
  const targetP = { x: 0, y: 0 };
  const curP = { x: 0, y: 0 };
  let mouseRotX = 0;
  let mouseRotY = 0;
  window.addEventListener(
    'pointermove',
    (e) => {
      if (e.pointerType === 'touch') return;
      targetP.x = (e.clientX / window.innerWidth - 0.5) * 2;
      targetP.y = (e.clientY / window.innerHeight - 0.5) * 2;
    },
    { passive: true }
  );

  // ---- 애니메이션 루프 ----
  let running = false;
  let rafId = null;
  let inView = true;
  let time = 0;
  const ASSEMBLE_DUR = 2.0; // 초 — 모여드는 시간
  const easeOut = (p) => 1 - Math.pow(1 - p, 3);

  function updateParticles() {
    const arr = posAttr.array;
    const p = Math.min(1, time / ASSEMBLE_DUR);
    const e = easeOut(p);
    const shimmer = e; // 다 모인 뒤에만 반짝임 강해짐
    for (let i = 0; i < COUNT; i++) {
      const i3 = i * 3;
      const ph = phase[i];
      // 시작 → 목표 보간 + (모인 뒤) shimmer
      const x = sx[i] + (tx[i] - sx[i]) * e + Math.sin(time * 0.6 + ph) * 0.13 * shimmer;
      const y = sy[i] + (ty[i] - sy[i]) * e + Math.cos(time * 0.5 + ph) * 0.13 * shimmer;
      const z = sz[i] + (tz[i] - sz[i]) * e + Math.sin(time * 0.4 + ph) * 0.18 * shimmer;
      arr[i3] = x;
      arr[i3 + 1] = y;
      arr[i3 + 2] = z;
    }
    posAttr.needsUpdate = true;
  }

  function frame() {
    if (!running) return;
    rafId = requestAnimationFrame(frame);
    time += 0.016;

    updateParticles();

    // 마우스 추적 (이징)
    curP.x += (targetP.x - curP.x) * 0.06;
    curP.y += (targetP.y - curP.y) * 0.06;

    // idle: Y축 자동 회전(별이 입체적으로 돌며 정면↔측면 모습 변화)
    // 마우스: 회전(기울기)로 반응 — 끌려오는 위치 이동은 최소화
    mouseRotY += (curP.x * 0.9 - mouseRotY) * 0.06;
    mouseRotX += (-curP.y * 0.5 - mouseRotX) * 0.06;
    points.rotation.y = time * 0.12 + mouseRotY;
    points.rotation.x = Math.sin(time * 0.25) * 0.12 + mouseRotX;
    points.rotation.z = time * 0.02;

    // 미세 위치 패럴랙스(살짝 따라오는 느낌만)
    points.position.x += ((CENTER_X + curP.x * 0.5) - points.position.x) * 0.05;
    points.position.y += ((CENTER_Y - curP.y * 0.4) - points.position.y) * 0.05;
    camera.lookAt(scene.position);

    renderer.render(scene, camera);
  }

  function start() {
    if (running || reduceMotion || !inView || document.hidden) return;
    running = true;
    frame();
  }
  function stop() {
    running = false;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop();
    else start();
  });

  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(
      (entries) => {
        inView = entries[0].isIntersecting;
        if (inView) start();
        else stop();
      },
      { threshold: 0 }
    );
    io.observe(canvas.parentElement);
  }

  if (reduceMotion) {
    // 모션 최소화: 모인 최종 상태로 정적 렌더
    const arr = posAttr.array;
    for (let i = 0; i < COUNT; i++) {
      arr[i * 3] = tx[i];
      arr[i * 3 + 1] = ty[i];
      arr[i * 3 + 2] = tz[i];
    }
    posAttr.needsUpdate = true;
    renderer.render(scene, camera);
  } else {
    start();
  }
})();
