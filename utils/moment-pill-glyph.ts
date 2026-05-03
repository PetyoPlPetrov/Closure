/**
 * Chooses a high-contrast icon/text glyph for material placed on a moment pill fill
 * (sun / lesson gradients that use `momentColors.*.background`).
 */

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace("#", "");
  const num = parseInt(
    h.length === 3 ? h.split("").map((c) => c + c).join("") : h,
    16,
  );
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}

export function momentPillGlyphColor(backgroundHex: string): string {
  const { r, g, b } = hexToRgb(backgroundHex);
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  const luminance = 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  return luminance > 0.45 ? "#0D0D0D" : "#FFFFFF";
}
