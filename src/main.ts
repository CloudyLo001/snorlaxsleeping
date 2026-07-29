import * as THREE from "three";
import { SparkRenderer } from "@sparkjsdev/spark";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { remoteWorldRuntime } from "./assets";
import { loadMintWorld, type MintWorld } from "./scene/world";
import { loadSnorlax, type Snorlax } from "./scene/snorlax";
import { createSnoreBubble, type SnoreBubble } from "./scene/snoreBubble";
import { createGroundImpact, type GroundImpact } from "./scene/groundImpact";
import { createPokeSystem, type PokeSystem } from "./interaction/poke";
import { createUi } from "./ui";

const app = document.querySelector<HTMLDivElement>("#app")!;
const ui = createUi(document.body);

// Splat-world renderer settings: no MSAA, capped pixel ratio.
const renderer = new THREE.WebGLRenderer({ antialias: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
app.append(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color("#cfe8f7");

const spark = new SparkRenderer({ renderer, enableLod: true });
scene.add(spark);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.05, 900);
camera.position.set(0, 6, 22);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 2, 0);
controls.enableDamping = true;
controls.dampingFactor = 0.07;
controls.maxPolarAngle = Math.PI * 0.49;
controls.autoRotate = true;
controls.autoRotateSpeed = 0.2;

// The splat world carries its own baked lighting; these lights shade only the
// Snorlax mesh with a soft warm-sun feel.
const sun = new THREE.DirectionalLight("#fff3d6", 2.2);
sun.position.set(14, 22, 10);
const hemi = new THREE.HemisphereLight("#cfe6ff", "#9ec98f", 1.2);
const ambient = new THREE.AmbientLight("#fdf6e3", 0.4);
scene.add(sun, hemi, ambient);

// Soft fake contact shadow. Splats cannot receive real shadows, so this is what
// keeps Snorlax visually planted on the grass instead of hovering over it.
function makeContactShadow(width: number, depth: number): THREE.Mesh {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d")!;
  const gradient = ctx.createRadialGradient(128, 128, 10, 128, 128, 126);
  gradient.addColorStop(0, "rgba(34, 52, 38, 0.62)");
  gradient.addColorStop(0.45, "rgba(34, 52, 38, 0.34)");
  gradient.addColorStop(1, "rgba(34, 52, 38, 0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 256, 256);
  const texture = new THREE.CanvasTexture(canvas);
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(width, depth),
    new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false }),
  );
  mesh.rotation.x = -Math.PI / 2;
  return mesh;
}

let world: MintWorld | null = null;
let snorlax: Snorlax | null = null;
let bubble: SnoreBubble | null = null;
let pokeSystem: PokeSystem | null = null;
let shadow: THREE.Mesh | null = null;
const groundImpact: GroundImpact = createGroundImpact(scene);
let loadFailed = false;
let moveSpeed = 8;
let groundY = 0;

function fail(message: string, error: unknown) {
  // Latch the first fatal loading error; later progress must not replace it.
  if (loadFailed) return;
  loadFailed = true;
  console.error(message, error);
  ui.setStatus(message, "error");
}

async function addSnorlax() {
  ui.setStatus("Snorlax is settling in…");
  try {
    const loaded = await loadSnorlax();
    // Nestle him into the grass rather than resting exactly on the collider
    // plane, which reads as floating against the splat ground.
    loaded.root.position.set(0, groundY - loaded.restHeight * 0.07, 0);
    scene.add(loaded.root);

    shadow = makeContactShadow(loaded.restFootprint.width * 1.15, loaded.restFootprint.depth * 1.15);
    shadow.position.set(0, groundY + loaded.restHeight * 0.01, 0);
    scene.add(shadow);

    snorlax = loaded;
    bubble = createSnoreBubble(loaded.bubbleAnchor, { size: loaded.sitHeight * 0.16 });
    loaded.onWake = () => bubble?.pop();
    loaded.onImpact = () =>
      groundImpact.burst(new THREE.Vector3(0, groundY + 0.05, 0), loaded.restFootprint.width * 0.75);
    pokeSystem = createPokeSystem({
      dom: renderer.domElement,
      camera,
      scene,
      snorlax: loaded,
      bubble,
      particleSize: loaded.sitHeight * 0.11,
    });

    // Frame him: he is a big creature, so back off proportionally to his size.
    controls.target.set(0, groundY + loaded.sitHeight * 0.2, 0);
    camera.position.set(0, groundY + loaded.sitHeight * 0.5, loaded.sitHeight * 2.0);
    controls.minDistance = loaded.sitHeight * 0.75;
    controls.maxDistance = loaded.sitHeight * 4.5;
    moveSpeed = loaded.sitHeight * 1.1;

    if (!loadFailed) {
      ui.clearStatus();
      ui.showHint();
    }
  } catch (error) {
    fail("Snorlax could not be woken up — the model failed to load.", error);
  }
}

async function loadScene() {
  ui.setStatus("Streaming the meadow…");
  const worldRuntime = remoteWorldRuntime("meadow");
  try {
    world = worldRuntime ? await loadMintWorld(scene, worldRuntime) : null;
    if (world) groundY = world.groundHeightAt(0, 0) ?? 0;
  } catch (error) {
    fail("The meadow failed to stream in.", error);
  }
  await addSnorlax();
}

void loadScene();

// WASD navigation (desktop splat-world default). Shift moves faster.
const pressedKeys = new Set<string>();
window.addEventListener("keydown", (event) => {
  const target = event.target as HTMLElement | null;
  if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
  pressedKeys.add(event.code);
  controls.autoRotate = false;
});
window.addEventListener("keyup", (event) => pressedKeys.delete(event.code));
window.addEventListener("blur", () => pressedKeys.clear());
renderer.domElement.addEventListener("pointerdown", () => {
  controls.autoRotate = false;
});

const moveForward = new THREE.Vector3();
const moveRight = new THREE.Vector3();
const moveDelta = new THREE.Vector3();

function applyWasd(dt: number) {
  if (pressedKeys.size === 0) return;
  const speed = pressedKeys.has("ShiftLeft") || pressedKeys.has("ShiftRight") ? moveSpeed * 2.5 : moveSpeed;
  camera.getWorldDirection(moveForward);
  moveForward.y = 0;
  if (moveForward.lengthSq() < 1e-6) return;
  moveForward.normalize();
  moveRight.crossVectors(moveForward, THREE.Object3D.DEFAULT_UP).normalize();
  moveDelta.set(0, 0, 0);
  if (pressedKeys.has("KeyW")) moveDelta.add(moveForward);
  if (pressedKeys.has("KeyS")) moveDelta.sub(moveForward);
  if (pressedKeys.has("KeyD")) moveDelta.add(moveRight);
  if (pressedKeys.has("KeyA")) moveDelta.sub(moveRight);
  if (moveDelta.lengthSq() === 0) return;
  moveDelta.normalize().multiplyScalar(speed * dt);
  // Apply to both camera and target so OrbitControls does not snap back.
  camera.position.add(moveDelta);
  controls.target.add(moveDelta);
}

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

const timer = new THREE.Timer();

renderer.setAnimationLoop(() => {
  timer.update();
  const dt = Math.min(timer.getDelta(), 0.05);

  applyWasd(dt);
  if (snorlax) {
    snorlax.update(dt);
    bubble?.update(dt, snorlax.breathPhase, snorlax.annoyance);
    ui.setAnnoyance(snorlax.annoyance);
  }
  pokeSystem?.update(dt);
  groundImpact.update(dt);
  controls.update();
  renderer.render(scene, camera);
});
