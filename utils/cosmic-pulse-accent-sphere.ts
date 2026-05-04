import type { LifeSphere } from "@/utils/JourneyProvider";

/** Last focused orbit sphere — drives chrome (e.g. AI tab) matched to CosmicPulseRings. */
let accentSphere: LifeSphere = "relationships";
const listeners = new Set<() => void>();

export function reportCosmicPulseAccentSphere(sphere: LifeSphere): void {
  if (accentSphere === sphere) return;
  accentSphere = sphere;
  for (const listener of listeners) {
    listener();
  }
}

export function getCosmicPulseAccentSphere(): LifeSphere {
  return accentSphere;
}

export function subscribeCosmicPulseAccentSphere(
  listener: () => void,
): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
