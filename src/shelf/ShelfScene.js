import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { gsap } from 'gsap';

import { hashSeed, makeCanvas, rng, woodCanvas } from './art.js';
import { BOARD, Book, GAP, sharedTextures } from './book.js';
import { SHELF_BG, themeFor } from './theme.js';
import { inOwnFrame } from '../lib/frames.js';

/*
 * The shelf: one clothbound volume per piece of work, standing on a walnut plank.
 *
 * States: shelf → toDetail → detail → toShelf → shelf.
 * A book leaving the shelf is re-parented to the scene at its exact world pose, flown to a
 * pose computed from the reading slot, then re-parented to the reading rig with its exact
 * local pose (and the reverse on the way back), so neither end of a flight can jump.
 *
 * The page owns all the controls; this class only draws, picks and animates, and reports
 * what changed through `onEvent(type, detail)`.
 */

const SPACING = 1;
const FOV = 26;
const ELEV = 0.1;
const CLOSED_YAW = 0.34;
const CRACK = 0.2;
const SPOT = 150;
const KEY = 3.1;
const PI = Math.PI;

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const smooth = t => t * t * (3 - 2 * t);
const damp = (a, b, lambda, dt) => a + (b - a) * (1 - Math.exp(-lambda * dt));

function radialCanvas() {
  const c = makeCanvas(256, 256);
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.35, 'rgba(255,255,255,0.55)');
  grd.addColorStop(0.7, 'rgba(255,255,255,0.12)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 256, 256);
  return c;
}

/** The wall behind the shelf: a dim plaster tone with a soft pool of light. */
function wallCanvas() {
  const c = makeCanvas(512, 256);
  const g = c.getContext('2d');
  g.fillStyle = '#ffffff';
  g.fillRect(0, 0, 512, 256);
  const r = rng(5);
  for (let i = 0; i < 4000; i++) {
    g.fillStyle = r() > 0.5 ? 'rgba(0,0,0,0.035)' : 'rgba(255,255,255,0.05)';
    g.fillRect(r() * 512, r() * 256, 1.5, 1.5);
  }
  return c;
}

async function fontsReady() {
  if (!document.fonts?.load) return;
  const faces = [
    '500 32px "Funnel Display"',
    '600 32px "Funnel Display"',
    '400 32px "Funnel Sans"',
    '500 32px "Funnel Sans"',
    '600 32px "Funnel Sans"',
    '500 32px "Martian Mono"',
    '600 32px "Martian Mono"'
  ];
  const all = Promise.all(faces.map(f => document.fonts.load(f).catch(() => null)));
  await Promise.race([all, new Promise(resolve => setTimeout(resolve, 3000))]);
}

