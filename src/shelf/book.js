import * as THREE from 'three';
import {
  ORM_CLOTH,
  PAPER,
  clothNormalCanvas,
  drawBack,
  drawCover,
  drawEndpaper,
  drawPages,
  drawSpine,
  makeCanvas,
  mix,
  pageEdgeCanvas,
  paperCanvas,
  shadowCanvas
} from './art.js';

/*
 * A clothbound hardcover built from parts: back board, spine, page block, headbands, a front
 * board on a hinge and, only while the book is being read, three sheets of paper that bend
 * as they turn.
 *
 * Local frame: x across the cover (spine at -w/2), y up from the bottom edge, z out of the
 * front cover. The group's origin is the bottom centre of the closed book.
 */

export const BOARD = 0.012;
const OVER = 0.008; // the boards overhang the page block at the fore-edge
const SHEETS = 3;
const SEG = 24;
export const GAP = 0.0004; // between stacked sheets
const BLOCK_GAP = 0.0016; // between the page block and the front board

function solid(color) {
  const c = makeCanvas(2, 2);
  const g = c.getContext('2d');
  g.fillStyle = color;
  g.fillRect(0, 0, 2, 2);
  return c;
}

export function sharedTextures(renderer, { quality = 1 } = {}) {
  const aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const tex = (canvas, { srgb = true, repeat } = {}) => {
    const t = new THREE.CanvasTexture(canvas);
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = aniso;
    if (repeat) {
      t.wrapS = THREE.RepeatWrapping;
      t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(repeat[0], repeat[1]);
    }
    return t;
  };
  return {
    quality,
    tex,
    clothNormal: tex(clothNormalCanvas(), { srgb: false, repeat: [18, 26] }),
    edgeV: tex(pageEdgeCanvas(true)),
    edgeH: tex(pageEdgeCanvas(false)),
    paper: tex(paperCanvas()),
    shadow: tex(shadowCanvas())
  };
}

const smooth = t => t * t * (3 - 2 * t);

/* Foil is pressed flat: where the roughness/metalness map marks foil, ignore the cloth weave. */
function flattenFoil(shader) {
  shader.fragmentShader = shader.fragmentShader.replace(
    '#include <normal_fragment_maps>',
    '#include <normal_fragment_maps>\n\tnormal = normalize( mix( normal, nonPerturbedNormal, clamp( metalnessFactor * 1.8, 0.0, 1.0 ) ) );'
  );
}

