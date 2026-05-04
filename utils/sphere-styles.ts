/**
 * Shared sphere styling: gradient colors and icon colors used by both
 * the classic home view (SphereAvatar) and the focused sfera view.
 * Single source of truth for sphere look-and-feel.
 */

import { Colors } from "@/constants/theme";

import type { LifeSphere } from "./JourneyProvider";

/** Soft chromatic surfaces (not flat grey). Paired with dark icon glyphs for AAA on light. */
const LIGHT_SPHERE_GRADIENT: Record<
  LifeSphere,
  { sunny: readonly [string, string, string]; cloudy: readonly [string, string, string] }
> = {
  relationships: {
    sunny: ["rgb(253,236,236)", "rgb(248,220,222)", "rgb(242,202,205)"],
    cloudy: ["rgb(241,230,230)", "rgb(232,218,218)", "rgb(220,206,206)"],
  },
  career: {
    sunny: ["rgb(232,241,252)", "rgb(220,232,246)", "rgb(205,222,243)"],
    cloudy: ["rgb(226,234,245)", "rgb(214,226,240)", "rgb(198,212,232)"],
  },
  family: {
    sunny: ["rgb(232,245,234)", "rgb(220,238,224)", "rgb(206,228,212)"],
    cloudy: ["rgb(228,240,230)", "rgb(216,232,220)", "rgb(200,220,208)"],
  },
  friends: {
    sunny: ["rgb(241,236,250)", "rgb(232,226,246)", "rgb(220,212,240)"],
    cloudy: ["rgb(236,232,248)", "rgb(226,220,242)", "rgb(212,206,232)"],
  },
  hobbies: {
    sunny: ["rgb(252,241,232)", "rgb(248,230,214)", "rgb(243,216,196)"],
    cloudy: ["rgb(248,236,228)", "rgb(240,224,212)", "rgb(232,210,196)"],
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
      // WCAG 2.0 AA: 3:1 contrast. Same pink-red shade as sfera, toned down but sufficient contrast.
      if (sunnyPercentage !== undefined && sunnyPercentage < 50) {
        return "#F56868"; // Light red on dark-red cloudy gradient
      }
      return "#CC3838"; // Deep red, same hue as sfera (~3:1 on light-pink)
    case "career":
      // WCAG 2.0 AA: 3:1 contrast. Sunny = light blue → dark icon; Cloudy = dark blue → lighter icon.
      if (sunnyPercentage !== undefined && sunnyPercentage < 50) {
        return "#90CAF9"; // Light blue on dark-blue cloudy gradient
      }
      return "#1565C0"; // Deep blue on light-blue sunny gradient
    case "family":
      // WCAG 2.0 AA: 3:1 contrast.
      if (sunnyPercentage !== undefined && sunnyPercentage < 50) {
        return "#CE93D8"; // Light purple on dark-purple cloudy gradient
      }
      return "#5E35B1"; // Deep purple on light-purple sunny gradient
    case "friends":
      // WCAG 2.0 AA: 3:1 contrast.
      if (sunnyPercentage !== undefined && sunnyPercentage < 50) {
        return "#B39DDB"; // Light purple on dark-purple cloudy gradient
      }
      return "#512DA8"; // Deep purple on light-purple sunny gradient
    case "hobbies":
      // WCAG 2.0 AA: 3:1 contrast.
      if (sunnyPercentage !== undefined && sunnyPercentage < 50) {
        return "#FFCC80"; // Light orange on dark-orange cloudy gradient
      }
      return "#E65100"; // Deep orange on light-orange sunny gradient
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
  // Dark: use RGB from the sfera gradient base (sunny) so it matches the floating orb
  switch (sphereType) {
    case "relationships":
      return "#FF9696"; // from rgba(255,150,150)
    case "career":
      return "#96C8FF"; // from rgba(150,200,255)
    case "family":
      return "#C896FF"; // from rgba(200,150,255) — lavender, matches family sfera
    case "friends":
      return "#8B5CF6"; // from rgba(139,92,246) — violet, matches friends sfera
    case "hobbies":
      return "#F97B16"; // from rgba(249,115,22)
    default:
      return "#96C8FF";
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
    return "#000";
  }
  switch (sphere) {
    case "relationships":
      return "#FF9696";
    case "career":
      return "#96CAFF";
    case "family":
      return "#C89CFF";
    case "friends":
      return "#9B7AFF";
    case "hobbies":
      return "#FFAA5A";
    default:
      return "#96CAFF";
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

  // Dark mode: colorful gradients per sphere
  if (sphere === "relationships") {
    if (isMoreSunny) {
      const baseOpacity = 0.4 + (sunnyPercentage / 100) * 0.3;
      return [
        `rgba(255, 140, 140, ${baseOpacity - 0.05})`,
        `rgba(255, 150, 150, ${baseOpacity})`,
        `rgba(255, 160, 160, ${baseOpacity + 0.05})`,
      ];
    }
    const cloudyPercentage = 100 - sunnyPercentage;
    const baseOpacity = 0.3 + (cloudyPercentage / 100) * 0.4;
    return [
      `rgba(170, 50, 50, ${baseOpacity - 0.05})`,
      `rgba(180, 60, 60, ${baseOpacity})`,
      `rgba(190, 70, 70, ${baseOpacity + 0.05})`,
    ];
  }
  if (sphere === "career") {
    if (isMoreSunny) {
      const baseOpacity = 0.4 + (sunnyPercentage / 100) * 0.3;
      return [
        `rgba(140, 190, 245, ${baseOpacity - 0.05})`,
        `rgba(150, 200, 255, ${baseOpacity})`,
        `rgba(160, 210, 255, ${baseOpacity + 0.05})`,
      ];
    }
    const cloudyPercentage = 100 - sunnyPercentage;
    const baseOpacity = 0.3 + (cloudyPercentage / 100) * 0.4;
    return [
      `rgba(50, 90, 170, ${baseOpacity - 0.05})`,
      `rgba(60, 100, 180, ${baseOpacity})`,
      `rgba(70, 110, 190, ${baseOpacity + 0.05})`,
    ];
  }
  if (sphere === "family") {
    if (isMoreSunny) {
      const baseOpacity = 0.4 + (sunnyPercentage / 100) * 0.3;
      return [
        `rgba(190, 140, 245, ${baseOpacity - 0.05})`,
        `rgba(200, 150, 255, ${baseOpacity})`,
        `rgba(210, 160, 255, ${baseOpacity + 0.05})`,
      ];
    }
    const cloudyPercentage = 100 - sunnyPercentage;
    const baseOpacity = 0.3 + (cloudyPercentage / 100) * 0.4;
    return [
      `rgba(110, 50, 170, ${baseOpacity - 0.05})`,
      `rgba(120, 60, 180, ${baseOpacity})`,
      `rgba(130, 70, 190, ${baseOpacity + 0.05})`,
    ];
  }
  if (sphere === "friends") {
    if (isMoreSunny) {
      const baseOpacity = 0.4 + (sunnyPercentage / 100) * 0.3;
      return [
        `rgba(129, 82, 236, ${baseOpacity - 0.05})`,
        `rgba(139, 92, 246, ${baseOpacity})`,
        `rgba(149, 102, 255, ${baseOpacity + 0.05})`,
      ];
    }
    const cloudyPercentage = 100 - sunnyPercentage;
    const baseOpacity = 0.3 + (cloudyPercentage / 100) * 0.4;
    return [
      `rgba(78, 18, 125, ${baseOpacity - 0.05})`,
      `rgba(88, 28, 135, ${baseOpacity})`,
      `rgba(98, 38, 145, ${baseOpacity + 0.05})`,
    ];
  }
  // Hobbies
  if (isMoreSunny) {
    const baseOpacity = 0.4 + (sunnyPercentage / 100) * 0.3;
    return [
      `rgba(239, 105, 12, ${baseOpacity - 0.05})`,
      `rgba(249, 115, 22, ${baseOpacity})`,
      `rgba(255, 125, 32, ${baseOpacity + 0.05})`,
    ];
  }
  const cloudyPercentage = 100 - sunnyPercentage;
  const baseOpacity = 0.3 + (cloudyPercentage / 100) * 0.4;
  return [
    `rgba(144, 42, 8, ${baseOpacity - 0.05})`,
    `rgba(154, 52, 18, ${baseOpacity})`,
    `rgba(164, 62, 28, ${baseOpacity + 0.05})`,
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
      return "#E57373";
    case "career":
      return Colors.dark.primary;
    case "family":
      return "#81C784";
    case "friends":
      return "#BA68C8";
    case "hobbies":
      return "#FFB74D";
    default:
      return Colors.dark.primary;
  }
}
