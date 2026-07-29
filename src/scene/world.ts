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

// Mint World Labs display calibration: apply to the shared splat+collider root.
const MINT_WORLD_SCALE = 2.5;
const MINT_WORLD_Y = 1.5;
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

  return {
    root,
    splat,
    collider,
    groundHeightAt(x: number, z: number) {
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
    },
  };
}
