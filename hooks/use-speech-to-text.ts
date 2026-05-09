import { useTranslate } from '@/utils/languages/use-translate';
import {
  getSupportedSpeechLocales,
  pickSpeechLocaleFromSupportedList,
  prefetchBulgarianOfflineModelIfAndroid,
} from '@/utils/speech-locale-support';
import type { ExpoSpeechRecognitionErrorEvent, ExpoSpeechRecognitionOptions, ExpoSpeechRecognitionResultEvent } from 'expo-speech-recognition';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Platform } from 'react-native';

// Expo native module may be unavailable until you rebuild the dev client.
// Avoid importing it at module scope (it can throw during initialization).
type SpeechModule = {
  ExpoSpeechRecognitionModule: {
    start: (options: ExpoSpeechRecognitionOptions) => void;
    stop: () => void;
    abort: () => void;
    requestPermissionsAsync: () => Promise<{ granted: boolean }>;
    isRecognitionAvailable: () => boolean;
    addListener: (eventName: string, listener: (event: any) => void) => { remove: () => void };
  };
};

function getSpeechModule(): SpeechModule | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('expo-speech-recognition') as SpeechModule;
  } catch {
    return null;
  }
}

type UseSpeechToTextParams = {
  /** Current app language, used for recognizer language. */
  language: 'en' | 'bg';
  /** Gets the current text that the user has already typed. */
  getText: () => string;
  /** Sets the text shown in the input (including partial preview). */
  setText: (text: string) => void;
  /** Whether speech-to-text controls should be disabled. */
  disabled?: boolean;
};

type UseSpeechToTextReturn = {
  isRecording: boolean;
  isListening: boolean;
  start: () => Promise<void>;
  stop: () => Promise<void>;
  abort: () => Promise<void>;
};

function pickFallbackLocaleFromError(
  message: string | undefined,
  preferredLocale: string,
  appLanguage: 'en' | 'bg'
): string | null {
  if (!message) return null;

  const match = message.match(/Available locales:\s*(.+)$/i);
  if (!match?.[1]) return null;

  const availableLocales = match[1]
    .split(',')
    .map(locale => locale.trim())
    .filter(Boolean);

  if (!availableLocales.length) return null;
  if (availableLocales.includes(preferredLocale)) return preferredLocale;

  const languagePrefix = `${appLanguage.toLowerCase()}-`;
  const sameLanguageLocale = availableLocales.find(locale => locale.toLowerCase().startsWith(languagePrefix));
  if (sameLanguageLocale) return sameLanguageLocale;

  const englishLocale = ['en-US', 'en-GB', 'en-AU', 'en-CA'].find(locale => availableLocales.includes(locale));
  if (englishLocale) return englishLocale;

  return availableLocales[0] ?? null;
}

function isUnsupportedLocaleError(message: string | undefined): boolean {
  if (!message) return false;
  return /Locale\s+[a-z]{2}-[A-Z]{2}\s+is not supported/i.test(message) || /Available locales:/i.test(message);
}

