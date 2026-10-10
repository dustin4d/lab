// Golden-hour drone flyover of the procedural club grounds (Three.js).
// Framework-agnostic: the Hero component mounts it, the film renderer seeks it.
import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { Water } from 'three/addons/objects/Water.js';
import * as C from './course.js';
import { rng, makeNoise, smoothstep, lerp, clamp } from './noise.js';

const { noise, fbm } = makeNoise(77);

const col = (hex) => new THREE.Color(hex); // sRGB hex -> linear working space

const PALETTE = {
  zenith: col('#5d7fa6'),
  horizon: col('#e8c49a'),
  horizonCool: col('#b4b3c2'),
  glow: col('#ffb36b'),
  sunCol: col('#fff1d6'),
  rough: col('#4c6a2a'),
  rough2: col('#5f7d33'),
  forest: col('#2b4220'),
  cut: col('#6b9038'),
  fairA: col('#8ab24c'),
  fairB: col('#7aa443'),
  green: col('#93c452'),
  greenB: col('#86b84a'),
  sand: col('#ead9b2'),
  rock: col('#8c7458'),
  mud: col('#3f4a2a'),
  lawn: col('#628f39'),
};

export const SUN_DEFAULT = { azimuth: -62, elevation: 11 }; // degrees; azimuth from north, WSW

function sunVector(azDeg, elDeg) {
  const az = THREE.MathUtils.degToRad(azDeg), el = THREE.MathUtils.degToRad(elDeg);
  // north = -z, east = +x
  return new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el)).normalize();
}

// ------------------------------------------------------------------ GLSL
const GLSL_NOISE = /* glsl */ `
float hash12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f*f*(3.0-2.0*f);
  return mix(mix(hash12(i), hash12(i+vec2(1,0)), u.x), mix(hash12(i+vec2(0,1)), hash12(i+vec2(1,1)), u.x), u.y); }
float fbm2(vec2 p){ float s = 0.0, a = 0.5; for (int i = 0; i < 4; i++){ s += a*vnoise(p); p = p*2.03 + 17.1; a *= 0.5; } return s / 0.9375; }
`;

// Course features are signed-distance fields baked once into a texture
// (fairway R, green G, bunker B, mowing-stripe phase A), so the terrain shader
// does one lookup per pixel instead of looping over every hole.
export const BAKE = { x0: -840, z0: -800, size: 1440, res: 2048, near: -12, range: 48 };

function bakeGLSL(n) {
  return /* glsl */ `
uniform vec4 uSeg[${n.seg}]; uniform vec2 uSegW[${n.seg}];
uniform vec4 uGreen[${n.green}]; uniform vec2 uGreenX[${n.green}];
uniform vec4 uBunk[${n.bunk}]; uniform float uBunkR[${n.bunk}];
uniform vec4 uBounds;
varying vec2 vUv;
${GLSL_NOISE}
float ellD(vec2 p, vec4 e, float r){ vec2 d = p - e.xy; float c = cos(r), s = sin(r);
  vec2 q = vec2(d.x*c - d.y*s, d.x*s + d.y*c); return (length(q / e.zw) - 1.0) * min(e.z, e.w); }
float enc(float d){ return clamp((d - (${BAKE.near.toFixed(1)})) / ${BAKE.range.toFixed(1)}, 0.0, 1.0); }
void main(){
  vec2 p = uBounds.xy + vUv * uBounds.zw;
  float dF = 1e4, along = 0.0, kind = 0.0;
  for (int i = 0; i < ${n.seg}; i++){
    vec4 s = uSeg[i]; vec2 a = s.xy; vec2 ba = s.zw - s.xy; float L = length(ba); vec2 dr = ba / L;
    vec2 pa = p - a; float t = dot(pa, dr); float tc = clamp(t, 0.0, L);
    float d = length(pa - dr * tc) - uSegW[i].x;
    if (d < dF){ dF = d; along = t; kind = uSegW[i].y; }
  }
  dF += (vnoise(p * 0.045) - 0.5) * 4.0;
  float dG = 1e4;
  for (int i = 0; i < ${n.green}; i++) dG = min(dG, ellD(p, uGreen[i], uGreenX[i].x));
  dG += (vnoise(p * 0.21) - 0.5) * 1.4;
  float dB = 1e4;
  float wob = (vnoise(p * 0.35) - 0.5) * 1.8;
  for (int i = 0; i < ${n.bunk}; i++) dB = min(dB, ellD(p, uBunk[i], uBunkR[i]));
  dB += wob;
  float sw = kind > 1.5 ? 14.0 : 9.0;
  float tri = abs(fract(along / sw) - 0.5) * 2.0;
  gl_FragColor = vec4(enc(dF), enc(dG), enc(dB), tri);
}`;
}

function terrainGLSL(n) {
  return /* glsl */ `
uniform sampler2D uCourse; uniform vec4 uBounds;
uniform vec4 uLawn[${n.lawn}];
uniform float uWaterY;
uniform vec3 cRough, cRough2, cForest, cCut, cFairA, cFairB, cGreen, cGreenB, cSand, cRock, cMud, cLawn;
varying vec3 vWPos; varying vec3 vWNrm;
${GLSL_NOISE}
float inside(float edge, float d){ float w = max(fwidth(d), 0.03) * 0.8; return 1.0 - smoothstep(edge - w, edge + w, d); }
float ellD0(vec2 p, vec4 e){ return (length((p - e.xy) / e.zw) - 1.0) * min(e.z, e.w); }
float band(float tri){ float w = fwidth(tri) * 1.5 + 0.02; return smoothstep(0.5 - w, 0.5 + w, tri); }
float stripes(float x){ return band(abs(fract(x) - 0.5) * 2.0); }

vec3 courseColor(vec3 wp, vec3 nrm){
  vec2 p = wp.xz;
  float nA = vnoise(p * 0.045), nB = vnoise(p * 0.21), nC = vnoise(p * 0.9), nE = vnoise(p * 0.11);
  vec2 uv = (p - uBounds.xy) / uBounds.zw;
  vec4 cf = vec4(1.0, 1.0, 1.0, 0.0);
  if (all(greaterThan(uv, vec2(0.0))) && all(lessThan(uv, vec2(1.0)))) cf = texture2D(uCourse, uv);
  vec3 dd = cf.rgb * ${BAKE.range.toFixed(1)} + (${BAKE.near.toFixed(1)});
  float dF = dd.x, dG = dd.y, dB = dd.z;
  float dL = 1e4;
  for (int i = 0; i < ${n.lawn}; i++) dL = min(dL, ellD0(p, uLawn[i]));

  // rough, fading into forest floor / distant canopy away from play
  vec3 col = mix(cRough, cRough2, nA * 0.6 + nC * 0.4);
  float away = smoothstep(14.0, 34.0, min(dF, dG)) * (1.0 - inside(0.0, dL + (nA - 0.5) * 30.0));
  vec3 canopy = cForest * (0.6 + 0.75 * nE) * (0.85 + 0.3 * nB);
  canopy = mix(canopy, canopy * vec3(1.55, 1.15, 0.6), smoothstep(0.6, 0.85, vnoise(p * 0.006)) * 0.6); // early autumn patches
  col = mix(col, canopy, away);
  col = mix(col, cLawn * (0.92 + 0.16 * nB), inside(0.0, dL + (nA - 0.5) * 18.0));
  if (min(min(dF, dG), dB) < 6.0) {
    // first cut and fairway with mowing stripes
    col = mix(col, cCut * (0.92 + 0.16 * nB), inside(3.0, dF));
    vec3 fw = mix(cFairA, cFairB, band(cf.a)) * (0.94 + 0.12 * nB);
    col = mix(col, fw, inside(0.0, dF));
    // greens: collar, then a cross-cut surface
    col = mix(col, cCut * 1.06, inside(2.0, dG));
    vec2 q = mat2(0.825, -0.565, 0.565, 0.825) * p;
    float chk = abs(stripes(q.x / 3.4) - stripes(q.y / 3.4));
    col = mix(col, mix(cGreen, cGreenB, chk) * (0.96 + 0.08 * nC), inside(0.0, dG));
    // bunkers with a darker grass lip
    col = mix(col, cCut * 0.8, inside(0.9, dB));
    col = mix(col, cSand * (0.93 + 0.1 * nC), inside(0.0, dB));
  }
  // wet shoreline and exposed rock ledges
  col = mix(col, cMud, (1.0 - smoothstep(uWaterY + 0.02, uWaterY + 0.45, wp.y)) * 0.7);
  float steep = smoothstep(0.74, 0.55, nrm.y) * (1.0 - inside(0.0, dF)) * (1.0 - inside(0.0, dG)) * (1.0 - smoothstep(700.0, 1100.0, length(p)));
  col = mix(col, cRock * (0.8 + 0.4 * nB), steep);
  return col;
}
`;
}

