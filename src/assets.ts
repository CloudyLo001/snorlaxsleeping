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

