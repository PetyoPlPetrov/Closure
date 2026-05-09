import { Platform } from 'react-native';

/**
 * System speech locales (Apple SFSpeechRecognizer on iOS, recognition service on Android).
 * Phone UI language does not add locales — only what the OS exposes via supportedLocales.
 */

type SpeechModuleSlice = {
  getSupportedLocales: (opts: Record<string, never>) => Promise<{
    locales: string[];
    installedLocales: string[];
  }>;
  androidTriggerOfflineModelDownload?: (opts: { locale: string }) => Promise<unknown>;
};

function getSpeechModuleSlice(): SpeechModuleSlice | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('expo-speech-recognition') as {
      ExpoSpeechRecognitionModule: SpeechModuleSlice;
    };
    return mod?.ExpoSpeechRecognitionModule ?? null;
  } catch {
    return null;
  }
}

const CACHE_TTL_MS = 5 * 60 * 1000;
let localesCache: { list: string[]; at: number } | null = null;

/** Clears cached supported locales (e.g. after OS language pack changes — rare). */
export function clearSupportedSpeechLocalesCache(): void {
  localesCache = null;
}

/**
 * Returns BCP-47 locale identifiers the device speech engine supports.
 * Empty array if unavailable (web, missing native module, or API error).
 */
export async function getSupportedSpeechLocales(): Promise<string[]> {
  if (Platform.OS === 'web') {
    return [];
  }
  const m = getSpeechModuleSlice();
  if (!m?.getSupportedLocales) {
    return [];
  }
  const now = Date.now();
  if (localesCache && now - localesCache.at < CACHE_TTL_MS) {
    return localesCache.list;
  }
  try {
    const { locales } = await m.getSupportedLocales({});
    const list = Array.isArray(locales) ? locales : [];
    localesCache = { list, at: now };
    return list;
  } catch {
    return [];
  }
}

export type SpeechLocalePickResult = {
  locale: string;
  /** User asked for Bulgarian but no `bg-*` locale exists on this device. */
  bulgarianUnavailable: boolean;
};

/**
 * Picks a locale known to exist on the device, avoiding a failed `start()` when possible.
 * When `supportedLocales` is empty, returns the usual default for `desiredLanguage` (caller may still fail).
 */
export function pickSpeechLocaleFromSupportedList(
  supportedLocales: string[],
  desiredLanguage: 'en' | 'bg',
): SpeechLocalePickResult {
  if (!supportedLocales.length) {
    return {
      locale: desiredLanguage === 'bg' ? 'bg-BG' : 'en-US',
      bulgarianUnavailable: false,
    };
  }

  if (desiredLanguage === 'bg') {
    const exactBg = supportedLocales.find(l => l.toLowerCase() === 'bg-bg');
    if (exactBg) {
      return { locale: exactBg, bulgarianUnavailable: false };
    }
    const anyBg = supportedLocales.find(l => l.toLowerCase().startsWith('bg-'));
    if (anyBg) {
      return { locale: anyBg, bulgarianUnavailable: false };
    }
    return {
      locale: pickEnglishLocaleFromSupportedList(supportedLocales),
      bulgarianUnavailable: true,
    };
  }

  return {
    locale: pickEnglishLocaleFromSupportedList(supportedLocales),
    bulgarianUnavailable: false,
  };
}

function pickEnglishLocaleFromSupportedList(supportedLocales: string[]): string {
  const preference = ['en-US', 'en-GB', 'en-AU', 'en-CA', 'en-IN', 'en-IE', 'en-SG', 'en-NZ', 'en-ZA', 'en-PH', 'en-AE', 'en-SA', 'en-ID'];
  for (const code of preference) {
    if (supportedLocales.includes(code)) {
      return code;
    }
  }
  const anyEn = supportedLocales.find(l => l.toLowerCase().startsWith('en-'));
  if (anyEn) {
    return anyEn;
  }
  return supportedLocales[0] ?? 'en-US';
}

/**
 * Android 13+: opens system UI to download offline speech model for Bulgarian when possible.
 * Does nothing on iOS (no equivalent public API for forcing BG packs).
 */
export async function prefetchBulgarianOfflineModelIfAndroid(): Promise<void> {
  if (Platform.OS !== 'android') {
    return;
  }
  const m = getSpeechModuleSlice();
  if (!m?.androidTriggerOfflineModelDownload) {
    return;
  }
  try {
    await m.androidTriggerOfflineModelDownload({ locale: 'bg-BG' });
  } catch {
    // User may cancel or device may not support — ignore
  }
}
