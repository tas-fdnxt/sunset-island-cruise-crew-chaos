/* Incredible PORTABOOM QR (PREVIEW). Three.js WebGL, iPhone-safe.
   Loads the real pb4000_named.glb twin in this folder. Auto-fits any mesh
   in that filename. QR bits come from qr.png (error H, quiet zone).
   Preview only. Not a send. */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

const NAVY = 0x1b2a4a;
const ORANGE = 0xee7202;
const PAPER = 0xffffff;
const SOFT = 0xf4f6f9;
const INK = 0x202020;
const MODULE = 0.041;

const canvas = document.getElementById('stage');
const hintEl = document.getElementById('hint');
const failEl = document.getElementById('fail');
const statusEl = document.getElementById('status');

const clock = new THREE.Clock();
const dummy = new THREE.Object3D();
const look = new THREE.Vector3();

let renderer;
let scene;
let camera;
let boomRoot;
let flatten = 0;
let flattenTo = 0;
let hopping = 0;
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let scanPlane;
let modules;
let moduleCount = 0;
let idleHeights;
let phases;
let qrSize = 49;
let card = (49 + 8) * MODULE;
let qrPlane = 49 * MODULE;
let brandRim;

const idleCam = {
  pos: new THREE.Vector3(1.95, 1.72, 2.62),
  look: new THREE.Vector3(0.12, 0.62, 0),
  fov: 34,
};
const scanCam = {
  pos: new THREE.Vector3(0, 4.4, 0.001),
  look: new THREE.Vector3(0, 0, 0),
  fov: 22,
};

try {
  renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    powerPreference: 'default',
    failIfMajorPerformanceCaveat: false,
  });
} catch (err) {
  failEl.classList.add('show');
  throw err;
}

if (!renderer.getContext()) {
  failEl.classList.add('show');
  throw new Error('WebGL unavailable');
}

renderer.setClearColor(SOFT, 1);
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.14;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

scene = new THREE.Scene();
scene.background = new THREE.Color(SOFT);
scene.fog = new THREE.Fog(SOFT, 7.2, 14.5);

camera = new THREE.PerspectiveCamera(idleCam.fov, 1, 0.08, 40);
camera.position.copy(idleCam.pos);
camera.lookAt(idleCam.look);

setupLights();
boomRoot = new THREE.Group();
boomRoot.name = 'BoomRoot';
scene.add(boomRoot);

resize();
window.addEventListener('resize', resize);
if (window.visualViewport) window.visualViewport.addEventListener('resize', resize);
canvas.addEventListener('pointerdown', onPointerDown, { passive: true });

boot();

async function boot() {
  const qr = await loadQrBits('./qr.png');
  qrSize = qr.size;
  card = (qrSize + qr.border * 2) * MODULE;
  qrPlane = qrSize * MODULE;
  setupStage();
  modules = setupQrGrid(qr.bits, qrSize);
  scanPlane = makeScanPlane();
  scene.add(scanPlane);
  await loadBoomModel();
  window.__QR = {
    scene,
    camera,
    boomRoot,
    setFlat: (on) => {
      flattenTo = on ? 1 : 0;
      hopping = 1;
      const open = flattenTo > 0.5;
      hintEl.textContent = open
        ? 'Scan with your camera. Tap again to raise the boom.'
        : 'Tap the boom. Navy modules flatten into a scan-ready code.';
      statusEl.textContent = open ? 'Scan-ready preview. Not a send.' : 'Preview only. Not a send.';
    },
  };
  requestAnimationFrame(tick);
}

function setupLights() {
  scene.add(new THREE.HemisphereLight(0xfff7ef, 0x7f8896, 0.78));

  const key = new THREE.DirectionalLight(0xfff3e4, 1.7);
  key.position.set(2.4, 5.6, 3.2);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.near = 0.4;
  key.shadow.camera.far = 14;
  key.shadow.camera.left = -3.4;
  key.shadow.camera.right = 3.4;
  key.shadow.camera.top = 3.4;
  key.shadow.camera.bottom = -3.4;
  key.shadow.bias = -0.00028;
  key.shadow.radius = 2.6;
  scene.add(key);

  const fill = new THREE.DirectionalLight(0xe6eef8, 0.48);
  fill.position.set(-3.4, 1.9, -1.5);
  scene.add(fill);

  brandRim = new THREE.DirectionalLight(ORANGE, 0.28);
  brandRim.name = 'BrandRim';
  brandRim.position.set(-1.2, 2.4, 2.8);
  scene.add(brandRim);

  const bounce = new THREE.PointLight(PAPER, 0.32, 8, 2);
  bounce.position.set(0.3, 1.9, -1.5);
  scene.add(bounce);
}

