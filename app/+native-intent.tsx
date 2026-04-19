type NativeIntentRedirectArgs = {
  path: string;
  initial: boolean;
};

/**
 * Normalize incoming native URLs before Expo Router resolves a route.
 * This prevents bare scheme opens like `sphere:///` from landing on Unmatched Route.
 */
export function redirectSystemPath({
  path,
}: NativeIntentRedirectArgs): string {
  const raw = (path ?? "").trim();
  if (!raw) return "/";

  const lowered = raw.toLowerCase();
  if (
    lowered === "/" ||
    lowered === "//" ||
    lowered === "///" ||
    lowered === "sphere://" ||
    lowered === "sphere:///" ||
    lowered === "sferas://" ||
    lowered === "sferas:///"
  ) {
    return "/";
  }

  return path;
}
