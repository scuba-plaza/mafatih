const PHONE_BELOW_PX = 600;
const TEXT_ONLY_BELOW_PX = 320;
const IOS_BAR_PX = 64;

const APPLE = /^(mac|iphone|ipad|ipod)/i;

export type Chrome = "full" | "collapsed" | "text-only";

export function isPhoneScreen({
  coarse,
  screenWidth,
  screenHeight,
}: {
  readonly coarse: boolean;
  readonly screenWidth: number;
  readonly screenHeight: number;
}): boolean {
  return coarse && Math.min(screenWidth, screenHeight) < PHONE_BELOW_PX;
}

export function chromeFor({
  phone,
  keyboardUp,
  visibleHeight,
}: {
  readonly phone: boolean;
  readonly keyboardUp: boolean;
  readonly visibleHeight: number;
}): Chrome {
  if (!phone || !keyboardUp) {
    return "full";
  }
  return visibleHeight < TEXT_ONLY_BELOW_PX ? "text-only" : "collapsed";
}

export function isApplePlatform(platform: string): boolean {
  return APPLE.test(platform);
}

export function keyboardReserve({
  appleTouch,
  keyboardUp,
}: {
  readonly appleTouch: boolean;
  readonly keyboardUp: boolean;
}): number {
  return appleTouch && keyboardUp ? IOS_BAR_PX : 0;
}
