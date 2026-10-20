// The atlas: one surface that is either a lit, varnished paper globe or a flat
// map. Every layer carries two positions per vertex — on the sphere and on
// the plane — and a single factor `flat` blends between them, so switching
// views unrolls the globe instead of cutting to a different picture.
//
// Coordinates: sphere of radius 1 (toVec); the plane faces +x with north = +y
// and east = −z, in radians (toFlat). No political borders are drawn.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { geoEquirectangular, geoPath, geoGraticule10, geoInterpolate, geoDistance } from 'd3-geo';
import { feature, mesh } from 'topojson-client';
import landAtlas from 'world-atlas/land-50m.json';
import { toVec, toFlat, toLatLon } from './data.js';
import { INK, ACCENT } from './palette.js';
import { THEME } from './theme.js';

const OCEAN = THEME.ocean;
const LAND = THEME.land;
const HOME_DIST = 4.8;
const MIN_DIST = 1.2;
const MAX_DIST = 7;
const LAT_LIMIT = (82 * Math.PI) / 180;
// how fast a drag turns the globe from the home distance, relative to the hand
// (1: the ground under the pointer stays under it); close up it is always 1
const GRAB_FAR = 1.6;

const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const clamp = THREE.MathUtils.clamp;
const landFeature = feature(landAtlas, landAtlas.objects.land);

// How much this device can draw, decided once:
//   low    no graphics acceleration (WebGL in software, e.g. a browser with
//          hardware acceleration turned off or its GPU blocklisted): a plain
//          material, small textures, one pixel per CSS pixel, no antialiasing,
//          no idle spinning, and while nothing moves only a few frames a second
//   small  a phone or tablet, or a device with little memory: smaller textures
//          (iOS also refuses canvases over 16.7 million pixels)
//   full   everything else
// ?gfx=low|small|full overrides it (for testing).
export const GFX = (() => {
  const forced = new URLSearchParams(location.search).get('gfx');
  if (['low', 'small', 'full'].includes(forced)) return forced;
  const probe = document.createElement('canvas').getContext('webgl2', { failIfMajorPerformanceCaveat: true });
  let soft = !probe;
  if (probe) {
    const info = probe.getExtension('WEBGL_debug_renderer_info');
    soft = /swiftshader|llvmpipe|softpipe|basic render|software|warp/i.test(info ? probe.getParameter(info.UNMASKED_RENDERER_WEBGL) : '');
    probe.getExtension('WEBGL_lose_context')?.loseContext();
  }
  if (soft) return 'low';
  const memory = navigator.deviceMemory ?? 8;
  const touch = matchMedia('(pointer: coarse)').matches;
  return touch || Math.min(screen.width, screen.height) < 700 || memory <= 4 ? 'small' : 'full';
})();
const TINY_MEMORY = (navigator.deviceMemory ?? 8) <= 2;

// a texture drawn once on a canvas: after it is on the GPU the canvas is let
// go, which on a phone frees as much memory as the texture itself
function canvasTexture(canvas, colorSpace) {
  const tex = new THREE.CanvasTexture(canvas);
  if (colorSpace) tex.colorSpace = colorSpace;
  tex.onUpdate = () => {
    canvas.width = canvas.height = 1;
  };
  return tex;
}

function paperNoise(size = 256) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(size, size);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.random() * 255;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

function equirect(W) {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = W / 2;
  const ctx = canvas.getContext('2d');
  const path = geoPath(geoEquirectangular().scale(W / (2 * Math.PI)).translate([W / 2, W / 4]), ctx);
  return { canvas, ctx, path };
}

function drawMap(W) {
  const { canvas, ctx, path } = equirect(W);
  const H = W / 2;
  const k = W / 4096;
  const coast = mesh(landAtlas, landAtlas.objects.land);
  ctx.fillStyle = OCEAN;
  ctx.fillRect(0, 0, W, H);
  // engraved-map shallows: soft concentric strokes hugging the coast
  ctx.lineJoin = 'round';
  for (const [w, a] of [[34, 0.035], [20, 0.05], [10, 0.07]]) {
    ctx.beginPath();
    path(coast);
    ctx.lineWidth = w * k;
    ctx.strokeStyle = `rgba(${THEME.shallow}, ${a * THEME.shallowAlpha})`;
    ctx.stroke();
  }
  ctx.beginPath();
  path(geoGraticule10());
  ctx.lineWidth = 1.1 * k;
  ctx.strokeStyle = THEME.graticule;
  ctx.stroke();
  ctx.beginPath();
  path(landFeature);
  ctx.fillStyle = LAND;
  ctx.fill();
  // paper grain, only on land
  ctx.save();
  ctx.beginPath();
  path(landFeature);
  ctx.clip();
  ctx.globalAlpha = THEME.grain;
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = ctx.createPattern(paperNoise(), 'repeat');
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
  ctx.beginPath();
  path(coast);
  ctx.lineWidth = 1.6 * k;
  ctx.strokeStyle = THEME.coast;
  ctx.stroke();
  return canvas;
}

function drawBump(W) {
  const { canvas, ctx, path } = equirect(W);
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, W / 2);
  ctx.filter = `blur(${W / 1400}px)`;
  ctx.beginPath();
  path(landFeature);
  ctx.fillStyle = '#fff';
  ctx.fill();
  return canvas;
}

// family colours per pixel (built offline), clipped to land here
function drawRegions(image, W) {
  const { canvas, ctx, path } = equirect(W);
  ctx.save();
  ctx.beginPath();
  path(landFeature);
  ctx.clip();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(image, 0, 0, W, W / 2);
  ctx.restore();
  return canvas;
}

