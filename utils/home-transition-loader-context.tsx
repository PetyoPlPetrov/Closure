import React, { createContext, useCallback, useContext, useRef, useState } from "react";

type HomeTransitionLoaderContextValue = {
  isVisible: boolean;
  showLoader: () => void;
};

const HomeTransitionLoaderContext = createContext<HomeTransitionLoaderContextValue | null>(null);

export function HomeTransitionLoaderProvider({ children }: { children: React.ReactNode }) {
  const [isVisible, setIsVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showLoader = useCallback(() => {
    if (__DEV__) console.log("[HomeTransitionLoader] showLoader called");
    if (timerRef.current) clearTimeout(timerRef.current);
    setIsVisible(true);
    timerRef.current = setTimeout(() => {
      if (__DEV__) console.log("[HomeTransitionLoader] hiding after 1s");
      setIsVisible(false);
      timerRef.current = null;
    }, 1000);
  }, []);

  React.useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const value = React.useMemo(
    () => ({ isVisible, showLoader }),
    [isVisible, showLoader],
  );

  return (
    <HomeTransitionLoaderContext.Provider value={value}>
      {children}
    </HomeTransitionLoaderContext.Provider>
  );
}

export function useHomeTransitionLoader() {
  const ctx = useContext(HomeTransitionLoaderContext);
  return ctx;
}
