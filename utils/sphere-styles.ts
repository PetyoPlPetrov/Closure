/**
 * Shared sphere styling: gradient colors and icon colors used by both
 * the classic home view (SphereAvatar) and the focused sfera view.
 * Single source of truth for sphere look-and-feel.
 */

import type { LifeSphere } from "./JourneyProvider";

export function getSphereIconColor(
  sphereType: LifeSphere,
  colorScheme: "light" | "dark",
  sunnyPercentage?: number,
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
      return "#64B5F6";
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
        return "#D32F2F";
      case "career":
        return "#1976D2";
      case "family":
        // #2E7D32: darker green for ≥3:1 contrast on light badge bg
        return "#2E7D32";
      case "friends":
        return "#7B1FA2";
      case "hobbies":
        // #D84315: deep orange for ≥3:1 contrast on light badge bg
        return "#D84315";
      default:
        return "#1976D2";
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
    if (isMoreSunny) {
      const baseGrey = 170 + (sunnyPercentage / 100) * 30;
      return [
        `rgb(${baseGrey - 8}, ${baseGrey - 8}, ${baseGrey - 8})`,
        `rgb(${baseGrey}, ${baseGrey}, ${baseGrey})`,
        `rgb(${baseGrey + 8}, ${baseGrey + 8}, ${baseGrey + 8})`,
      ];
    }
    const cloudyPercentage = 100 - sunnyPercentage;
    const baseGrey = 130 + (cloudyPercentage / 100) * 40;
    return [
      `rgb(${baseGrey - 8}, ${baseGrey - 8}, ${baseGrey - 8})`,
      `rgb(${baseGrey}, ${baseGrey}, ${baseGrey})`,
      `rgb(${baseGrey + 8}, ${baseGrey + 8}, ${baseGrey + 8})`,
    ];
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
