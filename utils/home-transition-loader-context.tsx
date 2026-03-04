import React, { createContext, useCallback, useContext, useRef, useState } from "react";

/** Stable API for triggering the loader. Consumers do NOT re-render when isVisible changes. */
type HomeTransitionLoaderActions = {
  showLoader: () => void;
};

/** Visibility state. Only the overlay consumes this so it re-renders when visible. */
type HomeTransitionLoaderVisibility = {
  isVisible: boolean;
};

const HomeTransitionLoaderActionsContext =
  createContext<HomeTransitionLoaderActions | null>(null);
const HomeTransitionLoaderVisibilityContext =
  createContext<HomeTransitionLoaderVisibility | null>(null);

export function HomeTransitionLoaderProvider({ children }: { children: React.ReactNode }) {
  const [isVisible, setIsVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showLoader = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setIsVisible(true);
    timerRef.current = setTimeout(() => {
      setIsVisible(false);
      timerRef.current = null;
    }, 1000);
  }, []);

  React.useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const actionsValue = React.useMemo(() => ({ showLoader }), [showLoader]);
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
