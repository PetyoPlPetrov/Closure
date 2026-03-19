import React, { createContext, useContext } from "react";

export type AIMemoryModalContextValue = {
  openMemoryModal: () => void;
};

export const AIMemoryModalContext =
  createContext<AIMemoryModalContextValue | null>(null);

export function useAIMemoryModal(): AIMemoryModalContextValue | null {
  return useContext(AIMemoryModalContext);
}
