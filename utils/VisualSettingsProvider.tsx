/**
 * Visual settings: orbit rotation speed, constellation amount, and cosmic background opacity.
 * Persisted to AsyncStorage. In dark mode, cosmic opacity scales the starfield image (and TabScreenContainer).
 * In light mode, the same slider scales only the viewport-edge vignette on a `#FFFFFF` base (no full-screen tint).
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useTheme } from "@/utils/ThemeContext";

const ORBIT_DURATION_KEY = "@sferas:orbit_duration_ms";
const CONSTELLATION_AMOUNT_KEY = "@sferas:constellation_amount";
const CONSTELLATION_OPACITY_KEY = "@sferas:constellation_opacity";
const COSMIC_BACKGROUND_OPACITY_KEY = "@sferas:cosmic_background_opacity";
const APP_USABILITY_HINTS_KEY = "@sferas:app_usability_hints";
const STOP_PULSING_ANIMATIONS_KEY = "@sferas:stop_pulsing_animations";
export const SPLASH_ANIMATION_KEY = "@sferas:splash_animation";
const SPHERE_3D_EFFECT_KEY = "@sferas:sphere_3d_effect";

const DEFAULT_ORBIT_DURATION_MS = 60000;
const MIN_ORBIT_DURATION_MS = 20000;
const MAX_ORBIT_DURATION_MS = 120000;

const DEFAULT_CONSTELLATION_AMOUNT = 2;
const MIN_CONSTELLATION_AMOUNT = 0;
const MAX_CONSTELLATION_AMOUNT = 10;

const DEFAULT_CONSTELLATION_OPACITY = 5;
const MIN_CONSTELLATION_OPACITY = 0;
const MAX_CONSTELLATION_OPACITY = 10;

const DEFAULT_COSMIC_BACKGROUND_OPACITY = 1;
const MIN_COSMIC_BACKGROUND_OPACITY = 0;
const MAX_COSMIC_BACKGROUND_OPACITY = 10;

type VisualSettingsContextValue = {
  orbitDurationMs: number;
  setOrbitDurationMs: (value: number) => void;
  constellationAmount: number;
  setConstellationAmount: (value: number) => void;
  constellationOpacity: number;
  setConstellationOpacity: (value: number) => void;
  cosmicBackgroundOpacity: number;
  setCosmicBackgroundOpacity: (value: number) => void;
  appUsabilityHints: boolean;
  setAppUsabilityHints: (value: boolean) => void;
  pulsingAnimations: boolean;
  setPulsingAnimations: (value: boolean) => void;
  splashAnimation: boolean;
  setSplashAnimation: (value: boolean) => void;
  /** Glossy radial spheres + gradient insight cards. Off by default in dark; enabled automatically in light theme. */
  sphere3DEffect: boolean;
  setSphere3DEffect: (value: boolean) => void;
};

const VisualSettingsContext = createContext<VisualSettingsContextValue | null>(
  null,
);