function setupStage() {
  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(5.6, 64),
    new THREE.MeshStandardMaterial({ color: SOFT, roughness: 0.96, metalness: 0 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.012;
  floor.receiveShadow = true;
  scene.add(floor);

  const lip = new THREE.Mesh(
    new THREE.BoxGeometry(card + 0.05, 0.01, card + 0.05),
    new THREE.MeshStandardMaterial({ color: 0xe6ebf1, roughness: 0.72, metalness: 0 }),
  );
  lip.position.y = 0.002;
  lip.receiveShadow = true;
  scene.add(lip);

  const paperCard = new THREE.Mesh(
    new THREE.BoxGeometry(card, 0.018, card),
    new THREE.MeshStandardMaterial({ color: PAPER, roughness: 0.4, metalness: 0.03 }),
  );
  paperCard.name = 'QuietZoneCard';
  paperCard.position.y = 0.01;
  paperCard.receiveShadow = true;
  paperCard.castShadow = true;
  scene.add(paperCard);
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('qr.png missing'));
    img.src = src;
  });
}

function isDark(data, w, x, y) {
  const i = (y * w + x) * 4;
  return data[i] * 0.3 + data[i + 1] * 0.5 + data[i + 2] * 0.2 < 140;
}

async function loadQrBits(src) {
  const img = await loadImage(src);
  const w = img.width;
  const h = img.height;
  const cvs = document.createElement('canvas');
  cvs.width = w;
  cvs.height = h;
  const ctx = cvs.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(0, 0, w, h).data;

  let qx = 0;
  let qy = 0;
  findQuiet:
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      if (isDark(data, w, x, y)) {
        qx = x;
        qy = y;
        break findQuiet;
      }
    }
  }
  let run = 0;
  while (qx + run < w && isDark(data, w, qx + run, qy)) run += 1;
  const modulePx = Math.max(1, run / 7);
  const total = Math.round(w / modulePx);
  const border = Math.max(0, Math.round(qx / modulePx));
  const size = Math.max(21, total - border * 2);
  const bits = [];
  for (let y = 0; y < size; y += 1) {
    let row = '';
    for (let x = 0; x < size; x += 1) {
      const px = Math.min(w - 1, Math.round((x + border + 0.5) * modulePx));
      const py = Math.min(h - 1, Math.round((y + border + 0.5) * modulePx));
      row += isDark(data, w, px, py) ? '1' : '0';
    }
    bits.push(row);
  }
  return { bits, size, border };
}

function setupQrGrid(bits, size) {
  const dark = [];
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      if (bits[y][x] === '1') dark.push({ x, y });
    }
  }
  moduleCount = dark.length;
  idleHeights = new Float32Array(moduleCount);
  phases = new Float32Array(moduleCount);

  const geo = new THREE.BoxGeometry(MODULE * 0.9, 1, MODULE * 0.9);
  const mat = new THREE.MeshStandardMaterial({
    color: NAVY,
    roughness: 0.32,
    metalness: 0.1,
  });
  const mesh = new THREE.InstancedMesh(geo, mat, moduleCount);
  mesh.name = 'QrModuleGrid';
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  scene.add(mesh);

  for (let i = 0; i < moduleCount; i += 1) {
    const { x, y } = dark[i];
    const h = 0.05 + ((x * 13 + y * 29) % 17) * 0.01;
    idleHeights[i] = h;
    phases[i] = x * 0.41 + y * 0.23;
    dummy.position.set(modX(x, size), 0.02 + h * 0.5, modZ(y, size));
    dummy.scale.set(1, h, 1);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
  mesh.userData.dark = dark;
  mesh.userData.size = size;
  return mesh;
}

function modX(x, size) {
  return (x - (size - 1) / 2) * MODULE;
}

