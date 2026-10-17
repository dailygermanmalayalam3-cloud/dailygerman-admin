"use client";

import { useSyncExternalStore } from "react";

const emptySubscribe = () => () => {};

/**
 * React 19 / SSR Hydration Safe client mount hook using useSyncExternalStore.
 * Avoids cascading render cycles and violates 0 ESLint react-hooks/set-state-in-effect rules.
 */
export function useIsMounted(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}
