import * as THREE from "three";
import { SplatFileType, SplatMesh } from "@sparkjsdev/spark";
import { createMintGltfLoader } from "../loaders";

export interface MintWorld {
  root: THREE.Group;
  splat: SplatMesh;
  collider: THREE.Object3D;
  /** Raycast straight down against the collider; returns ground Y or null. */
  groundHeightAt(x: number, z: number): number | null;
}

// Mint World Labs display calibration is scale 2.5 / Y 1.5, which assumes a
// camera roughly 6 units out. Snorlax is 13.6 units wide, so our camera has to
// sit ~23 units back — near the edge of the captured region, where splats
// stretch into smeared artifacts. Scaling the shared root up moves that edge
// outward: the camera then sits at ~40% of the captured ground radius, which is
// where this world renders cleanly. Splat and collider share the root, so
// grounding stays consistent.
const MINT_WORLD_SCALE = 5.5;
const MINT_WORLD_Y = 3.3;

/** Roughly Snorlax's footprint half-width, the patch he has to lie flat on. */
const LEVEL_RADIUS = 7;
/** Candidate offsets to slide the world by, looking for flatter ground. */
const LEVEL_CANDIDATES: [number, number][] = [
  [0, 0], [12, 0], [-12, 0], [0, 12], [0, -12],
  [12, 12], [-12, -12], [12, -12], [-12, 12],
];
const MINT_WORLD_ROTATION: [number, number, number] = [Math.PI, Math.PI, 0];

/**
 * Streams the Mint-generated meadow world (RAD splat) and its invisible
 * collider under one shared root transform. The collider is used only for
 * grounding raycasts; it is never rendered.
 */
export async function loadMintWorld(
  scene: THREE.Scene,
  runtime: { radUrl: string; colliderUrl: string },
): Promise<MintWorld> {
  const root = new THREE.Group();
  root.position.set(0, MINT_WORLD_Y, 0);
  root.rotation.set(...MINT_WORLD_ROTATION);
  root.scale.setScalar(MINT_WORLD_SCALE);
  scene.add(root);

  const splat = new SplatMesh({
    url: runtime.radUrl,
    fileType: SplatFileType.RAD,
    paged: true,
    raycastable: false,
    onFrame: () => {},
  });
  root.add(splat);

  const colliderPromise = createMintGltfLoader().loadAsync(runtime.colliderUrl);
  const [, colliderGltf] = await Promise.all([splat.initialized, colliderPromise]);

  const collider = colliderGltf.scene;
  root.add(collider);
  root.updateMatrixWorld(true);

  // Keep geometry loaded for grounding raycasts, but never render it.
  collider.traverse((object) => {
    object.visible = false;
  });

  const raycaster = new THREE.Raycaster();
  const down = new THREE.Vector3(0, -1, 0);

  function groundHeightAt(x: number, z: number) {
    raycaster.set(new THREE.Vector3(x, 30, z), down);
    raycaster.far = 100;
    // Raycasting skips invisible objects unless forced per-object.
    const hits: THREE.Intersection[] = [];
    collider.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (mesh.isMesh) {
        const wasVisible = mesh.visible;
        mesh.visible = true;
        raycaster.intersectObject(mesh, false, hits);
        mesh.visible = wasVisible;
      }
    });
    hits.sort((a, b) => a.distance - b.distance);
    return hits.length > 0 ? hits[0].point.y : null;
  }

  /** Height spread across the patch Snorlax would occupy, or null off-mesh. */
  function flatnessAt(cx: number, cz: number) {
    const heights: number[] = [];
    for (let i = 0; i < 8; i += 1) {
      const angle = (i / 8) * Math.PI * 2;
      const y = groundHeightAt(cx + Math.cos(angle) * LEVEL_RADIUS, cz + Math.sin(angle) * LEVEL_RADIUS);
      if (y === null) return null;
      heights.push(y);
    }
    return Math.max(...heights) - Math.min(...heights);
  }

  // Generated terrain is never perfectly level, and Snorlax always lies at the
  // origin, so slide the world until its flattest patch is the one underneath
  // him. Cheap: nine candidates, eight rays each.
  let best: { x: number; z: number; flatness: number } | null = null;
  for (const [x, z] of LEVEL_CANDIDATES) {
    const flatness = flatnessAt(x, z);
    if (flatness === null) continue;
    if (!best || flatness < best.flatness) best = { x, z, flatness };
  }
  if (best && (best.x !== 0 || best.z !== 0)) {
    root.position.x -= best.x;
    root.position.z -= best.z;
    root.updateMatrixWorld(true);
  }

  return {
    root,
    splat,
    collider,
    groundHeightAt,
  };
}
