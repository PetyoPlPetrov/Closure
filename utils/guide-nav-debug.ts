/**
 * Guide navigation diagnostics.
 * - In Metro dev (`npm run ios`), logs appear automatically.
 * - For TestFlight/device release builds, set `FORCE` to `true` temporarily.
 */
const FORCE = false;

export function logGuideNav(message: string, data?: Record<string, unknown>) {
  if (!__DEV__ && !FORCE) return;
  if (data !== undefined) {
    console.log(`[GuideNav] ${message}`, data);
  } else {
    console.log(`[GuideNav] ${message}`);
  }
}