function modZ(y, size) {
  return (y - (size - 1) / 2) * MODULE;
}

function makeScanPlane() {
  const plane = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.MeshBasicMaterial({
      color: PAPER,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    }),
  );
  plane.rotation.x = -Math.PI / 2;
  plane.position.y = 0.036;
  plane.scale.set(qrPlane, qrPlane, 1);
  plane.visible = false;
  const loader = new THREE.TextureLoader();
  loader.load('./qr.png', (tex) => {
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    plane.material.map = tex;
    plane.material.needsUpdate = true;
  });
  return plane;
}

function fitBoom(model) {
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z, 0.001);
  model.scale.setScalar(2.28 / maxDim);
  box.setFromObject(model);
  model.position.x -= (box.min.x + box.max.x) * 0.5;
  model.position.y -= box.min.y;
  model.position.z -= (box.min.z + box.max.z) * 0.5;
  model.traverse((n) => {
    if (!n.isMesh) return;
    n.castShadow = false;
    n.receiveShadow = false;
    n.frustumCulled = true;
    const mats = Array.isArray(n.material) ? n.material : [n.material];
    mats.forEach((m) => {
      if (!m) return;
      if (typeof m.metalness === 'number' && m.metalness > 0.28) m.metalness = 0.18;
      if (typeof m.roughness === 'number' && m.roughness > 0.62) m.roughness = 0.46;
      if (m.color && m.color.getHex() <= 0x111111) m.color.setHex(NAVY);
      m.envMapIntensity = 0.35;
      m.needsUpdate = true;
    });
  });
}

function buildFallbackBoom() {
  const g = new THREE.Group();
  g.name = 'Pb4000Fallback';
  const orange = new THREE.MeshStandardMaterial({ color: ORANGE, roughness: 0.36, metalness: 0.16 });
  const paper = new THREE.MeshStandardMaterial({ color: PAPER, roughness: 0.34, metalness: 0.08 });
  const navy = new THREE.MeshStandardMaterial({ color: NAVY, roughness: 0.4, metalness: 0.1 });
  const ink = new THREE.MeshStandardMaterial({ color: INK, roughness: 0.7, metalness: 0.04 });
  const red = new THREE.MeshStandardMaterial({ color: 0xc8102e, roughness: 0.45, metalness: 0.06 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.415, 1.153, 0.598), orange);
  body.position.y = 0.576;
  body.castShadow = true;
  g.add(body);
  const plate = new THREE.Mesh(new THREE.BoxGeometry(0.29, 0.09, 0.012), navy);
  plate.position.set(0, 1.02, 0.31);
  g.add(plate);
  const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 2.2, 20), paper);
  arm.rotation.z = Math.PI / 2;
  arm.position.set(1.36, 1.02, 0);
  arm.castShadow = true;
  g.add(arm);
  for (let i = 0; i < 9; i += 1) {
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.034, 0.055, 14), red);
    band.rotation.z = Math.PI / 2;
    band.position.set(0.46 + i * 0.2, 1.02, 0);
    g.add(band);
  }
  const stop = new THREE.Mesh(new THREE.CircleGeometry(0.155, 8), red);
  stop.position.set(1.72, 1.02, 0.06);
  g.add(stop);
  for (const [x, z] of [[-0.13, 0.22], [0.13, 0.22], [-0.13, -0.22], [0.13, -0.22]]) {
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.055, 16), ink);
    wheel.rotation.x = Math.PI / 2;
    wheel.position.set(x, 0.085, z);
    g.add(wheel);
  }
  return g;
}

async function loadBoomModel() {
  const loader = new GLTFLoader();
  const draco = new DRACOLoader();
  draco.setDecoderPath('https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/libs/draco/gltf/');
  loader.setDRACOLoader(draco);
  try {
    const gltf = await loader.loadAsync('./pb4000_named.glb');
    const model = gltf.scene;
    model.name = 'Pb4000Named';
    fitBoom(model);
    boomRoot.add(model);
  } catch (err) {
    console.warn('pb4000_named.glb failed, using procedural boom', err);
    const fallback = buildFallbackBoom();
    fitBoom(fallback);
    boomRoot.add(fallback);
  }
}

