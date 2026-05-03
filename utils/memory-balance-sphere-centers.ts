import type { LifeSphere } from "@/utils/JourneyProvider";
import { Dimensions, Platform } from "react-native";

/** Same order as Memory Balance rings in FocusedSferaView (`SPHERE_LIST`). */
const MEMORY_BALANCE_SPHERE_ORDER: LifeSphere[] = [
  "relationships",
  "career",
  "family",
  "friends",
  "hobbies",
];

const MEMORY_BALANCE_RING_LAYOUT: readonly {
  angleDeg: number;
  radius: number;
}[] = [
  { angleDeg: -90, radius: 148 },
  { angleDeg: -18, radius: 156 },
  { angleDeg: 54, radius: 172 },
  { angleDeg: 126, radius: 172 },
  { angleDeg: 198, radius: 156 },
];

/** Matches FocusedSferaView `scaleFocused`: iPad-only scale bump. */
function scaleFocusedPx(value: number): number {
  const ipad = Platform.OS === "ios" && Platform.isPad;
  return value * (ipad ? 1.55 : 1);
}

/**
 * Visual center of a Memory Balance orb (clamp matches FocusedSferaView
 * MemoryBalanceSphereItem layout; uses nominal ring size mid-range).
 */
export function getMemoryBalanceSphereCenterPx(sphere: LifeSphere): {
  cx: number;
  cy: number;
} {
  const { width: SW, height: SH } = Dimensions.get("window");
  const SUN_CENTER_X = SW / 2;
  const SUN_CENTER_Y = SH * 0.38;

  let idx = MEMORY_BALANCE_SPHERE_ORDER.indexOf(sphere);
  if (idx < 0) idx = 0;
  const layout = MEMORY_BALANCE_RING_LAYOUT[idx];

  const rad = (layout.angleDeg * Math.PI) / 180;
  const radius = scaleFocusedPx(layout.radius);
  const rawCenterX = SUN_CENTER_X + Math.cos(rad) * radius;
  const rawCenterY = SUN_CENTER_Y + Math.sin(rad) * radius;

  const nominalSize =
    (scaleFocusedPx(70) + scaleFocusedPx(136)) / 2;
  const safeLeft = nominalSize / 2 + 10;
  const safeRight = SW - nominalSize / 2 - 10;
  const safeTop = nominalSize / 2 + scaleFocusedPx(42);
  const safeBottom = SH - nominalSize / 2 - scaleFocusedPx(140);

  return {
    cx: Math.max(safeLeft, Math.min(safeRight, rawCenterX)),
    cy: Math.max(safeTop, Math.min(safeBottom, rawCenterY)),
  };
}
