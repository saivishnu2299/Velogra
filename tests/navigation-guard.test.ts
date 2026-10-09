import { test } from "node:test";
import assert from "node:assert/strict";
import {
  installProjectNavigationGuard,
  registerProjectNavigationGuard,
} from "../app/studio/navigation-guard";

test("a studio can stop Back before the router unmounts it", () => {
  const browser = new EventTarget();
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: browser,
  });
  try {
    installProjectNavigationGuard();
    installProjectNavigationGuard();
    let routed = 0;
    let guarded = 0;
    browser.addEventListener("popstate", () => routed++);
    const oldStudio = registerProjectNavigationGuard(() => {
      throw new Error("Obsolete studio should not handle Back");
    });
    const currentStudio = registerProjectNavigationGuard((event) => {
      guarded++;
      event.stopImmediatePropagation();
    });
    oldStudio();
    browser.dispatchEvent(new Event("popstate"));
    assert.equal(guarded, 1);
    assert.equal(routed, 0);
    currentStudio();
    browser.dispatchEvent(new Event("popstate"));
    assert.equal(routed, 1);
  } finally {
    Reflect.deleteProperty(globalThis, "window");
  }
});
