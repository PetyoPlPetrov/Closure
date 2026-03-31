import React, { createContext, useCallback, useContext, useRef, useState } from "react";

/** Stable API for triggering the loader. Consumers do NOT re-render when isVisible changes. */
type HomeTransitionLoaderActions = {
  showLoader: () => void;
  hideLoader: () => void;
};

/** Visibility state. Only the overlay consumes this so it re-renders when visible. */
type HomeTransitionLoaderVisibility = {
  isVisible: boolean;
};

const HomeTransitionLoaderActionsContext =
  createContext<HomeTransitionLoaderActions | null>(null);
const HomeTransitionLoaderVisibilityContext =
  createContext<HomeTransitionLoaderVisibility | null>(null);

const MIN_DISPLAY_MS = 250; // Ensure loader is visible long enough to paint

export function HomeTransitionLoaderProvider({ children }: { children: React.ReactNode }) {
  const [isVisible, setIsVisible] = useState(false);
  const fallbackRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shownAtRef = useRef<number>(0);

  const hideLoader = useCallback(() => {
    if (fallbackRef.current) {
      clearTimeout(fallbackRef.current);
      fallbackRef.current = null;
    }
    const elapsed = Date.now() - shownAtRef.current;
    const remaining = Math.max(0, MIN_DISPLAY_MS - elapsed);
    if (remaining > 0) {
      fallbackRef.current = setTimeout(() => {
        fallbackRef.current = null;
        setIsVisible(false);
      }, remaining);
    } else {
      setIsVisible(false);
    }
  }, []);

  /** Show loader immediately. Only used for: Focused↔Classic (circle avatar), Home tab press. */
  const showLoader = useCallback(() => {
    console.log('[HomeTransitionLoader] showLoader called, setting isVisible=true');
    if (fallbackRef.current) clearTimeout(fallbackRef.current);
    shownAtRef.current = Date.now();
    setIsVisible(true);
    fallbackRef.current = setTimeout(() => {
      fallbackRef.current = null;
      setIsVisible(false);
    }, 2500);
  }, []);

  React.useEffect(() => {
    return () => {
      if (fallbackRef.current) clearTimeout(fallbackRef.current);
    };
  }, []);

  const actionsValue = React.useMemo(() => ({ showLoader, hideLoader }), [showLoader, hideLoader]);
  const visibilityValue = React.useMemo(() => ({ isVisible }), [isVisible]);

  return (
    <HomeTransitionLoaderActionsContext.Provider value={actionsValue}>
      <HomeTransitionLoaderVisibilityContext.Provider value={visibilityValue}>
        {children}
      </HomeTransitionLoaderVisibilityContext.Provider>
    </HomeTransitionLoaderActionsContext.Provider>
  );
}

/** Use for triggering the loader. Stable reference – does not cause re-renders when loader shows/hides. */
export function useHomeTransitionLoader() {
  return useContext(HomeTransitionLoaderActionsContext);
}

/** Use only in the overlay – subscribes to visibility and re-renders when it changes. */
export function useHomeTransitionLoaderVisibility() {
  return useContext(HomeTransitionLoaderVisibilityContext);
}