// a sphere whose morph target is the flat map, sharing UVs with the texture
function morphingSphere(coarse) {
  const geo = coarse ? new THREE.SphereGeometry(1, 128, 80) : new THREE.SphereGeometry(1, 192, 128);
  const uv = geo.getAttribute('uv');
  const flat = new Float32Array(uv.count * 3);
  const normal = new Float32Array(uv.count * 3);
  for (let i = 0; i < uv.count; i++) {
    const lon = uv.getX(i) * 360 - 180;
    const lat = (uv.getY(i) - 0.5) * 180;
    flat.set(toFlat(lat, lon), i * 3);
    normal.set([1, 0, 0], i * 3);
  }
  geo.morphAttributes.position = [new THREE.Float32BufferAttribute(flat, 3)];
  geo.morphAttributes.normal = [new THREE.Float32BufferAttribute(normal, 3)];
  return geo;
}

const dotVertex = /* glsl */ `
  attribute vec3 aCenter;
  attribute vec3 aFlat;
  attribute float aSize;
  attribute vec3 aColor;
  attribute float aState;   // 0 normal · 1 dimmed · 2 highlighted · 3 hidden
  attribute float aShape;   // 0 disc · 1 hollow (extinct) · 2 diamond (sign language)
  #ifdef MERGED
  attribute float aIndex;
  #endif
  uniform float uScale;
  uniform float uHover;
  uniform float uFlat;
  varying vec2 vUv;
  varying vec3 vColor;
  varying float vState;
  varying float vShape;
  void main() {
    vec3 n = normalize(aCenter);
    // on the globe, a dot past the horizon is hidden by the sphere: drop it here,
    // before any of its pixels are shaded (the discard below defeats early depth tests)
    if (uFlat < 0.001 && dot(n, cameraPosition) < 0.99) {
      gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
      return;
    }
    vec3 up = abs(n.y) > 0.99 ? vec3(1.0, 0.0, 0.0) : vec3(0.0, 1.0, 0.0);
    vec3 t = normalize(mix(normalize(cross(up, n)), vec3(0.0, 0.0, -1.0), uFlat));
    vec3 nn = normalize(mix(n, vec3(1.0, 0.0, 0.0), uFlat));
    vec3 b = normalize(cross(nn, t));
    float grow = aState > 1.5 ? 1.45 : (aState > 0.5 ? 0.8 : 1.0);
    #ifdef MERGED
    float id = aIndex;
    #else
    float id = float(gl_InstanceID);
    #endif
    if (abs(id - uHover) < 0.5) grow = 2.0;
    float s = aState > 2.5 ? 0.0 : aSize * uScale * grow;
    float lift = 0.0012 + (aState > 1.5 ? 0.0008 : 0.0);
    vec3 base = mix(n * (1.0 + lift), aFlat + vec3(lift, 0.0, 0.0), uFlat);
    vec3 p = base + (t * position.x + b * position.y) * s;
    vUv = position.xy;
    vColor = aColor;
    vState = aState;
    vShape = aShape;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;

const dotFragment = /* glsl */ `
  uniform vec3 uPaper;
  uniform vec3 uLand;
  varying vec2 vUv;
  varying vec3 vColor;
  varying float vState;
  varying float vShape;
  void main() {
    float r = vShape > 1.5 ? (abs(vUv.x) + abs(vUv.y)) * 0.86 : length(vUv);
    float aa = fwidth(r) * 1.2;
    float alpha = 1.0 - smoothstep(1.0 - aa, 1.0, r);
    if (alpha < 0.01) discard;
    // a thin paper ring keeps overlapping dots legible
    vec3 col = mix(vColor, uPaper, smoothstep(0.70 - aa, 0.70, r));
    if (vShape > 0.5 && vShape < 1.5) col = mix(uPaper, col, smoothstep(0.34 - aa, 0.34, r));
    if (vState > 0.5 && vState < 1.5) {
      col = mix(uLand, col, 0.22);
      alpha *= 0.55;
    }
    gl_FragColor = vec4(col, alpha);
    #include <colorspace_fragment>
  }
`;

const lineVertex = /* glsl */ `
  attribute vec3 aFlat;
  attribute vec3 aColor;
  attribute float aAlpha;
  attribute float aWrap;
  uniform float uFlat;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    vec3 p = mix(position, aFlat + vec3(0.0016, 0.0, 0.0), uFlat);
    vColor = aColor;
    // segments that cross the date line cannot be drawn on the plane
    vAlpha = aAlpha * (aWrap > 0.5 ? 1.0 - smoothstep(0.0, 0.25, uFlat) : 1.0);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;

const lineFragment = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    if (vAlpha < 0.005) discard;
    gl_FragColor = vec4(vColor, vAlpha);
    #include <colorspace_fragment>
  }
