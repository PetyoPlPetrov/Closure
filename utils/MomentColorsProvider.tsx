import { useColorScheme } from "@/hooks/use-color-scheme";
import { useSubscription } from "@/utils/SubscriptionProvider";
import { canUseMomentColorEditingWithoutSubscription } from "@/utils/badge-rewards";
import { subscribeBadgeRewardsChanged } from "@/utils/badge-rewards-events";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { AppState } from "react-native";

const STORAGE_KEY = "@sferas:moment_colors";

export interface MomentColorSet {
  background: string;
  text: string;
}

export interface MomentColors {
  sunny: MomentColorSet;
  cloudy: MomentColorSet;
  lesson: MomentColorSet;
}

// Lesson default: cosmic-tinted gold (blend of #FFD700 + #5CE1E6 at 28%) — the "growing bulb" color
const CLOUDY_DEFAULT: MomentColorSet = {
  background: "#2C3E50",
  text: "#FFFFFFE6",
};
const LESSON_DEFAULT: MomentColorSet = {
  background: "#D1DA40",
  /** Dark text on default lime bulb — white was inaccessible on this fill */
  text: "#0D0D0D",
};

/**
 * Theme-aware defaults: dark keeps vivid gold on cosmic UI; light uses warmer amber
 * so sun moments match the softer gray surfaces and pastel sferas.
 */
export function getDefaultMomentColors(
  colorScheme: "light" | "dark",
): MomentColors {
  return {
    sunny: {
      background: colorScheme === "light" ? "#F59E0B" : "#FFD700",
      text: "#000000",
    },
    cloudy: CLOUDY_DEFAULT,
    lesson: LESSON_DEFAULT,
  };
}

/** Dark-theme defaults; use `getDefaultMomentColors` when the active theme matters. */
export const DEFAULT_MOMENT_COLORS: MomentColors =
  getDefaultMomentColors("dark");

interface MomentColorsContextValue {
  momentColors: MomentColors;
  setMomentColor: (
    type: keyof MomentColors,
    field: keyof MomentColorSet,
    value: string,
  ) => void;
  resetToDefaults: () => void;
  isLoaded: boolean;
}

const MomentColorsContext = createContext<MomentColorsContextValue>({
  momentColors: DEFAULT_MOMENT_COLORS,
  setMomentColor: () => {},
  resetToDefaults: () => {},
  isLoaded: false,
});

export function MomentColorsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const appColorScheme = useColorScheme();
  const scheme: "light" | "dark" =
    appColorScheme === "light" ? "light" : "dark";

  const [colors, setColors] = useState<MomentColors>(() =>
    getDefaultMomentColors("dark"),
  );
  const [isLoaded, setIsLoaded] = useState(false);

  const LEGACY_LESSON_TEXT = "#1A1A1A"; // old default; align with current base.lesson.text

  useEffect(() => {
    const base = getDefaultMomentColors(scheme);
    let cancelled = false;

    const normalizeHex6 = (hex?: string) => {
      if (!hex) return "";
      let s = hex.replace(/^#/, "").trim().toUpperCase();
      if (s.length === 3) s = s.split("").map((c) => c + c).join("");
      return s.length >= 6 ? s.slice(0, 6) : s;
    };

    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (cancelled) return;
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            const lesson = { ...base.lesson, ...parsed.lesson };
            let lessonNeedsPersist = false;
            if (
              lesson.text?.toUpperCase() === LEGACY_LESSON_TEXT.toUpperCase()
            ) {
              lesson.text = base.lesson.text;
              lessonNeedsPersist = true;
            }
            // White on old default lime lesson fill — failed contrast; use body-style dark text
            const bgN = normalizeHex6(lesson.background);
            const txN = normalizeHex6(lesson.text);
            if (bgN === "D1DA40" && txN === "FFFFFF") {
              lesson.text = "#0D0D0D";
              lessonNeedsPersist = true;
            }
            if (lessonNeedsPersist) {
              AsyncStorage.setItem(
                STORAGE_KEY,
                JSON.stringify({
                  sunny: { ...base.sunny, ...parsed.sunny },
                  cloudy: { ...base.cloudy, ...parsed.cloudy },
                  lesson,
                }),
              ).catch(() => {});
            }
            setColors({
              sunny: { ...base.sunny, ...parsed.sunny },
              cloudy: { ...base.cloudy, ...parsed.cloudy },
              lesson,
            });
          } catch {
            // corrupt data — keep defaults
          }
        } else {
          setColors(base);
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoaded(true);
      });

    return () => {
      cancelled = true;
    };
  }, [scheme]);

  const persist = useCallback((next: MomentColors) => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
  }, []);

  const setMomentColor = useCallback(
    (type: keyof MomentColors, field: keyof MomentColorSet, value: string) => {
      setColors((prev) => {
        const next = {
          ...prev,
          [type]: { ...prev[type], [field]: value },
        };
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const resetToDefaults = useCallback(() => {
    const next = getDefaultMomentColors(scheme);
    setColors(next);
    AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
  }, [scheme]);

  const value = useMemo(
    () => ({ momentColors: colors, setMomentColor, resetToDefaults, isLoaded }),
    [colors, setMomentColor, resetToDefaults, isLoaded],
  );

  return (
    <MomentColorsContext.Provider value={value}>
      {children}
    </MomentColorsContext.Provider>
  );
}

/** Returns custom moment colors when user has any subscription (Plus or AI); otherwise defaults. */
export function useMomentColors() {
  const ctx = useContext(MomentColorsContext);
  const appColorScheme = useColorScheme();
  const scheme: "light" | "dark" =
    appColorScheme === "light" ? "light" : "dark";
  const fallbackColors = useMemo(() => getDefaultMomentColors(scheme), [scheme]);
  const { isSubscribed } = useSubscription(); // true for Sfera Plus OR Sfera AI
  const [hasBadgeAccess, setHasBadgeAccess] = useState(false);

  useEffect(() => {
    let mounted = true;

    const refreshBadgeAccess = async () => {
      const allowed = await canUseMomentColorEditingWithoutSubscription();
      if (mounted) {
        setHasBadgeAccess(allowed);
      }
    };

    void refreshBadgeAccess();

    const sub = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        void refreshBadgeAccess();
      }
    });

    // Refresh immediately when a memory is logged (or when the streak is recomputed)
    // so the user gets/loses Pulse-unlocked moment colors without backgrounding the app.
    const unsubscribe = subscribeBadgeRewardsChanged(() => {
      void refreshBadgeAccess();
    });

    return () => {
      mounted = false;
      sub.remove();
      unsubscribe();
    };
  }, []);

  return useMemo(
    () =>
      isSubscribed || hasBadgeAccess
        ? ctx
        : { ...ctx, momentColors: fallbackColors },
    [ctx, isSubscribed, hasBadgeAccess, fallbackColors],
  );
}

/** Raw context without subscription gating — used only by the settings screen
 *  so free users can preview colors even though they can't save them. */
export function useMomentColorsRaw() {
  return useContext(MomentColorsContext);
}