export class ShelfScene {
  constructor({ canvas, volumes, reduced = false, onEvent }) {
    this.canvas = canvas;
    this.volumes = volumes;
    this.N = volumes.length;
    this.reduced = reduced;
    this.emit = onEvent || (() => {});

    this.state = 'loading';
    this.index = 0;
    this.offset = 0;
    this.present = 0;
    this.books = new Array(this.N).fill(null);
    this.hover = new Array(this.N).fill(0);
    this.hoverTarget = -1;
    this.active = null;
    this.flight = null;
    this.backClose = null;
    this.cover = { angle: 0 };
    this.coverTarget = 0;
    this.orbit = { yaw: 0, pitch: 0 };
    this.orbitTarget = { yaw: 0, pitch: 0 };
    this.zoom = 1;
    this.zoomTarget = 1;
    this.ptr = null;
    this.visible = true;
    this.dirty = 2;
    this.time = 0;
    this.last = 0;
    this.queue = [];
    this.built = 0;
    this.ready = false;
    this.compiled = false;
    this.slotRect = null;
    this.size = { cw: 1, ch: 1 };
    this.lastPage = -1;
    this.wheelAt = 0;
    this.wheelAxis = null;
    this.wheelStart = 0;
    this.wheelSettle = 0;
    this.mouse = null;
    this.pickedAt = Infinity;
    this.disposed = false;
    this.v = {
      a: new THREE.Vector3(),
      b: new THREE.Vector3(),
      p: new THREE.Vector3(),
      s: new THREE.Vector3(),
      q: new THREE.Quaternion(),
      m: new THREE.Matrix4(),
      fwd: new THREE.Vector3(),
      up: new THREE.Vector3(),
      right: new THREE.Vector3(),
      ndc: new THREE.Vector2(),
      yAxis: new THREE.Vector3(0, 1, 0),
      spin: new THREE.Quaternion()
    };
    this.tmp = new THREE.Object3D();
    this.raycaster = new THREE.Raycaster();

    // Throws when WebGL is unavailable; the page shows its plain list instead.
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NeutralToneMapping;
    renderer.toneMappingExposure = 1;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.setClearColor(SHELF_BG, 1);
    this.renderer = renderer;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 80);
    this.tick = this.tick.bind(this);
    // The rest of the set-up (textures, environment, room) runs in setup(), a piece per frame.
  }

  /**
   * The heavy set-up, split so each piece runs in a frame of its own (see lib/frames.js): textures,
   * the environment map, then the room. Only after that does the scene take input and draw.
   */
  async setup() {
    const steps = [
      () => {
        const small = Math.min(window.screen?.width || 1200, window.screen?.height || 1200) < 700;
        this.shared = sharedTextures(this.renderer, { quality: small ? 0.72 : 1 });
      },
      () => {
        const pmrem = new THREE.PMREMGenerator(this.renderer);
        const room = new RoomEnvironment();
        this.envRT = pmrem.fromScene(room, 0.04);
        room.dispose();
        pmrem.dispose();
        this.scene.environment = this.envRT.texture;
        this.scene.environmentIntensity = 0.32;
      },
      () => {
        this.buildLights();
        this.buildShelf();
        this.buildOverlays();
        this.rig = new THREE.Group();
        this.scene.add(this.rig);
        this.bind();
        this.resize();
        gsap.ticker.add(this.tick);
      }
    ];
    for (const step of steps) {
      await inOwnFrame(() => this.disposed || step());
      if (this.disposed) return false;
    }
    return true;
  }

  /* ---------- construction ---------- */

  buildLights() {
    const spot = new THREE.SpotLight(0xfff0de, SPOT, 0, 0.36, 0.9, 2);
    spot.position.set(-1.9, 4.9, 4.7);
    spot.target.position.set(0, 0.42, -0.1);
    spot.castShadow = true;
    spot.shadow.mapSize.set(2048, 2048);
    spot.shadow.camera.near = 3;
    spot.shadow.camera.far = 14;
    spot.shadow.bias = -0.0003;
    spot.shadow.normalBias = 0.02;
    spot.shadow.radius = 3;
    this.spot = spot;

    const rim = new THREE.DirectionalLight(0xc9d8ff, 0.7);
    rim.position.set(3, 2.5, -4);

    const key = new THREE.DirectionalLight(0xfff5ea, 0);
    this.key = key;

    this.scene.add(spot, spot.target, rim, key, key.target);
  }

  buildShelf() {
    const { N } = this;
    this.stage = new THREE.Group();
    this.row = new THREE.Group();
    this.stage.add(this.row);
    this.scene.add(this.stage);
    this.statics = [];
    const keep = x => {
      this.statics.push(x);
      return x;
    };

    // Wall
    const wallTex = keep(this.shared.tex(wallCanvas(), { repeat: [10, 4] }));
    const wall = new THREE.Mesh(
      keep(new THREE.PlaneGeometry(48, 20)),
      keep(new THREE.MeshStandardMaterial({ color: '#2a2d33', map: wallTex, roughness: 0.97 }))
    );
    wall.position.set(0, 4, -0.64);
    wall.receiveShadow = true;
    this.stage.add(wall);

    // Plank, with a thin brass inlay along its front edge
    const span = (N - 1) * SPACING;
    const len = span + 2.7;
    const wood = keep(this.shared.tex(woodCanvas(), { repeat: [len / 3.4, 1] }));
    const plank = new THREE.Mesh(
      keep(new THREE.BoxGeometry(len, 0.07, 0.68)),
      keep(new THREE.MeshStandardMaterial({ map: wood, roughness: 0.55 }))
    );
    plank.position.set(span / 2, -0.035, -0.06);
    plank.receiveShadow = true;
    plank.castShadow = true;
    this.row.add(plank);

    const brass = keep(new THREE.MeshStandardMaterial({ color: '#b8925a', metalness: 1, roughness: 0.34 }));
    const inlay = new THREE.Mesh(keep(new THREE.BoxGeometry(len, 0.006, 0.004)), brass);
    inlay.position.set(span / 2, -0.014, 0.281);
    this.row.add(inlay);

    // Brass bookends at both ends
    const upright = keep(new THREE.BoxGeometry(0.018, 0.5, 0.24));
    const foot = keep(new THREE.BoxGeometry(0.2, 0.012, 0.24));
    [-1, 1].forEach(side => {
      const end = new THREE.Group();
      const u = new THREE.Mesh(upright, brass);
      u.position.set(0, 0.25, 0);
      const f = new THREE.Mesh(foot, brass);
      f.position.set(-side * 0.1, 0.006, 0);
      [u, f].forEach(m => {
        m.castShadow = true;
        m.receiveShadow = true;
      });
      end.add(u, f);
      end.position.set(side < 0 ? -0.72 : span + 0.72, 0, -0.12);
      this.row.add(end);
    });

    // One slot per volume, with a little deterministic irregularity
    this.slots = this.volumes.map((vol, i) => {
      const slot = new THREE.Group();
      const r = rng(hashSeed(vol.id) + 3);
      slot.userData.jitter = { x: (r() - 0.5) * 0.05, z: (r() - 0.5) * 0.03, yaw: (r() - 0.5) * 0.05 };
      this.row.add(slot);
      return slot;
    });
    this.shelfMeshes = [];
  }

  buildOverlays() {
    // A veil in front of the shelf, in the reading colour, and a pool of light behind the book.
    this.scrim = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({ color: SHELF_BG, transparent: true, opacity: 0, depthWrite: false, toneMapped: false })
    );
    this.scrim.renderOrder = 10;
    this.scrim.visible = false;
    this.glowTex = this.shared.tex(radialCanvas());
    this.glow = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({
        map: this.glowTex,
        color: '#ffffff',
        transparent: true,
        opacity: 0,
        depthWrite: false,
        toneMapped: false
      })
    );
    this.glow.renderOrder = 11;
    this.glow.visible = false;
    this.scene.add(this.scrim, this.glow);
  }

  /**
   * Fonts first (the covers are typeset on canvas), then the books, centre outwards, a few
   * milliseconds' worth per frame so building never competes with scrolling.
   */
  async init() {
    const fonts = fontsReady();
    if (!(await this.setup())) return;
    await fonts;
    if (this.disposed) return;
    const order = [this.index];
    for (let d = 1; order.length < this.N; d++) {
      if (this.index + d < this.N) order.push(this.index + d);
      if (this.index - d >= 0) order.push(this.index - d);
    }
    this.queue = order;
    // A few milliseconds of building per frame: quick, but never long enough to stutter a scroll.
    // Queued with the page's other heavy jobs, so a batch never shares a frame with one of them.
    while (this.queue.length) {
      await inOwnFrame(() => {
        if (this.disposed) return;
        const start = performance.now();
        do this.buildNext();
        while (this.queue.length && performance.now() - start < 8);
      });
      if (this.disposed) return;
    }
  }

  buildNext() {
    const i = this.queue.shift();
    const book = new Book(this.volumes[i], i, this.N, this.shared);
    this.slots[i].add(book.group);
    this.books[i] = book;
    this.shelfMeshes.push(...book.hitMeshes);
    book.textures.forEach(t => this.renderer.initTexture(t));
    this.built++;

    if (this.built === 1) {
      // Compile every material variant once, off the main thread where the browser allows it,
      // including the two-sided paper used by the pages.
      const warm = new THREE.Group();
      const geo = new THREE.PlaneGeometry(0.01, 0.01);
      [THREE.FrontSide, THREE.BackSide].forEach(side => {
        warm.add(new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: this.shared.paper, side })));
      });
      warm.position.set(0, -50, 0);
      this.scene.add(warm);
      this.scrim.visible = true;
      this.glow.visible = true;
      const done = () => {
        this.scene.remove(warm);
        warm.children.forEach(m => m.material.dispose());
        geo.dispose();
        this.scrim.visible = false;
        this.glow.visible = false;
        this.compiled = true;
        this.invalidate();
      };
      // compileAsync only helps (and only stays quiet) where parallel compilation exists.
      if (this.renderer.extensions.has('KHR_parallel_shader_compile')) {
        this.renderer.compileAsync(this.scene, this.camera).then(done, done);
      } else {
        this.renderer.compile(this.scene, this.camera);
        done();
      }
    }

    // Ready as soon as the first few books (the ones in view) stand; the rest follow within a few frames.
    if (!this.ready && (this.built >= Math.min(3, this.N) || !this.queue.length)) {
      this.ready = true;
      this.setState('shelf');
      this.emit('ready', {});
    }
    this.invalidate();
  }

  /* ---------- events ---------- */

  bind() {
    const c = this.canvas;
    this.onDown = this.onDown.bind(this);
    this.onMove = this.onMove.bind(this);
    this.onUp = this.onUp.bind(this);
    this.onCancel = this.onCancel.bind(this);
    this.onLeave = this.onLeave.bind(this);
    this.onWheel = this.onWheel.bind(this);
    c.addEventListener('pointerdown', this.onDown);
    c.addEventListener('pointermove', this.onMove);
    c.addEventListener('pointerup', this.onUp);
    c.addEventListener('pointercancel', this.onCancel);
    c.addEventListener('pointerleave', this.onLeave);
    this.wheelEl = c.parentElement || c;
    this.wheelEl.addEventListener('wheel', this.onWheel, { passive: false });

    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(c);
    this.io = new IntersectionObserver(
      ([entry]) => {
        this.visible = entry.isIntersecting;
        if (this.visible) this.invalidate();
      },
      { rootMargin: '120px' }
    );
    this.io.observe(c);
    this.onLost = e => {
      e.preventDefault();
      this.emit('error', { reason: 'context-lost' });
    };
    c.addEventListener('webglcontextlost', this.onLost);
  }

  setState(state) {
    if (this.state === state) return;
    this.state = state;
    this.canvas.dataset.state = state;
    this.emit('state', { state, index: this.index });
  }

  invalidate() {
    this.dirty = 2;
  }

  /* ---------- tweening ---------- */

  tween(target, vars) {
    const { duration = 0.6, ease, delay, onComplete, onUpdate, overwrite, ...props } = vars;
    if (this.reduced || duration === 0) {
      gsap.killTweensOf(target, Object.keys(props).join(','));
      Object.assign(target, props);
      onUpdate?.();
      this.invalidate();
      onComplete?.();
      return null;
    }
    return gsap.to(target, {
      ...props,
      duration,
      ease,
      delay,
      overwrite: overwrite ?? 'auto',
      onUpdate: () => {
        this.invalidate();
        onUpdate?.();
      },
      onComplete
    });
  }

  /* ---------- layout ---------- */

  resize() {
    const cw = this.canvas.clientWidth;
    const ch = this.canvas.clientHeight;
    if (!cw || !ch) return;
    this.size = { cw, ch };
    this.renderer.setSize(cw, ch, false);
    this.frame();
    this.invalidate();
  }

  /** Frames the shelf: about five volumes across on a wide screen, one and a half on a phone. */
  frame() {
    const { cw, ch } = this.size;
    const aspect = cw / ch;
    const cam = this.camera;
    const tan = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
    const across = aspect < 0.75 ? 1.62 : aspect < 1.15 ? 2.4 : aspect < 1.6 ? 3.5 : 4.4;
    const dW = (across * SPACING) / 2 / (tan * aspect);
    const dH = 1.12 / 0.46 / 2 / tan;
    const dist = Math.max(dW, dH);
    this.camDist = dist;
    this.tan = tan;
    const target = new THREE.Vector3(0, 0.45, -0.06);
    cam.aspect = aspect;
    cam.position.set(0, target.y + Math.sin(ELEV) * dist, target.z + Math.cos(ELEV) * dist);
    cam.lookAt(target);
    cam.updateProjectionMatrix();
    cam.updateMatrixWorld();
    const { fwd, up, right } = this.v;
    cam.getWorldDirection(fwd);
    up.set(0, 1, 0).applyQuaternion(cam.quaternion);
    right.set(1, 0, 0).applyQuaternion(cam.quaternion);

    // The veil sits just in front of the books.
    const sd = dist - 0.5;
    this.scrim.position.copy(cam.position).addScaledVector(fwd, sd);
    this.scrim.quaternion.copy(cam.quaternion);
    this.scrim.scale.set(2 * sd * tan * aspect * 1.3, 2 * sd * tan * 1.3, 1);
  }

  /** The reading slot, in CSS pixels relative to the canvas. */
  setSlot(rect) {
    this.slotRect = rect;
    this.invalidate();
  }

  /** Where the rig (the centre of the book being read) goes, and how far from the camera. */
  layoutRig(dt) {
    const b = this.active;
    if (!b) return;
    const { cw, ch } = this.size;
    const aspect = cw / ch;
    const tan = this.tan;
    const r = this.slotRect || { x: 0, y: 0, w: cw, h: ch };
    const nx = ((r.x + r.w / 2) / cw) * 2 - 1;
    const ny = 1 - ((r.y + r.h / 2) / ch) * 2;
    const fw = (Math.max(40, r.w) / cw) * 2 * tan * aspect;
    const fh = (Math.max(40, r.h) / ch) * 2 * tan;
    const e = this.layoutE;
    const narrow = aspect < 0.8;
    const closedW = b.w + b.t * 0.45;
    const dClosed = Math.max(closedW / ((narrow ? 0.7 : 0.6) * fw), b.h / ((narrow ? 0.88 : 0.78) * fh));
    const dOpen = Math.max((2 * b.w + 0.06) / (0.94 * fw), b.h / (0.86 * fh));

    this.zoom = damp(this.zoom, this.zoomTarget, 10, dt);
    this.orbit.yaw = damp(this.orbit.yaw, this.orbitTarget.yaw, 9, dt);
    this.orbit.pitch = damp(this.orbit.pitch, this.orbitTarget.pitch, 9, dt);
    const want = clamp((dClosed + (dOpen - dClosed) * e) / this.zoom, 0.9, 40);
    // Stay well in front of the veil over the shelf: past that depth, come closer and scale down instead.
    const dist = Math.min(want, this.camDist - 1.5);
    const scale = dist / want;
    this.rigDist = dist;

    const cam = this.camera;
    const { p } = this.v;
    p.set(nx * dist * tan * aspect, ny * dist * tan, -dist).applyMatrix4(cam.matrixWorld);
    const still = this.reduced || this.ptr;
    const floatAmt = still ? 0 : 1 - e;
    p.addScaledVector(this.v.up, Math.sin(this.time * 0.9) * 0.012 * floatAmt);
    this.rig.position.copy(p);
    this.rig.quaternion.copy(cam.quaternion);
    this.rig.rotateY(this.orbit.yaw + Math.sin(this.time * 0.55) * 0.035 * floatAmt);
    this.rig.rotateX(this.orbit.pitch);
    this.rig.scale.setScalar(scale);
    this.rig.updateMatrixWorld();

    if (b.group.parent === this.rig) this.applyRigLocal(b, b.group);

    // Pool of light behind the book
    const back = 1.6;
    this.glow.position.copy(p).addScaledVector(this.v.fwd, back);
    this.glow.quaternion.copy(cam.quaternion);
    const g = b.h * scale * 3.3 * ((dist + back) / dist);
    this.glow.scale.set(g * 1.15, g, 1);

    // Key light for the book, from the upper left
    this.key.position
      .copy(p)
      .addScaledVector(this.v.right, -2.2)
      .addScaledVector(this.v.up, 2.8)
      .addScaledVector(this.v.fwd, -2.6);
    this.key.target.position.copy(p);
    this.key.target.updateMatrixWorld();
  }

  get openE() {
    return smooth(clamp(this.cover.angle / PI, 0, 1));
  }

  /** How open the layout is: held fully open while the book closes from the back, so the left page stays put. */
  get layoutE() {
    return this.backClose ? 1 : this.openE;
  }

  /** The book's pose inside the rig: centred when closed (turned to show the spine), spread centred when open. */
  applyRigLocal(b, obj) {
    const e = this.layoutE;
    obj.position.set((b.w / 2) * e, -b.h / 2, 0);
    obj.rotation.set(0, CLOSED_YAW * (1 - e), 0);
    obj.scale.set(1, 1, 1);
    if (this.backClose) {
      // Swing the whole book about its spine; the cover and read pages counter-rotate, so they stay where they lie
      // and the back half of the book folds over onto them.
      const { a, q } = this.v;
      const spine = a.set(-b.w / 2, 0, b.t / 2 - BOARD / 2);
      q.setFromAxisAngle(this.v.yAxis, this.backClose.psi);
      const offset = spine.clone().sub(spine.clone().applyQuaternion(q)).applyQuaternion(obj.quaternion);
      obj.position.add(offset);
      obj.quaternion.multiply(q);
    }
  }

  /* ---------- per frame ---------- */

  tick() {
    if (this.disposed) return;
    const now = performance.now();
    const dt = Math.min(0.05, this.last ? (now - this.last) / 1000 : 0.016);
    this.last = now;
    if (document.hidden || !this.visible) return;
    this.time += dt;
    const moving = this.update(dt);
    if (this.compiled && (moving || this.dirty > 0)) {
      this.renderer.render(this.scene, this.camera);
      if (this.dirty > 0) this.dirty--;
    }
  }

  update(dt) {
    let moving = false;

    // Shelf
    this.row.position.x = -this.offset * SPACING;
    const lift = this.reduced ? 0 : 1;
    for (let i = 0; i < this.N; i++) {
      const slot = this.slots[i];
      const j = slot.userData.jitter;
      const target = i === this.hoverTarget && this.state === 'shelf' ? 1 : 0;
      const hv = damp(this.hover[i], target, 11, dt);
      if (Math.abs(hv - target) > 0.001) moving = true;
      this.hover[i] = Math.abs(hv - target) < 0.001 ? target : hv;
      const d = i - this.offset;
      const f = smooth(clamp(1 - Math.abs(d), 0, 1));
      const h = this.hover[i] * lift;
      slot.position.set(i * SPACING + j.x, 0.055 * h, -0.13 + j.z + 0.075 * f + 0.03 * h);
      slot.rotation.set(0, -clamp(d, -1.6, 1.6) * 0.085 + j.yaw * (1 - f), 0);
    }

    // Books rise as they slide under a resting pointer (trackpad swipe, drag) and settle as they leave.
    if (this.state === 'shelf' && this.mouse && Math.abs(this.offset - this.pickedAt) > 0.001) {
      this.pickedAt = this.offset;
      this.stage.updateMatrixWorld(true);
      const hit = this.pick(this.mouse.x, this.mouse.y);
      const i = hit ? hit.book.index : -1;
      if (i !== this.hoverTarget) {
        this.hoverTarget = i;
        this.canvas.style.cursor = hit ? 'pointer' : '';
        moving = true;
      }
    }

    // Reading view: shelf recedes behind a veil in the book's colour
    const pe = smooth(this.present);
    this.stage.position.set(0, -0.2 * pe, -1.1 * pe);
    this.stage.visible = this.present < 0.999;
    this.scrim.visible = this.present > 0.001;
    this.scrim.material.opacity = pe;
    this.glow.visible = this.present > 0.001 && !!this.active;
    this.glow.material.opacity = pe * 0.42;
    this.spot.intensity = SPOT * (1 - 0.9 * pe);
    this.key.intensity = KEY * pe;

    const b = this.active;
    if (b && this.backClose) {
      const psi = this.backClose.psi;
      this.cover.angle = PI + psi;
      // Read pages keep their place on the left: counter-rotate them, and pin their spine edge
      // to where it lay before the book started to turn about its spine.
      const sx = -b.w / 2;
      const sz = b.t / 2 - BOARD / 2;
      const c = Math.cos(-psi);
      const n = Math.sin(-psi);
      b.sheets?.forEach((s, k) => {
        if (!this.backClose.read[k]) return;
        s.turn = 1 + psi / PI;
        const dx = 0.003;
        const dz = b.t / 2 + (k + 1) * GAP - sz;
        s.pin = { x: sx + dx * c + dz * n, z: sz - dx * n + dz * c };
      });
    }
    if (b) {
      b.setCover(this.cover.angle);
      b.layoutSheets();
      this.layoutRig(dt);
      if (!this.reduced && this.state === 'detail' && this.openE < 1) moving = true; // idle float
      if (
        Math.abs(this.zoom - this.zoomTarget) > 1e-4 ||
        Math.abs(this.orbit.yaw - this.orbitTarget.yaw) > 1e-4 ||
        Math.abs(this.orbit.pitch - this.orbitTarget.pitch) > 1e-4
      )
        moving = true;
      if (this.state === 'detail') this.emitPage();
    }

    if (this.flight) {
      this.applyFlight();
      moving = true;
    }
    return moving;
  }

  /** Interpolates the flying book between its captured start pose and its live destination. */
  applyFlight() {
    const f = this.flight;
    const b = f.book;
    const { p, q, s, m } = this.v;
    this.stage.updateMatrixWorld(true);
    if (f.to === 'rig') {
      this.applyRigLocal(b, this.tmp);
      this.tmp.updateMatrix();
      m.multiplyMatrices(this.rig.matrixWorld, this.tmp.matrix);
    } else {
      m.copy(this.slots[b.index].matrixWorld);
    }
    m.decompose(f.dp, f.dq, f.ds);
    const e = f.t;
    p.lerpVectors(f.from.p, f.dp, e);
    p.addScaledVector(this.v.up, Math.sin(PI * e) * 0.14);
    if (f.unflip) {
      // The book was closed from the back, so it arrives back-first: turn it round on the way home.
      q.slerpQuaternions(f.fromFront, f.dq, e).multiply(this.v.spin.setFromAxisAngle(this.v.yAxis, -PI * (1 - e)));
    } else {
      q.slerpQuaternions(f.from.q, f.dq, e);
    }
    s.lerpVectors(f.from.s, f.ds, e);
    b.group.position.copy(p);
    b.group.quaternion.copy(q);
    b.group.scale.copy(s);
    const off = f.to === 'rig' ? smooth(clamp(e * 5, 0, 1)) : 1 - smooth(clamp(e * 5 - 4, 0, 1));
    b.shadow.material.opacity = 0.55 * (1 - off);
  }

  /* ---------- shelf navigation ---------- */

  select(i) {
    if (this.state !== 'shelf' && this.state !== 'loading') return;
    const next = clamp(Math.round(i), 0, this.N - 1);
    if (next !== this.index) {
      this.index = next;
      this.emit('select', { index: next });
    }
    this.tween(this, { offset: next, duration: 0.9, ease: 'power3.out' });
  }

  next() {
    this.select(this.index + 1);
  }

  /** A short peek towards the next volume and back, to show the shelf can be swiped. Any drag cancels it. */
  nudge() {
    if (this.state !== 'shelf' || this.reduced || this.ptr) return;
    const base = this.index;
    const dir = base < this.N - 1 ? 1 : -1;
    gsap.killTweensOf(this, 'offset');
    gsap
      .timeline({ onUpdate: () => this.invalidate() })
      .to(this, { offset: base + 0.32 * dir, duration: 0.6, ease: 'power2.inOut' })
      .to(this, { offset: base, duration: 0.9, ease: 'power3.out' }, '+=0.12');
  }

  prev() {
    this.select(this.index - 1);
  }

  /* ---------- reading ---------- */

  open(i = this.index) {
    if (this.state !== 'shelf') return false;
    const book = this.books[i];
    if (!book) return false;
    if (i !== this.index) {
      this.index = i;
      this.emit('select', { index: i });
    }
    this.hoverTarget = -1;
    this.canvas.style.cursor = '';
    book.ensureDetailArt();
    book.ensurePages();
    book.textures.forEach(t => this.renderer.initTexture(t));
    book.pageTextures.forEach(t => this.renderer.initTexture(t));

    const theme = themeFor(book.vol.binding);
    this.scrim.material.color.set(theme.tint);
    this.glow.material.color.set(theme.glow);

    this.active = book;
    this.cover.angle = 0;
    this.coverTarget = 0;
    this.orbit.yaw = this.orbit.pitch = 0;
    this.orbitTarget.yaw = this.orbitTarget.pitch = 0;
    this.zoom = this.zoomTarget = 1;
    this.lastPage = -1;
    this.layoutRig(0);

    this.scene.attach(book.group);
    this.flight = {
      book,
      to: 'rig',
      t: 0,
      from: { p: book.group.position.clone(), q: book.group.quaternion.clone(), s: book.group.scale.clone() },
      dp: new THREE.Vector3(),
      dq: new THREE.Quaternion(),
      ds: new THREE.Vector3(1, 1, 1)
    };
    this.setState('toDetail');
    // Centre this volume on the shelf behind the veil, ready for the return.
    this.tween(this, { offset: i, duration: 1.1, ease: 'power3.inOut' });
    this.tween(this, { present: 1, duration: 1.0, ease: 'power2.inOut' });
    this.tween(this.flight, {
      t: 1,
      duration: 1.15,
      ease: 'power3.inOut',
      onComplete: () => this.landInRig()
    });
    return true;
  }

  landInRig() {
    const b = this.active;
    if (!b || !this.flight) return;
    this.rig.attach(b.group);
    this.applyRigLocal(b, b.group);
    this.flight = null;
    this.setState('detail');
    this.emitPage(true);
  }

  close() {
    if (this.state !== 'detail') return false;
    const b = this.active;
    this.ptr = null;
    this.setState('toShelf');
    gsap.killTweensOf(this.cover);
    b.sheets?.forEach(s => gsap.killTweensOf(s));
    this.tween(this.orbitTarget, { yaw: 0, pitch: 0, duration: 0.6 });

    // An open book closes from the back: the unread half folds over the pages already read,
    // like closing a book you have finished. Then it turns round and goes home.
    if (!this.reduced && b.sheets && this.cover.angle > PI / 2) {
      this.cover.angle = PI;
      this.coverTarget = 0;
      const read = b.sheets.map(s => s.target > 0.5);
      b.sheets.forEach((s, k) => {
        s.target = 0;
        s.turn = read[k] ? 1 : 0;
        s.applied = -1;
      });
      b.flat = true;
      this.backClose = { psi: 0, read };
      this.tween(this.backClose, {
        psi: -PI,
        duration: 0.95,
        ease: 'power2.inOut',
        onComplete: () => this.flyHome(b, true)
      });
      return true;
    }

    // Otherwise just fold it shut on the way back.
    b.sheets?.forEach(s => {
      s.target = 0;
      this.tween(s, { turn: 0, duration: 0.5, ease: 'power2.inOut' });
    });
    this.coverTarget = 0;
    this.tween(this.cover, { angle: 0, duration: 0.7, delay: this.reduced ? 0 : 0.12, ease: 'power2.inOut' });
    this.flyHome(b, false);
    return true;
  }

  /** Detach the book at its exact pose and fly it back into its slot. */
  flyHome(b, unflip) {
    if (this.active !== b) return;
    b.group.updateWorldMatrix(true, false);
    this.scene.attach(b.group);
    if (this.backClose) {
      this.backClose = null;
      b.flat = false;
      this.cover.angle = 0;
      b.sheets?.forEach(s => {
        s.turn = 0;
        s.pin = null;
        s.applied = -1;
      });
    }
    const fromQ = b.group.quaternion.clone();
    this.flight = {
      book: b,
      to: 'slot',
      t: 0,
      unflip,
      from: { p: b.group.position.clone(), q: fromQ, s: b.group.scale.clone() },
      fromFront: unflip ? fromQ.clone().multiply(new THREE.Quaternion().setFromAxisAngle(this.v.yAxis, PI)) : null,
      dp: new THREE.Vector3(),
      dq: new THREE.Quaternion(),
      ds: new THREE.Vector3(1, 1, 1)
    };
    const lead = this.reduced || unflip ? 0 : 0.1;
    this.tween(this, { present: 0, duration: 1.05, delay: lead, ease: 'power2.inOut' });
    this.tween(this.flight, {
      t: 1,
      duration: unflip ? 1.3 : 1.15,
      delay: lead,
      ease: 'power3.inOut',
      onComplete: () => this.landOnShelf()
    });
  }

  landOnShelf() {
    const b = this.active;
    if (!b || !this.flight) return;
    const slot = this.slots[b.index];
    slot.attach(b.group);
    b.group.position.set(0, 0, 0);
    b.group.quaternion.identity();
    b.group.scale.set(1, 1, 1);
    b.shadow.material.opacity = 0.55;
    b.setCover(0);
    this.cover.angle = 0;
    b.releasePages();
    this.flight = null;
    this.active = null;
    this.glow.visible = false;
    this.setState('shelf');
  }

  setCoverOpen(open) {
    if (!this.active || this.state !== 'detail') return;
    this.coverTarget = open ? PI : 0;
    this.tween(this.cover, {
      angle: this.coverTarget,
      duration: 0.5 + 0.55 * Math.abs(this.coverTarget - this.cover.angle) / PI,
      ease: 'power3.inOut',
      overwrite: true
    });
  }

  crack(on) {
    if (!this.active || this.state !== 'detail' || this.reduced) return;
    if (this.coverTarget !== 0 && this.coverTarget !== CRACK) return;
    const to = on ? CRACK : 0;
    if (this.coverTarget === to) return;
    this.coverTarget = to;
    this.tween(this.cover, { angle: to, duration: on ? 0.55 : 0.45, ease: 'power2.out', overwrite: true });
  }

  turnSheet(s, to) {
    s.target = to;
    this.tween(s, {
      turn: to,
      duration: 0.35 + 0.65 * Math.abs(to - s.turn),
      ease: 'power2.inOut',
      overwrite: true
    });
  }

  nextPage() {
    const b = this.active;
    if (!b || this.state !== 'detail') return;
    if (this.coverTarget < PI / 2) {
      this.setCoverOpen(true);
      return;
    }
    const s = b.sheets.find(x => x.target < 0.5);
    if (s) this.turnSheet(s, 1);
    // Past the last page: close the book and put it back on the shelf
    else this.close();
  }

  /** Is this hit on the "Let's talk" line of the last page? */
  onLink(hit) {
    const b = this.active;
    if (!b || !hit || hit.book !== b || hit.part !== 'sheet' || !hit.back || !hit.uv || !b.pageLink) return false;
    const last = b.sheets?.[b.sheets.length - 1];
    if (!last || hit.sheet !== last.k || last.turn < 0.9) return false;
    // The reverse side is drawn mirrored, and canvas rows run top to bottom
    const u = 1 - hit.uv.x;
    const v = 1 - hit.uv.y;
    const r = b.pageLink;
    return u >= r.x0 && u <= r.x1 && v >= r.y0 && v <= r.y1;
  }

  prevPage() {
    const b = this.active;
    if (!b || this.state !== 'detail') return;
    if (this.coverTarget < PI / 2) return;
    const turned = b.sheets.filter(x => x.target > 0.5);
    const s = turned[turned.length - 1];
    if (s) this.turnSheet(s, 0);
    else this.setCoverOpen(false);
  }

  /** 0 = cover, 1 = title page, 2–3 = spreads, 4 = last page. */
  get page() {
    const b = this.active;
    if (!b || this.cover.angle < PI / 2) return 0;
    return 1 + b.spread;
  }

  emitPage(force = false) {
    const page = this.page;
    if (page !== this.lastPage || force) {
      this.lastPage = page;
      this.emit('page', { page, pages: 4 });
    }
  }

  resetView() {
    this.orbitTarget.yaw = 0;
    this.orbitTarget.pitch = 0;
    this.zoomTarget = 1;
    this.invalidate();
  }

  /* ---------- picking ---------- */

  pick(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    const { ndc } = this.v;
    ndc.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.camera);
    let targets = [];
    if (this.state === 'shelf') targets = this.shelfMeshes;
    else if (this.state === 'detail' && this.active) targets = this.active.pickables;
    const hit = this.raycaster.intersectObjects(targets, false)[0];
    if (!hit) return null;
    const book = hit.object.userData.book;
    const local = book.group.worldToLocal(hit.point.clone());
    return {
      book,
      part: hit.object.userData.part,
      sheet: hit.object.userData.sheet,
      left: local.x < -book.w / 2,
      uv: hit.uv,
      back: hit.object.material.side === THREE.BackSide
    };
  }

  /** On-screen width of one page of the book being read, for mapping drags to turns. */
  pageWidthPx() {
    const b = this.active;
    b.group.updateWorldMatrix(true, false);
    const { a, b: c } = this.v;
    a.set(-b.w / 2, b.h / 2, b.t / 2).applyMatrix4(b.group.matrixWorld).project(this.camera);
    c.set(b.w / 2, b.h / 2, b.t / 2).applyMatrix4(b.group.matrixWorld).project(this.camera);
    return Math.max(40, Math.abs(c.x - a.x) * 0.5 * this.size.cw);
  }

  /* ---------- pointer ---------- */

  onDown(e) {
    if (e.button !== 0 || !this.ready) return;
    if (this.state !== 'shelf' && this.state !== 'detail') return;
    const now = performance.now();
    this.ptr = {
      id: e.pointerId,
      x0: e.clientX,
      y0: e.clientY,
      lastX: e.clientX,
      lastT: now,
      t0: now,
      vx: 0,
      mode: null,
      hit: this.pick(e.clientX, e.clientY)
    };
    if (this.state === 'detail') {
      e.preventDefault();
      this.canvas.setPointerCapture?.(e.pointerId);
    }
  }

  onMove(e) {
    const p = this.ptr;
    if (!p || e.pointerId !== p.id) {
      if (e.pointerType === 'mouse') this.mouse = { x: e.clientX, y: e.clientY };
      if (e.pointerType === 'mouse' && !e.buttons) this.hoverAt(e);
      return;
    }
    const now = performance.now();
    const dtm = now - p.lastT;
    if (dtm > 0) {
      p.vx = 0.75 * ((e.clientX - p.lastX) / dtm) + 0.25 * p.vx;
      p.lastX = e.clientX;
      p.lastT = now;
    }
    if (e.pointerType === 'mouse') this.mouse = { x: e.clientX, y: e.clientY };
    const dx = e.clientX - p.x0;
    const dy = e.clientY - p.y0;
    if (!p.mode) {
      if (Math.hypot(dx, dy) < 6) return;
      p.mode = this.modeFor(p, dx, dy);
      if (!p.mode) {
        this.ptr = null;
        return;
      }
      this.beginDrag(p, e);
    }
    this.dragTo(p, dx, dy);
    this.invalidate();
  }

  modeFor(p, dx, dy) {
    if (this.state === 'shelf') return Math.abs(dx) > Math.abs(dy) ? 'shelf' : null;
    if (this.state !== 'detail') return null;
    const b = this.active;
    const h = p.hit;
    if (!h || h.book !== b) return 'orbit';
    if (this.coverTarget < PI / 2) return 'cover';
    if (h.left) return b.spread > 0 ? 'back' : 'uncover';
    return b.sheets.some(s => s.target < 0.5) ? 'forward' : 'orbit';
  }

  beginDrag(p, e) {
    this.canvas.setPointerCapture?.(e.pointerId);
    const b = this.active;
    switch (p.mode) {
      case 'shelf':
        gsap.killTweensOf(this, 'offset');
        p.offset0 = this.offset;
        p.perPx = (2 * this.camDist * this.tan) / this.size.ch;
        break;
      case 'cover':
      case 'uncover':
        gsap.killTweensOf(this.cover);
        p.angle0 = this.cover.angle;
        p.pageW = this.pageWidthPx();
        break;
      case 'forward':
        p.sheet = b.sheets.find(s => s.target < 0.5);
        gsap.killTweensOf(p.sheet);
        p.pageW = this.pageWidthPx();
        break;
      case 'back': {
        const turned = b.sheets.filter(s => s.target > 0.5);
        p.sheet = turned[turned.length - 1];
        gsap.killTweensOf(p.sheet);
        p.pageW = this.pageWidthPx();
        break;
      }
      case 'orbit':
        p.yaw0 = this.orbitTarget.yaw;
        p.pitch0 = this.orbitTarget.pitch;
        this.canvas.style.cursor = 'grabbing';
        break;
      default:
    }
  }

  dragTo(p, dx, dy) {
    switch (p.mode) {
      case 'shelf': {
        this.offset = clamp(p.offset0 - (dx * p.perPx) / SPACING, -0.35, this.N - 0.65);
        const near = clamp(Math.round(this.offset), 0, this.N - 1);
        if (near !== this.index) {
          this.index = near;
          this.emit('select', { index: near });
        }
        break;
      }
      case 'cover':
        this.cover.angle = clamp(p.angle0 - (dx / p.pageW) * PI * 0.9, 0, PI);
        break;
      case 'uncover':
        this.cover.angle = clamp(p.angle0 - (dx / p.pageW) * PI * 0.9, 0, PI);
        break;
      case 'forward':
        p.sheet.turn = clamp(-dx / (p.pageW * 1.6), 0, 1);
        break;
      case 'back':
        p.sheet.turn = clamp(1 - dx / (p.pageW * 1.6), 0, 1);
        break;
      case 'orbit':
        this.orbitTarget.yaw = clamp(p.yaw0 + dx * 0.006, -0.8, 0.8);
        this.orbitTarget.pitch = clamp(p.pitch0 + dy * 0.004, -0.38, 0.38);
        break;
      default:
    }
  }

  onUp(e) {
    const p = this.ptr;
    if (!p || e.pointerId !== p.id) return;
    this.ptr = null;
    if (this.canvas.hasPointerCapture?.(e.pointerId)) this.canvas.releasePointerCapture(e.pointerId);
    if (!p.mode) {
      if (performance.now() - p.t0 < 700) this.click(p.hit);
      return;
    }
    this.endDrag(p);
    if (e.pointerType === 'mouse') this.hoverAt(e);
  }

  onCancel(e) {
    const p = this.ptr;
    if (!p || e.pointerId !== p.id) return;
    this.ptr = null;
    if (p.mode) this.endDrag({ ...p, vx: 0 });
  }

  onLeave(e) {
    if (e.pointerType !== 'mouse' || this.ptr) return;
    this.mouse = null;
    this.hoverTarget = -1;
    this.crack(false);
    this.canvas.style.cursor = '';
  }

  endDrag(p) {
    const v = p.vx; // px per ms, positive to the right
    switch (p.mode) {
      case 'shelf': {
        const throwBy = (-v * 260 * p.perPx) / SPACING;
        this.select(this.offset + clamp(throwBy, -2.5, 2.5));
        break;
      }
      case 'cover': {
        const open = v < -0.3 || (v <= 0.3 && this.cover.angle > PI * 0.35);
        this.setCoverOpen(open);
        break;
      }
      case 'uncover': {
        const shut = v > 0.3 || (v >= -0.3 && this.cover.angle < PI * 0.65);
        this.setCoverOpen(!shut);
        break;
      }
      case 'forward':
        this.turnSheet(p.sheet, v < -0.3 || (v <= 0.3 && p.sheet.turn > 0.42) ? 1 : 0);
        break;
      case 'back':
        this.turnSheet(p.sheet, v > 0.3 || (v >= -0.3 && p.sheet.turn < 0.58) ? 0 : 1);
        break;
      case 'orbit':
        this.canvas.style.cursor = 'grab';
        break;
      default:
    }
    this.invalidate();
  }

  click(hit) {
    if (this.state === 'shelf') {
      if (hit?.book) this.emit('request-open', { index: hit.book.index });
      return;
    }
    if (this.state !== 'detail' || !hit || hit.book !== this.active) return;
    if (this.onLink(hit)) {
      this.emit('link', { href: 'mailto' });
      return;
    }
    if (this.coverTarget < PI / 2) this.setCoverOpen(true);
    else if (hit.left) this.prevPage();
    else this.nextPage();
  }

  hoverAt(e) {
    if (!this.ready) return;
    const hit = this.state === 'shelf' || this.state === 'detail' ? this.pick(e.clientX, e.clientY) : null;
    if (this.state === 'shelf') {
      const i = hit ? hit.book.index : -1;
      if (i !== this.hoverTarget) {
        this.hoverTarget = i;
        this.emit('hover', { index: i });
        this.invalidate();
      }
      this.canvas.style.cursor = hit ? 'pointer' : '';
    } else if (this.state === 'detail') {
      const onBook = hit && hit.book === this.active;
      this.canvas.style.cursor = onBook ? 'pointer' : 'grab';
      this.canvas.title = this.onLink(hit) ? 'Email Devang' : '';
      this.crack(onBook && this.coverTarget < PI / 2);
    }
  }

  onWheel(e) {
    if (this.state === 'detail') {
      // Zoom only when the wheel is over the book itself, never over the reading panel.
      if (e.target !== this.canvas) return;
      e.preventDefault();
      e.stopPropagation();
      this.zoomTarget = clamp(this.zoomTarget * Math.exp(-e.deltaY * 0.0015), 0.85, 1.45);
      this.invalidate();
      return;
    }
    if (this.state !== 'shelf' || !this.ready) return;

    const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? this.size.cw : 1;
    const dx = e.deltaX * unit;
    const dy = e.deltaY * unit;
    const now = performance.now();

    // Each trackpad gesture (including its momentum) picks one axis when it starts:
    // sideways moves the shelf, up and down keeps scrolling the page.
    if (now - this.wheelAt > 260) this.wheelAxis = null;
    this.wheelAt = now;
    if (!this.wheelAxis) {
      if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return;
      this.wheelAxis = Math.abs(dx) > Math.abs(dy) * 0.75 ? 'x' : 'y';
      if (this.wheelAxis === 'x') {
        gsap.killTweensOf(this, 'offset');
        this.wheelStart = this.offset;
      }
    }
    if (this.wheelAxis !== 'x') return;
    this.mouse = { x: e.clientX, y: e.clientY };
    e.preventDefault();
    e.stopPropagation();

    // The shelf follows the fingers one to one, like dragging it.
    const perPx = (2 * this.camDist * this.tan) / this.size.ch;
    this.offset = clamp(this.offset + (dx * perPx * 1.15) / SPACING, -0.3, this.N - 0.7);
    const near = clamp(Math.round(this.offset), 0, this.N - 1);
    if (near !== this.index) {
      this.index = near;
      this.emit('select', { index: near });
    }
    this.invalidate();

    // When the gesture stops, settle on a book. A short flick still moves one book.
    clearTimeout(this.wheelSettle);
    this.wheelSettle = setTimeout(() => {
      this.wheelAxis = null;
      if (this.state !== 'shelf') return;
      const moved = this.offset - this.wheelStart;
      const target =
        Math.abs(moved) > 0.15 && Math.abs(moved) < 0.5 ? Math.round(this.wheelStart) + Math.sign(moved) : this.offset;
      this.select(target);
    }, 220);
  }

  /* ---------- teardown ---------- */

  dispose() {
    this.disposed = true;
    gsap.ticker.remove(this.tick);
    gsap.killTweensOf([this, this.cover, this.orbitTarget]);
    if (this.flight) gsap.killTweensOf(this.flight);
    if (this.backClose) gsap.killTweensOf(this.backClose);
    this.books.forEach(b => {
      if (!b) return;
      b.sheets?.forEach(s => gsap.killTweensOf(s));
      b.dispose();
    });
    const c = this.canvas;
    c.removeEventListener('pointerdown', this.onDown);
    c.removeEventListener('pointermove', this.onMove);
    c.removeEventListener('pointerup', this.onUp);
    c.removeEventListener('pointercancel', this.onCancel);
    c.removeEventListener('pointerleave', this.onLeave);
    this.wheelEl?.removeEventListener('wheel', this.onWheel);
    clearTimeout(this.wheelSettle);
    c.removeEventListener('webglcontextlost', this.onLost);
    this.ro?.disconnect();
    this.io?.disconnect();
    // set-up may have stopped part way (the section left before it finished), so each piece is optional
    this.statics?.forEach(x => x.dispose());
    [this.scrim, this.glow].forEach(m => {
      if (!m) return;
      m.geometry.dispose();
      m.material.dispose();
    });
    const sh = this.shared;
    [sh?.clothNormal, sh?.edgeV, sh?.edgeH, sh?.paper, sh?.shadow, this.glowTex].forEach(t => t?.dispose());
    this.envRT?.dispose();
    this.spot?.shadow.map?.dispose();
    this.renderer.dispose();
  }
}
