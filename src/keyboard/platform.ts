import { isRecord } from "~/lib/guards.ts";

const MAC = /^mac/i;

export function isMacPlatform(platform: string): boolean {
  return MAC.test(platform);
}

export function platformOf(source: { readonly platform: string }): string {
  const hints: unknown = Reflect.get(source, "userAgentData");
  const platform = isRecord(hints) ? hints.platform : undefined;
  return typeof platform === "string" && platform !== "" ? platform : source.platform;
}