export function useSpeechToText({
  language,
  getText,
  setText,
  disabled = false,
}: UseSpeechToTextParams): UseSpeechToTextReturn {
  const t = useTranslate();
  const moduleRef = useRef<SpeechModule['ExpoSpeechRecognitionModule'] | null>(null);
  const [module, setModule] = useState<SpeechModule['ExpoSpeechRecognitionModule'] | null>(null); // state used only to trigger effects/subscriptions

  const [isRecording, setIsRecording] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const baseTextRef = useRef<string>('');
  const lastFinalTranscriptRef = useRef<string>('');
  const startSeqRef = useRef(0);
  const fallbackNoticeShownRef = useRef(false);
  const localeRetryInProgressRef = useRef(false);
  const androidBgPrefetchOnceRef = useRef(false);

  const lang = useMemo(() => (language === 'bg' ? 'bg-BG' : 'en-US'), [language]);

  const buildSpeechOptions = useCallback(
    (locale: string): ExpoSpeechRecognitionOptions => ({
      lang: locale,
      interimResults: true,
      // iOS-only app: keep non-continuous to match native behavior best.
      continuous: false,
      maxAlternatives: 1,
      addsPunctuation: true,
      // iOS dictation: hint the recognizer for best results
      iosTaskHint: Platform.OS === 'ios' ? 'dictation' : undefined,
      // Bias toward offline if available on device
      requiresOnDeviceRecognition: false,
      androidIntentOptions:
        Platform.OS === 'android'
          ? {
              EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS: 5000,
              EXTRA_SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS: 3000,
              EXTRA_LANGUAGE_MODEL: 'free_form',
              EXTRA_CALLING_PACKAGE: 'com.petyoplpetrov.Sphere',
            }
          : undefined,
    }),
    []
  );

  const getOrLoadModule = useCallback(() => {
    if (moduleRef.current) return moduleRef.current;
    const speech = getSpeechModule();
    const loaded = speech?.ExpoSpeechRecognitionModule ?? null;
    moduleRef.current = loaded;
    if (loaded) setModule(loaded);
    return loaded;
  }, []);

  // Native event subscriptions (safe even if module is missing)
  useEffect(() => {
    if (!module) return;

    const subs = [
      module.addListener('start', () => {
        setIsRecording(true);
        lastFinalTranscriptRef.current = '';
        baseTextRef.current = getText().trim();
      }),
      module.addListener('speechstart', () => {
        setIsListening(true);
      }),
      module.addListener('speechend', () => {
        setIsListening(false);
      }),
      module.addListener('end', () => {
        setIsRecording(false);
        setIsListening(false);
      }),
      module.addListener('result', (e: ExpoSpeechRecognitionResultEvent) => {
        const transcript = e?.results?.[0]?.transcript?.trim() ?? '';
        if (!transcript) return;

        const currentBase = baseTextRef.current;
        if (e.isFinal) {
          // In Android continuous mode, multiple final results can arrive per session.
          // Deduplicate identical finals instead of allowing only one.
          if (transcript === lastFinalTranscriptRef.current) return;
          lastFinalTranscriptRef.current = transcript;
          const committed = currentBase ? `${currentBase} ${transcript}`.trim() : transcript;
          baseTextRef.current = committed;
          setText(committed);
        } else {
          const preview = currentBase ? `${currentBase} ${transcript}`.trim() : transcript;
          setText(preview);
        }
      }),
      module.addListener('error', (e: ExpoSpeechRecognitionErrorEvent) => {
        setIsRecording(false);
        setIsListening(false);

        // Ignore benign/expected errors (no alert)
        if (e?.error === 'no-speech' || e?.error === 'speech-timeout' || e?.error === 'aborted') return;
        const rawMessage = e?.message;
        const message = rawMessage || t('ai.error.recording') || 'Speech recognition failed';

        if (e?.error === 'language-not-supported' || isUnsupportedLocaleError(rawMessage)) {
          const fallbackLocale = pickFallbackLocaleFromError(rawMessage, lang, language);
          if (
            fallbackLocale &&
            fallbackLocale !== lang &&
            !localeRetryInProgressRef.current
          ) {
            localeRetryInProgressRef.current = true;
            try {
              module.start(buildSpeechOptions(fallbackLocale));
              if (!fallbackNoticeShownRef.current) {
                fallbackNoticeShownRef.current = true;
                Alert.alert(t('ai.speech.fallback.title'), t('ai.speech.fallback.message'));
              }
              return;
            } catch {
              // Fall through to friendly error below.
            } finally {
              localeRetryInProgressRef.current = false;
            }
          }

          Alert.alert(t('ai.speech.unsupported.title'), t('ai.speech.unsupported.message'));
          return;
        }

        Alert.alert(t('common.error') || 'Error', message);
      }),
    ];

    return () => subs.forEach(s => s.remove());
  }, [module, getText, setText, t, buildSpeechOptions, lang, language]);

  // IMPORTANT:
  // Do not abort() on unmount. The underlying recognizer is effectively global, and aborting here can
  // cancel a new session started by another modal that mounts immediately after this one unmounts.

  const ensureAvailableAndPermitted = useCallback(async () => {
    // Web is not supported in these modals
    if (Platform.OS === 'web') {
      throw new Error(t('ai.error.notAvailable') || 'Speech recognition is not available on this device');
    }

    // Lazily load the native module (prevents crashes on startup if app wasn't rebuilt yet)
    const m = getOrLoadModule();
    if (!m) {
      throw new Error(
        t('ai.error.notAvailable') ||
          'Speech recognition is not available. Please rebuild the app so native modules are included.'
      );
    }

    const available = m.isRecognitionAvailable();
    if (!available) {
      throw new Error(t('ai.error.notAvailable') || 'Speech recognition is not available on this device');
    }

    const perms = await m.requestPermissionsAsync();
    if (!perms.granted) {
      throw new Error(t('ai.permission.message') || 'Microphone permission is required for speech-to-text.');
    }
  }, [getOrLoadModule, t]);

  const start = useCallback(async () => {
    if (disabled) return;
    await ensureAvailableAndPermitted();

    const m = getOrLoadModule();
    if (!m) return;

    const seq = ++startSeqRef.current;
    const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

    // Best-effort cleanup: avoid abort() here since it emits an "aborted" error event on iOS
    try {
      m.stop();
    } catch {
      // ignore
    }

    // iOS can be finicky about rapid restart: give the audio/session a brief moment to settle.
    if (Platform.OS === 'ios') {
      await sleep(180);
      // If another start was requested while we were waiting, ignore this one.
      if (startSeqRef.current !== seq) return;
    }

    // Best practice (Apple / expo-speech-recognition): query supported locales before starting so we
    // don't rely on failing first. Phone UI language does not add locales — only OS-supported IDs count.
    if (Platform.OS === 'android' && language === 'bg' && !androidBgPrefetchOnceRef.current) {
      androidBgPrefetchOnceRef.current = true;
      void prefetchBulgarianOfflineModelIfAndroid();
    }

    const supportedLocales = await getSupportedSpeechLocales();
    let localeToUse = lang;
    if (supportedLocales.length > 0) {
      const picked = pickSpeechLocaleFromSupportedList(supportedLocales, language);
      localeToUse = picked.locale;
      if (picked.bulgarianUnavailable && !fallbackNoticeShownRef.current) {
        fallbackNoticeShownRef.current = true;
        Alert.alert(t('ai.speech.fallback.title'), t('ai.speech.fallback.message'));
      }
    }

    const options = buildSpeechOptions(localeToUse);

    try {
      m.start(options);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const fallbackLocale = pickFallbackLocaleFromError(message, lang, language);

      if (fallbackLocale && fallbackLocale !== localeToUse) {
        try {
          m.start({
            ...options,
            lang: fallbackLocale,
          });
          if (!fallbackNoticeShownRef.current) {
            fallbackNoticeShownRef.current = true;
            Alert.alert(t('ai.speech.fallback.title'), t('ai.speech.fallback.message'));
          }
          return;
        } catch {
          // If fallback start also fails, surface the original error below.
        }
      }

      throw error;
    }
  }, [disabled, ensureAvailableAndPermitted, getOrLoadModule, lang, language, buildSpeechOptions, t]);

  const stop = useCallback(async () => {
    if (disabled) return;
    try {
      getOrLoadModule()?.stop();
    } catch {
      // ignore
    } finally {
      setIsRecording(false);
      setIsListening(false);
    }
  }, [disabled, getOrLoadModule]);

  const abort = useCallback(async () => {
    if (disabled) return;
    try {
      getOrLoadModule()?.abort();
    } catch {
      // ignore
    } finally {
      setIsRecording(false);
      setIsListening(false);
    }
  }, [disabled, getOrLoadModule]);

  return { isRecording, isListening, start, stop, abort };
}

