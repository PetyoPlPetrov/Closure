/**
 * Shared sphere styling: gradient colors and icon colors used by both
 * the classic home view (SphereAvatar) and the focused sfera view.
 * Single source of truth for sphere look-and-feel.
 */

import { Colors } from "@/constants/theme";

import type { LifeSphere } from "./JourneyProvider";

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const normalized = hex.replace("#", "");
  const value =
    normalized.length === 3
      ? normalized
          .split("")
          .map((char) => `${char}${char}`)
          .join("")
      : normalized;
  const int = parseInt(value, 16);
  return {
    r: (int >> 16) & 255,
    g: (int >> 8) & 255,
    b: int & 255,
  };
}

function rgbaFromHex(hex: string, alpha: number): string {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function mixRgb(
  a: { r: number; g: number; b: number },
  b: { r: number; g: number; b: number },
  weightOfB: number,
): { r: number; g: number; b: number } {
  const weightOfA = 1 - weightOfB;
  return {
    r: Math.round(a.r * weightOfA + b.r * weightOfB),
    g: Math.round(a.g * weightOfA + b.g * weightOfB),
    b: Math.round(a.b * weightOfA + b.b * weightOfB),
  };
}

/** Soft chromatic surfaces (not flat grey). Paired with dark icon glyphs for AAA on light. */
const LIGHT_SPHERE_GRADIENT: Record<
  LifeSphere,
  { sunny: readonly [string, string, string]; cloudy: readonly [string, string, string] }
> = {
  relationships: {
    sunny: ["rgb(255,247,247)", "rgb(253,238,240)", "rgb(250,227,230)"],
    cloudy: ["rgb(250,241,242)", "rgb(245,233,235)", "rgb(238,223,226)"],
  },
  career: {
    sunny: ["rgb(244,249,255)", "rgb(235,244,253)", "rgb(223,237,251)"],
    cloudy: ["rgb(238,245,252)", "rgb(229,239,249)", "rgb(216,231,244)"],
  },
  family: {
    sunny: ["rgb(244,252,246)", "rgb(235,247,238)", "rgb(224,241,229)"],
    cloudy: ["rgb(239,248,241)", "rgb(230,243,234)", "rgb(217,235,223)"],
  },
  friends: {
    sunny: ["rgb(248,244,255)", "rgb(240,234,252)", "rgb(230,223,248)"],
    cloudy: ["rgb(243,239,252)", "rgb(234,228,248)", "rgb(222,216,241)"],
  },
  hobbies: {
    sunny: ["rgb(255,248,241)", "rgb(252,239,228)", "rgb(248,228,212)"],
    cloudy: ["rgb(251,244,237)", "rgb(245,233,222)", "rgb(238,220,206)"],
  },
};

export function getSphereIconColor(
  sphereType: LifeSphere,
  colorScheme: "light" | "dark",
  sunnyPercentage?: number,
): string {
  if (colorScheme === "light") {
    /** ≥7:1 vs light sphere highlights (incl. 3D boost that clips to white) — WCAG AAA. */
    switch (sphereType) {
      case "relationships":
        return "#6D1414";
      case "career":
        return "#0D47A1";
      case "family":
        return "#174D1B";
      case "friends":
        return "#4A148C";
      case "hobbies":
        return "#8C2E0F";
      default:
        return "#0D47A1";
    }
  }
  switch (sphereType) {
    case "relationships":
      if (sunnyPercentage !== undefined && sunnyPercentage < 50) {
        return "#FCA5A5";
      }
      return "#FECACA";
    case "career":
      if (sunnyPercentage !== undefined && sunnyPercentage < 50) {
        return "#93C5FD";
      }
      return "#DBEAFE";
    case "family":
      if (sunnyPercentage !== undefined && sunnyPercentage < 50) {
        return "#6EE7B7";
      }
      return "#D1FAE5";
    case "friends":
      if (sunnyPercentage !== undefined && sunnyPercentage < 50) {
        return "#C4B5FD";
      }
      return "#EDE9FE";
    case "hobbies":
      if (sunnyPercentage !== undefined && sunnyPercentage < 50) {
        return "#FDBA74";
      }
      return "#FFEDD5";
    default:
      return Colors.dark.primary;
  }
}

/**
 * 3D sphere gradient colors: highlight (light top-left), base, shadow (dark bottom-right).
 * Light source from top-left creates glossy spherical appearance.
 */
export function getSphere3DGradientColors(
  sphere: LifeSphere,
  sunnyPercentage: number,
  colorScheme: "light" | "dark",
): { highlight: string; base: string; shadow: string } {
  const [c1, c2, c3] = getSphereGradientColors(sphere, sunnyPercentage, colorScheme);
  if (colorScheme === "light") {
    const lighter = (rgb: string) => {
      const m = rgb.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
      if (!m) return rgb;
      const r = Math.min(255, parseInt(m[1], 10) + 60);
      const g = Math.min(255, parseInt(m[2], 10) + 60);
      const b = Math.min(255, parseInt(m[3], 10) + 60);
      return `rgb(${r},${g},${b})`;
    };
    const darker = (rgb: string) => {
      const m = rgb.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
      if (!m) return rgb;
      const r = Math.max(0, parseInt(m[1], 10) - 25);
      const g = Math.max(0, parseInt(m[2], 10) - 25);
      const b = Math.max(0, parseInt(m[3], 10) - 25);
      return `rgb(${r},${g},${b})`;
    };
    return { highlight: lighter(c1), base: c2, shadow: darker(c3) };
  }
  const lighter = (rgba: string) => {
    const m = rgba.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
    if (!m) return rgba;
    const r = Math.min(255, parseInt(m[1], 10) + 55);
    const g = Math.min(255, parseInt(m[2], 10) + 55);
    const b = Math.min(255, parseInt(m[3], 10) + 55);
    const a = m[4] ? parseFloat(m[4]) : 1;
    return `rgba(${r},${g},${b},${Math.min(1, a + 0.15)})`;
  };
  const darker = (rgba: string) => {
    const m = rgba.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
    if (!m) return rgba;
    const r = Math.max(0, parseInt(m[1], 10) - 45);
    const g = Math.max(0, parseInt(m[2], 10) - 45);
    const b = Math.max(0, parseInt(m[3], 10) - 45);
    const a = m[4] ? parseFloat(m[4]) : 1;
    return `rgba(${r},${g},${b},${a})`;
  };
  return { highlight: lighter(c1), base: c2, shadow: darker(c3) };
}

/**
 * Solid color that matches the floating sfera (the gradient ball) for use in badges, chips, etc.
 * Derived from the sphere gradient so badges match the orb color the user sees.
 */
export function getSphereSferaColor(
  sphereType: LifeSphere,
  colorScheme: "light" | "dark",
): string {
  if (colorScheme === "light") {
    switch (sphereType) {
      case "relationships":
        return "#C62828";
      case "career":
        return "#1565C0";
      case "family":
        return "#2E7D32";
      case "friends":
        return "#6A1B9A";
      case "hobbies":
        return "#8C2E0F";
      default:
        return "#1565C0";
    }
  }
  // Dark: new solid sphere palette.
  switch (sphereType) {
    case "relationships":
      return "#EF4444";
    case "career":
      return "#3B82F6";
    case "family":
      return "#10B981";
    case "friends":
      return "#8B5CF6";
    case "hobbies":
      return "#F97316";
    default:
      return "#3B82F6";
  }
}

/**
 * Shadow/glow color for sphere (used for shadowColor in dark mode).
 * Matches the loading border color from classic SphereAvatar.
 */
export function getSphereShadowColor(
  sphere: LifeSphere,
  colorScheme: "light" | "dark",
): string {
  if (colorScheme === "light") {
    return "#000000";
  }
  switch (sphere) {
    case "relationships":
      return "#EF4444";
    case "career":
      return "#3B82F6";
    case "family":
      return "#10B981";
    case "friends":
      return "#8B5CF6";
    case "hobbies":
      return "#F97316";
    default:
      return "#3B82F6";
  }
}

/** Stroke/glow hue used by CosmicPulseRings — pair AI tab / chrome to the same accent. */
export function getCosmicPulseRingAccent(
  sphereType: LifeSphere,
  colorScheme: "light" | "dark",
): string {
  if (colorScheme === "light") {
    return getSphereSferaColor(sphereType, "light");
  }
  return getSphereShadowColor(sphereType, "dark");
}

/**
 * Three-color gradient for sphere background (sunny vs cloudy).
 * Same logic as SphereAvatar in the classic home view.
 */
export function getSphereGradientColors(
  sphere: LifeSphere,
  sunnyPercentage: number,
  colorScheme: "light" | "dark",
): readonly [string, string, string] {
  const isMoreSunny = sunnyPercentage >= 50;

  if (colorScheme === "light") {
    const g = LIGHT_SPHERE_GRADIENT[sphere];
    return isMoreSunny ? g.sunny : g.cloudy;
  }

  const sferaHex = getSphereSferaColor(sphere, "dark");
  if (isMoreSunny) {
    // Sunny: centered glow from sphere color to transparent edges.
    return [rgbaFromHex(sferaHex, 0), rgbaFromHex(sferaHex, 0.4), rgbaFromHex(sferaHex, 0)];
  }

  // Cloudy: softer center (sphere color @ 0.15) mixed with slate tint, fading to transparent edges.
  const sferaRgb = hexToRgb(sferaHex);
  const slateRgb = hexToRgb("#334155");
  const centerBase = mixRgb(sferaRgb, slateRgb, 0.35);
  const mixed = mixRgb(centerBase, sferaRgb, 0.15);
  return [
    "rgba(0, 0, 0, 0)",
    `rgba(${mixed.r}, ${mixed.g}, ${mixed.b}, 0.22)`,
    "rgba(0, 0, 0, 0)",
  ];
}

/** Solid UI accents for sphere-scoped screens (manual edit, empty states, add-entity flows). */
export function getSphereAccentColor(
  sphereType: LifeSphere,
  colorScheme: "light" | "dark",
): string {
  if (colorScheme === "light") {
    switch (sphereType) {
      case "relationships":
        return "#D32F2F";
      case "career":
        return "#1976D2";
      case "family":
        return "#388E3C";
      case "friends":
        return "#7B1FA2";
      case "hobbies":
        return "#F57C00";
      default:
        return "#1976D2";
    }
  }
  switch (sphereType) {
    case "relationships":
      return "#FCA5A5";
    case "career":
      return "#93C5FD";
    case "family":
      return "#6EE7B7";
    case "friends":
      return "#C4B5FD";
    case "hobbies":
      return "#FDBA74";
    default:
      return Colors.dark.primaryLight;
  }
}

/**
 * Foreground color for glyph/text rendered on top of solid sfera fills.
 * In dark mode, family + hobbies use dark ink to keep >=3:1 contrast.
 */
export function getSferaForegroundColor(
  sphereType: LifeSphere,
  colorScheme: "light" | "dark",
): string {
  if (colorScheme === "light") {
    return "#FFFFFF";
  }
  switch (sphereType) {
    case "family":
    case "hobbies":
      return Colors.dark.background;
    default:
      return "#FFFFFF";
  }
}
