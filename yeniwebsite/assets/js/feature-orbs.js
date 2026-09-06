/**
 * VYBot — Professional Interactive Feature Orbs v2
 * ==================================================
 * 6 küre altıgen düzende yerleştirilir, aralarında ince bağlantı
 * çizgileri vardır. Her küre bir özellik kategorisini temsil eder.
 */

export const FEATURE_ORBS = [
  { id: 'moderation', label: { en: 'Moderation', tr: 'Moderasyon' }, hint: { en: 'Keep order', tr: 'Düzeni sağla' }, color: 0x2b7fff, target: '#features' },
  { id: 'security',   label: { en: 'Security',   tr: 'Güvenlik' },   hint: { en: 'Your server, shielded', tr: 'Sunucun kalkanlı' }, color: 0x00d4ff, target: '#features' },
  { id: 'music',      label: { en: 'Music',      tr: 'Müzik' },      hint: { en: 'Heartbeat of voice', tr: 'Sesli odanın kalbi' }, color: 0x7c3aed, target: '#features' },
  { id: 'economy',    label: { en: 'Economy',    tr: 'Ekonomi' },    hint: { en: 'Make members stay', tr: 'Üyeler istesin' }, color: 0xf59e0b, target: '#features' },
  { id: 'leveling',   label: { en: 'Leveling',   tr: 'Seviye' },     hint: { en: 'Reward activity', tr: 'Ödüllendir' }, color: 0x10b981, target: '#features' },
  { id: 'giveaway',   label: { en: 'Giveaway',   tr: 'Çekiliş' },    hint: { en: 'Auto winner pick', tr: 'Otomatik kazanan' }, color: 0xec4899, target: '#features' },
];