export function VisualSettingsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { colorScheme } = useTheme();
  const [orbitDurationMs, setOrbitState] = useState(DEFAULT_ORBIT_DURATION_MS);
  const [constellationAmount, setConstellationState] = useState(
    DEFAULT_CONSTELLATION_AMOUNT,
  );
  const [constellationOpacity, setConstellationOpacityState] = useState(
    DEFAULT_CONSTELLATION_OPACITY,
  );
  const [cosmicBackgroundOpacity, setCosmicOpacityState] = useState(
    DEFAULT_COSMIC_BACKGROUND_OPACITY,
  );
  const [appUsabilityHints, setAppUsabilityHintsState] = useState(true);
  const [pulsingAnimations, setPulsingAnimationsState] = useState(true);
  const [splashAnimation, setSplashAnimationState] = useState(true);
  const [sphere3DEffect, setSphere3DEffectState] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.multiGet([
      ORBIT_DURATION_KEY,
      CONSTELLATION_AMOUNT_KEY,
      CONSTELLATION_OPACITY_KEY,
      COSMIC_BACKGROUND_OPACITY_KEY,
      APP_USABILITY_HINTS_KEY,
      STOP_PULSING_ANIMATIONS_KEY,
      SPLASH_ANIMATION_KEY,
      SPHERE_3D_EFFECT_KEY,
    ]).then(
      ([
        [, orbit],
        [, constellation],
        [, constellationOp],
        [, cosmic],
        [, hints],
        [, stopPulsing],
        [, splash],
        [, sphere3d],
      ]) => {
        if (orbit != null) {
          const n = parseInt(orbit, 10);
          if (
            Number.isFinite(n) &&
            n >= MIN_ORBIT_DURATION_MS &&
            n <= MAX_ORBIT_DURATION_MS
          ) {
            setOrbitState(n);
          }
        }
        if (constellation != null) {
          const n = parseInt(constellation, 10);
          if (
            Number.isFinite(n) &&
            n >= MIN_CONSTELLATION_AMOUNT &&
            n <= MAX_CONSTELLATION_AMOUNT
          ) {
            setConstellationState(n);
          }
        }
        if (constellationOp != null) {
          const n = parseInt(constellationOp, 10);
          if (
            Number.isFinite(n) &&
            n >= MIN_CONSTELLATION_OPACITY &&
            n <= MAX_CONSTELLATION_OPACITY
          ) {
            setConstellationOpacityState(n);
          }
        }
        if (cosmic != null) {
          const n = parseInt(cosmic, 10);
          if (
            Number.isFinite(n) &&
            n >= MIN_COSMIC_BACKGROUND_OPACITY &&
            n <= MAX_COSMIC_BACKGROUND_OPACITY
          ) {
            setCosmicOpacityState(n);
          }
        }
        if (hints != null && hints !== "true" && hints !== "false") {
          // Legacy or invalid
        } else if (hints === "false") {
          setAppUsabilityHintsState(false);
        }
        if (stopPulsing === "true") {
          // Legacy: "true" meant animations were stopped — flip to new semantics (false = not playing)
          setPulsingAnimationsState(false);
        } else if (stopPulsing === "false") {
          setPulsingAnimationsState(true);
        }
        if (splash === "false") {
          setSplashAnimationState(false);
        }
        if (sphere3d === "true") {
          setSphere3DEffectState(true);
        }
        setLoaded(true);
      },
    );
  }, []);

  const setOrbitDurationMs = useCallback((value: number) => {
    const clamped = Math.round(
      Math.max(MIN_ORBIT_DURATION_MS, Math.min(MAX_ORBIT_DURATION_MS, value)),
    );
    setOrbitState(clamped);
    AsyncStorage.setItem(ORBIT_DURATION_KEY, String(clamped));
  }, []);

  const setConstellationAmount = useCallback((value: number) => {
    const clamped = Math.round(
      Math.max(
        MIN_CONSTELLATION_AMOUNT,
        Math.min(MAX_CONSTELLATION_AMOUNT, value),
      ),
    );
    setConstellationState(clamped);
    AsyncStorage.setItem(CONSTELLATION_AMOUNT_KEY, String(clamped));
  }, []);

  const setConstellationOpacity = useCallback((value: number) => {
    const clamped = Math.round(
      Math.max(
        MIN_CONSTELLATION_OPACITY,
        Math.min(MAX_CONSTELLATION_OPACITY, value),
      ),
    );
    setConstellationOpacityState(clamped);
    AsyncStorage.setItem(CONSTELLATION_OPACITY_KEY, String(clamped));
  }, []);

  const setCosmicBackgroundOpacity = useCallback((value: number) => {
    const clamped = Math.round(
      Math.max(
        MIN_COSMIC_BACKGROUND_OPACITY,
        Math.min(MAX_COSMIC_BACKGROUND_OPACITY, value),
      ),
    );
    setCosmicOpacityState(clamped);
    AsyncStorage.setItem(COSMIC_BACKGROUND_OPACITY_KEY, String(clamped));
  }, []);

  const setAppUsabilityHints = useCallback((value: boolean) => {
    setAppUsabilityHintsState(value);
    AsyncStorage.setItem(APP_USABILITY_HINTS_KEY, String(value));
  }, []);

  const setPulsingAnimations = useCallback((value: boolean) => {
    setPulsingAnimationsState(value);
    // Store inverted so legacy readers still work (stored "true" = stopped = !playing)
    AsyncStorage.setItem(STOP_PULSING_ANIMATIONS_KEY, String(!value));
  }, []);

  const setSplashAnimation = useCallback((value: boolean) => {
    setSplashAnimationState(value);
    AsyncStorage.setItem(SPLASH_ANIMATION_KEY, String(value));
  }, []);

  const setSphere3DEffect = useCallback((value: boolean) => {
    setSphere3DEffectState(value);
    AsyncStorage.setItem(SPHERE_3D_EFFECT_KEY, String(value));
  }, []);

  /** Light theme (manual or system): glossy 3D sferas read better on pale surfaces — keep on. */
  useEffect(() => {
    if (!loaded) return;
    if (colorScheme !== "light") return;
    setSphere3DEffect(true);
  }, [loaded, colorScheme, setSphere3DEffect]);

  const value = useMemo<VisualSettingsContextValue>(
    () => ({
      orbitDurationMs,
      setOrbitDurationMs,
      constellationAmount,
      setConstellationAmount,
      constellationOpacity,
      setConstellationOpacity,
      cosmicBackgroundOpacity,
      setCosmicBackgroundOpacity,
      appUsabilityHints,
      setAppUsabilityHints,
      pulsingAnimations,
      setPulsingAnimations,
      splashAnimation,
      setSplashAnimation,
      sphere3DEffect,
      setSphere3DEffect,
    }),
    [
      orbitDurationMs,
      setOrbitDurationMs,
      constellationAmount,
      setConstellationAmount,
      constellationOpacity,
      setConstellationOpacity,
      cosmicBackgroundOpacity,
      setCosmicBackgroundOpacity,
      appUsabilityHints,
      setAppUsabilityHints,
      pulsingAnimations,
      setPulsingAnimations,
      splashAnimation,
      setSplashAnimation,
      sphere3DEffect,
      setSphere3DEffect,
    ],
  );

  return (
    <VisualSettingsContext.Provider value={value}>
      {children}
    </VisualSettingsContext.Provider>
  );
}

