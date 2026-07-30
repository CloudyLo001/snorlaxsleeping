import registry from "../mint-assets.json";

interface RegistryArtifact {
  localPath?: string;
  [key: string]: unknown;
}

interface RegistryAsset {
  mode: string;
  artifacts: Record<string, RegistryArtifact>;
}

const assets = registry.assets as unknown as Record<string, RegistryAsset>;

/**
 * Durable Mint CDN mirrors for artifacts that are normally served from the
 * repo. Hosts that do not carry the binaries (the deployed build ships source
 * only) fall back to these. The sync script deliberately keeps download URLs
 * out of mint-assets.json, so they live here instead.
 */
const CDN_MIRRORS: Record<string, string> = {
  "snorlax/original_glb": "https://cdn.mint.gg/glb/pastel-belly-snorlax-normalized-9df98b8349641215.glb",
  "ambience/audio_file":
    "https://cdn.mint.gg/audio/xd744zgkj0t37gj8k8kwsfxbqh8bhj79/serene-meadow-ambience-cf339f-cf6e7d4161b52b96.mp3",
  "snore/audio_file":
    "https://cdn.mint.gg/audio/xd728zeenv0465hc2vsak9n7sh8bgvc4/giant-creature-snore-f94251-493a73362d9efa8b.mp3",
  "pop/audio_file":
    "https://cdn.mint.gg/audio/xd7b1fa9xf5ggnfx3h5kjqvr0h8bh0h9/soft-bubble-pop-80e65a-f04a3c103cf2ced1.mp3",
  "thud/audio_file":
    "https://cdn.mint.gg/audio/xd705d1crs7fg3jx7gkmzb11m98bhez0/giant-soft-body-thud-66c866-63222748597bfe97.mp3",
};

/** Mirror for an artifact, or undefined when there is no remote copy. */
export function artifactMirrorUrl(assetKey: string, artifactId: string): string | undefined {
  return CDN_MIRRORS[`${assetKey}/${artifactId}`];
}

/**
 * Convert a registry `public/...` path into the browser URL.
 *
 * This is built at runtime, so Vite cannot rewrite it the way it rewrites
 * imported assets — it has to honour BASE_URL itself, or the app breaks when
 * served from a subpath such as GitHub Pages rather than a domain root.
 */
export function localArtifactUrl(assetKey: string, artifactId: string): string {
  const artifact = assets[assetKey]?.artifacts[artifactId];
  if (!artifact?.localPath) {
    throw new Error(`Missing local artifact ${assetKey}/${artifactId} in mint-assets.json`);
  }
  return `${import.meta.env.BASE_URL}${artifact.localPath.replace(/^public\//, "")}`;
}

