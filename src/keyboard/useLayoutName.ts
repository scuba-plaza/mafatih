import { useI18n } from "~/i18n/I18nProvider.tsx";
import { MAC_LAYOUT_NAME } from "./layout101.ts";
import { isMacPlatform, platformOf } from "./platform.ts";

export function useLayoutName(): string {
  const { t } = useI18n();
  return isMacPlatform(platformOf(navigator)) ? MAC_LAYOUT_NAME : t("guide.layout");
}
