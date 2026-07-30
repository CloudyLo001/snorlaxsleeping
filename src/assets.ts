import registry from "../mint-assets.json";

interface RegistryArtifact {
  localPath?: string;
  runtimeUrl?: string;
  [key: string]: unknown;
}

interface RegistryAsset {
  mode: string;
  artifacts: Record<string, RegistryArtifact>;
  runtime?: {
    runtimeUrl?: string;
    collider?: { runtimeUrl?: string };
  };
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

/** Convert a registry `public/...` path into the Vite-served browser URL. */
export function localArtifactUrl(assetKey: string, artifactId: string): string {
  const artifact = assets[assetKey]?.artifacts[artifactId];
  if (!artifact?.localPath) {
    throw new Error(`Missing local artifact ${assetKey}/${artifactId} in mint-assets.json`);
  }
  return `/${artifact.localPath.replace(/^public\//, "")}`;
}

/**
 * RAD splat + collider runtime URLs for a remote_stream world record.
 * Returns null when the world has not been synced into the registry yet.
 */
export function remoteWorldRuntime(assetKey: string): { radUrl: string; colliderUrl: string } | null {
  const asset = assets[assetKey];
  if (!asset || asset.mode !== "remote_stream") return null;
  const radUrl = asset.runtime?.runtimeUrl;
  const colliderUrl = asset.runtime?.collider?.runtimeUrl;
  return radUrl && colliderUrl ? { radUrl, colliderUrl } : null;
}
