import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const NAVY = 0x1b2a4a;
const ORANGE = 0xee7202;
const PAPER = 0xffffff;
const SOFT = 0xf4f6f9;
const INK = 0x202020;
const QR_N = 21;
const MODULE = 0.086;

const canvas = document.getElementById('stage');
const hintEl = document.getElementById('hint');
const failEl = document.getElementById('fail');

const clock = new THREE.Clock();
const pointer = new THREE.Vector2();
const raycaster = new THREE.Raycaster();

let renderer;
let scene;
let camera;
let boomRoot;
let scanPlane;
let flatten = 0;
let flattenTo = 0;
let hopping = 0;
let reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

scene = new THREE.Scene();
scene.background = new THREE.Color(SOFT);
scene.fog = new THREE.Fog(SOFT, 8, 16);

camera = new THREE.PerspectiveCamera(42, 1, 0.1, 40);
camera.position.set(2.35, 1.55, 3.35);
camera.lookAt(0.15, 0.72, 0);

const hemi = new THREE.HemisphereLight(PAPER, NAVY, 1.15);
scene.add(hemi);
const key = new THREE.DirectionalLight(0xfff4e8, 1.35);
key.position.set(2.8, 5.2, 3.4);
key.castShadow = true;
key.shadow.mapSize.set(1024, 1024);
key.shadow.camera.near = 0.5;
key.shadow.camera.far = 16;
scene.add(key);
const fill = new THREE.DirectionalLight(ORANGE, 0.28);
fill.position.set(-3, 1.4, -1.2);
scene.add(fill);

const floor = new THREE.Mesh(
  new THREE.CircleGeometry(4.6, 48),
  new THREE.MeshStandardMaterial({ color: SOFT, roughness: 1, metalness: 0 }),
);
floor.rotation.x = -Math.PI / 2;
floor.position.y = -0.02;
floor.receiveShadow = true;
scene.add(floor);

boomRoot = new THREE.Group();
boomRoot.name = 'BoomRoot';
scene.add(boomRoot);

const hitTarget = new THREE.Mesh(
  new THREE.BoxGeometry(3.4, 2.2, 1.2),
  new THREE.MeshBasicMaterial({ visible: false }),
);
hitTarget.position.set(0.55, 0.9, 0);
boomRoot.add(hitTarget);

const modules = [];
const qrBits = buildQrBits();
const moduleGroup = new THREE.Group();
moduleGroup.name = 'QrModuleGrid';
boomRoot.add(moduleGroup);

const moduleGeo = new THREE.BoxGeometry(MODULE * 0.86, MODULE * 0.86, MODULE * 0.86);
const navyMat = new THREE.MeshStandardMaterial({
  color: NAVY,
  roughness: 0.38,
  metalness: 0.12,
});
const paperMat = new THREE.MeshStandardMaterial({
  color: PAPER,
  roughness: 0.55,
  metalness: 0.02,
});

for (let y = 0; y < QR_N; y += 1) {
  for (let x = 0; x < QR_N; x += 1) {
    const on = qrBits[y][x];
    const mesh = new THREE.Mesh(moduleGeo, on ? navyMat : paperMat);
    mesh.castShadow = on;
    const flat = flatPos(x, y);
    const idle = idlePos(x, y, on);
    mesh.position.copy(idle);
    moduleGroup.add(mesh);
    modules.push({ mesh, idle, flat, on });
  }
}

scanPlane = new THREE.Mesh(
  new THREE.PlaneGeometry(QR_N * MODULE, QR_N * MODULE),
  new THREE.MeshStandardMaterial({
    color: PAPER,
    roughness: 0.35,
    metalness: 0.04,
    transparent: true,
    opacity: 0,
  }),
);
scanPlane.position.set(0.18, 1.05, 0.42);
scanPlane.visible = false;
scene.add(scanPlane);

const texLoader = new THREE.TextureLoader();
texLoader.load('./qr.png', (tex) => {
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  scanPlane.material.map = tex;
  scanPlane.material.needsUpdate = true;
});

resize();
window.addEventListener('resize', resize);
if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', resize);
}

canvas.addEventListener('pointerdown', onPointerDown, { passive: true });

loadBoomModel();
requestAnimationFrame(tick);

function buildQrBits() {
  const bits = Array.from({ length: QR_N }, () => Array(QR_N).fill(false));
  function finder(ox, oy) {
    for (let y = 0; y < 7; y += 1) {
      for (let x = 0; x < 7; x += 1) {
        const edge = x === 0 || y === 0 || x === 6 || y === 6;
        const core = x >= 2 && x <= 4 && y >= 2 && y <= 4;
        bits[oy + y][ox + x] = edge || core;
      }
    }
  }
  finder(0, 0);
  finder(QR_N - 7, 0);
  finder(0, QR_N - 7);
  for (let i = 8; i < QR_N - 8; i += 1) {
    bits[6][i] = i % 2 === 0;
    bits[i][6] = i % 2 === 0;
  }
  for (let y = 0; y < QR_N; y += 1) {
    for (let x = 0; x < QR_N; x += 1) {
      if (reserved(x, y)) continue;
      bits[y][x] = ((x * 3 + y * 5 + (x ^ y)) % 7) < 3;
    }
  }
  return bits;
}

function reserved(x, y) {
  const inFinder = (ox, oy) => x >= ox && x < ox + 8 && y >= oy && y < oy + 8;
  return inFinder(0, 0) || inFinder(QR_N - 8, 0) || inFinder(0, QR_N - 8) || y === 6 || x === 6;
}

