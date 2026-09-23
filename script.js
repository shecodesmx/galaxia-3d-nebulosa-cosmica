// import { AdditiveBlending, BufferAttribute, BufferGeometry, CanvasTexture, Color, 
// PerspectiveCamera, Points, RawShaderMaterial, Scene, WebGLRenderer } from "https://cdn.skypack.dev/three@0.136.0"
// import { OrbitControls } from "https://cdn.skypack.dev/three@0.136.0/examples/jsm/controls/OrbitControls"
// import { TWEEN } from "https://cdn.skypack.dev/three@0.136.0/examples/jsm/libs/tween.module.min.js"

import { AdditiveBlending, BufferAttribute, BufferGeometry, CanvasTexture, Color, 
PerspectiveCamera, Points, RawShaderMaterial, Scene, WebGLRenderer } from "https://esm.sh/three@0.136.0"
import { OrbitControls } from "https://esm.sh/three@0.136.0/examples/jsm/controls/OrbitControls"
import { TWEEN } from "https://esm.sh/three@0.136.0/examples/jsm/libs/tween.module.min.js"
console.clear()

setTimeout(() => {
  document.querySelector('.loading').style.opacity = '0';
  setTimeout(() => {
    document.querySelector('.loading').style.display = 'none';
  }, 500);
}, 2000);

const count = 150 ** 2

const scene = new Scene()

const camera = new PerspectiveCamera(
  75, innerWidth / innerHeight, 0.1, 1000
)
camera.position.set(0, 2, 5)

const renderer = new WebGLRenderer({ 
  canvas: document.getElementById('canvas'),
  antialias: true 
})
renderer.setSize(innerWidth, innerHeight)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
renderer.setClearColor(0x000000)

const orbit = new OrbitControls(camera, canvas)
orbit.enableDamping = true
orbit.dampingFactor = 0.05
orbit.autoRotate = false
orbit.autoRotateSpeed = 0.5

const ctx = document.createElement("canvas").getContext("2d")
ctx.canvas.width = ctx.canvas.height = 128

ctx.clearRect(0, 0, 128, 128)

let grd = ctx.createRadialGradient(64, 64, 0, 64, 64, 64)
grd.addColorStop(0.0, "rgba(255, 255, 255, 1)")
grd.addColorStop(0.2, "rgba(255, 255, 255, 0.8)")
grd.addColorStop(0.4, "rgba(200, 200, 255, 0.3)")
grd.addColorStop(1.0, "rgba(150, 150, 255, 0)")
ctx.fillStyle = grd
ctx.fillRect(0, 0, 128, 128)

grd = ctx.createRadialGradient(64, 64, 0, 64, 64, 32)
grd.addColorStop(0.0, "rgba(255, 255, 255, 1)")
grd.addColorStop(1.0, "rgba(255, 255, 255, 0)")
ctx.fillStyle = grd
ctx.beginPath()
ctx.arc(64, 64, 32, 0, Math.PI * 2)
ctx.fill()

const alphaMap = new CanvasTexture(ctx.canvas)

const galaxyGeometry = new BufferGeometry()

const galaxyPosition = new Float32Array(count * 3)
const galaxySeed = new Float32Array(count * 3)
const galaxySize = new Float32Array(count)
const galaxyColor = new Float32Array(count * 3)

for (let i = 0; i < count; i++) {
  galaxyPosition[i * 3] = i / count
  galaxySeed[i * 3 + 0] = Math.random()
  galaxySeed[i * 3 + 1] = Math.random()
  galaxySeed[i * 3 + 2] = Math.random()
  galaxySize[i] = Math.random() * 3 + 0.5
  
  if (Math.random() > 0.9) {
    galaxyColor[i * 3 + 0] = Math.random() * 0.5 + 0.5
    galaxyColor[i * 3 + 1] = Math.random() * 0.3 + 0.2
    galaxyColor[i * 3 + 2] = Math.random() * 0.5 + 0.5
  } else {
    galaxyColor[i * 3 + 0] = 1.0
    galaxyColor[i * 3 + 1] = 1.0
    galaxyColor[i * 3 + 2] = 1.0
  }
}

galaxyGeometry.setAttribute("position", new BufferAttribute(galaxyPosition, 3))
galaxyGeometry.setAttribute("size", new BufferAttribute(galaxySize, 1))
galaxyGeometry.setAttribute("seed", new BufferAttribute(galaxySeed, 3))
galaxyGeometry.setAttribute("color", new BufferAttribute(galaxyColor, 3))

const innColor = new Color("#336666")
const outColor = new Color("#631886")

const shaderUtils = `
float random (vec2 st) {
  return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

vec3 scatter (vec3 seed) {
  float u = random(seed.xy);
  float v = random(seed.yz);
  float theta = u * 6.28318530718;
  float phi = acos(2.0 * v - 1.0);

  float sinTheta = sin(theta);
  float cosTheta = cos(theta);
  float sinPhi = sin(phi);
  float cosPhi = cos(phi);

  float x = sinPhi * cosTheta;
  float y = sinPhi * sinTheta;
  float z = cosPhi;

  return vec3(x, y, z);
}
`

