import { SECTIONS } from "@/utils/guide-data";
import { logGuideNav } from "@/utils/guide-nav-debug";

/** Match guide detail route param to config (URLs often lowercase camelCase ids). */
export function resolveGuideSectionFromParams(
  raw: string | string[] | undefined,
): (typeof SECTIONS)[number] | undefined {
  if (raw === undefined) {
    logGuideNav("resolveGuideSectionFromParams: raw is undefined");
    return undefined;
  }
  const first = Array.isArray(raw) ? raw[0] : raw;
  if (first == null || first === "") {
    logGuideNav("resolveGuideSectionFromParams: empty param", {
      rawPreview: Array.isArray(raw) ? `[array len=${raw.length}]` : String(raw),
    });
    return undefined;
  }
  let decoded = first;
  try {
    decoded = decodeURIComponent(first);
  } catch {
    decoded = first;
  }
  const needle = decoded.trim().toLowerCase();
  const found = SECTIONS.find((s) => s.id.toLowerCase() === needle);
  if (!found) {
    logGuideNav("resolveGuideSectionFromParams: NO MATCH", {
      rawType: Array.isArray(raw) ? "array" : "string",
      first,
      needle,
      knownIds: SECTIONS.map((s) => s.id),
    });
  } else {
    logGuideNav("resolveGuideSectionFromParams: ok", {
      needle,
      resolvedId: found.id,
    });
  }
  return found;
}