`;

// destination point at angular distance d (radians) and bearing b from (lat, lon)
function destination(lat, lon, d, b) {
  const φ1 = (lat * Math.PI) / 180;
  const λ1 = (lon * Math.PI) / 180;
  const φ2 = Math.asin(Math.sin(φ1) * Math.cos(d) + Math.cos(φ1) * Math.sin(d) * Math.cos(b));
  const λ2 = λ1 + Math.atan2(Math.sin(b) * Math.sin(d) * Math.cos(φ1), Math.cos(d) - Math.sin(φ1) * Math.sin(φ2));
  return [(φ2 * 180) / Math.PI, (λ2 * 180) / Math.PI];
}

export class Globe {
  constructor(container, data, { onHover, onPick, onMove, onMode } = {}) {
    this.data = data;
    this.onHover = onHover;
    this.onPick = onPick;
    this.onMove = onMove;
    this.onMode = onMode;
    this.container = container;
    this.offset = { x: 0, y: 0 };
    this.flat = 0;
    this.mode = '3d';
    this.flight = null;
    this.morph = null;
    this.hoverIdx = -1;
    this.fat = { story: [], links: [], ring: [] };
    this.specs = { story: [], links: [], ring: [] };
    this.lastInteraction = performance.now();
    this.drawnAt = 0;

    const low = GFX === 'low';
    const renderer = new THREE.WebGLRenderer({ antialias: !low, alpha: true });
    renderer.setPixelRatio(low ? 0.75 : Math.min(window.devicePixelRatio, TINY_MEMORY ? 1.5 : 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NeutralToneMapping;
    renderer.toneMappingExposure = THEME.exposure;
    container.appendChild(renderer.domElement);
    this.renderer = renderer;

    const scene = new THREE.Scene();
    this.scene = scene;
    // the varnish reflects a soft room; without acceleration there is no varnish
    this.environment = () => {
      if (low) return;
      scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
      scene.environmentIntensity = 0.35;
    };
    this.environment();

    const camera = new THREE.PerspectiveCamera(30, 1, 0.01, 100);
    scene.add(camera);
    this.camera = camera;
    // lights ride with the camera so the lit face is always the one you look at
    const key = new THREE.DirectionalLight(...THEME.key);
    key.position.set(-2.2, 2.4, 1.6);
    camera.add(key);
    const fill = new THREE.DirectionalLight(...THEME.fill);
    fill.position.set(2.5, -1, 1);
    camera.add(fill);
    scene.add(new THREE.HemisphereLight(...THEME.hemi));
    // a soft atmosphere behind the sphere (dark theme), when there is power to spare
    if (THEME.halo && !low) {
      const c = document.createElement('canvas');
      c.width = c.height = 256;
      const g = c.getContext('2d');
      const grad = g.createRadialGradient(128, 128, 0, 128, 128, 128);
      const fade = (k) => THEME.halo.replace(/[\d.]+\)$/, (a) => `${parseFloat(a) * k})`);
      grad.addColorStop(0.6, fade(1));
      grad.addColorStop(0.7, fade(0.55));
      grad.addColorStop(0.82, fade(0.18));
      grad.addColorStop(1, fade(0));
      g.fillStyle = grad;
      g.fillRect(0, 0, 256, 256);
      this.halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), depthWrite: false, transparent: true }));
      this.halo.scale.set(3, 3, 1);
      this.halo.renderOrder = -1;
      scene.add(this.halo);
    }

    // texture widths (the map is twice as wide as it is tall)
    const maxTex = renderer.capabilities.maxTextureSize;
    this.texSize = Math.min(maxTex, low || TINY_MEMORY ? 2048 : GFX === 'small' || window.devicePixelRatio < 1.5 ? 4096 : 8192);
    this.bumpSize = Math.min(maxTex, GFX === 'full' ? 4096 : 2048);
    this.regionSize = Math.min(maxTex, GFX === 'full' ? 4096 : 2048);
    const mapTexture = canvasTexture(drawMap(this.texSize), THREE.SRGBColorSpace);
    mapTexture.anisotropy = low ? 1 : renderer.capabilities.getMaxAnisotropy();
    const geo = morphingSphere(low);
    this.sphere = new THREE.Mesh(geo, low
      ? new THREE.MeshLambertMaterial({ map: mapTexture })
      : new THREE.MeshPhysicalMaterial({
        map: mapTexture,
        bumpMap: canvasTexture(drawBump(this.bumpSize)),
        bumpScale: 1.4,
        roughness: 0.82,
        clearcoat: THEME.clearcoat ?? 0.32,
        clearcoatRoughness: 0.42,
      }));
    this.bindContextLoss();
    this.sphere.morphTargetInfluences = [0];
    scene.add(this.sphere);

    // family areas: a transparent skin over the same morphing geometry
    this.regions = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({
      transparent: true, opacity: 0.62, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
    }));
    this.regions.morphTargetInfluences = [0];
    this.regions.renderOrder = 1;
    this.regions.visible = false;
    scene.add(this.regions);

    this.buildDots();
    this.lineage = null;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.zoomSpeed = 0.7;
    controls.autoRotateSpeed = 0.35;
    controls.addEventListener('start', () => {
      this.flight = null;
      controls.autoRotate = false;
      this.lastInteraction = performance.now();
      this.onMove?.('start');
    });
    this.controls = controls;

    this.raycaster = new THREE.Raycaster();
    this.pointer = null;
    this.bindPointer();
    this.resize();
    controls.autoRotate = GFX !== 'low';
    camera.position.set(...toVec(18, 12).map((c) => c * this.homeDist));
    // projection is used before the first frame (labels, picking): set the matrices now
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld();
    window.addEventListener('resize', () => this.resize());
    renderer.setAnimationLoop(() => this.tick());
  }

  // A phone that runs out of graphics memory loses the WebGL context, and the
  // browser then paints the canvas white. Hide it, and when the context comes
  // back redraw the textures at half the size (their canvases were let go).
  bindContextLoss() {
    const canvas = this.renderer.domElement;
    canvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      canvas.style.visibility = 'hidden';
    });
    canvas.addEventListener('webglcontextrestored', () => {
      const m = this.sphere.material;
      this.texSize = Math.max(1024, this.texSize / 2);
      this.bumpSize = Math.max(1024, this.bumpSize / 2);
      this.regionSize = Math.max(1024, this.regionSize / 2);
      m.map.image = drawMap(this.texSize);
      m.map.needsUpdate = true;
      if (m.bumpMap) {
        m.bumpMap.image = drawBump(this.bumpSize);
        m.bumpMap.needsUpdate = true;
      }
      const r = this.regions.material.map;
      if (r && this.regionImage) {
        r.image = drawRegions(this.regionImage, this.regionSize);
        r.needsUpdate = true;
      }
      this.environment();
      this.labelsDirty = true;
      canvas.style.visibility = '';
    });
  }

  // ── dots ──────────────────────────────────────────────
  buildDots() {
    const { languages } = this.data;
    const n = languages.length;
    // Each dot is an instance of a small square. Software WebGL pays for every
    // instance, so there (GFX low) the dots are one plain mesh instead, a
    // triangle around each circle, with the per-dot values copied to its corners.
    const merged = GFX === 'low';
    const geo = merged ? new THREE.BufferGeometry() : new THREE.InstancedBufferGeometry();
    const spread = (array, size, out = new Float32Array(array.length * 3)) => {
      for (let i = 0; i < array.length / size; i++) {
        for (let v = 0; v < 3; v++) out.set(array.subarray(i * size, (i + 1) * size), (i * 3 + v) * size);
      }
      return out;
    };
    const perDot = (array, size) => (merged ? new THREE.BufferAttribute(spread(array, size), size) : new THREE.InstancedBufferAttribute(array, size));
    if (merged) {
      const corner = [0, 2.4, 0, -2.08, -1.2, 0, 2.08, -1.2, 0];
      const position = new Float32Array(n * 9);
      const index = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) {
        position.set(corner, i * 9);
        index.fill(i, i * 3, i * 3 + 3);
      }
      geo.setAttribute('position', new THREE.BufferAttribute(position, 3));
      geo.setAttribute('aIndex', new THREE.BufferAttribute(index, 1));
    } else {
      const plane = new THREE.PlaneGeometry(2, 2);
      geo.index = plane.index;
      geo.setAttribute('position', plane.getAttribute('position'));
    }
    const center = new Float32Array(n * 3);
    const flat = new Float32Array(n * 3);
    const size = new Float32Array(n);
    const shape = new Float32Array(n);
    languages.forEach((l, i) => {
      center.set(l.v, i * 3);
      flat.set(l.f, i * 3);
      size[i] = 0.0042 + 0.00165 * Math.max(0, Math.log10((l.speakers ?? 0) + 1) - 2);
      shape[i] = l.family === 'sign1238' ? 2 : l.aes === 6 ? 1 : 0;
    });
    this.dotSize = size;
    geo.setAttribute('aCenter', perDot(center, 3));
    geo.setAttribute('aFlat', perDot(flat, 3));
    geo.setAttribute('aSize', perDot(size, 1));
    geo.setAttribute('aShape', perDot(shape, 1));
    // colour and state are written per dot here (setColors, setFocus)
    this.colorAttr = new THREE.InstancedBufferAttribute(new Float32Array(n * 3), 3);
    this.stateAttr = new THREE.InstancedBufferAttribute(new Float32Array(n), 1);
    if (merged) {
      geo.setAttribute('aColor', perDot(this.colorAttr.array, 3));
      geo.setAttribute('aState', perDot(this.stateAttr.array, 1));
      this.syncDots = () => {
        spread(this.colorAttr.array, 3, geo.attributes.aColor.array);
        spread(this.stateAttr.array, 1, geo.attributes.aState.array);
        geo.attributes.aColor.needsUpdate = true;
        geo.attributes.aState.needsUpdate = true;
      };
    } else {
      geo.setAttribute('aColor', this.colorAttr);
      geo.setAttribute('aState', this.stateAttr);
      geo.instanceCount = n;
    }
    this.dotUniforms = {
      uScale: { value: 1 },
      uHover: { value: -1 },
      uFlat: { value: 0 },
      uPaper: { value: new THREE.Color(THEME.ring) },
      uLand: { value: new THREE.Color(LAND) },
    };
    const dots = new THREE.Mesh(geo, new THREE.ShaderMaterial({
      vertexShader: dotVertex, fragmentShader: dotFragment, uniforms: this.dotUniforms, transparent: true, depthWrite: false,
      defines: merged ? { MERGED: '' } : {},
    }));
    dots.frustumCulled = false;
    dots.renderOrder = 3;
    this.scene.add(dots);
    this.dots = dots;
  }

  setColors(colorOf) {
    const c = new THREE.Color();
    this.data.languages.forEach((l, i) => {
      c.set(colorOf(l));
      this.colorAttr.setXYZ(i, c.r, c.g, c.b);
    });
    this.colorAttr.needsUpdate = true;
    this.syncDots?.();
    this.colorOf = colorOf;
    if (this.lineage) this.paintLineage();
  }

  // focus: null (all normal) or a Set of language ids to keep lit
  setFocus(focus, { strong = null, mode = 'dim' } = {}) {
    this.focus = focus;
    this.data.languages.forEach((l, i) => {
      let s = 0;
      if (focus) s = focus.has(l.id) ? 0 : mode === 'hide' ? 3 : 1;
      if (strong?.has(l.id)) s = 2;
      this.stateAttr.setX(i, s);
    });
    this.stateAttr.needsUpdate = true;
    this.syncDots?.();
    if (this.lineage?.visible) this.paintLineage();
    else this.lineageStale = true;
    this.labelsDirty = true;
  }

  // ── layers ─────────────────────────────────────────────
  setLayer(name, on) {
    if (name === 'dots') this.dots.visible = on;
    if (name === 'regions') {
      this.layerRegions = on;
      if (on && !this.regions.material.map && !this.regionsLoading) {
        this.regionsLoading = true;
        const img = new Image();
        img.onload = () => {
          const tex = canvasTexture(drawRegions(img, this.regionSize), THREE.SRGBColorSpace);
          tex.anisotropy = GFX === 'low' ? 1 : 8;
          this.regionImage = img;
          this.regions.material.map = tex;
          this.regions.material.needsUpdate = true;
          this.regions.visible = this.layerRegions;
        };
        img.src = `${import.meta.env.BASE_URL}data/regions.png`;
      }
      this.regions.visible = on && !!this.regions.material.map;
    }
    if (name === 'lineage') {
      if (on && !this.lineage) this.buildLineage();
      if (this.lineage) {
        this.lineage.visible = on;
        if (on && this.lineageStale) this.paintLineage();
      }
    }
    this.labelsDirty = true;
  }

  // each language joins the centre of its branch, each branch the centre of its parent
  buildLineage() {
    const { data } = this;
    const centre = new Map();
    for (const g of data.groups) {
      if (!g.langs.length) continue;
      const m = [0, 0, 0];
      for (const l of g.langs) for (let k = 0; k < 3; k++) m[k] += l.v[k];
      const len = Math.hypot(...m) || 1;
      centre.set(g.id, m.map((x) => x / len));
    }
    // pseudo-families (sign languages, pidgins…) are categories, not lineages on the ground
    const lineal = (topId) => !data.byId.get(topId)?.pseudo;
    const segs = [];
    for (const l of data.languages) if (l.parent && centre.has(l.parent) && lineal(l.family)) segs.push({ a: l.v, b: centre.get(l.parent), child: l.id, sample: l, leaf: true });
    for (const g of data.groups) if (g.parent && centre.has(g.id) && centre.has(g.parent) && lineal(data.topOf(g.id).id)) segs.push({ a: centre.get(g.id), b: centre.get(g.parent), child: g.id, sample: g.langs[0], leaf: false });

    const pos = [], flat = [], wrap = [], owner = [];
    const va = new THREE.Vector3(), vb = new THREE.Vector3(), q = new THREE.Vector3();
    for (const [si, s] of segs.entries()) {
      va.set(...s.a);
      vb.set(...s.b);
      const ang = va.angleTo(vb);
      const steps = Math.max(1, Math.min(24, Math.ceil(ang / 0.025)));
      let prev = null;
      for (let k = 0; k <= steps; k++) {
        const t = k / steps;
        q.copy(va).lerp(vb, t).normalize();
        // arch long links off the surface so the tree reads in depth
        const lift = 1.0015 + Math.min(0.045, 0.05 * ang) * Math.sin(Math.PI * t);
        const ll = toLatLon(q.toArray());
        const cur = { p: q.clone().multiplyScalar(lift), f: toFlat(...ll), lon: ll[1] };
        if (prev) {
          const w = Math.abs(cur.lon - prev.lon) > 180 ? 1 : 0;
          pos.push(...prev.p.toArray(), ...cur.p.toArray());
          flat.push(...prev.f, ...cur.f);
          wrap.push(w, w);
          owner.push(si, si);
        }
        prev = cur;
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('aFlat', new THREE.Float32BufferAttribute(flat, 3));
    geo.setAttribute('aWrap', new THREE.Float32BufferAttribute(wrap, 1));
    geo.setAttribute('aColor', new THREE.Float32BufferAttribute(new Float32Array(pos.length), 3));
    geo.setAttribute('aAlpha', new THREE.Float32BufferAttribute(new Float32Array(pos.length / 3), 1));
    this.lineUniforms = { uFlat: { value: this.flat } };
    this.lineage = new THREE.LineSegments(geo, new THREE.ShaderMaterial({
      vertexShader: lineVertex, fragmentShader: lineFragment, uniforms: this.lineUniforms, transparent: true, depthWrite: false,
    }));
    this.lineage.renderOrder = 2;
    this.lineage.frustumCulled = false;
    this.lineSegs = segs;
    this.lineOwner = owner;
    this.scene.add(this.lineage);
    this.paintLineage();
  }

  paintLineage() {
    this.lineageStale = false;
    const { data } = this;
    const geo = this.lineage.geometry;
    const color = geo.getAttribute('aColor');
    const alpha = geo.getAttribute('aAlpha');
    const lit = new Set();
    if (this.focus) {
      for (const id of this.focus) {
        lit.add(id);
        for (const g of data.ancestors(id)) lit.add(g.id);
      }
    }
    const c = new THREE.Color();
    const segColor = this.lineSegs.map((s) => c.set(this.colorOf ? this.colorOf(s.sample) : INK).clone().multiplyScalar(0.8));
    for (let v = 0; v < this.lineOwner.length; v++) {
      const s = this.lineSegs[this.lineOwner[v]];
      const col = segColor[this.lineOwner[v]];
      color.setXYZ(v, col.r, col.g, col.b);
      alpha.setX(v, !this.focus || lit.has(s.child) ? (s.leaf ? 0.55 : 0.75) : 0.04);
    }
    color.needsUpdate = true;
    alpha.needsUpdate = true;
  }

  // ── fat lines: story routes, similarity links, the "nearby" ring ─────
  // Rebuilt for the current view whenever the view changes.
  setArcs(arcs = []) {
    this.specs.story = arcs.map((a, i) => ({ ...a, delay: a.delay ?? i * 220 }));
    this.rebuildFat('story');
  }

  setLinks(from, targets = []) {
    this.specs.links = from ? targets.map((l, i) => ({ from: [from.lat, from.lon], to: [l.lat, l.lon], color: ACCENT, weight: 0.8, delay: i * 70, dur: 900 })) : [];
    this.rebuildFat('links');
  }

  setNearby(spot) {
    this.specs.ring = spot ? [{ ring: spot, color: INK, weight: 0.9 }] : [];
    this.rebuildFat('ring');
  }

  pathPoints(spec) {
    if (spec.ring) {
      const { lat, lon, km } = spec.ring;
      const pts = [];
      for (let k = 0; k <= 96; k++) pts.push({ ll: destination(lat, lon, km / 6371, (k / 96) * Math.PI * 2), lift: 0.0018 });
      return pts;
    }
    const [from, to] = [spec.from, spec.to];
    const interp = geoInterpolate([from[1], from[0]], [to[1], to[0]]);
    const lift = 0.006 + 0.055 * (geoDistance([from[1], from[0]], [to[1], to[0]]) / Math.PI);
    const pts = [];
    for (let s = 0; s <= 96; s++) {
      const [lon, lat] = interp(s / 96);
      pts.push({ ll: [lat, lon], lift: 0.002 + lift * Math.sin((Math.PI * s) / 96) });
    }
    return pts;
  }

  rebuildFat(kind) {
    for (const m of this.fat[kind]) {
      this.scene.remove(m.mesh);
      m.mesh.geometry.dispose();
      m.mesh.material.dispose();
    }
    const now = performance.now();
    const flat = this.mode === '2d';
    this.fat[kind] = this.specs[kind].map((spec) => {
      // unwrap longitudes so a route crossing the date line stays continuous on the plane
      let prevLon = null;
      const xyz = this.pathPoints(spec).map(({ ll: [lat, lon], lift }) => {
        if (prevLon != null) {
          while (lon - prevLon > 180) lon -= 360;
          while (prevLon - lon > 180) lon += 360;
        }
        prevLon = lon;
        if (flat) {
          const f = toFlat(lat, lon);
          return [f[0] + lift * 0.8, f[1], f[2]];
        }
        return toVec(lat, lon).map((c) => c * (1 + lift));
      });
      const seg = [];
      for (let i = 0; i < xyz.length - 1; i++) seg.push(...xyz[i], ...xyz[i + 1]);
      const geo = new LineSegmentsGeometry().setPositions(seg);
      const mat = new LineMaterial({ color: spec.color ?? INK, linewidth: 2.2 * (spec.weight ?? 1), transparent: true, opacity: 0.92 });
      mat.resolution.set(this.width, this.height);
      const mesh = new LineSegments2(geo, mat);
      mesh.renderOrder = 4;
      mesh.visible = !this.morph;
      this.scene.add(mesh);
      const total = xyz.length - 1;
      if (spec.ring) {
        geo.instanceCount = total;
        return { mesh, total, dur: 0 };
      }
      geo.instanceCount = 0;
      return { mesh, total, start: now + (spec.delay ?? 0), dur: spec.dur ?? 1600 };
    });
  }

  // ── views: globe ⇄ map ─────────────────────────────────
  configureControls() {
    const c = this.controls;
    if (this.mode === '2d') {
      c.enableRotate = false;
      c.enablePan = true;
      c.screenSpacePanning = true;
      c.zoomToCursor = true;
      c.mouseButtons = { LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN };
      c.touches = { ONE: THREE.TOUCH.PAN, TWO: THREE.TOUCH.DOLLY_PAN };
      c.minDistance = 0.25;
      c.maxDistance = this.homeFlat * 1.15;
      c.autoRotate = false;
    } else {
      c.enableRotate = true;
      c.enablePan = false;
      c.zoomToCursor = false;
      c.mouseButtons = { LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE };
      c.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };
      c.minDistance = MIN_DIST;
      c.maxDistance = Math.max(MAX_DIST, this.homeDist * 1.35);
      c.target.set(0, 0, 0);
    }
  }

  // the point the camera is looking at, as latitude/longitude
  centerLatLon() {
    if (this.mode === '2d' && !this.morph) {
      const t = this.controls.target;
      return [(t.y * 180) / Math.PI, (-t.z * 180) / Math.PI];
    }
    return toLatLon(this.camera.position.toArray());
  }

  altitude() {
    return this.mode === '2d' && !this.morph ? this.camera.position.x - this.controls.target.x : this.camera.position.length() - 1;
  }

  setMode(mode, duration = 1500) {
    if (mode === this.mode || this.morph) return;
    const [lat, lon] = this.centerLatLon();
    const latC = clamp(lat, -70, 70);
    const alt = this.altitude();
    // a viewing height on one surface roughly matches the other's
    // the map opens a little wider than the globe was, so its shape reads at once
    const toAlt = mode === '2d' ? clamp(alt * 1.5, 0.35, this.homeFlat) : clamp(alt / 1.5, MIN_DIST - 0.95, this.homeDist - 1);
    this.mode = mode;
    this.flight = null;
    this.controls.enabled = false;
    this.controls.autoRotate = false;
    for (const kind of Object.keys(this.fat)) for (const m of this.fat[kind]) m.mesh.visible = false;
    this.morph = {
      to: mode === '2d' ? 1 : 0, from: this.flat, t0: performance.now(), dur: duration,
      sphereDir: new THREE.Vector3(...toVec(latC, lon)), flatPt: new THREE.Vector3(...toFlat(latC, lon)), fromAlt: alt, toAlt,
    };
    this.onMode?.(mode);
  }

  stepMorph(now) {
    const m = this.morph;
    const t = Math.min(1, (now - m.t0) / m.dur);
    const e = ease(t);
    this.flat = THREE.MathUtils.lerp(m.from, m.to, e);
    // keep the viewed point centred and seen face-on while the surface unrolls
    const point = m.sphereDir.clone().lerp(m.flatPt, this.flat);
    const normal = m.sphereDir.clone().lerp(new THREE.Vector3(1, 0, 0), this.flat).normalize();
    this.camera.position.copy(point).addScaledVector(normal, THREE.MathUtils.lerp(m.fromAlt, m.toAlt, e));
    this.camera.up.set(0, 1, 0);
    this.camera.lookAt(point);
    if (t >= 1) {
      this.morph = null;
      this.flat = m.to;
      this.configureControls();
      if (this.mode === '2d') {
        this.controls.target.copy(m.flatPt);
        this.camera.position.set(m.toAlt, m.flatPt.y, m.flatPt.z);
      } else {
        this.camera.position.copy(m.sphereDir).multiplyScalar(1 + m.toAlt);
      }
      this.camera.lookAt(this.controls.target);
      this.controls.enabled = true;
      this.controls.update();
      for (const kind of Object.keys(this.fat)) this.rebuildFat(kind);
    }
    this.labelsDirty = true;
  }

  // ── camera moves ──────────────────────────────────────
  // a distance tuned for a landscape globe, mapped to this viewport and view
  fit(dist) {
    const alt = (dist - 1) * this.fitK;
    return this.mode === '2d' ? clamp(alt * 1.15, 0.3, this.homeFlat) : 1 + alt;
  }

  flyTo(lat, lon, dist = null, duration = 1800) {
    this.controls.autoRotate = false;
    if (this.morph) return;
    if (this.mode === '2d') {
      const fromT = this.controls.target.clone();
      const toT = new THREE.Vector3(...toFlat(clamp(lat, -75, 75), lon));
      const fromAlt = this.altitude();
      this.flight = { flat: true, fromT, toT, fromAlt, toAlt: dist != null ? this.fit(dist) : fromAlt, t0: performance.now(), dur: duration };
      return;
    }
    const from = this.camera.position.clone();
    const fromDist = from.length();
    const toDist = dist != null ? this.fit(dist) : Math.min(fromDist, this.homeDist);
    const toDir = new THREE.Vector3(...toVec(lat, lon));
    const fromDir = from.clone().normalize();
    // long hops pull back a little, like a camera on a crane
    const arcLift = Math.min(1.2, fromDir.angleTo(toDir) * 0.5);
    this.flight = { fromDir, toDir, fromDist, toDist, arcLift, t0: performance.now(), dur: duration };
  }

  // show a set of languages: centre on their spherical mean, zoom to their spread
  framePoints(langs, { minDist = 1.6, maxDist = HOME_DIST, duration } = {}) {
    if (!langs.length) return;
    const m = new THREE.Vector3();
    for (const l of langs) m.add(new THREE.Vector3(...l.v));
    if (m.length() < 1e-6) m.set(...langs[0].v);
    m.normalize();
    let spread = 0;
    for (const l of langs) spread = Math.max(spread, m.angleTo(new THREE.Vector3(...l.v)));
    const [lat, lon] = toLatLon(m.toArray());
    this.flyTo(lat, lon, clamp(1 + spread * 2.6, minDist, maxDist), duration);
  }

  setViewOffset(x, y) {
    this.offset = { x, y };
    this.resize();
  }

  resize() {
    // a tab opened in the background can report no size yet; fall back to the
    // window (or a nominal screen) so the camera never starts from NaN
    const w = this.container.clientWidth || window.innerWidth || 1280;
    const h = this.container.clientHeight || window.innerHeight || 800;
    this.width = w;
    this.height = h;
    this.renderer.setSize(w, h);
    const aspect = w / h;
    this.camera.aspect = aspect;
    // shift the picture's centre on screen without moving the camera
    this.camera.setViewOffset(w, h, -this.offset.x, -this.offset.y, w, h);
    this.camera.updateProjectionMatrix();
    // portrait screens pull back until the globe fits the width
    this.homeDist = aspect < 1.05 ? Math.max(HOME_DIST, 4.1 / aspect) : HOME_DIST;
    this.fitK = (this.homeDist - 1) / (HOME_DIST - 1);
    const tanV = Math.tan((this.camera.fov * Math.PI) / 360);
    this.homeFlat = Math.max((Math.PI * 1.04) / (tanV * aspect), ((Math.PI / 2) * 1.02) / tanV);
    if (!this.morph) this.configureControls();
    for (const kind of Object.keys(this.fat)) for (const m of this.fat[kind]) m.mesh.material.resolution.set(w, h);
    this.labelsDirty = true;
  }

  // ── picking & projection ───────────────────────────────
  bindPointer() {
    const el = this.renderer.domElement;
    let down = null;
    el.addEventListener('pointermove', (e) => {
      this.pointer = { x: e.offsetX, y: e.offsetY, type: e.pointerType };
      this.pointerDirty = true;
    });
    el.addEventListener('pointerleave', () => {
      this.pointer = null;
      this.pointerDirty = true;
    });
    el.addEventListener('pointerdown', (e) => (down = { x: e.clientX, y: e.clientY, t: performance.now() }));
    el.addEventListener('pointerup', (e) => {
      if (!down) return;
      const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
      if (moved < 6 && performance.now() - down.t < 600 && !this.morph) this.click(e.offsetX, e.offsetY, e.pointerType);
      down = null;
    });
  }

  worldOf(l, out = new THREE.Vector3()) {
    const f = this.flat;
    return out.set(l.v[0] * (1 - f) + l.f[0] * f, l.v[1] * (1 - f) + l.f[1] * f, l.v[2] * (1 - f) + l.f[2] * f);
  }

  // screen position of a language, or null when it faces away
  project(l, margin = 0) {
    let facing = 1;
    if (this.flat < 0.5) {
      const cam = this.camera.position;
      const camLen = cam.length();
      facing = (l.v[0] * cam.x + l.v[1] * cam.y + l.v[2] * cam.z) / camLen;
      if (facing < 1 / camLen + margin) return null;
    }
    const v = this.worldOf(l).project(this.camera);
    if (v.z > 1) return null;
    return { x: (v.x * 0.5 + 0.5) * this.width, y: (-v.y * 0.5 + 0.5) * this.height, facing };
  }

  // the language dot nearest to a screen point, or -1
  pickDot(x, y, radiusPx = 9) {
    if (!this.dots.visible) return -1;
    const langs = this.data.languages;
    const state = this.stateAttr.array;
    const pxPerUnit = this.height / (2 * Math.tan((this.camera.fov * Math.PI) / 360));
    const camPos = this.camera.position;
    const w = new THREE.Vector3();
    let best = -1;
    let bestD = Infinity;
    for (let i = 0; i < langs.length; i++) {
      if (state[i] > 2.5) continue;
      const p = this.project(langs[i], 0.02);
      if (!p) continue;
      const d = Math.hypot(p.x - x, p.y - y);
      if (d > 40) continue;
      const depth = this.worldOf(langs[i], w).distanceTo(camPos);
      const r = Math.max(radiusPx, (this.dotSize[i] * this.dotUniforms.uScale.value * pxPerUnit) / depth);
      // dimmed dots are harder to hit than lit ones
      const penalty = state[i] > 0.5 && state[i] < 1.5 ? 6 : 0;
      if (d < r && d + penalty < bestD) {
        bestD = d + penalty;
        best = i;
      }
    }
    return best;
  }

  surfaceAt(x, y) {
    const ndc = new THREE.Vector2((x / this.width) * 2 - 1, -(y / this.height) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.camera);
    const { origin, direction } = this.raycaster.ray;
    if (this.mode === '2d') {
      if (Math.abs(direction.x) < 1e-6) return null;
      const p = origin.clone().addScaledVector(direction, -origin.x / direction.x);
      const lat = (p.y * 180) / Math.PI;
      const lon = (-p.z * 180) / Math.PI;
      return Math.abs(lat) <= 90 && Math.abs(lon) <= 180 ? [lat, lon] : null;
    }
    // ray against the unit sphere
    const b = origin.dot(direction);
    const disc = b * b - (origin.lengthSq() - 1);
    if (disc < 0) return null;
    return toLatLon(origin.clone().addScaledVector(direction, -b - Math.sqrt(disc)).toArray());
  }

  click(x, y, pointerType) {
    const i = this.pickDot(x, y, pointerType === 'touch' ? 16 : 9);
    if (i >= 0) return this.onPick?.({ lang: this.data.languages[i] });
    const ll = this.surfaceAt(x, y);
    this.onPick?.(ll ? { lat: ll[0], lon: ll[1] } : { empty: true });
  }

  updateHover() {
    if (!this.pointerDirty) return;
    this.pointerDirty = false;
    const p = this.pointer;
    const i = p && p.type !== 'touch' && !this.morph ? this.pickDot(p.x, p.y) : -1;
    if (i !== this.hoverIdx) {
      this.hoverIdx = i;
      this.dotUniforms.uHover.value = i;
      this.renderer.domElement.style.cursor = i >= 0 ? 'pointer' : 'grab';
    }
    this.onHover?.(i >= 0 ? this.data.languages[i] : null, p);
  }

  // the globe's disc on screen (only meaningful in the globe view)
  disc() {
    const c = new THREE.Vector3(0, 0, 0).project(this.camera);
    const d = this.camera.position.length();
    const pxPerUnit = this.height / (2 * Math.tan((this.camera.fov * Math.PI) / 360));
    return { x: (c.x * 0.5 + 0.5) * this.width, y: (-c.y * 0.5 + 0.5) * this.height, r: pxPerUnit / Math.sqrt(Math.max(1e-6, d * d - 1)) };
  }

  // ground distance per screen pixel near the centre of the view
  kmPerPixel() {
    const pxPerUnit = this.height / (2 * Math.tan((this.camera.fov * Math.PI) / 360));
    return (this.altitude() / pxPerUnit) * 6371;
  }

  // ── frame loop ────────────────────────────────────────
  tick() {
    // a full-page view covers the atlas: skip drawing it
    if (this.paused) return;
    const now = performance.now();
    if (this.morph) this.stepMorph(now);
    else if (this.flight) {
      const f = this.flight;
      const t = Math.min(1, (now - f.t0) / f.dur);
      const e = ease(t);
      if (f.flat) {
        const target = f.fromT.clone().lerp(f.toT, e);
        const alt = THREE.MathUtils.lerp(f.fromAlt, f.toAlt, e);
        this.controls.target.copy(target);
        this.camera.position.set(target.x + alt, target.y, target.z);
      } else {
        const dir = f.fromDir.clone().lerp(f.toDir, e);
        if (dir.lengthSq() < 1e-6) dir.copy(f.toDir);
        dir.normalize();
        this.camera.position.copy(dir.multiplyScalar(THREE.MathUtils.lerp(f.fromDist, f.toDist, e) + f.arcLift * Math.sin(Math.PI * e)));
      }
      this.camera.lookAt(this.controls.target);
      if (t >= 1) this.flight = null;
      this.labelsDirty = true;
    } else {
      const before = this.camera.position.clone();
      this.controls.update();
      if (this.mode === '2d') {
        // keep the map in view and the camera square to it
        const tg = this.controls.target;
        tg.x = 0;
        tg.y = clamp(tg.y, -LAT_LIMIT, LAT_LIMIT);
        tg.z = clamp(tg.z, -Math.PI, Math.PI);
        this.camera.position.set(Math.max(0.2, this.camera.position.x), tg.y, tg.z);
        this.camera.lookAt(tg);
      }
      if (!before.equals(this.camera.position)) this.labelsDirty = true;
    }
    if (GFX !== 'low' && this.mode === '3d' && !this.controls.autoRotate && !this.flight && !this.morph && now - this.lastInteraction > 45000 && !this.focus) {
      this.controls.autoRotate = true;
    }

    const f = this.flat;
    if (this.halo) this.halo.visible = f < 0.3;
    this.sphere.morphTargetInfluences[0] = f;
    this.regions.morphTargetInfluences[0] = f;
    this.dotUniforms.uFlat.value = f;
    if (this.lineUniforms) this.lineUniforms.uFlat.value = f;
    const alt = this.mode === '2d' && !this.morph ? this.altitude() / 1.15 : this.camera.position.length() - 1;
    const rel = clamp(alt / (this.homeDist - 1), 0.02, 1.6);
    this.dotUniforms.uScale.value = Math.pow(rel, 0.62) * Math.sqrt(this.fitK);
    // zoomed in, a drag carries the ground under the pointer along with it; from
    // far away the globe turns a little faster than the hand, to roam the world
    if (this.mode === '3d' && !this.morph) {
      const d = Math.max(1.02, this.camera.position.length());
      const k = 1 + (GRAB_FAR - 1) * clamp((d - 1.5) / (this.homeDist - 1.5), 0, 1);
      // the ground facing the camera is d − 1 away; OrbitControls turns 2π·rotateSpeed per screen height
      this.controls.rotateSpeed = (k * Math.tan((this.camera.fov * Math.PI) / 360) * (d - 1)) / Math.PI;
    } else this.controls.rotateSpeed = 0.18 + 0.5 * Math.min(1, rel);

    let growing = false;
    for (const kind of Object.keys(this.fat)) {
      for (const a of this.fat[kind]) {
        if (!a.dur) continue;
        a.mesh.geometry.instanceCount = Math.floor(ease(clamp((now - a.start) / a.dur, 0, 1)) * a.total);
        growing ||= now - a.start < a.dur + 50;
      }
    }
    this.updateHover();
    // without acceleration every frame is expensive: while nothing moves, draw five a second
    const still = GFX === 'low' && !this.labelsDirty && !this.morph && !this.flight && !growing && this.hoverIdx === this.drawnHover;
    if (!still || now - this.drawnAt > 200) {
      this.renderer.render(this.scene, this.camera);
      this.drawnAt = now;
      this.drawnHover = this.hoverIdx;
    }
    if (this.labelsDirty) {
      this.labelsDirty = false;
      this.onMove?.('frame');
    }
  }
}
