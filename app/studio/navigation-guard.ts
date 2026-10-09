type HistoryGuard = (event: PopStateEvent) => void;

let activeGuard: HistoryGuard | null = null;
let installed = false;

export function installProjectNavigationGuard() {
  if (installed || typeof window === "undefined") return;
  installed = true;
  // Window-target events run in registration order. Install before the router
  // so it cannot unmount a studio whose final save has not committed.
  window.addEventListener("popstate", (event) => activeGuard?.(event));
}

export function registerProjectNavigationGuard(guard: HistoryGuard) {
  activeGuard = guard;
  return () => {
    if (activeGuard === guard) activeGuard = null;
  };
}
