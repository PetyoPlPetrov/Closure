/**
 * Visual settings: orbit rotation speed, constellation amount, and cosmic background opacity.
 * Persisted to AsyncStorage and used by Home (classic + focused), ConstellationBackground, and TabScreenContainer.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

const ORBIT_DURATION_KEY = "@sferas:orbit_duration_ms";
const CONSTELLATION_AMOUNT_KEY = "@sferas:constellation_amount";
const CONSTELLATION_OPACITY_KEY = "@sferas:constellation_opacity";
const COSMIC_BACKGROUND_OPACITY_KEY = "@sferas:cosmic_background_opacity";
const APP_USABILITY_HINTS_KEY = "@sferas:app_usability_hints";

const DEFAULT_ORBIT_DURATION_MS = 60000;
const MIN_ORBIT_DURATION_MS = 20000;
const MAX_ORBIT_DURATION_MS = 120000;

const DEFAULT_CONSTELLATION_AMOUNT = 2;
const MIN_CONSTELLATION_AMOUNT = 0;
const MAX_CONSTELLATION_AMOUNT = 10;

const DEFAULT_CONSTELLATION_OPACITY = 5;
const MIN_CONSTELLATION_OPACITY = 0;
const MAX_CONSTELLATION_OPACITY = 10;

const DEFAULT_COSMIC_BACKGROUND_OPACITY = 10;
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
};

const VisualSettingsContext = createContext<VisualSettingsContextValue | null>(null);

export function VisualSettingsProvider({ children }: { children: React.ReactNode }) {
  const [orbitDurationMs, setOrbitState] = useState(DEFAULT_ORBIT_DURATION_MS);
  const [constellationAmount, setConstellationState] = useState(DEFAULT_CONSTELLATION_AMOUNT);
  const [constellationOpacity, setConstellationOpacityState] = useState(DEFAULT_CONSTELLATION_OPACITY);
  const [cosmicBackgroundOpacity, setCosmicOpacityState] = useState(DEFAULT_COSMIC_BACKGROUND_OPACITY);
  const [appUsabilityHints, setAppUsabilityHintsState] = useState(true);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.multiGet([
      ORBIT_DURATION_KEY,
      CONSTELLATION_AMOUNT_KEY,
      CONSTELLATION_OPACITY_KEY,
      COSMIC_BACKGROUND_OPACITY_KEY,
      APP_USABILITY_HINTS_KEY,
    ]).then(([[, orbit], [, constellation], [, constellationOp], [, cosmic], [, hints]]) => {
        if (orbit != null) {
          const n = parseInt(orbit, 10);
          if (Number.isFinite(n) && n >= MIN_ORBIT_DURATION_MS && n <= MAX_ORBIT_DURATION_MS) {
            setOrbitState(n);
          }
        }
        if (constellation != null) {
          const n = parseInt(constellation, 10);
          if (Number.isFinite(n) && n >= MIN_CONSTELLATION_AMOUNT && n <= MAX_CONSTELLATION_AMOUNT) {
            setConstellationState(n);
          }
        }
        if (constellationOp != null) {
          const n = parseInt(constellationOp, 10);
          if (Number.isFinite(n) && n >= MIN_CONSTELLATION_OPACITY && n <= MAX_CONSTELLATION_OPACITY) {
            setConstellationOpacityState(n);
          }
        }
        if (cosmic != null) {
          const n = parseInt(cosmic, 10);
          if (Number.isFinite(n) && n >= MIN_COSMIC_BACKGROUND_OPACITY && n <= MAX_COSMIC_BACKGROUND_OPACITY) {
            setCosmicOpacityState(n);
          }
        }
        if (hints != null && hints !== "true" && hints !== "false") {
          // Legacy or invalid
        } else if (hints === "false") {
          setAppUsabilityHintsState(false);
        }
        setLoaded(true);
      },
    );
  }, []);

  const setOrbitDurationMs = useCallback((value: number) => {
    const clamped = Math.round(Math.max(MIN_ORBIT_DURATION_MS, Math.min(MAX_ORBIT_DURATION_MS, value)));
    setOrbitState(clamped);
    AsyncStorage.setItem(ORBIT_DURATION_KEY, String(clamped));
  }, []);

  const setConstellationAmount = useCallback((value: number) => {
    const clamped = Math.round(Math.max(MIN_CONSTELLATION_AMOUNT, Math.min(MAX_CONSTELLATION_AMOUNT, value)));
    setConstellationState(clamped);
    AsyncStorage.setItem(CONSTELLATION_AMOUNT_KEY, String(clamped));
  }, []);

  const setConstellationOpacity = useCallback((value: number) => {
    const clamped = Math.round(
      Math.max(MIN_CONSTELLATION_OPACITY, Math.min(MAX_CONSTELLATION_OPACITY, value)),
    );
    setConstellationOpacityState(clamped);
    AsyncStorage.setItem(CONSTELLATION_OPACITY_KEY, String(clamped));
  }, []);

  const setCosmicBackgroundOpacity = useCallback((value: number) => {
    const clamped = Math.round(
      Math.max(MIN_COSMIC_BACKGROUND_OPACITY, Math.min(MAX_COSMIC_BACKGROUND_OPACITY, value)),
    );
    setCosmicOpacityState(clamped);
    AsyncStorage.setItem(COSMIC_BACKGROUND_OPACITY_KEY, String(clamped));
  }, []);

  const setAppUsabilityHints = useCallback((value: boolean) => {
    setAppUsabilityHintsState(value);
    AsyncStorage.setItem(APP_USABILITY_HINTS_KEY, String(value));
  }, []);

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
    };
  }
  return ctx;
}

export {
  MIN_ORBIT_DURATION_MS,
  MAX_ORBIT_DURATION_MS,
  MIN_CONSTELLATION_AMOUNT,
  MAX_CONSTELLATION_AMOUNT,
  MIN_CONSTELLATION_OPACITY,
  MAX_CONSTELLATION_OPACITY,
  MIN_COSMIC_BACKGROUND_OPACITY,
  MAX_COSMIC_BACKGROUND_OPACITY,
};
