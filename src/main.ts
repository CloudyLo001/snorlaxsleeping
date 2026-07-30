import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { createEnvironment, type Environment } from "./scene/environment";
import { loadSnorlax, type Snorlax } from "./scene/snorlax";
import { createSnoreBubble, type SnoreBubble } from "./scene/snoreBubble";
import { createGroundImpact, type GroundImpact } from "./scene/groundImpact";
import { createPokeSystem, type PokeSystem } from "./interaction/poke";
import { createUi } from "./ui";

const app = document.querySelector<HTMLDivElement>("#app")!;
const ui = createUi(document.body);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;
app.append(renderer.domElement);

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.5, 2000);
camera.position.set(0, 6, 22);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 2, 0);
controls.enableDamping = true;
controls.dampingFactor = 0.07;
controls.maxPolarAngle = Math.PI * 0.49;
controls.autoRotate = true;
controls.autoRotateSpeed = 0.2;
// The camera orbits Snorlax and never leaves him: panning would slide the
// target off him, so it stays off.
controls.enablePan = false;

const environment: Environment = createEnvironment(scene);
const groundY = environment.groundHeightAt(0, 0);

let snorlax: Snorlax | null = null;
let bubble: SnoreBubble | null = null;
let pokeSystem: PokeSystem | null = null;
const groundImpact: GroundImpact = createGroundImpact(scene);
let loadFailed = false;

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
    // Nestle him into the grass rather than resting exactly on the ground
    // plane, which reads as hovering over it.
    loaded.root.position.set(0, groundY - loaded.restHeight * 0.07, 0);
    scene.add(loaded.root);

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

    ui.clearStatus();
    ui.showHint();
  } catch (error) {
    fail("Snorlax could not be woken up — the model failed to load.", error);
  }
}

void addSnorlax();

renderer.domElement.addEventListener("pointerdown", () => {
  controls.autoRotate = false;
});

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

const timer = new THREE.Timer();

renderer.setAnimationLoop(() => {
  timer.update();
  const dt = Math.min(timer.getDelta(), 0.05);

  environment.update(dt);
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
