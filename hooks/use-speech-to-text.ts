import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Platform } from 'react-native';
import type { ExpoSpeechRecognitionErrorEvent, ExpoSpeechRecognitionOptions, ExpoSpeechRecognitionResultEvent } from 'expo-speech-recognition';
import { useTranslate } from '@/utils/languages/use-translate';

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

const STT_DEBUG = __DEV__ && true;
function dlog(...args: any[]) {
  if (!STT_DEBUG) return;
  // eslint-disable-next-line no-console
  console.log('[SpeechToText]', ...args);
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

  const lang = useMemo(() => (language === 'bg' ? 'bg-BG' : 'en-US'), [language]);

  const getOrLoadModule = useCallback(() => {
    if (moduleRef.current) return moduleRef.current;
    const speech = getSpeechModule();
    const loaded = speech?.ExpoSpeechRecognitionModule ?? null;
    moduleRef.current = loaded;
    if (loaded) setModule(loaded);
    dlog('loadModule', { loaded: !!loaded, platform: Platform.OS });
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
        dlog('event:start', { baseLen: baseTextRef.current.length });
      }),
      module.addListener('speechstart', () => {
        setIsListening(true);
        dlog('event:speechstart');
      }),
      module.addListener('speechend', () => {
        setIsListening(false);
        dlog('event:speechend');
      }),
      module.addListener('end', () => {
        setIsRecording(false);
        setIsListening(false);
        dlog('event:end');
      }),
      module.addListener('audiostart', (e: any) => {
        dlog('event:audiostart', { hasUri: !!e?.uri });
      }),
      module.addListener('audioend', (e: any) => {
        dlog('event:audioend', { hasUri: !!e?.uri });
      }),
      module.addListener('nomatch', () => {
        dlog('event:nomatch');
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
          dlog('event:result(final)', { len: transcript.length, committedLen: committed.length });
        } else {
          const preview = currentBase ? `${currentBase} ${transcript}`.trim() : transcript;
          setText(preview);
          dlog('event:result(partial)', { len: transcript.length, previewLen: preview.length });
        }
      }),
      module.addListener('error', (e: ExpoSpeechRecognitionErrorEvent) => {
        setIsRecording(false);
        setIsListening(false);

        // Always log errors in dev; only alert on actionable ones.
        dlog('event:error', { error: e?.error, code: e?.code, message: e?.message });

        // Ignore benign/expected errors (no alert)
        if (e?.error === 'no-speech' || e?.error === 'speech-timeout' || e?.error === 'aborted') return;
        const message = e?.message || t('ai.error.recording') || 'Speech recognition failed';
        Alert.alert(t('common.error') || 'Error', message);
      }),
    ];

    return () => subs.forEach(s => s.remove());
  }, [module, getText, setText, t]);

  // Ensure we stop recognition if component unmounts
  useEffect(() => {
    return () => {
      try {
        module?.abort();
      } catch {
        // ignore
      }
    };
  }, [module]);

  const ensureAvailableAndPermitted = useCallback(async () => {
    // Web is not supported in these modals
    if (Platform.OS === 'web') {
      throw new Error((t('ai.error.notAvailable' as any) as any) || 'Speech recognition is not available on this device');
    }

    // Lazily load the native module (prevents crashes on startup if app wasn't rebuilt yet)
    const m = getOrLoadModule();
    if (!m) {
      dlog('ensureAvailableAndPermitted:missingNativeModule');
      throw new Error(
        (t('ai.error.notAvailable' as any) as any) ||
          'Speech recognition is not available. Please rebuild the app so native modules are included.'
      );
    }

    const available = m.isRecognitionAvailable();
    dlog('availability', { available, lang });
    if (!available) {
      throw new Error((t('ai.error.notAvailable' as any) as any) || 'Speech recognition is not available on this device');
    }

    const perms = await m.requestPermissionsAsync();
    dlog('permissions', { status: (perms as any)?.status, granted: perms.granted, restricted: (perms as any)?.restricted, canAskAgain: (perms as any)?.canAskAgain });
    if (!perms.granted) {
      throw new Error(t('ai.permission.message') || 'Microphone permission is required for speech-to-text.');
    }
  }, [getOrLoadModule, t]);

  const start = useCallback(async () => {
    if (disabled) return;
    dlog('start:pressed', { lang, disabled });
    await ensureAvailableAndPermitted();

    const m = getOrLoadModule();
    if (!m) return;

    // Best-effort cleanup: avoid abort() here since it emits an "aborted" error event on iOS
    try {
      m.stop();
      dlog('prestart:stop');
    } catch {
      // ignore
    }

    const options: ExpoSpeechRecognitionOptions = {
      lang,
      interimResults: true,
      // iOS-only app: keep non-continuous to match native behavior best.
      continuous: false,
      maxAlternatives: 1,
      addsPunctuation: true,
      // iOS dictation: hint the recognizer for best results
      iosTaskHint: Platform.OS === 'ios' ? 'dictation' : undefined,
      // Bias toward offline if available on device
      requiresOnDeviceRecognition: false,
      androidIntentOptions: Platform.OS === 'android'
        ? {
            EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS: 5000,
            EXTRA_SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS: 3000,
            EXTRA_LANGUAGE_MODEL: 'free_form',
            EXTRA_CALLING_PACKAGE: 'com.petyoplpetrov.Sphere',
          }
        : undefined,
    };

    dlog('start:options', {
      lang: options.lang,
      interimResults: options.interimResults,
      continuous: options.continuous,
      maxAlternatives: options.maxAlternatives,
      addsPunctuation: options.addsPunctuation,
      iosTaskHint: options.iosTaskHint,
      requiresOnDeviceRecognition: options.requiresOnDeviceRecognition,
    });
    m.start(options);
  }, [disabled, ensureAvailableAndPermitted, getOrLoadModule, lang]);

  const stop = useCallback(async () => {
    if (disabled) return;
    dlog('stop:pressed');
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
    dlog('abort:called');
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