function ease(t) {
  const x = THREE.MathUtils.clamp(t, 0, 1);
  return x < 0.5 ? 4 * x * x * x : 1 - ((-2 * x + 2) ** 3) / 2;
}

function onPointerDown() {
  flattenTo = flattenTo > 0.5 ? 0 : 1;
  hopping = 1;
  const open = flattenTo > 0.5;
  hintEl.textContent = open
    ? 'Scan with your camera. Tap again to raise the boom.'
    : 'Tap the boom. Navy modules flatten into a scan-ready code.';
  statusEl.textContent = open ? 'Scan-ready preview. Not a send.' : 'Preview only. Not a send.';
}

function resize() {
  const w = Math.max(1, window.innerWidth);
  const h = Math.max(1, window.innerHeight);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h, false);
}

function updateModules(t, k, alive) {
  if (!modules) return;
  const dark = modules.userData.dark;
  const size = modules.userData.size;
  for (let i = 0; i < moduleCount; i += 1) {
    const { x, y } = dark[i];
    const phase = phases[i];
    const idleH = idleHeights[i];
    const breathe = reduced ? 1 : 1 + Math.sin(t * 1.85 + phase) * 0.09 * alive;
    const hop = reduced ? 0 : (Math.max(0, Math.sin(t * 2.45 + phase * 0.16)) ** 8) * 0.11 * alive;
    const h = THREE.MathUtils.lerp(idleH * breathe + hop, MODULE * 0.08, k);
    dummy.position.set(modX(x, size), 0.02 + h * 0.5, modZ(y, size));
    dummy.scale.set(
      THREE.MathUtils.lerp(0.9, 1, k),
      Math.max(0.012, h),
      THREE.MathUtils.lerp(0.9, 1, k),
    );
    dummy.updateMatrix();
    modules.setMatrixAt(i, dummy.matrix);
  }
  modules.instanceMatrix.needsUpdate = true;
}

function tick() {
  const t = clock.getElapsedTime();
  const dt = Math.min(clock.getDelta(), 0.05);
  flatten += (flattenTo - flatten) * Math.min(1, dt * 6.2);
  const k = ease(flatten);
  const alive = 1 - k;

  const breathe = reduced ? 1 : 1 + Math.sin(t * 1.6) * 0.028 * alive;
  const jump = reduced ? 0 : (Math.max(0, Math.sin(t * 2.2)) ** 6) * 0.13 * alive;
  hopping = Math.max(0, hopping - dt * 2.0);
  const tapHop = hopping * hopping * 0.1 * alive;

  boomRoot.scale.setScalar(THREE.MathUtils.lerp(breathe, 0.04, k));
  boomRoot.position.y = THREE.MathUtils.lerp(jump + tapHop, -0.85, k);
  boomRoot.rotation.y = THREE.MathUtils.lerp(0.06 * Math.sin(t * 0.55), 0, k);
  boomRoot.rotation.z = THREE.MathUtils.lerp(0.02 * Math.sin(t * 0.9), 0, k);
  boomRoot.visible = k < 0.82;

  const flash = reduced ? 0.35 : 0.22 + 0.9 * Math.max(0, Math.sin(t * 3.35));
  if (brandRim) brandRim.intensity = 0.12 + 0.32 * flash * alive;

  updateModules(t, k, alive);

  look.copy(idleCam.look).lerp(scanCam.look, k);
  if (window.innerWidth < 520) {
    camera.position.set(
      THREE.MathUtils.lerp(1.42, 0, k),
      THREE.MathUtils.lerp(1.95, 4.55, k),
      THREE.MathUtils.lerp(2.95, 0.001, k),
    );
    camera.fov = THREE.MathUtils.lerp(38, 24, k);
  } else {
    camera.position.lerpVectors(idleCam.pos, scanCam.pos, k);
    camera.fov = THREE.MathUtils.lerp(idleCam.fov, 22, k);
  }
  camera.lookAt(look);
  camera.updateProjectionMatrix();

  if (scanPlane) {
    scanPlane.visible = k > 0.38;
    scanPlane.material.opacity = THREE.MathUtils.smoothstep(k, 0.42, 0.78);
    const s = THREE.MathUtils.lerp(0.94, 1, k);
    scanPlane.scale.set(qrPlane * s, qrPlane * s, 1);
  }

  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}
