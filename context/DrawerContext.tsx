import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

type DrawerContextValue = {
  isOpen: boolean;
  open: () => void;
  close: () => void;
};

const DrawerContext = createContext<DrawerContextValue | undefined>(undefined);

/** Holds the app-wide navigation drawer open/closed state so the shared header
 *  (on any page) can open it and the global drawer overlay can read it. */
export function DrawerProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const value = useMemo(() => ({ isOpen, open, close }), [isOpen, open, close]);
  return <DrawerContext.Provider value={value}>{children}</DrawerContext.Provider>;
}

export function useDrawer() {
  const ctx = useContext(DrawerContext);
  if (!ctx) throw new Error("useDrawer must be used within DrawerProvider");
  return ctx;
}