const galaxyMaterial = new RawShaderMaterial({
  uniforms: {
    uTime: { value: 0 },
    uSize: { value: renderer.getPixelRatio() * 0.5 },
    uBranches: { value: 4 },
    uRadius: { value: 0 },
    uSpin: { value: Math.PI * 0.5 },
    uRandomness: { value: 0 },
    uAlphaMap: { value: alphaMap },
    uColorInn: { value: innColor },
    uColorOut: { value: outColor },
    uPulse: { value: 0.0 },
  },

  vertexShader: `
precision highp float;

attribute vec3 position;
attribute float size;
attribute vec3 seed;
attribute vec3 color;
uniform mat4 projectionMatrix;
uniform mat4 modelViewMatrix;

uniform float uTime;
uniform float uSize;
uniform float uBranches;
uniform float uRadius;
uniform float uSpin;
uniform float uRandomness;
uniform float uPulse;

varying float vDistance;
varying vec3 vColor;

#define PI  3.14159265359
#define PI2 6.28318530718

${shaderUtils}

void main() {
  vec3 p = position;
  float st = sqrt(p.x);
  float qt = p.x * p.x;
  float mt = mix(st, qt, p.x);

  float angle = qt * uSpin * (2.0 - sqrt(1.0 - qt));
  float branchOffset = (PI2 / uBranches) * floor(seed.x * uBranches);
  p.x = position.x * cos(angle + branchOffset) * uRadius;
  p.z = position.x * sin(angle + branchOffset) * uRadius;

  p += scatter(seed) * random(seed.zx) * uRandomness * mt;
  p.y *= 0.5 + qt * 0.5;

  float pulse = sin(uTime * 2.0 + position.x * 10.0) * 0.1 * uPulse;
  p *= (1.0 + pulse);

  vec3 temp = p;
  float ac = cos(-uTime * (2.0 - st) * 0.3);
  float as = sin(-uTime * (2.0 - st) * 0.3);
  p.x = temp.x * ac - temp.z * as;
  p.z = temp.x * as + temp.z * ac;

  vDistance = mt;
  vColor = color;

  vec4 mvp = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mvp;
  gl_PointSize = (15.0 * size * uSize * (1.0 + pulse)) / -mvp.z;
}
`,

  fragmentShader: `
precision highp float;

uniform vec3 uColorInn;
uniform vec3 uColorOut;
uniform sampler2D uAlphaMap;
uniform float uTime;

varying float vDistance;
varying vec3 vColor;

#define PI  3.14159265359

void main() {
  vec2 uv = vec2(gl_PointCoord.x, 1.0 - gl_PointCoord.y);
  float a = texture2D(uAlphaMap, uv).r;
  if (a < 0.05) discard;

  float flicker = 0.8 + 0.2 * sin(uTime * 10.0 + gl_PointCoord.x * 100.0);
  a *= flicker;

  vec3 baseColor = mix(uColorInn, uColorOut, vDistance);
  vec3 finalColor = mix(baseColor, vColor, 0.3);
  
  float glow = 1.0 - vDistance * 0.5;
  finalColor += vec3(0.2, 0.1, 0.3) * glow;

  float flash = sin(uTime * 5.0 + gl_PointCoord.y * 20.0) * 0.2 + 0.8;
  finalColor *= flash;

  gl_FragColor = vec4(finalColor, a * 0.9);
}
`,

  transparent: true,
  depthTest: false,
  depthWrite: false,
  blending: AdditiveBlending,
})

const galaxy = new Points(galaxyGeometry, galaxyMaterial)
scene.add(galaxy)

const universeCount = count / 3
const universeGeometry = new BufferGeometry()

const universePosition = new Float32Array(universeCount * 3)
const universeSeed = new Float32Array(universeCount * 3)
const universeSize = new Float32Array(universeCount)
const universeColor = new Float32Array(universeCount * 3)

for (let i = 0; i < universeCount; i++) {
  universeSeed[i * 3 + 0] = Math.random()
  universeSeed[i * 3 + 1] = Math.random()
  universeSeed[i * 3 + 2] = Math.random()
  universeSize[i] = Math.random() * 4 + 1.0
  
  universeColor[i * 3 + 0] = Math.random() * 0.3 + 0.1
  universeColor[i * 3 + 1] = Math.random() * 0.2 + 0.1
  universeColor[i * 3 + 2] = Math.random() * 0.5 + 0.3
}

universeGeometry.setAttribute("position", new BufferAttribute(universePosition, 3))
universeGeometry.setAttribute("seed", new BufferAttribute(universeSeed, 3))
universeGeometry.setAttribute("size", new BufferAttribute(universeSize, 1))
universeGeometry.setAttribute("color", new BufferAttribute(universeColor, 3))