export function useVisualSettings(): VisualSettingsContextValue {
  const ctx = useContext(VisualSettingsContext);
  if (!ctx) {
    return {
      orbitDurationMs: DEFAULT_ORBIT_DURATION_MS,
      setOrbitDurationMs: () => {},
      constellationAmount: DEFAULT_CONSTELLATION_AMOUNT,
      setConstellationAmount: () => {},
      constellationOpacity: DEFAULT_CONSTELLATION_OPACITY,
      setConstellationOpacity: () => {},
      cosmicBackgroundOpacity: DEFAULT_COSMIC_BACKGROUND_OPACITY,
      setCosmicBackgroundOpacity: () => {},
      appUsabilityHints: true,
      setAppUsabilityHints: () => {},
      pulsingAnimations: true,
      setPulsingAnimations: () => {},
      splashAnimation: true,
      setSplashAnimation: () => {},
      sphere3DEffect: false,
      setSphere3DEffect: () => {},
    };
  }
  return ctx;
}

export {
  MAX_CONSTELLATION_AMOUNT,
  MAX_CONSTELLATION_OPACITY,
  MAX_COSMIC_BACKGROUND_OPACITY,
  MAX_ORBIT_DURATION_MS,
  MIN_CONSTELLATION_AMOUNT,
  MIN_CONSTELLATION_OPACITY,
  MIN_COSMIC_BACKGROUND_OPACITY,
  MIN_ORBIT_DURATION_MS
};

