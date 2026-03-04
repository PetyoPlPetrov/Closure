/**
 * Visual settings: orbit rotation speed and constellation amount.
 * Persisted to AsyncStorage and used by Home (classic + focused) and ConstellationBackground.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

const ORBIT_DURATION_KEY = "@sferas:orbit_duration_ms";
const CONSTELLATION_AMOUNT_KEY = "@sferas:constellation_amount";

const DEFAULT_ORBIT_DURATION_MS = 60000;
const MIN_ORBIT_DURATION_MS = 20000;
const MAX_ORBIT_DURATION_MS = 120000;

const DEFAULT_CONSTELLATION_AMOUNT = 10;
const MIN_CONSTELLATION_AMOUNT = 0;
const MAX_CONSTELLATION_AMOUNT = 10;

type VisualSettingsContextValue = {
  orbitDurationMs: number;
  setOrbitDurationMs: (value: number) => void;
  constellationAmount: number;
  setConstellationAmount: (value: number) => void;
};

const VisualSettingsContext = createContext<VisualSettingsContextValue | null>(null);

export function VisualSettingsProvider({ children }: { children: React.ReactNode }) {
  const [orbitDurationMs, setOrbitState] = useState(DEFAULT_ORBIT_DURATION_MS);
  const [constellationAmount, setConstellationState] = useState(DEFAULT_CONSTELLATION_AMOUNT);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.multiGet([ORBIT_DURATION_KEY, CONSTELLATION_AMOUNT_KEY]).then(([[, orbit], [, constellation]]) => {
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
      setLoaded(true);
    });
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

  const value = useMemo<VisualSettingsContextValue>(
    () => ({
      orbitDurationMs,
      setOrbitDurationMs,
      constellationAmount,
      setConstellationAmount,
    }),
    [orbitDurationMs, setOrbitDurationMs, constellationAmount, setConstellationAmount],
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
    };
  }
  return ctx;
}

export {
  MIN_ORBIT_DURATION_MS,
  MAX_ORBIT_DURATION_MS,
  MIN_CONSTELLATION_AMOUNT,
  MAX_CONSTELLATION_AMOUNT,
};