const universeMaterial = new RawShaderMaterial({
  uniforms: {
    uTime: { value: 0 },
    uSize: galaxyMaterial.uniforms.uSize,
    uRadius: galaxyMaterial.uniforms.uRadius,
    uAlphaMap: { value: alphaMap },
    uPulse: galaxyMaterial.uniforms.uPulse,
  },

  vertexShader: `
precision highp float;

attribute vec3 seed;
attribute float size;
attribute vec3 color;
uniform mat4 projectionMatrix;
uniform mat4 modelViewMatrix;

uniform float uTime;
uniform float uSize;
uniform float uRadius;
uniform float uPulse;

#define PI  3.14159265359
#define PI2 6.28318530718

${shaderUtils}

const float r = 5.0;
const vec3 s = vec3(2.5, 1.8, 2.5);

varying vec3 vColor;

void main() {
  vec3 p = scatter(seed) * r * s;

  float q = random(seed.zx);
  for (int i = 0; i < 3; i++) q *= q;
  p *= q;

  float l = length(p) / (s.x * r);
  p = l < 0.001 ? (p / l) : p;

  float pulse = sin(uTime * 1.5 + seed.x * 20.0) * 0.15 * uPulse;
  p *= (1.0 + pulse);

  vec3 temp = p;
  float ql = 1.0 - l;
  for (int i = 0; i < 3; i++) ql *= ql;
  float ac = cos(-uTime * ql * 0.2);
  float as = sin(-uTime * ql * 0.2);
  p.x = temp.x * ac - temp.z * as;
  p.z = temp.x * as + temp.z * ac;

  vColor = color * (1.0 + pulse * 2.0);

  vec4 mvp = modelViewMatrix * vec4(p * uRadius * 1.5, 1.0);
  gl_Position = projectionMatrix * mvp;

  l = (2.0 - l) * (2.0 - l);

  gl_PointSize = (r * size * uSize * l * (1.0 + pulse)) / -mvp.z;
}
`,

  fragmentShader: `
precision highp float;

uniform sampler2D uAlphaMap;
uniform float uTime;

varying vec3 vColor;

#define PI 3.14159265359

void main() {
  vec2 uv = vec2(gl_PointCoord.x, 1.0 - gl_PointCoord.y);
  float a = texture2D(uAlphaMap, uv).r;
  if (a < 0.05) discard;

  float flicker = 0.7 + 0.3 * sin(uTime * 8.0 + gl_PointCoord.x * 50.0);
  
  float dist = length(gl_PointCoord - 0.5);
  float glow = 1.0 - dist * 2.0;
  glow = max(0.0, glow);
  
  vec3 finalColor = vColor * flicker + vec3(0.1, 0.05, 0.2) * glow;
  
  gl_FragColor = vec4(finalColor, a * 0.7);
}
`,

  transparent: true,
  depthTest: false,
  depthWrite: false,
  blending: AdditiveBlending,
})

const universe = new Points(universeGeometry, universeMaterial)
scene.add(universe)

new TWEEN.Tween({
  radius: 0,
  spin: 0,
  randomness: 0,
  pulse: 0,
  rotate: 0,
  cameraZ: 5,
}).to({
  radius: 2.0,
  spin: Math.PI * 3,
  randomness: 0.7,
  pulse: 0.5,
  rotate: Math.PI * 6,
  cameraZ: 8,
})
.duration(8000)
.easing(TWEEN.Easing.Exponential.Out)
.onUpdate(({ radius, spin, randomness, pulse, rotate, cameraZ }) => {
  galaxyMaterial.uniforms.uRadius.value = radius
  galaxyMaterial.uniforms.uSpin.value = spin
  galaxyMaterial.uniforms.uRandomness.value = randomness
  galaxyMaterial.uniforms.uPulse.value = pulse
  camera.position.z = cameraZ
  galaxy.rotation.y = rotate
  universe.rotation.y = rotate / 2
  
  const title = document.querySelector('.title')
  title.style.opacity = (radius / 2.0).toString()
})
.onComplete(() => {
  document.querySelector('.title').style.opacity = '0.3'
  orbit.autoRotate = true
})
.start()

let time = 0
renderer.setAnimationLoop(() => {
  time += 0.01
  galaxyMaterial.uniforms.uTime.value = time
  universeMaterial.uniforms.uTime.value = time
  
  galaxyMaterial.uniforms.uPulse.value = 0.3 + Math.sin(time * 0.5) * 0.2
  
  TWEEN.update()
  orbit.update()
  renderer.render(scene, camera)
})

addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  galaxyMaterial.uniforms.uSize.value = renderer.getPixelRatio() * 0.5
})

canvas.addEventListener('dblclick', () => {
  orbit.reset()
})