const SKY_VERT = /* glsl */ `
varying vec3 vDir;
void main(){
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vDir = wp.xyz - cameraPosition;
  gl_Position = projectionMatrix * viewMatrix * wp;
  gl_Position.z = gl_Position.w;
}`;

const SKY_FRAG = /* glsl */ `
uniform vec3 uSun, uZenith, uHorizon, uHorizonCool, uGlow, uSunCol; uniform float uTime;
varying vec3 vDir;
${GLSL_NOISE}
void main(){
  vec3 d = normalize(vDir);
  float h = max(d.y, 0.0);
  float sd = max(dot(d, uSun), 0.0);
  vec3 hz = mix(uHorizonCool, uHorizon, pow(sd, 3.0) * 0.85 + 0.15);
  vec3 col = mix(hz, uZenith, pow(h, 0.5));
  col += uGlow * (pow(sd, 5.0) * 0.5 + pow(sd, 40.0) * 0.7) * (1.0 - h * 0.5);
  if (d.y > 0.0) {
    vec2 cp = d.xz / (d.y + 0.1) * 1.2 + vec2(uTime * 0.004, uTime * 0.0015);
    float c = fbm2(cp * 1.3) * 0.75 + fbm2(cp * 4.1) * 0.25;
    float cov = smoothstep(0.5, 0.78, c) * smoothstep(0.015, 0.09, d.y) * (1.0 - smoothstep(0.3, 0.75, d.y));
    vec3 lit = mix(vec3(0.85, 0.48, 0.36), vec3(1.0, 0.8, 0.55), pow(sd, 3.0));
    col = mix(col, lit * (0.55 + 0.75 * pow(sd, 4.0)), cov * 0.7);
  }
  col += uSunCol * smoothstep(0.99935, 0.99975, sd) * 10.0;
  col = mix(col, hz, smoothstep(0.0, -0.06, d.y));
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

// Directional aerial haze: fog tints warm toward the sun and cool away from it.
// Patched into three's fog chunks so every lit material shares it.
function installHaze(sun, cool) {
  const v3 = (v) => `vec3(${[v.x ?? v.r, v.y ?? v.g, v.z ?? v.b].map((n) => n.toFixed(5)).join(', ')})`;
  const S = THREE.ShaderChunk;
  if (!S.__hazeBase) S.__hazeBase = { pv: S.fog_pars_vertex, v: S.fog_vertex, pf: S.fog_pars_fragment, f: S.fog_fragment };
  const B = S.__hazeBase;
  S.fog_pars_vertex = B.pv + '\n#ifdef USE_FOG\nvarying vec3 vFogWorld;\n#endif\n';
  S.fog_vertex = B.v + `
#ifdef USE_FOG
  vec4 hazeWP = vec4(transformed, 1.0);
  #ifdef USE_INSTANCING
    hazeWP = instanceMatrix * hazeWP;
  #endif
  vFogWorld = (modelMatrix * hazeWP).xyz;
#endif
`;
  S.fog_pars_fragment = B.pf + `
#ifdef USE_FOG
varying vec3 vFogWorld;
const vec3 HAZE_SUN = ${v3(sun)};
const vec3 HAZE_COOL = ${v3(cool)};
#endif
`;
  S.fog_fragment = `
#ifdef USE_FOG
  float fogFactor = 1.0 - exp(-fogDensity * fogDensity * vFogDepth * vFogDepth);
  vec3 hazeDir = normalize(vFogWorld - cameraPosition);
  float hazeSun = pow(max(dot(hazeDir, HAZE_SUN), 0.0), 3.0);
  gl_FragColor.rgb = mix(gl_FragColor.rgb, mix(HAZE_COOL, fogColor, hazeSun * 0.85 + 0.15), fogFactor);
