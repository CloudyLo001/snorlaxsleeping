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
