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
  initial,
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

  // Enforce plain cold start behavior: on initial launch, treat empty custom-scheme
  // opens as a normal app start so Router goes to root/default tabs.
  if (initial && /^(sphere|sferas):\/{0,3}$/i.test(raw)) {
    return "/";
  }

  // Dev client can pass this internal startup path on first open.
  if (
    initial &&
    (lowered.startsWith("expo-development-client") ||
      lowered.includes("://expo-development-client/?url="))
  ) {
    return "/";
  }

  // Some platforms pass full URLs; normalize empty-path custom-scheme opens.
  try {
    const parsed = new URL(raw);
    const isKnownScheme =
      parsed.protocol === "sphere:" || parsed.protocol === "sferas:";
    const isEmptyPath = !parsed.hostname && (!parsed.pathname || parsed.pathname === "/");
    if (isKnownScheme && isEmptyPath) {
      return "/";
    }
  } catch {
    // Keep original path for valid in-app routes.
  }

  return raw;
}
