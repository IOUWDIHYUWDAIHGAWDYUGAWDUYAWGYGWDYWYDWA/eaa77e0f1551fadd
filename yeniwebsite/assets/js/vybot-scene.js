/**
 * VYBot — Yeniden Kullanılabilir 3D Sistem (21. madde)
 * ---------------------------------------------------------------------------
 * Tek görsel dil: koyu yüzeyler, safir mavisi + cyan aydınlatma, ince halkalar,
 * kısıtlı partiküller. Hazır 3D model YOK — her şey prosedürel geometri.
 *
 * Preset'ler:
 *   'core'    — Hero: VYBot çekirdeği (iç ikosahedron + tel kafes kabuk + halkalar)
 *   'shield'  — Güvenlik: korumalı çekirdek + 3 savunma halkası
 *   'ambient' — CTA arka planı: partiküller + tek halka, loş
 *
 * Performans (22. madde):
 *   - three.module.js YALNIZCA scene mount edilince dinamik import edilir
 *   - DPR 1.75 ile sınırlı, ekran dışındayken duraklar (IntersectionObserver)
 *   - Sekme gizliyken durur, resize gözlemlenir, dispose ile temizlenir
 *   - prefers-reduced-motion: tek kare render, döngü yok
 *   - WebGL yoksa: canvas kaldırılır, .scene-fallback CSS amblemi gösterilir
 */

const REDUCED = typeof window !== 'undefined'
  && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const PRESETS = {
  core:    { rings: 2, particles: 220, wire: true, opacity: 1.0, ringOpacity: 0.4 },
  shield:  { rings: 3, particles: 160, wire: true, opacity: 0.9, ringOpacity: 0.5 },
  ambient: { rings: 1, particles: 140, wire: false, opacity: 0.45, ringOpacity: 0.22 },
};