export async function mountFeatureOrbs(container) {
  if (!container) return () => {};

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const lang = () => (window.VYBOT_LANG?.current) || 'en';

  let THREE;
  try { THREE = await import('../vendor/three.module.js'); }
  catch { return () => {}; }

  const W = () => container.clientWidth || 1;
  const H = () => container.clientHeight || 1;

  // WebGL can be unavailable even when the Three.js module loads successfully
  // (for example, in an embedded browser or with hardware acceleration disabled).
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch {
    return () => {};
  }
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.setSize(W(), H());
  renderer.domElement.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:auto;z-index:1;';
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(55, W() / H(), 0.1, 100);
  camera.position.set(0, 0, 6.5);

  scene.add(new THREE.AmbientLight(0x334466, 0.6));
  const keyLight = new THREE.PointLight(0x88bbff, 40, 25); keyLight.position.set(3, 2.5, 4); scene.add(keyLight);
  const rimLight  = new THREE.PointLight(0x00d4ff, 25, 25); rimLight.position.set(-4, -2, 3);  scene.add(rimLight);

  const orbs = [];
  const SPREAD = 1.7;
  const sphereGeo = new THREE.IcosahedronGeometry(1, 3);

  FEATURE_ORBS.forEach((cfg, i) => {
    const angle = (i / FEATURE_ORBS.length) * Math.PI * 2 - Math.PI / 2;
    const mat = new THREE.MeshStandardMaterial({
      color: cfg.color, metalness: 0.25, roughness: 0.15,
      emissive: cfg.color, emissiveIntensity: 0.35,
      transparent: true, opacity: 0.95,
    });
    const mesh = new THREE.Mesh(sphereGeo, mat);
    const radius = 0.62 + (i % 2) * 0.08;
    mesh.position.set(Math.cos(angle) * SPREAD, Math.sin(angle) * SPREAD * 0.62, 0);
    mesh.scale.setScalar(0.001);
    mesh.userData = { cfg, radius, angle, basePos: mesh.position.clone(),
      phase: Math.random() * Math.PI * 2, speed: 0.35 + Math.random() * 0.25,
      floatAmp: 0.12 + Math.random() * 0.08,
      scaleFactor: 1, hoverVel: 0, entryEased: 0, entryDelay: i * 110 };
    const glow = new THREE.PointLight(cfg.color, 0.8, radius * 5);
    mesh.add(glow);
    mesh.userData.innerLight = glow;
    scene.add(mesh);
    orbs.push(mesh);
  });

  const lineMat = new THREE.LineBasicMaterial({ color: 0x2b7fff, transparent: true, opacity: 0.12 });
  const lineGeo = new THREE.BufferGeometry();
  lineGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(FEATURE_ORBS.length * 2 * 3), 3));
  const lines = new THREE.LineSegments(lineGeo, lineMat);
  scene.add(lines);

  function updateLines() {
    const pos = lines.geometry.attributes.position;
    for (let i = 0; i < FEATURE_ORBS.length; i++) {
      const a = orbs[i], b = orbs[(i + 1) % FEATURE_ORBS.length];
      pos.setXYZ(i * 2, a.position.x, a.position.y, a.position.z);
      pos.setXYZ(i * 2 + 1, b.position.x, b.position.y, b.position.z);
    }
    pos.needsUpdate = true;
  }


  const PARTICLE_COUNT = 80;
  const pGeo = new THREE.BufferGeometry();
  const pPos = new Float32Array(PARTICLE_COUNT * 3);
  const pVel = [];
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    pPos[i*3] = (Math.random() - 0.5) * 12;
    pPos[i*3+1] = (Math.random() - 0.5) * 8;
    pPos[i*3+2] = -2 - Math.random() * 4;
    pVel.push({ x: (Math.random()-0.5)*0.003, y: (Math.random()-0.5)*0.003 });
  }
  pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
  const pMat = new THREE.PointsMaterial({ color: 0x4d95ff, size: 0.025, transparent: true, opacity: 0.5, sizeAttenuation: true });
  const particles = new THREE.Points(pGeo, pMat);
  scene.add(particles);

  const rippleGeo = new THREE.RingGeometry(0.1, 0.15, 32);
  const rippleMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, side: THREE.DoubleSide });
  const ripple = new THREE.Mesh(rippleGeo, rippleMat);
  ripple.visible = false;
  scene.add(ripple);

  function spawnRipple(x, y, color) {
    ripple.position.set(x, y, 0.1);
    ripple.material.color.setHex(color);
    ripple.material.opacity = 0.6;
    ripple.scale.setScalar(0.1);
    ripple.visible = true;
    ripple.userData = { t: 0 };
  }

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2(-10, -10);
  let hoveredOrb = null;

  const tooltip = document.createElement('div');
  tooltip.className = 'orb-tooltip';
  tooltip.setAttribute('role', 'tooltip');
  container.style.position = 'relative';
  container.appendChild(tooltip);

  function updateTooltipContent(orb) {
    const cfg = orb.userData.cfg;
    const l = lang();
    tooltip.innerHTML =
      '<span class="orb-tt-dot" style="background:#'+cfg.color.toString(16).padStart(6,'0')+'"></span>' +
      '<span class="orb-tt-body"><strong>'+(cfg.label[l]||cfg.label.en)+'</strong>' +
      '<em>'+(cfg.hint[l]||cfg.hint.en)+'</em></span>';
  }

  function positionTooltip(clientX, clientY) {
    const rect = container.getBoundingClientRect();
    const tw = tooltip.offsetWidth || 160;
    let x = clientX - rect.left + 18;
    let y = clientY - rect.top - 20;
    if (x + tw > rect.width - 8) x = clientX - rect.left - tw - 18;
    if (y < 8) y = 8;
    tooltip.style.left = x + 'px';
    tooltip.style.top  = y + 'px';
  }

  function setHover(clientX, clientY) {
    const rect = container.getBoundingClientRect();
    pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(orbs);
    hoveredOrb = hits.length ? hits[0].object : null;
    container.style.cursor = hoveredOrb ? 'pointer' : '';
    if (hoveredOrb) {
      updateTooltipContent(hoveredOrb);
      tooltip.classList.add('active');
      positionTooltip(clientX, clientY);
    } else {
      tooltip.classList.remove('active');
    }
    if (reduced) renderStaticFrame();
  }

  function renderStaticFrame() {
    orbs.forEach((orb) => {
      orb.scale.setScalar((orb === hoveredOrb ? 1.25 : 1) * orb.userData.radius);
      orb.material.emissiveIntensity = (orb === hoveredOrb ? 0.7 : 0.35);
    });
    renderer.render(scene, camera);
  }

  let running = false, visible = true, rafId = 0, last = 0, disposed = false;
  const clock = { t: 0 };
  let entryProgress = 0;

  function frame(now) {
    rafId = 0;
    if (!running) return;
    const dt = Math.min(48, now - last || 16);
    last = now;
    clock.t += dt * 0.001;

    entryProgress = Math.min(1, entryProgress + dt / 1000);

    orbs.forEach((orb) => {
      const u = orb.userData, t = clock.t;
      const local = Math.max(0, Math.min(1, (t * 1000 - u.entryDelay) / 750));
      const c1 = 1.70158, c3 = c1 + 1;
      u.entryEased = local < 1 ? 1 + c3 * Math.pow(local - 1, 3) + c1 * Math.pow(local - 1, 2) : 1;

      orb.position.x = u.basePos.x + Math.cos(t * u.speed * 0.7 + u.phase) * u.floatAmp * 0.5;
      orb.position.y = u.basePos.y + Math.sin(t * u.speed + u.phase) * u.floatAmp;
      orb.position.z = u.basePos.z + Math.sin(t * u.speed * 0.5 + u.phase) * 0.12;

      const target = (orb === hoveredOrb) ? 1.3 : 1;
      u.hoverVel += (target - u.scaleFactor) * 100 * (dt/1000);
      u.hoverVel *= Math.max(0, 1 - 14 * (dt/1000));
      u.scaleFactor += u.hoverVel * (dt/1000);
      orb.scale.setScalar(Math.max(0.001, u.scaleFactor * u.radius * u.entryEased));

      const targetEmis = (orb === hoveredOrb) ? 0.8 : 0.35;
      orb.material.emissiveIntensity += (targetEmis - orb.material.emissiveIntensity) * 0.12;
      if (u.innerLight) u.innerLight.intensity = (orb === hoveredOrb) ? 2.0 : 0.8;

      orb.rotation.y += dt * 0.0003 * (1 + u.speed);
      orb.rotation.x += dt * 0.00015;
    });

    updateLines();

    const pp = particles.geometry.attributes.position;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      pp.array[i*3]   += pVel[i].x * dt * 0.06;
      pp.array[i*3+1] += pVel[i].y * dt * 0.06;
      if (Math.abs(pp.array[i*3]) > 6) pp.array[i*3] *= -0.5;
      if (Math.abs(pp.array[i*3+1]) > 4) pp.array[i*3+1] *= -0.5;
    }
    pp.needsUpdate = true;

    if (ripple.visible) {
      ripple.userData.t += dt / 1000;
      const s = ripple.userData.t;
      ripple.scale.setScalar(1 + s * 8);
      ripple.material.opacity = Math.max(0, 0.6 - s * 1.2);
      if (ripple.material.opacity <= 0) ripple.visible = false;
    }

    camera.position.x += (pointer.x * 0.3 - camera.position.x) * 0.025;
    camera.position.y += (-pointer.y * 0.2 - camera.position.y) * 0.025;
    camera.lookAt(0, 0, 0);

    renderer.render(scene, camera);
    if (running) rafId = requestAnimationFrame(frame);
  }

  function start() { if (!running && visible && !disposed) { running = true; last = 0; rafId = requestAnimationFrame(frame); } }
  function stop()  { running = false; if (rafId) { cancelAnimationFrame(rafId); rafId = 0; } }

  let intersectionObserver = null;
  function handleVisibility() { document.hidden ? stop() : start(); }

  const onPointerMove = (e) => setHover(e.clientX, e.clientY);
  const onPointerLeave = () => {
    pointer.set(-10, -10);
    hoveredOrb = null;
    container.style.cursor = '';
    tooltip.classList.remove('active');
    if (reduced) renderStaticFrame();
  };
  const onClick = (e) => {
    setHover(e.clientX, e.clientY);
    if (hoveredOrb) {
      spawnRipple(hoveredOrb.position.x, hoveredOrb.position.y, hoveredOrb.userData.cfg.color);
      const target = document.querySelector(hoveredOrb.userData.cfg.target);
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };
  container.addEventListener('pointermove', onPointerMove, { passive: true });
  container.addEventListener('pointerleave', onPointerLeave);
  container.addEventListener('click', onClick);

  function handleResize() {
    camera.aspect = W() / H();
    camera.updateProjectionMatrix();
    renderer.setSize(W(), H());
  }
  let resizeObserver = 'ResizeObserver' in window ? new ResizeObserver(handleResize) : null;
  if (resizeObserver) resizeObserver.observe(container);
  else window.addEventListener('resize', handleResize);

  const onLangChange = () => { if (hoveredOrb) updateTooltipContent(hoveredOrb); };
  window.addEventListener('vybot:langchange', onLangChange);

  if (reduced) {
    orbs.forEach((orb) => orb.scale.setScalar(orb.userData.radius));
    updateLines();
    renderer.render(scene, camera);
  } else {
    intersectionObserver = new IntersectionObserver((entries) => {
      visible = entries[0].isIntersecting;
      visible ? start() : stop();
    }, { threshold: 0.05 });
    intersectionObserver.observe(container);
    document.addEventListener('visibilitychange', handleVisibility);
    start();
  }

  return function dispose() {
    disposed = true;
    stop();
    window.removeEventListener('vybot:langchange', onLangChange);
    if (resizeObserver) resizeObserver.disconnect(); else window.removeEventListener('resize', handleResize);
    if (intersectionObserver) intersectionObserver.disconnect();
    document.removeEventListener('visibilitychange', handleVisibility);
    container.removeEventListener('pointermove', onPointerMove);
    container.removeEventListener('pointerleave', onPointerLeave);
    container.removeEventListener('click', onClick);
    sphereGeo.dispose(); rippleGeo.dispose(); rippleMat.dispose(); pGeo.dispose(); pMat.dispose(); lineGeo.dispose(); lineMat.dispose();
    orbs.forEach((o) => o.material.dispose());
    renderer.dispose();
    renderer.domElement.remove();
    tooltip.remove();
  };
}