function flatPos(x, y) {
  const ox = (x - (QR_N - 1) / 2) * MODULE;
  const oy = ((QR_N - 1) / 2 - y) * MODULE;
  return new THREE.Vector3(ox + 0.18, oy + 1.05, 0.42);
}

function idlePos(x, y, on) {
  const col = x / (QR_N - 1);
  const row = y / (QR_N - 1);
  const onMast = x < 5;
  if (onMast) {
    return new THREE.Vector3(
      -0.62 + col * 0.22,
      0.18 + (1 - row) * 1.72,
      (y % 2 === 0 ? -0.04 : 0.05) + (on ? 0.03 : 0),
    );
  }
  return new THREE.Vector3(
    -0.28 + col * 2.05,
    1.42 + Math.sin(x * 0.35) * 0.04,
    -0.08 + (row - 0.5) * 0.18 + (on ? 0.05 : 0),
  );
}

function buildFallbackBoom() {
  const g = new THREE.Group();
  g.name = 'Pb4000Fallback';

  const base = new THREE.Mesh(
    new THREE.BoxGeometry(0.92, 0.28, 0.62),
    new THREE.MeshStandardMaterial({ color: ORANGE, roughness: 0.45, metalness: 0.18 }),
  );
  base.name = 'Base';
  base.position.set(-0.55, 0.16, 0);
  base.castShadow = true;
  g.add(base);

  const mast = new THREE.Mesh(
    new THREE.BoxGeometry(0.18, 1.55, 0.18),
    new THREE.MeshStandardMaterial({ color: NAVY, roughness: 0.32, metalness: 0.22 }),
  );
  mast.name = 'Mast';
  mast.position.set(-0.55, 1.02, 0);
  mast.castShadow = true;
  g.add(mast);

  const boom = new THREE.Mesh(
    new THREE.BoxGeometry(2.35, 0.1, 0.1),
    new THREE.MeshStandardMaterial({ color: 0xf2a100, roughness: 0.4, metalness: 0.16 }),
  );
  boom.name = 'Boom';
  boom.position.set(0.62, 1.68, 0);
  boom.castShadow = true;
  g.add(boom);

  const stop = new THREE.Mesh(
    new THREE.CircleGeometry(0.22, 8),
    new THREE.MeshStandardMaterial({ color: 0xc1121f, roughness: 0.5, metalness: 0.08 }),
  );
  stop.name = 'StopSign';
  stop.position.set(1.55, 1.68, 0.08);
  g.add(stop);

  for (const wx of [-0.78, -0.32]) {
    const wheel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.12, 0.08, 16),
      new THREE.MeshStandardMaterial({ color: INK, roughness: 0.7 }),
    );
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(wx, 0.12, 0.28);
    g.add(wheel);
    wheel.clone().position.set(wx, 0.12, -0.28);
    g.add(wheel.clone());
  }
  return g;
}

async function loadBoomModel() {
  const loader = new GLTFLoader();
  try {
    const gltf = await loader.loadAsync('./pb4000_named.glb');
    const model = gltf.scene;
    model.name = 'Pb4000Named';
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const max = Math.max(size.x, size.y, size.z) || 1;
    if (max < 0.05) throw new Error('placeholder glb');
    const scale = 2.2 / max;
    model.scale.setScalar(scale);
    box.setFromObject(model);
    const c = box.getCenter(new THREE.Vector3());
    model.position.sub(c);
    model.position.y += 0.85;
    model.traverse((n) => {
      if (n.isMesh) {
        n.castShadow = true;
        n.receiveShadow = true;
      }
    });
    boomRoot.add(model);
  } catch (err) {
    boomRoot.add(buildFallbackBoom());
  }
}

function onPointerDown(event) {
  const rect = canvas.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects([hitTarget, boomRoot], true);
  if (!hits.length && flattenTo < 0.5) {
    flattenTo = 1;
  } else if (hits.length) {
    flattenTo = flattenTo > 0.5 ? 0 : 1;
  } else {
    flattenTo = flattenTo > 0.5 ? 0 : 1;
  }
  hopping = 1;
  hintEl.textContent = flattenTo > 0.5
    ? 'Scan plane is up. Tap again to raise the boom.'
    : 'Tap the boom. Navy modules flatten to a scan plane.';
}

function resize() {
  const w = Math.max(1, window.innerWidth);
  const h = Math.max(1, window.innerHeight);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h, false);
}

function tick() {
  const t = clock.getElapsedTime();
  const dt = Math.min(clock.getDelta(), 0.05);
  flatten += (flattenTo - flatten) * Math.min(1, dt * 5.2);

  const breathe = reduced ? 1 : 1 + Math.sin(t * 1.6) * 0.018 * (1 - flatten);
  const jump = reduced ? 0 : Math.max(0, Math.sin(t * 2.4)) ** 8 * 0.09 * (1 - flatten);
  hopping = Math.max(0, hopping - dt * 2.2);
  const tapHop = hopping * hopping * 0.08;

  boomRoot.scale.setScalar(breathe);
  boomRoot.position.y = jump + tapHop;
  boomRoot.rotation.z = THREE.MathUtils.lerp(0.02 * Math.sin(t * 0.9), -0.18, flatten);

  for (let i = 0; i < modules.length; i += 1) {
    const m = modules[i];
    m.mesh.position.lerpVectors(m.idle, m.flat, flatten);
    const s = THREE.MathUtils.lerp(m.on ? 1 : 0.55, 1, flatten);
    m.mesh.scale.setScalar(s);
  }

  scanPlane.visible = flatten > 0.35;
  scanPlane.material.opacity = THREE.MathUtils.smoothstep(flatten, 0.55, 0.95);
  scanPlane.scale.setScalar(THREE.MathUtils.lerp(0.86, 1, flatten));

  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}