export async function mountScene(container, preset = 'core') {
  if (!container) return () => {};

  const conf = PRESETS[preset] || PRESETS.core;

  /* WebGL desteği kontrolü */
  let webglOK = false;
  try {
    const test = document.createElement('canvas');
    webglOK = !!(window.WebGLRenderingContext
      && (test.getContext('webgl2') || test.getContext('webgl')));
  } catch (_) { webglOK = false; }

  if (!webglOK) {
    container.querySelector('.scene-fallback')?.classList.add('show');
    return () => {};
  }

  /* Ağır bağımlılığı tembel yükle (22. madde) */
  let THREE;
  try {
    THREE = await import('../vendor/three.module.js');
  } catch (err) {
    container.querySelector('.scene-fallback')?.classList.add('show');
    return () => {};
  }

  const width = () => container.clientWidth || 1;
  const height = () => container.clientHeight || 1;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.setSize(width(), height());
  renderer.domElement.setAttribute('aria-hidden', 'true');
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, width() / height(), 0.1, 100);
  camera.position.set(0, 0, 8.2);

  const BLUE = 0x2b7fff;
  const CYAN = 0x00d4ff;

  /* ---------- Işıklar: derinlik yoluyla aydınlatma ---------- */
  scene.add(new THREE.AmbientLight(0x223455, 0.9));
  const keyLight = new THREE.PointLight(BLUE, 42, 40);
  keyLight.position.set(5, 4, 7);
  scene.add(keyLight);
  const rimLight = new THREE.PointLight(CYAN, 26, 40);
  rimLight.position.set(-6, -3, 5);
  scene.add(rimLight);

  const group = new THREE.Group();
  scene.add(group);

  /* Çekirdek — düz gölgeli ikosahedron */
  const coreGeo = new THREE.IcosahedronGeometry(1.55, 1);
  const coreMat = new THREE.MeshStandardMaterial({
    color: 0x0d1d3d,
    metalness: 0.55,
    roughness: 0.32,
    flatShading: true,
    emissive: 0x0a2a66,
    emissiveIntensity: 0.35,
    transparent: true,
    opacity: conf.opacity,
  });
  const core = new THREE.Mesh(coreGeo, coreMat);
  group.add(core);

  /* Tel kafes kabuk */
  let wire = null;
  if (conf.wire) {
    const wireGeo = new THREE.IcosahedronGeometry(2.15, 1);
    const wireMat = new THREE.MeshBasicMaterial({
      color: BLUE, wireframe: true, transparent: true, opacity: 0.14,
    });
    wire = new THREE.Mesh(wireGeo, wireMat);
    group.add(wire);
  }

  /* Yörünge halkaları */
  const rings = [];
  const ringGeos = [];
  for (let i = 0; i < conf.rings; i++) {
    const r = 2.6 + i * 0.55;
    const geo = new THREE.TorusGeometry(r, 0.012, 8, 128);
    ringGeos.push(geo);
    const mat = new THREE.MeshBasicMaterial({
      color: i % 2 === 0 ? BLUE : CYAN,
      transparent: true,
      opacity: conf.ringOpacity * (1 - i * 0.22),
    });
    const ring = new THREE.Mesh(geo, mat);
    ring.rotation.x = Math.PI / 2.6 + i * 0.5;
    ring.rotation.y = i * 0.7;
    rings.push(ring);
    group.add(ring);
  }

  /* Kısıtlı partikül alanı — yumuşak küresel kabuk */
  const N = conf.particles;
  const pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const radius = 3.1 + Math.random() * 2.4;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    pos[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
    pos[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta) * 0.72;
    pos[i * 3 + 2] = radius * Math.cos(phi);
  }
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const pMat = new THREE.PointsMaterial({
    color: 0x9fc4ff,
    size: 0.028,
    transparent: true,
    opacity: 0.5,
    sizeAttenuation: true,
    depthWrite: false,
  });
  const points = new THREE.Points(pGeo, pMat);
  group.add(points);

  /* ---------- Etkileşim: yumuşak fare tepkisi + scroll etkisi ---------- */
  const pointer = { x: 0, y: 0 };
  const target = { x: 0, y: 0 };
  const onPointerMove = (e) => {
    target.x = (e.clientX / window.innerWidth - 0.5) * 2;
    target.y = (e.clientY / window.innerHeight - 0.5) * 2;
  };
  if (!REDUCED && window.matchMedia('(pointer: fine)').matches) {
    window.addEventListener('pointermove', onPointerMove, { passive: true });
  }

  let scrollShift = 0;
  const onScroll = () => {
    scrollShift = Math.min(1, window.scrollY / Math.max(1, window.innerHeight));
  };
  if (!REDUCED) window.addEventListener('scroll', onScroll, { passive: true });

  const onResize = () => {
    camera.aspect = width() / height();
    camera.updateProjectionMatrix();
    renderer.setSize(width(), height());
  };
  window.addEventListener('resize', onResize);

  /* ---------- Döngü: ekran dışındayken durur ---------- */
  let running = false;
  let visible = true;
  let rafId = 0;
  let last = 0;

  function frame(now) {
    rafId = 0;
    if (!running) return;
    const dt = Math.min(48, now - last || 16);
    last = now;

    pointer.x += (target.x - pointer.x) * 0.04;
    pointer.y += (target.y - pointer.y) * 0.04;

    group.rotation.y += dt * 0.00011;
    group.rotation.x = pointer.y * 0.16 + scrollShift * 0.18;
    group.position.y = -scrollShift * 0.9;
    group.rotation.z = pointer.x * 0.05;

    if (wire) wire.rotation.y -= dt * 0.00006;
    rings.forEach((r, i) => {
      r.rotation.z += dt * (0.00012 + i * 0.00005) * (i % 2 ? -1 : 1);
    });
    points.rotation.y -= dt * 0.00002;

    camera.position.x = pointer.x * 0.4;
    camera.position.y = -pointer.y * 0.28;
    camera.lookAt(0, 0, 0);

    renderer.render(scene, camera);
    if (running) rafId = requestAnimationFrame(frame);
  }

  function start() {
    if (!running && visible) { running = true; last = 0; rafId = requestAnimationFrame(frame); }
  }
  function stop() {
    running = false;
    if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
  }

  if (REDUCED) {
    /* Tek kare: atmosfer korunur, hareket yok */
    renderer.render(scene, camera);
  } else {
    if ('IntersectionObserver' in window) {
      new IntersectionObserver((entries) => {
        visible = entries[0].isIntersecting;
        if (visible) start(); else stop();
      }, { threshold: 0.02 }).observe(container);
    }
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stop(); else start();
    });
    start();
  }

  /* ---------- Temizlik ---------- */
  return function dispose() {
    stop();
    window.removeEventListener('resize', onResize);
    window.removeEventListener('scroll', onScroll);
    window.removeEventListener('pointermove', onPointerMove);
    coreGeo.dispose();
    coreMat.dispose();
    pGeo.dispose();
    pMat.dispose();
    ringGeos.forEach((g) => g.dispose());
    rings.forEach((r) => r.material.dispose());
    if (wire) { wire.geometry.dispose(); wire.material.dispose(); }
    renderer.dispose();
    renderer.domElement.remove();
  };
}

