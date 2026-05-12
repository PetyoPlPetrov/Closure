import React, { createContext, useContext } from "react";

export type OnboardingGateContextValue = {
  requestShowOnboarding: () => Promise<void>;
  /** Hide the onboarding overlay immediately (call after persisting completion). */
  dismissOnboarding: () => void;
};

export const OnboardingGateContext =
  createContext<OnboardingGateContextValue | null>(null);

export function useOnboardingGate(): OnboardingGateContextValue | null {
  return useContext(OnboardingGateContext);
}
