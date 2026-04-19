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
export const DEFAULT_MOMENT_COLORS: MomentColors = {
  sunny: { background: "#FFD700", text: "#000000" },
  cloudy: { background: "#2C3E50", text: "#FFFFFFE6" },
  lesson: { background: "#D1DA40", text: "#FFFFFF" },
};

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
  const [colors, setColors] = useState<MomentColors>(DEFAULT_MOMENT_COLORS);
  const [isLoaded, setIsLoaded] = useState(false);

  const LEGACY_LESSON_TEXT = "#1A1A1A"; // old default; migrate to new default (#FFFFFF)

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            const lesson = { ...DEFAULT_MOMENT_COLORS.lesson, ...parsed.lesson };
            // Migrate old default lesson text to new default (white)
            if (
              lesson.text?.toUpperCase() === LEGACY_LESSON_TEXT.toUpperCase()
            ) {
              lesson.text = DEFAULT_MOMENT_COLORS.lesson.text;
              AsyncStorage.setItem(
                STORAGE_KEY,
                JSON.stringify({
                  sunny: { ...DEFAULT_MOMENT_COLORS.sunny, ...parsed.sunny },
                  cloudy: { ...DEFAULT_MOMENT_COLORS.cloudy, ...parsed.cloudy },
                  lesson,
                }),
              ).catch(() => {});
            }
            setColors({
              sunny: { ...DEFAULT_MOMENT_COLORS.sunny, ...parsed.sunny },
              cloudy: { ...DEFAULT_MOMENT_COLORS.cloudy, ...parsed.cloudy },
              lesson,
            });
          } catch {
            // corrupt data — keep defaults
          }
        }
      })
      .finally(() => setIsLoaded(true));
  }, []);

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
    setColors(DEFAULT_MOMENT_COLORS);
    AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
  }, []);

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
        : { ...ctx, momentColors: DEFAULT_MOMENT_COLORS },
    [ctx, isSubscribed, hasBadgeAccess],
  );
}

/** Raw context without subscription gating — used only by the settings screen
 *  so free users can preview colors even though they can't save them. */
export function useMomentColorsRaw() {
  return useContext(MomentColorsContext);
}