#endif
`;
}

// ------------------------------------------------------------------ helpers
function waterNormalTexture() {
  const S = 256;
  const data = new Uint8Array(S * S * 4);
  const waves = [];
  const R = rng(4);
  for (let i = 0; i < 40; i++) {
    const f = 2 + i * 0.7;
    const a = R() * Math.PI * 2;
    waves.push({ kx: Math.round(Math.cos(a) * f), ky: Math.round(Math.sin(a) * f) || 1, ph: R() * 6.28, a: 1 / (1 + i * 0.22) });
  }
  const hgt = (x, y) => waves.reduce((s, w) => s + w.a * Math.sin(((w.kx * x + w.ky * y) / S) * Math.PI * 2 + w.ph), 0);
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const dx = hgt(x + 1, y) - hgt(x - 1, y), dy = hgt(x, y + 1) - hgt(x, y - 1);
      const n = new THREE.Vector3(-dx * 0.5, -dy * 0.5, 1).normalize();
      const k = (y * S + x) * 4;
      data[k] = (n.x * 0.5 + 0.5) * 255; data[k + 1] = (n.y * 0.5 + 0.5) * 255; data[k + 2] = (n.z * 0.5 + 0.5) * 255; data[k + 3] = 255;
    }
  }
  const tex = new THREE.DataTexture(data, S, S, THREE.RGBAFormat);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.LinearFilter; tex.minFilter = THREE.LinearMipmapLinearFilter; tex.generateMipmaps = true;
  tex.needsUpdate = true;
  return tex;
}

function paintVertexColor(geo, color, shadeBottom = 0) {
  const n = geo.attributes.position.count;
  const arr = new Float32Array(n * 3);
  geo.computeBoundingBox();
  const { min, max } = geo.boundingBox;
  for (let i = 0; i < n; i++) {
    const y = geo.attributes.position.getY(i);
    const k = shadeBottom ? lerp(1 - shadeBottom, 1, (y - min.y) / Math.max(0.001, max.y - min.y)) : 1;
    arr[i * 3] = color.r * k; arr[i * 3 + 1] = color.g * k; arr[i * 3 + 2] = color.b * k;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return geo;
}

function clean(geo) {
  geo.deleteAttribute('uv');
  return geo;
}

function blob(r, detail, R, squash = 1) {
  let g = new THREE.IcosahedronGeometry(r, detail);
  g.deleteAttribute('uv'); g.deleteAttribute('normal');
  g = mergeVertices(g);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const k = 1 + (R() - 0.5) * 0.38;
    p.setXYZ(i, p.getX(i) * k, p.getY(i) * k * squash, p.getZ(i) * k);
  }
  g.computeVertexNormals();
  return g;
}

function treeGeometries(R, d) {
  const trunkCol = col('#463c32');
  const pine = () => {
    const parts = [paintVertexColor(clean(new THREE.CylinderGeometry(0.2, 0.32, 15, 5).translate(0, 7.5, 0)), trunkCol)];
    const crown = col('#304b24');
    for (let i = 0; i < 3; i++) {
      const b = blob(2.4 + R() * 0.9, d, R, 0.62).translate((R() - 0.5) * 2.4, 14.5 + i * 1.3, (R() - 0.5) * 2.4);
      parts.push(paintVertexColor(b, crown, 0.45));
    }
    return mergeGeometries(parts);
  };
  const oak = (crown = col('#405f27')) => {
    const parts = [paintVertexColor(clean(new THREE.CylinderGeometry(0.28, 0.45, 6.5, 5).translate(0, 3.2, 0)), trunkCol)];
    const n = 4;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + R();
      const b = blob(3.2 + R() * 1.4, d, R, 0.8).translate(Math.cos(a) * 2.2, 8 + R() * 2.2, Math.sin(a) * 2.2);
      parts.push(paintVertexColor(b, crown, 0.5));
    }
    return mergeGeometries(parts);
  };
  const cedar = () => {
    const parts = [paintVertexColor(clean(new THREE.CylinderGeometry(0.2, 0.3, 3, 5).translate(0, 1.5, 0)), trunkCol)];
    let cone = new THREE.ConeGeometry(2.6, 10, 8, 3);
    cone.deleteAttribute('uv'); cone.deleteAttribute('normal');
    cone = mergeVertices(cone);
    const p = cone.attributes.position;
    for (let i = 0; i < p.count; i++) { const k = 1 + (R() - 0.5) * 0.3; p.setXYZ(i, p.getX(i) * k, p.getY(i), p.getZ(i) * k); }
    cone.computeVertexNormals();
    parts.push(paintVertexColor(cone.translate(0, 7.5, 0), col('#2c4625'), 0.45));
    return mergeGeometries(parts);
  };
  const far = () => paintVertexColor(blob(4.2, 0, R, 0.85).translate(0, 7, 0), col('#344f25'), 0.5);
  return { pine: pine(), oak: oak(), oakGold: oak(col('#8a7a36')), oakRust: oak(col('#87573a')), cedar: cedar(), far: far() };
}

function hipRoof(w, d, h, over = 1.2) {
  const W = w / 2 + over, D = d / 2 + over, r = Math.max(0, W - D);
  const v = new Float32Array([-W, 0, -D, W, 0, -D, W, 0, D, -W, 0, D, -r, h, 0, r, h, 0]);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(v, 3));
  g.setIndex([3, 2, 5, 3, 5, 4, 1, 0, 4, 1, 4, 5, 2, 1, 5, 0, 3, 4]);
  const ng = g.toNonIndexed();
  ng.computeVertexNormals();
  return ng;
}

function gable(w, h, depth) {
  const s = new THREE.Shape();
  s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(0, h); s.closePath();
  return new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false });
}

// ------------------------------------------------------------------ main
export function createFlyover(canvas, opts = {}) {
  const film = !!opts.film;
  const tier = opts.tier || (film ? 'film' : 'high');
  const Q = {
    film: { dpr: 1, grid: 480, shadow: 2048, nearStep: 9, farStep: 13, aa: true, lod: true, reflect: 512, hiDist: 110, modelDist: 300 },
    high: { dpr: Math.min(window.devicePixelRatio || 1, 1.5), grid: 560, shadow: 2048, nearStep: 9, farStep: 13, aa: true, lod: true, reflect: 768, hiDist: 160, modelDist: 460 },
    low: { dpr: 1, grid: 360, shadow: 1024, nearStep: 10.5, farStep: 18, aa: false, lod: false, reflect: 384, hiDist: -1, modelDist: 260 },
  }[tier];

  const dbg = new Set(opts.debug || []);
  if (dbg.has('noaa')) Q.aa = false;
  if (dbg.has('half')) Q.dpr = 0.5;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: Q.aa, preserveDrawingBuffer: film, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Q.dpr);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = !dbg.has('noshadow');
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = true;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 16 / 9, 0.5, 14000);
  const sun = sunVector(opts.sunAzimuth ?? SUN_DEFAULT.azimuth, opts.sunElevation ?? SUN_DEFAULT.elevation);
  installHaze(sun, PALETTE.horizonCool);
  scene.fog = new THREE.FogExp2(PALETTE.horizon.clone(), 0.00062);

  // ---- sky + environment
  const skyUniforms = {
    uSun: { value: sun.clone() }, uZenith: { value: PALETTE.zenith }, uHorizon: { value: PALETTE.horizon }, uHorizonCool: { value: PALETTE.horizonCool },
    uGlow: { value: PALETTE.glow }, uSunCol: { value: PALETTE.sunCol }, uTime: { value: 0 },
  };
  const skyMat = new THREE.ShaderMaterial({ vertexShader: SKY_VERT, fragmentShader: SKY_FRAG, uniforms: skyUniforms, side: THREE.BackSide, depthWrite: false, fog: false });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(5000, 48, 24), skyMat);
  sky.frustumCulled = false; sky.renderOrder = -10;
  scene.add(sky);

  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene();
  envScene.add(new THREE.Mesh(new THREE.SphereGeometry(100, 32, 16), skyMat));
  const envRT = pmrem.fromScene(envScene, 0.02, 0.1, 1000);
  scene.environment = envRT.texture;

  // ---- lights
  const sunLight = new THREE.DirectionalLight(col('#ffca94'), 3.7);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(Q.shadow, Q.shadow);
  const SH = 380;
  Object.assign(sunLight.shadow.camera, { left: -SH, right: SH, top: SH, bottom: -SH, near: 1, far: 4000 });
  sunLight.shadow.bias = -0.0004;
  sunLight.shadow.normalBias = 0.9;
  scene.add(sunLight, sunLight.target);
  const hemi = new THREE.HemisphereLight(col('#a9bfdc'), col('#4d4630'), 0.7);
  scene.add(hemi);

  // ---- terrain
  const NSEG = C.SEGMENTS.length, NGREEN = C.GREENS.length, NBUNK = C.BUNKERS.length, NLAWN = C.LAWNS.length;
  const bounds = new THREE.Vector4(BAKE.x0, BAKE.z0, BAKE.size, BAKE.size);
  const courseRT = new THREE.WebGLRenderTarget(BAKE.res, BAKE.res, {
    type: THREE.UnsignedByteType, format: THREE.RGBAFormat, generateMipmaps: true,
    minFilter: THREE.LinearMipmapLinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false,
  });
  {
    const bakeMat = new THREE.ShaderMaterial({
      uniforms: {
        uSeg: { value: C.SEGMENTS.map((s) => new THREE.Vector4(s.a[0], s.a[1], s.b[0], s.b[1])) },
        uSegW: { value: C.SEGMENTS.map((s) => new THREE.Vector2(s.hw, s.kind)) },
        uGreen: { value: C.GREENS.map((g) => new THREE.Vector4(g.x, g.z, g.rx, g.rz)) },
        uGreenX: { value: C.GREENS.map((g) => new THREE.Vector2(g.rot, g.biarritz)) },
        uBunk: { value: C.BUNKERS.map((b) => new THREE.Vector4(b.x, b.z, b.rx, b.rz)) },
        uBunkR: { value: C.BUNKERS.map((b) => b.rot) },
        uBounds: { value: bounds },
      },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
      fragmentShader: bakeGLSL({ seg: NSEG, green: NGREEN, bunk: NBUNK }),
      depthTest: false, depthWrite: false,
    });
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), bakeMat);
    quad.frustumCulled = false;
    const bakeScene = new THREE.Scene();
    bakeScene.add(quad);
    renderer.setRenderTarget(courseRT);
    renderer.render(bakeScene, new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1));
    renderer.setRenderTarget(null);
    bakeMat.dispose();
    quad.geometry.dispose();
  }
  const terrainUniforms = {
    uCourse: { value: courseRT.texture },
    uBounds: { value: bounds },
    uLawn: { value: C.LAWNS.map((l) => new THREE.Vector4(l.x, l.z, l.rx, l.rz)) },
    uWaterY: { value: C.WATER_Y },
  };
  for (const k of ['rough', 'rough2', 'forest', 'cut', 'fairA', 'fairB', 'green', 'greenB', 'sand', 'rock', 'mud', 'lawn']) {
    terrainUniforms['c' + k[0].toUpperCase() + k.slice(1)] = { value: PALETTE[k] };
  }
  const terrainMat = new THREE.MeshStandardMaterial({ roughness: 0.96, metalness: 0, envMapIntensity: 0.32 });
  terrainMat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, terrainUniforms);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWPos; varying vec3 vWNrm;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvWPos = (modelMatrix * vec4(position, 1.0)).xyz; vWNrm = normal;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\n' + terrainGLSL({ lawn: NLAWN }))
      .replace('#include <color_fragment>', 'diffuseColor.rgb = courseColor(vWPos, normalize(vWNrm));');
  };
  {
    // Build the full non-uniform grid once (so normals are seamless), then cut
    // it into tiles that the renderer can frustum-cull in every pass.
    const N = Q.grid, T = 8, per = N / T;
    const geo = new THREE.PlaneGeometry(2, 2, N, N);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    const f = (u) => Math.sign(u) * (1500 * Math.abs(u) + 3500 * Math.abs(u) ** 5);
    for (let i = 0; i < pos.count; i++) {
      const x = f(pos.getX(i)), z = f(pos.getZ(i));
      pos.setXYZ(i, x, C.height(x, z), z);
    }
    geo.computeVertexNormals();
    const P = pos.array, Nn = geo.attributes.normal.array;
    for (let ty = 0; ty < T; ty++) {
      for (let tx = 0; tx < T; tx++) {
        const vp = new Float32Array((per + 1) * (per + 1) * 3), vn = new Float32Array(vp.length);
        for (let j = 0; j <= per; j++) {
          for (let i = 0; i <= per; i++) {
            const g = ((ty * per + j) * (N + 1) + tx * per + i) * 3, l = (j * (per + 1) + i) * 3;
            vp[l] = P[g]; vp[l + 1] = P[g + 1]; vp[l + 2] = P[g + 2];
            vn[l] = Nn[g]; vn[l + 1] = Nn[g + 1]; vn[l + 2] = Nn[g + 2];
          }
        }
        const idx = [];
        for (let j = 0; j < per; j++) {
          for (let i = 0; i < per; i++) {
            const a = i + (per + 1) * j, b = i + (per + 1) * (j + 1), c = i + 1 + (per + 1) * (j + 1), d = i + 1 + (per + 1) * j;
            idx.push(a, b, d, b, c, d);
          }
        }
        const tg = new THREE.BufferGeometry();
        tg.setAttribute('position', new THREE.BufferAttribute(vp, 3));
        tg.setAttribute('normal', new THREE.BufferAttribute(vn, 3));
        tg.setIndex(idx);
        tg.computeBoundingSphere();
        const tile = new THREE.Mesh(tg, terrainMat);
        tile.receiveShadow = true;
        tile.castShadow = true;
        scene.add(tile);
      }
    }
    geo.dispose();
  }

  // ---- lake: planar reflector so the tree line and sky mirror in the water
  const waterTex = waterNormalTexture();
  const water = new Water(new THREE.CircleGeometry(1, 96), {
    textureWidth: Q.reflect,
    textureHeight: Q.reflect,
    waterNormals: waterTex,
    sunDirection: sun.clone(),
    sunColor: 0xffd2a0,
    waterColor: 0x0d2624,
    distortionScale: 0.35,
    fog: true,
  });
  // Water's vertex shader has no `transformed`; feed the haze varying directly.
  water.material.vertexShader = water.material.vertexShader.replace(
    '#include <fog_vertex>',
    '#ifdef USE_FOG\n  vFogDepth = - mvPosition.z;\n  vFogWorld = worldPosition.xyz;\n#endif',
  );
  water.material.uniforms.size.value = 0.9;
  water.rotation.x = -Math.PI / 2;
  water.scale.set(C.LAKE.rx * 1.7, C.LAKE.rz * 1.7, 1);
  water.position.set(C.LAKE.x, C.WATER_Y, C.LAKE.z);
  scene.add(water);
  if (dbg.has('nowater')) water.visible = false;

  // ---- trees
  // Cells of trees switch between detailed 3D, low-poly 3D and baked
  // billboards (impostors) by distance, so the forest can run to the horizon.
  const R = rng(1950);
  const TG = treeGeometries(rng(1950), 1);
  const TGlo = treeGeometries(rng(1950), 0);
  const TYPES = ['pine', 'oak', 'oakGold', 'oakRust', 'cedar', 'far'];
  const treeMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.88, metalness: 0, envMapIntensity: 0.22 });
  // modelled trees live in small cells (fine-grained LOD); every tree also
  // has a billboard in a big cell, hidden per-instance inside MODEL_DIST
  const TILE = 150, BIG = 540, EXT = 2700;
  const cells = new Map(), bigCells = new Map();
  const put = (type, x, z, s, tint, rot) => {
    const item = [x, z, s, tint, rot, TYPES.indexOf(type)];
    if (type !== 'far') {
      const key = Math.floor((x + EXT) / TILE) + ':' + Math.floor((z + EXT) / TILE);
      if (!cells.has(key)) cells.set(key, { byType: {} });
      (cells.get(key).byType[type] ||= []).push(item);
    }
    const bk = Math.floor((x + EXT) / BIG) + ':' + Math.floor((z + EXT) / BIG);
    if (!bigCells.has(bk)) bigCells.set(bk, []);
    bigCells.get(bk).push(item);
  };
  const tints = {
    green: [col('#ffffff'), col('#e6f0d0'), col('#d2dcc0'), col('#f2ead2')],
    autumn: [col('#e8d48a'), col('#e0bf86'), col('#d8cf8a'), col('#dcb486')],
  };
  // near ring: modelled trees around the course and flight route
  const near = (x, z) => x > -1150 && x < 760 && z > -1120 && z < 640;
  for (let gx = -EXT; gx < EXT; gx += Q.nearStep) {
    for (let gz = -EXT; gz < EXT; gz += Q.nearStep) {
      if (!near(gx, gz)) continue;
      const x = gx + (R() - 0.5) * Q.nearStep * 0.95, z = gz + (R() - 0.5) * Q.nearStep * 0.95;
      const cd = C.clearDist(x, z);
      const edge = 16 + noise(x * 0.018, z * 0.018) * 9;
      const lawn = C.LAWNS.some((l) => ((x - l.x) / l.rx) ** 2 + ((z - l.z) / l.rz) ** 2 < 0.85 + noise(x * 0.03, z * 0.03) * 0.2);
      if (cd < edge || lawn) {
        // the odd specimen tree out in the rough
        if (cd > 4 && R() < 0.012) put('oak', x, z, 1.0 + R() * 0.4, tints.green[0], R() * 6.28);
        continue;
      }
      const meadow = fbm(x * 0.0035 + 5, z * 0.0035 - 2, 3);
      if (meadow < -0.32 && R() < 0.85) continue;
      const species = noise(x * 0.006 - 9, z * 0.006 + 4);
      const pick = R();
      const type = species > 0.15 ? (pick < 0.72 ? 'pine' : pick < 0.9 ? 'oak' : 'cedar') : (pick < 0.62 ? 'oak' : pick < 0.88 ? 'pine' : 'cedar');
      const autumn = type === 'oak' && R() < 0.07;
      const kind = autumn ? (R() < 0.6 ? 'oakGold' : 'oakRust') : type;
      put(kind, x, z, (0.72 + R() * 0.55) * 1.12, tints.green[Math.floor(R() * 4)], R() * 6.28);
    }
  }
  // far ring: billboards only
  for (let gx = -2600; gx < 2600; gx += Q.farStep) {
    for (let gz = -2600; gz < 2600; gz += Q.farStep) {
      if (near(gx, gz)) continue;
      const x = gx + (R() - 0.5) * Q.farStep, z = gz + (R() - 0.5) * Q.farStep;
      const r = Math.hypot(x, z);
      if (r > 1900 || R() < smoothstep(1300, 1900, r) * 0.6) continue;
      if (C.clearDist(x, z) < 12) continue;
      if (fbm(x * 0.0035 + 5, z * 0.0035 - 2, 2) < -0.45) continue;
      const autumn = R() < 0.05;
      const pick = R();
      put(pick < 0.55 ? 'far' : pick < 0.85 ? 'pine' : autumn ? 'oakGold' : 'oak', x, z, 0.85 + R() * 0.6, tints.green[Math.floor(R() * 4)], R() * 6.28);
    }
  }

  // impostor atlas: each tree type rendered side-on into one cell, framed
  // tightly to its silhouette so billboards waste as little fill as possible
  const CELL_W = 160, CELL_H = 256;
  const impBounds = TYPES.map((t) => {
    const g = TG[t];
    g.computeBoundingBox();
    const b = g.boundingBox;
    const hw = Math.max(Math.abs(b.min.x), Math.abs(b.max.x), Math.abs(b.min.z), Math.abs(b.max.z)) * 0.92;
    return new THREE.Vector2(hw, b.max.y + 0.3);
  });
  const atlasRT = new THREE.WebGLRenderTarget(CELL_W * TYPES.length, CELL_H, { generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter, magFilter: THREE.LinearFilter });
  atlasRT.texture.colorSpace = THREE.SRGBColorSpace;
  {
    const bakeScene = new THREE.Scene();
    const basic = new THREE.MeshBasicMaterial({ vertexColors: true });
    const prevClear = renderer.getClearColor(new THREE.Color()), prevAlpha = renderer.getClearAlpha();
    renderer.setRenderTarget(atlasRT);
    renderer.setClearColor(0x000000, 0);
    renderer.clear();
    atlasRT.scissorTest = true; // the RT's own flag wins over renderer.setScissorTest
    TYPES.forEach((type, i) => {
      const cam = new THREE.OrthographicCamera(-impBounds[i].x, impBounds[i].x, impBounds[i].y, 0, -60, 60);
      cam.position.set(0, 0, 30);
      const m = new THREE.Mesh(TG[type], basic);
      bakeScene.add(m);
      atlasRT.viewport.set(i * CELL_W, 0, CELL_W, CELL_H);
      atlasRT.scissor.set(i * CELL_W, 0, CELL_W, CELL_H);
      renderer.setRenderTarget(atlasRT);
      renderer.render(bakeScene, cam);
      bakeScene.remove(m);
    });
    atlasRT.scissorTest = false;
    renderer.setRenderTarget(null);
    renderer.setClearColor(prevClear, prevAlpha);
    basic.dispose();
  }
  const impMat = new THREE.ShaderMaterial({
    uniforms: {
      uAtlas: { value: atlasRT.texture },
      uCells: { value: TYPES.length },
      uSun: { value: sun },
      uSunCol: { value: new THREE.Color() },
      uSky: { value: new THREE.Color() },
      uGround: { value: new THREE.Color() },
      uWarm: { value: PALETTE.horizon },
      uCool: { value: PALETTE.horizonCool },
      uFogD: { value: 0 },
      uNear: { value: 0 },
      uSize: { value: impBounds },
      uDebug: { value: dbg.has('redimp') ? 1 : 0 },
    },
    vertexShader: /* glsl */ `
      uniform float uNear; uniform vec2 uSize[${TYPES.length}];
      attribute vec4 aPos; attribute vec4 aInfo;
      varying vec2 vUv; varying vec3 vTint; varying float vType; varying vec3 vWorld; varying vec3 vRight; varying vec3 vToCam;
      void main(){
        vec3 toCam = cameraPosition - aPos.xyz; toCam.y = 0.0; toCam = normalize(toCam + vec3(1e-4, 0.0, 0.0));
        vec3 right = vec3(toCam.z, 0.0, -toCam.x);
        vec2 sz = uSize[int(aInfo.x + 0.5)];
        vec3 wp = aPos.xyz + right * (position.x * 2.0 * sz.x * aPos.w) + vec3(0.0, position.y * sz.y * aPos.w, 0.0);
        vUv = vec2(position.x + 0.5, position.y);
        vTint = aInfo.yzw; vType = aInfo.x; vWorld = wp; vRight = right; vToCam = toCam;
        gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
        // modelled trees cover everything inside uNear
        if (distance(aPos.xz, cameraPosition.xz) < uNear) gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D uAtlas; uniform float uCells;
      uniform vec3 uSun, uSunCol, uSky, uGround, uWarm, uCool; uniform float uFogD; uniform float uDebug;
      varying vec2 vUv; varying vec3 vTint; varying float vType; varying vec3 vWorld; varying vec3 vRight; varying vec3 vToCam;
      void main(){
        vec4 c = texture2D(uAtlas, vec2((vType + clamp(vUv.x, 0.01, 0.99)) / uCells, vUv.y));
        if (c.a < 0.45) discard;
        c.rgb /= max(c.a, 0.001); // mips blend toward transparent black: undo it
        vec2 q = vec2(vUv.x * 2.0 - 1.0, (vUv.y - 0.62) * 2.4);
        float r2 = min(dot(q, q), 1.0);
        vec3 n = normalize(vRight * q.x + vec3(0.0, q.y + 0.45, 0.0) + vToCam * sqrt(1.0 - r2));
        float diff = max(dot(n, uSun), 0.0);
        // foliage lets light through when backlit, brightest toward the rim
        float back = pow(max(dot(-vToCam, uSun), 0.0), 2.0) * (0.35 + 0.65 * r2);
        vec3 col = c.rgb * vTint * (mix(uGround, uSky, n.y * 0.5 + 0.5) + uSunCol * (diff * 0.9 + back * 0.45));
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        // haze after tone mapping, exactly like three's fog chunk
        float dist = length(vWorld - cameraPosition);
        float f = 1.0 - exp(-uFogD * uFogD * dist * dist);
        vec3 dir = normalize(vWorld - cameraPosition);
        gl_FragColor.rgb = mix(gl_FragColor.rgb, mix(uCool, uWarm, pow(max(dot(dir, uSun), 0.0), 3.0) * 0.85 + 0.15), f);
        if (uDebug > 0.5) gl_FragColor = vec4(1.0, 0.0, vUv.y, 1.0);
      }`,
  });
  const quad = new THREE.PlaneGeometry(1, 1).translate(0, 0.5, 0);

  const m4 = new THREE.Matrix4(), q4 = new THREE.Quaternion(), s4 = new THREE.Vector3(), p4 = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  let treeCount = 0;
  const treeCells = [];
  for (const [key, c] of cells) {
    const [cx, cz] = key.split(':').map(Number);
    const center = new THREE.Vector3((cx + 0.5) * TILE - EXT, 0, (cz + 0.5) * TILE - EXT);
    center.y = C.height(center.x, center.z);
    const cell = { center, radius: TILE * 0.71, meshes: [], state: '' };
    for (const [type, items] of Object.entries(c.byType)) {
      const mesh = new THREE.InstancedMesh(TGlo[type], treeMat, items.length);
      mesh.userData.lod = { hi: TG[type], lo: TGlo[type] };
      items.forEach(([x, z, s, tint, rot], i) => {
        q4.setFromAxisAngle(up, rot);
        s4.set(s, s * (0.9 + (rot % 0.2)), s);
        p4.set(x, C.height(x, z) - 0.4, z);
        m4.compose(p4, q4, s4);
        mesh.setMatrixAt(i, m4);
        mesh.setColorAt(i, tint);
      });
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();
      mesh.castShadow = mesh.receiveShadow = true;
      mesh.visible = false;
      scene.add(mesh);
      cell.meshes.push(mesh);
    }
    if (dbg.has('notrees')) cell.disabled = true;
    treeCells.push(cell);
  }
  for (const [key, items] of bigCells) {
    const [cx, cz] = key.split(':').map(Number);
    const center = new THREE.Vector3((cx + 0.5) * BIG - EXT, 0, (cz + 0.5) * BIG - EXT);
    center.y = C.height(center.x, center.z);
    const n = items.length;
    const g = new THREE.InstancedBufferGeometry();
    g.index = quad.index;
    g.setAttribute('position', quad.attributes.position);
    const aPos = new Float32Array(n * 4), aInfo = new Float32Array(n * 4);
    items.forEach(([x, z, s, tint, rot, ti], i) => {
      aPos.set([x, C.height(x, z) - 0.4, z, s * (0.95 + (rot % 0.2) * 0.5)], i * 4);
      aInfo.set([ti, tint.r, tint.g, tint.b], i * 4);
    });
    g.setAttribute('aPos', new THREE.InstancedBufferAttribute(aPos, 4));
    g.setAttribute('aInfo', new THREE.InstancedBufferAttribute(aInfo, 4));
    g.instanceCount = n;
    g.boundingSphere = new THREE.Sphere(center.clone().setY(center.y + 10), BIG * 0.75 + 60);
    const imp = new THREE.Mesh(g, impMat);
    imp.visible = !dbg.has('notrees') && !dbg.has('noimp');
    if (dbg.has('nocull')) imp.frustumCulled = false;
    scene.add(imp);
    treeCount += n;
  }
  {
    // impostor lighting matches three's physically based Lambert terms
    const k = 1 / Math.PI;
    impMat.uniforms.uSunCol.value.copy(sunLight.color).multiplyScalar(sunLight.intensity * k);
    // hemisphere + the sky's image-based light, which the 3D trees also receive
    impMat.uniforms.uSky.value.copy(hemi.color).multiplyScalar(hemi.intensity * k * 2.3);
    impMat.uniforms.uGround.value.copy(hemi.groundColor).multiplyScalar(hemi.intensity * k * 2.0);
    impMat.uniforms.uFogD.value = scene.fog.density;
  }

  // ---- clubhouse precinct
  const white = new THREE.MeshStandardMaterial({ color: col('#f1ece2'), roughness: 0.82 });
  const trim = new THREE.MeshStandardMaterial({ color: col('#ffffff'), roughness: 0.6 });
  const roofMat = new THREE.MeshStandardMaterial({ color: col('#3b4246'), roughness: 0.72, side: THREE.DoubleSide });
  const brick = new THREE.MeshStandardMaterial({ color: col('#9a5a43'), roughness: 0.9 });
  const glass = new THREE.MeshStandardMaterial({ color: col('#2b2620'), emissive: col('#ffb766'), emissiveIntensity: opts.windowGlow ?? 0.85, roughness: 0.3 });
  const deckMat = new THREE.MeshStandardMaterial({ color: col('#ddd5c4'), roughness: 0.9 });
  const asphalt = new THREE.MeshStandardMaterial({ color: col('#4a4945'), roughness: 0.95, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 });
  const box = (w, h, d, mat, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; return m; };

  const club = new THREE.Group();
  club.position.set(C.CLUBHOUSE.x, C.PADS.club, C.CLUBHOUSE.z);
  club.rotation.y = -C.CLUBHOUSE.rot;
  club.updateMatrixWorld();
  const wv = new THREE.Vector3();
  // local height of the real ground under a point in the clubhouse's frame
  const groundAt = (lx, lz) => { club.localToWorld(wv.set(lx, 0, lz)); return C.height(wv.x, wv.z) - C.PADS.club; };
  const drape = (geo, lift = 0.3) => {
    const a = geo.attributes.position;
    for (let i = 0; i < a.count; i++) a.setY(i, groundAt(a.getX(i), a.getZ(i)) + lift);
    geo.computeVertexNormals();
    return geo;
  };
  {
    club.add(box(40, 11, 18, white, 0, 5.5, 0));
    const r = new THREE.Mesh(hipRoof(40, 18, 6.5), roofMat); r.position.y = 11; r.castShadow = true; club.add(r);
    for (const sx of [-1, 1]) {
      club.add(box(24, 8, 15, white, sx * 31, 4, -1));
      const wr = new THREE.Mesh(hipRoof(24, 15, 4.6), roofMat); wr.position.set(sx * 31, 8, -1); wr.castShadow = true; club.add(wr);
      club.add(box(1.8, 5, 1.8, brick, sx * 11, 15, -2));
      for (let i = 0; i < 6; i++) club.add(box(2.1, 2.6, 0.2, glass, sx * (22 + i * 3.6), 4.2, 6.55));
    }
    // portico with columns and pediment
    for (let i = 0; i < 6; i++) {
      const c = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.48, 10, 12), trim);
      c.position.set(-9 + i * 3.6, 5, 12.2); c.castShadow = true; club.add(c);
    }
    club.add(box(22, 0.9, 7, trim, 0, 10.4, 11.5));
    const ped = new THREE.Mesh(gable(23, 4.2, 7.4), white); ped.position.set(0, 10.85, 8); ped.castShadow = true; club.add(ped);
    for (let row = 0; row < 2; row++) for (let i = 0; i < 9; i++) {
      if (row === 0 && i >= 3 && i <= 5) continue;
      club.add(box(2.1, 2.8, 0.2, glass, -16 + i * 4, 3.4 + row * 4.6, 9.05));
    }
    club.add(box(3.2, 4.4, 0.2, glass, 0, 2.4, 9.05));
    // back terrace facing the course + umbrellas
    club.add(box(46, 0.7, 13, deckMat, 0, 0.35, -15.5));
    for (let i = 0; i < 6; i++) {
      const u = new THREE.Mesh(new THREE.ConeGeometry(2, 0.8, 10), i % 2 ? trim : new THREE.MeshStandardMaterial({ color: col('#1f4a3a'), roughness: 0.8 }));
      u.position.set(-17 + i * 6.8, 3, -16); u.castShadow = true; club.add(u);
    }
    // entrance circle and a parking court south of it, both laid on the ground
    const ringGeo = new THREE.RingGeometry(13, 19, 64, 3).rotateX(-Math.PI / 2).translate(0, 0, 32);
    const ring = new THREE.Mesh(drape(ringGeo), asphalt); ring.receiveShadow = true; club.add(ring);
    const lotGeo = new THREE.PlaneGeometry(60, 30, 20, 10).rotateX(-Math.PI / 2).translate(-6, 0, 76);
    const lot = new THREE.Mesh(drape(lotGeo), asphalt); lot.receiveShadow = true; club.add(lot);
    const driveGeo = new THREE.PlaneGeometry(7, 14, 2, 6).rotateX(-Math.PI / 2).translate(0, 0, 56);
    club.add(Object.assign(new THREE.Mesh(drape(driveGeo), asphalt), { receiveShadow: true }));
    const carCols = ['#e9e7e1', '#1d1f22', '#7b8288', '#2e3e5c', '#8a1f24', '#c9c4b8', '#3a4a3c'].map(col);
    const carGeo = new THREE.BoxGeometry(1.9, 1.45, 4.5);
    const cars = new THREE.InstancedMesh(carGeo, new THREE.MeshStandardMaterial({ roughness: 0.35, metalness: 0.4 }), 44);
    let ci = 0;
    for (let row = 0; row < 3; row++) for (let i = 0; i < 13; i++) {
      if (R() < 0.22) continue;
      const lx = -32 + i * 4.3, lz = 66 + row * 10;
      m4.compose(p4.set(lx, groundAt(lx, lz) + 0.75, lz), q4.identity(), s4.set(1, 1, 1));
      cars.setMatrixAt(ci, m4); cars.setColorAt(ci, carCols[Math.floor(R() * carCols.length)]); ci++;
    }
    cars.count = ci; cars.castShadow = true; club.add(cars);
  }
  scene.add(club);

  // tennis: 15 Har-Tru courts with windscreens and a pavilion
  {
    const T = C.TENNIS;
    const W = T.cols * T.cw, L = T.rows * T.cl;
    const cv = document.createElement('canvas');
    const ppm = 12; cv.width = Math.round(W * ppm); cv.height = Math.round(L * ppm);
    const g = cv.getContext('2d');
    g.fillStyle = '#2f4a37'; g.fillRect(0, 0, cv.width, cv.height);
    for (let cx = 0; cx < T.cols; cx++) for (let cz = 0; cz < T.rows; cz++) {
      const ox = cx * T.cw * ppm, oz = cz * T.cl * ppm;
      g.fillStyle = '#6c8f62'; g.fillRect(ox + 0.6 * ppm, oz + 0.6 * ppm, (T.cw - 1.2) * ppm, (T.cl - 1.2) * ppm);
      const mx = ox + (T.cw * ppm) / 2, mz = oz + (T.cl * ppm) / 2;
      const hw = 5.485 * ppm, sw = 4.115 * ppm, hl = 11.885 * ppm, sl = 6.4 * ppm;
      g.strokeStyle = 'rgba(255,255,255,0.95)'; g.lineWidth = 1.4;
      g.strokeRect(mx - hw, mz - hl, hw * 2, hl * 2);
      g.beginPath();
      g.moveTo(mx - sw, mz - hl); g.lineTo(mx - sw, mz + hl); g.moveTo(mx + sw, mz - hl); g.lineTo(mx + sw, mz + hl);
      g.moveTo(mx - sw, mz - sl); g.lineTo(mx + sw, mz - sl); g.moveTo(mx - sw, mz + sl); g.lineTo(mx + sw, mz + sl);
      g.moveTo(mx, mz - sl); g.lineTo(mx, mz + sl);
      g.stroke();
      g.strokeStyle = 'rgba(20,24,22,0.9)'; g.lineWidth = 2.2;
      g.beginPath(); g.moveTo(mx - hw - 0.9 * ppm, mz); g.lineTo(mx + hw + 0.9 * ppm, mz); g.stroke();
    }
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
    const courts = new THREE.Mesh(new THREE.PlaneGeometry(W, L), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95 }));
    courts.rotation.x = -Math.PI / 2;
    const grp = new THREE.Group();
    grp.add(courts); courts.receiveShadow = true;
    const screen = new THREE.MeshStandardMaterial({ color: col('#1e3b2c'), roughness: 0.9 });
    for (let cz = 0; cz <= T.rows; cz++) grp.add(box(W, 3, 0.15, screen, 0, 1.5, -L / 2 + cz * T.cl));
    for (const sx of [-1, 1]) grp.add(box(0.15, 3, L, screen, sx * W / 2, 1.5, 0));
    grp.add(box(16, 5, 10, white, W / 2 + 13, 2.5, -L / 2 + 14));
    const pr = new THREE.Mesh(hipRoof(16, 10, 3.6), roofMat); pr.position.set(W / 2 + 13, 5, -L / 2 + 14); pr.castShadow = true; grp.add(pr);
    grp.position.set(T.x, C.PADS.tennis + 0.06, T.z);
    grp.rotation.y = -T.rot;
    scene.add(grp);
  }

  // pools: main, diving well and children's pool on a shared deck
  {
    const P = C.POOLS;
    const grp = new THREE.Group();
    const deck = box(P.deck[0], 0.6, P.deck[1], deckMat, 0, 0.3, 0); deck.castShadow = false; grp.add(deck);
    const poolMat = new THREE.MeshStandardMaterial({ color: col('#3fbcc8'), emissive: col('#0b6670'), emissiveIntensity: 0.55, roughness: 0.08, envMapIntensity: 0.9, normalMap: waterTex, normalScale: new THREE.Vector2(0.12, 0.12) });
    const laneMat = new THREE.MeshStandardMaterial({ color: col('#1f5d8a'), emissive: col('#0d3350'), emissiveIntensity: 0.3 });
    for (const p of P.pools) {
      grp.add(box(p.w + 1.2, 0.08, p.d + 1.2, trim, p.dx, 0.64, p.dz));
      const w = new THREE.Mesh(new THREE.PlaneGeometry(p.w, p.d), poolMat); w.rotation.x = -Math.PI / 2; w.position.set(p.dx, 0.7, p.dz); grp.add(w);
    }
    const main = P.pools[0];
    for (let i = 1; i < 8; i++) {
      const l = new THREE.Mesh(new THREE.PlaneGeometry(main.w - 3, 0.25), laneMat); l.rotation.x = -Math.PI / 2; l.position.set(main.dx, 0.71, main.dz - main.d / 2 + (i * main.d) / 8); grp.add(l);
    }
    const umbrellaA = new THREE.MeshStandardMaterial({ color: col('#f5efe2'), roughness: 0.8 });
    const umbrellaB = new THREE.MeshStandardMaterial({ color: col('#1f4a3a'), roughness: 0.8 });
    const chairs = new THREE.InstancedMesh(new THREE.BoxGeometry(0.75, 0.35, 2), trim, 60);
    let k = 0;
    for (let i = 0; i < 9; i++) {
      const x = -44 + i * 10, z = 24;
      const u = new THREE.Mesh(new THREE.ConeGeometry(1.9, 0.7, 10), i % 2 ? umbrellaA : umbrellaB); u.position.set(x, 3.2, z); u.castShadow = true; grp.add(u);
      for (const dx of [-1.4, 1.4]) { m4.compose(p4.set(x + dx, 0.78, z - 0.6), q4.identity(), s4.set(1, 1, 1)); chairs.setMatrixAt(k++, m4); }
    }
    for (let i = 0; i < 12; i++) { m4.compose(p4.set(-40 + i * 6.5, 0.78, -24), q4.identity(), s4.set(1, 1, 1)); chairs.setMatrixAt(k++, m4); }
    chairs.count = k; chairs.castShadow = true; grp.add(chairs);
    grp.add(box(20, 4.5, 8, white, 30, 2.6, -26));
    const hr = new THREE.Mesh(hipRoof(20, 8, 3), roofMat); hr.position.set(30, 4.85, -26); hr.castShadow = true; grp.add(hr);
    grp.position.set(P.x, C.PADS.pool, P.z);
    grp.rotation.y = -P.rot;
    scene.add(grp);
  }

  // flags
  const flags = [];
  {
    const pole = new THREE.CylinderGeometry(0.07, 0.07, 3.6, 6).translate(0, 1.8, 0);
    const poleMat = new THREE.MeshStandardMaterial({ color: col('#f7f5ef'), roughness: 0.5 });
    const flagMat = new THREE.MeshStandardMaterial({ color: col('#c41e2c'), roughness: 0.7, side: THREE.DoubleSide });
    for (const f of C.FLAGS) {
      const y = C.height(f.x, f.z);
      const p = new THREE.Mesh(pole, poleMat); p.position.set(f.x, y, f.z); p.castShadow = true; p.scale.setScalar(1.35);
      const fg = new THREE.PlaneGeometry(1.25, 0.8, 8, 2).translate(0.625, 3.15, 0);
      const fm = new THREE.Mesh(fg, flagMat); fm.position.copy(p.position); fm.scale.setScalar(1.35); fm.rotation.y = 0.6; fm.castShadow = true;
      scene.add(p, fm);
      flags.push({ mesh: fm, base: Float32Array.from(fg.attributes.position.array) });
    }
  }

  // ------------------------------------------------------------------ flight path
  const curve = new THREE.CatmullRomCurve3(C.ROUTE.map((w) => new THREE.Vector3(w.p[0], w.alt, w.p[1])), true, 'centripetal');
  const NS = 3600;
  const samples = curve.getSpacedPoints(NS).slice(0, NS);
  const pathLen = curve.getLength();
  const ds = pathLen / NS;
  // ground + canopy ceiling along the path, then max-filter and smooth
  const ceil = samples.map((s) => {
    const g = C.height(s.x, s.z);
    return Math.max(g, C.WATER_Y) + (C.clearDist(s.x, s.z) > 12 ? 22 : 0);
  });
  const win = Math.round(70 / ds);
  const maxed = ceil.map((_, i) => { let m = -1e9; for (let k = -win; k <= win; k++) m = Math.max(m, ceil[(i + k + NS) % NS]); return m; });
  const smooth = maxed.map((_, i) => { let s = 0; for (let k = -win; k <= win; k++) s += maxed[(i + k + NS) % NS]; return s / (2 * win + 1); });
  const chapterAt = samples.map((s) => {
    let best = 0, bd = Infinity;
    C.ROUTE.forEach((w, i) => { const d = Math.hypot(w.p[0] - s.x, w.p[1] - s.z); if (d < bd) { bd = d; best = i; } });
    return C.ROUTE[best].chapter;
  });
  const sampleAt = (s, out) => {
    const u = ((s / ds) % NS + NS) % NS;
    const i = Math.floor(u), j = (i + 1) % NS, f = u - i;
    const a = samples[i], b = samples[j];
    out.set(lerp(a.x, b.x, f), lerp(smooth[i], smooth[j], f) + lerp(a.y, b.y, f), lerp(a.z, b.z, f));
    return i;
  };

  const SPEED = 19; // m/s
  const state = { chapter: 0, alt: 0, hdg: 0, progress: 0, sunX: 0, sunY: 0, sunVisible: 0, trees: treeCount, ready: true };
  const vA = new THREE.Vector3(), vB = new THREE.Vector3(), fwd = new THREE.Vector3(), look = new THREE.Vector3(), tmp = new THREE.Vector3();
  const ease = (x) => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
  const intro = opts.intro ?? 6;

  function headingAt(s) {
    sampleAt(s, vA); sampleAt(s + 30, vB);
    return Math.atan2(vB.x - vA.x, -(vB.z - vA.z));
  }

  function placeCamera(t) {
    const s = t * SPEED;
    const idx = sampleAt(s, vA);
    // forward = average direction to a few points ahead (smooth yaw)
    fwd.set(0, 0, 0);
    for (const ahead of [25, 50, 80]) { sampleAt(s + ahead, vB); fwd.add(tmp.subVectors(vB, vA).setY(0).normalize()); }
    fwd.normalize();
    const k = ease(t / intro);
    const pos = vA.clone();
    pos.y += 65 * (1 - k);
    pos.x += Math.sin(t * 0.7) * 0.35; pos.y += Math.sin(t * 1.1) * 0.25; pos.z += Math.cos(t * 0.53) * 0.35;
    const pitch = THREE.MathUtils.degToRad(lerp(-50, -14, k) + Math.sin(t * 0.31) * 1.2);
    look.copy(pos).addScaledVector(fwd, Math.cos(pitch) * 100);
    look.y += Math.sin(pitch) * 100;
    camera.position.copy(pos);
    camera.up.set(0, 1, 0);
    camera.lookAt(look);
    let dh = headingAt(s + 60) - headingAt(s);
    if (dh > Math.PI) dh -= Math.PI * 2; if (dh < -Math.PI) dh += Math.PI * 2;
    camera.rotateZ(clamp(-dh * 0.55, -0.11, 0.11));

    state.chapter = chapterAt[idx];
    state.alt = pos.y - Math.max(C.height(pos.x, pos.z), C.WATER_Y);
    state.hdg = (THREE.MathUtils.radToDeg(Math.atan2(fwd.x, -fwd.z)) + 360) % 360;
    state.progress = (((s % pathLen) + pathLen) % pathLen) / pathLen;
    return fwd;
  }

  function aimCamera(p, target, fov = 50) {
    camera.position.set(...p);
    camera.up.set(0, 1, 0);
    camera.lookAt(...target);
    camera.fov = fov; camera.updateProjectionMatrix();
    return tmp.set(target[0] - p[0], 0, target[2] - p[2]).normalize();
  }

  const shadowFocus = new THREE.Vector3();
  const lightRight = new THREE.Vector3().crossVectors(sun, new THREE.Vector3(0, 1, 0)).normalize();
  const lightUp = new THREE.Vector3().crossVectors(lightRight, sun).normalize();
  function placeShadow(forward) {
    shadowFocus.copy(camera.position).addScaledVector(forward, SH * 0.55);
    shadowFocus.y = C.height(shadowFocus.x, shadowFocus.z);
    // snap to shadow-map texels so shadows don't shimmer as the camera moves
    const texel = (2 * SH) / Q.shadow;
    const a = Math.round(shadowFocus.dot(lightRight) / texel) * texel - shadowFocus.dot(lightRight);
    const b = Math.round(shadowFocus.dot(lightUp) / texel) * texel - shadowFocus.dot(lightUp);
    shadowFocus.addScaledVector(lightRight, a).addScaledVector(lightUp, b);
    sunLight.target.position.copy(shadowFocus);
    sunLight.position.copy(shadowFocus).addScaledVector(sun, 1800);
    sunLight.target.updateMatrixWorld();
  }

  function animate(t) {
    skyUniforms.uTime.value = t;
    water.material.uniforms.time.value = t * 0.6;
    for (const f of flags) {
      const a = f.mesh.geometry.attributes.position;
      for (let i = 0; i < a.count; i++) {
        const bx = f.base[i * 3];
        a.setZ(i, Math.sin(bx * 4.2 - t * 7.5) * 0.14 * bx);
      }
      a.needsUpdate = true;
    }
  }

  function projectSun() {
    tmp.copy(camera.position).addScaledVector(sun, 4000).project(camera);
    state.sunX = (tmp.x * 0.5 + 0.5);
    state.sunY = (1 - (tmp.y * 0.5 + 0.5));
    state.sunVisible = tmp.z < 1 && Math.abs(tmp.x) < 1.6 && Math.abs(tmp.y) < 1.6 ? 1 : 0;
  }

  // near cells: detailed crowns; mid: low-poly; beyond MODEL_DIST: billboards
  const HI_DIST = Q.lod && !dbg.has('nohi') ? Q.hiDist : -1, MODEL_DIST = dbg.has('allimp') ? 0 : Q.modelDist;
  impMat.uniforms.uNear.value = MODEL_DIST;
  function updateLod() {
    for (const c of treeCells) {
      // horizontal distance to the cell's nearest point, matching the billboard cut
      const d = Math.max(0, Math.hypot(camera.position.x - c.center.x, camera.position.z - c.center.z) - c.radius);
      const state = c.disabled ? 'off' : d < MODEL_DIST ? (d < HI_DIST ? 'hi' : 'lo') : 'off';
      if (state === c.state) continue;
      c.state = state;
      for (const m of c.meshes) {
        m.visible = state !== 'off';
        m.geometry = state === 'hi' ? m.userData.lod.hi : m.userData.lod.lo;
      }
    }
  }

  function draw() {
    updateLod();
    sky.position.copy(camera.position);
    renderer.info.autoReset = false;
    renderer.info.reset();
    renderer.render(scene, camera);
    state.calls = renderer.info.render.calls;
    state.tris = renderer.info.render.triangles;
  }

  const PRESETS = {
    clubhouse: { p: [-74, C.PADS.club + 30, 104], t: [8, C.PADS.club + 7, 4], fov: 34 },
    tennis: { p: [-36, C.PADS.tennis + 64, 160], t: [-128, C.PADS.tennis, 72], fov: 46 },
    pools: { p: [128, C.PADS.pool + 52, 118], t: [66, C.PADS.pool, 48], fov: 44 },
    lake: { p: [-150, C.WATER_Y + 44, -222], t: [-172, C.WATER_Y + 1, -402], fov: 46 },
    redan: { p: [-700, C.height(-660, -470) + 40, -500], t: [-648, C.height(-650, -398), -398], fov: 46 },
    aerial: { p: [-120, 330, 420], t: [-300, 0, -330], fov: 50 },
  };

  if (dbg.size) window.__scene = scene;
  return {
    state,
    camera,
    setPixelRatio(r) {
      if (renderer.getPixelRatio() === r) return;
      const v = renderer.getSize(new THREE.Vector2());
      renderer.setPixelRatio(r);
      renderer.setSize(v.x, v.y, false);
    },
    resize(w, h) {
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    },
    renderAt(t) {
      animate(t);
      const f = placeCamera(t);
      camera.fov = 50; camera.updateProjectionMatrix();
      placeShadow(f);
      projectSun();
      draw();
    },
    renderView(p, target, fov = 50, t = 0) {
      animate(t);
      placeShadow(aimCamera(p, target, fov));
      projectSun();
      draw();
    },
    renderPreset(name, t = 0) {
      const P = PRESETS[name];
      animate(t);
      const f = aimCamera(P.p, P.t, P.fov);
      placeShadow(f);
      projectSun();
      draw();
    },
    presets: Object.keys(PRESETS),
    pathLength: pathLen,
    speed: SPEED,
    dispose() {
      renderer.dispose();
      courseRT.dispose();
      atlasRT.dispose();
      pmrem.dispose();
      envRT.dispose();
    },
  };
}
