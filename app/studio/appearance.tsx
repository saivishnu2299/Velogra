"use client";

import { ThemeProvider, useTheme } from "next-themes";
import { useSyncExternalStore, type ReactNode } from "react";

const subscribe = () => () => {};

export function AppearanceProvider({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem
      enableColorScheme storageKey="velogra-appearance" disableTransitionOnChange>
      {children}
    </ThemeProvider>
  );
}

export function useAppearance() {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);
  const dark = mounted && resolvedTheme === "dark";
  const setDark = (next: boolean | ((previous: boolean) => boolean)) =>
    setTheme((typeof next === "function" ? next(dark) : next) ? "dark" : "light");
  return { dark, setDark };
}

export function AppearanceSelect() {
  const { theme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);
  return (
    <select className="appearance-select" aria-label="Appearance"
      title="System follows your computer’s appearance"
      value={mounted ? theme ?? "system" : "system"}
      onChange={(event) => setTheme(event.target.value)}>
      <option value="system">System</option>
      <option value="light">Light</option>
      <option value="dark">Dark</option>
    </select>
  );
}
