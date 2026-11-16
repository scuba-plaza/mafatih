import { useSyncExternalStore } from "react";
import { platformOf } from "~/keyboard/platform.ts";
import { useDialogOpen } from "~/ui/dialogs.ts";
import { useMediaQuery } from "~/ui/useMediaQuery.ts";
import { type Chrome, chromeFor, isApplePlatform, isPhoneScreen, keyboardReserve } from "./screen.ts";
import { useSoftKeyboard } from "./softKeyboard.ts";

function subscribe(notify: () => void): () => void {
  const viewport = window.visualViewport;
  viewport?.addEventListener("resize", notify);
  window.addEventListener("resize", notify);
  return () => {
    viewport?.removeEventListener("resize", notify);
    window.removeEventListener("resize", notify);
  };
}

function visibleHeight(): number {
  return window.visualViewport?.height ?? window.innerHeight;
}

export function useChrome(): { readonly chrome: Chrome; readonly reserve: number } {
  const keyboardUp = useSoftKeyboard();
  const dialogOpen = useDialogOpen();
  const coarse = useMediaQuery("(pointer: coarse)");
  const height = useSyncExternalStore(subscribe, visibleHeight, () => 0);
  const phone = isPhoneScreen({ coarse, screenWidth: screen.width, screenHeight: screen.height });
  const appleTouch = coarse && isApplePlatform(platformOf(navigator));
  return {
    chrome: dialogOpen ? "full" : chromeFor({ phone, keyboardUp, visibleHeight: height }),
    reserve: keyboardReserve({ appleTouch, keyboardUp }),
  };
}