export class Book {
  constructor(vol, index, total, shared) {
    this.vol = vol;
    this.index = index;
    this.total = total;
    this.shared = shared;
    const { w, h, t } = vol.size;
    this.w = w;
    this.h = h;
    this.t = t;
    this.owned = [];
    this.textures = [];
    this.detailArt = false;
    this.sheets = null;
    this.coverAngle = 0;

    const q = shared.quality;
    const cloth = vol.binding.cloth;
    const normalScale = new THREE.Vector2(0.3, 0.3);

    // Materials: plain cloth, printed cloth (colour + roughness/metalness for the foil), paper.
    this.clothMat = this.own(
      new THREE.MeshStandardMaterial({
        color: cloth,
        roughness: 0.86,
        metalness: 0,
        normalMap: shared.clothNormal,
        normalScale
      })
    );
    const printed = (color, orm) => {
      const m = new THREE.MeshStandardMaterial({
        map: color,
        roughnessMap: orm,
        metalnessMap: orm,
        roughness: 1,
        metalness: 1,
        normalMap: shared.clothNormal,
        normalScale
      });
      m.onBeforeCompile = flattenFoil;
      return this.own(m);
    };

    const cover = drawCover(vol, index, total, Math.round(768 * q));
    const spine = drawSpine(vol, index, Math.round(1024 * q));
    const coverMat = printed(this.tex(cover.color), this.tex(cover.orm, false));
    const spineMat = printed(this.tex(spine.color), this.tex(spine.orm, false));

    // The back cover and endpapers are only seen up close; they are drawn on first reading.
    this.backMat = printed(this.tex(solid(cloth)), this.tex(solid(ORM_CLOTH), false));
    this.endMat = this.own(
      new THREE.MeshStandardMaterial({ map: this.tex(solid(mix(PAPER, cloth, 0.08))), roughness: 0.92 })
    );

    const edgeV = this.own(new THREE.MeshStandardMaterial({ map: shared.edgeV, roughness: 0.95 }));
    const edgeH = this.own(new THREE.MeshStandardMaterial({ map: shared.edgeH, roughness: 0.95 }));
    this.paperMat = this.own(new THREE.MeshStandardMaterial({ map: shared.paper, roughness: 0.95 }));
    const band = this.own(
      new THREE.MeshStandardMaterial({ color: vol.binding.foil, roughness: 0.55, metalness: 0.2 })
    );

    this.group = new THREE.Group();
    this.group.name = `book-${vol.id}`;

    const boardGeo = this.own(new THREE.BoxGeometry(w + OVER, h, BOARD));
    const C = this.clothMat;

    // Back board: inside face gets the endpaper, outside the back cover.
    const backBoard = new THREE.Mesh(boardGeo, [C, C, C, C, this.endMat, this.backMat]);
    backBoard.position.set(OVER / 2, h / 2, -t / 2 + BOARD / 2);

    // Spine: its outer (-x) face carries the title.
    const spineMesh = new THREE.Mesh(this.own(new THREE.BoxGeometry(BOARD, h, t)), [C, spineMat, C, C, C, C]);
    spineMesh.position.set(-w / 2 - BOARD / 2, h / 2, 0);

    // Page block, inset from the boards.
    const bh = h - 0.022;
    const bw = w - 0.004;
    this.blockFront = t / 2 - BOARD - BLOCK_GAP;
    const blockDepth = this.blockFront - (-t / 2 + BOARD);
    const block = new THREE.Mesh(this.own(new THREE.BoxGeometry(bw, bh, blockDepth)), [
      edgeV,
      C,
      edgeH,
      edgeH,
      this.paperMat,
      this.paperMat
    ]);
    block.position.set(-w / 2 + bw / 2, h / 2, (this.blockFront + (-t / 2 + BOARD)) / 2);

    // Headbands at the top and bottom of the spine edge of the block.
    const bandGeo = this.own(new THREE.BoxGeometry(0.014, 0.006, blockDepth * 0.96));
    const bands = [h - 0.011 + 0.002, 0.011 - 0.002].map(y => {
      const m = new THREE.Mesh(bandGeo, band);
      m.position.set(-w / 2 + 0.007, y, block.position.z);
      return m;
    });

    // Front board on a hinge along the spine.
    this.hinge = new THREE.Group();
    this.hinge.position.set(-w / 2, 0, t / 2 - BOARD / 2);
    const front = new THREE.Mesh(boardGeo, [C, C, C, C, coverMat, this.endMat]);
    front.position.set((w + OVER) / 2, h / 2, 0);
    this.hinge.add(front);

    // Soft contact shadow on whatever the book stands on.
    this.shadow = new THREE.Mesh(
      this.own(new THREE.PlaneGeometry(w * 1.5, t + 0.26)),
      this.own(new THREE.MeshBasicMaterial({ map: shared.shadow, transparent: true, depthWrite: false, opacity: 0.55 }))
    );
    this.shadow.rotation.x = -Math.PI / 2;
    this.shadow.position.set(0.015, 0.0015, 0.02);
    this.shadow.renderOrder = -1;

    [backBoard, spineMesh, block, front].forEach(m => {
      m.castShadow = true;
      m.receiveShadow = true;
    });
    backBoard.userData.part = 'back';
    spineMesh.userData.part = 'spine';
    block.userData.part = 'block';
    front.userData.part = 'cover';

    this.group.add(backBoard, spineMesh, block, ...bands, this.hinge, this.shadow);
    this.front = front;
    this.hitMeshes = [backBoard, spineMesh, block, front];
    this.hitMeshes.forEach(m => {
      m.userData.book = this;
    });
  }

  own(x) {
    this.owned.push(x);
    return x;
  }

  tex(canvas, srgb = true) {
    const t = this.own(this.shared.tex(canvas, { srgb }));
    this.textures.push(t);
    return t;
  }

  /** Swaps a placeholder texture for real artwork without recompiling the material. */
  swap(material, keys, texture) {
    const old = material[keys[0]];
    keys.forEach(k => {
      material[k] = texture;
    });
    if (old && old !== texture) {
      old.dispose();
      this.owned = this.owned.filter(o => o !== old);
      this.textures = this.textures.filter(o => o !== old);
    }
  }

  /** Back cover and endpapers, drawn the first time the book is taken off the shelf. */
  ensureDetailArt() {
    if (this.detailArt) return;
    this.detailArt = true;
    const q = this.shared.quality;
    const back = drawBack(this.vol, Math.round(512 * q));
    this.swap(this.backMat, ['map'], this.tex(back.color));
    this.swap(this.backMat, ['roughnessMap', 'metalnessMap'], this.tex(back.orm, false));
    this.swap(this.endMat, ['map'], this.tex(drawEndpaper(this.vol, Math.round(512 * q))));
  }

  /** 0 = closed, π = fully open (the board swings out to the left). */
  setCover(angle) {
    if (angle === this.coverAngle) return;
    this.coverAngle = angle;
    this.hinge.rotation.y = -angle;
  }

  /** Builds the turnable sheets and their printed pages. Released again on the way back to the shelf. */
  ensurePages() {
    if (this.sheets) return;
    // Pages are drawn large so their type stays crisp when the book is opened up close
    const width = Math.round(1280 * this.shared.quality);
    const canvases = drawPages(this.vol, this.index, this.total, width);
    this.pageLink = canvases.link;
    const pw = this.w - 0.012;
    const ph = this.h - 0.03;
    this.pw = pw;
    this.pageOwned = [];
    this.pageTextures = [];
    this.sheets = [];
    for (let k = 0; k < SHEETS; k++) {
      const geo = new THREE.PlaneGeometry(pw, ph, SEG, 1);
      geo.translate(pw / 2, ph / 2, 0);
      const make = c => {
        const tx = this.shared.tex(c);
        this.pageTextures.push(tx);
        return tx;
      };
      const frontTex = make(canvases[k * 2]);
      const backTex = make(canvases[k * 2 + 1]);
      // The reverse side is seen from behind; flip it so its text reads the right way round.
      backTex.repeat.x = -1;
      backTex.offset.x = 1;
      backTex.wrapS = THREE.RepeatWrapping;
      const fm = new THREE.MeshStandardMaterial({ map: frontTex, roughness: 0.95, side: THREE.FrontSide });
      const bm = new THREE.MeshStandardMaterial({ map: backTex, roughness: 0.95, side: THREE.BackSide });
      const pivot = new THREE.Group();
      const a = new THREE.Mesh(geo, fm);
      const b = new THREE.Mesh(geo, bm);
      [a, b].forEach(m => {
        m.userData.book = this;
        m.userData.part = 'sheet';
        m.userData.sheet = k;
      });
      pivot.add(a, b);
      pivot.position.set(-this.w / 2 + 0.003, (this.h - ph) / 2, this.blockFront);
      pivot.visible = false;
      this.group.add(pivot);
      this.pageOwned.push(geo, frontTex, backTex, fm, bm);
      this.sheets.push({ pivot, geo, meshes: [a, b], turn: 0, target: 0, applied: -1, k });
    }
    this.layoutSheets();
  }

  releasePages() {
    if (!this.sheets) return;
    this.sheets.forEach(s => this.group.remove(s.pivot));
    this.pageOwned.forEach(o => o.dispose());
    this.sheets = null;
    this.pageOwned = [];
    this.pageTextures = [];
  }

  /** Meshes that can be clicked or dragged: the book itself plus any visible sheets. */
  get pickables() {
    if (!this.sheets) return this.hitMeshes;
    return this.hitMeshes.concat(...this.sheets.filter(s => s.pivot.visible).map(s => s.meshes));
  }

  /** Bends each sheet along a gentle curve while it turns, and stacks the sheets on either side. */
  layoutSheets() {
    if (!this.sheets) return;
    const n = this.sheets.length;
    const right = this.blockFront;
    const left = this.t / 2;
    const show = this.coverAngle > 0.02;
    this.sheets.forEach(s => {
      const zRight = right + (n - s.k) * GAP;
      const zLeft = left + (s.k + 1) * GAP;
      if (s.pin) {
        // Held in place while the book closes around it
        s.pivot.position.x = s.pin.x;
        s.pivot.position.z = s.pin.z;
      } else {
        s.pivot.position.x = -this.w / 2 + 0.003;
        s.pivot.position.z = zRight + (zLeft - zRight) * smooth(s.turn);
      }
      s.pivot.visible = show;
      if (Math.abs(s.applied - s.turn) < 1e-5) return;
      s.applied = s.turn;
      const theta = s.turn * Math.PI;
      const lift = Math.sin(theta);
      const pos = s.geo.attributes.position;
      const step = this.pw / SEG;
      let x = 0;
      let z = 0;
      const xs = [0];
      const zs = [0];
      for (let j = 1; j <= SEG; j++) {
        const u = (j - 0.5) / SEG;
        const bend = this.flat ? 0 : 0.95 * lift;
        const phi = Math.min(Math.PI, Math.max(0, theta + bend * (u - 0.35)));
        x += Math.cos(phi) * step;
        z += Math.sin(phi) * step;
        xs.push(x);
        zs.push(z);
      }
      for (let row = 0; row < 2; row++) {
        for (let j = 0; j <= SEG; j++) {
          const i = row * (SEG + 1) + j;
          pos.setX(i, xs[j]);
          pos.setZ(i, zs[j]);
        }
      }
      pos.needsUpdate = true;
      s.geo.computeVertexNormals();
      s.geo.computeBoundingSphere();
    });
  }

  /** Sheets turned over (0..3): which spread is showing once the cover is open. */
  get spread() {
    return this.sheets ? this.sheets.filter(s => s.turn > 0.5).length : 0;
  }

  dispose() {
    this.releasePages();
    this.owned.forEach(d => d.dispose?.());
    this.owned = [];
    this.textures = [];
  }
}
