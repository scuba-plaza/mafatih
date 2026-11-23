import { type ReactNode, useLayoutEffect, useRef, useState } from "react";
import { useI18n } from "~/i18n/I18nProvider.tsx";
import { GUIDE_WIDTH } from "~/keyboard/GuideKeyboard.tsx";

export function PreviewScale({ children }: { readonly children: ReactNode }) {
  const { t, formatNumber } = useI18n();
  const frame = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const outer = frame.current;
    const inner = content.current;
    if (outer === null || inner === null) {
      return;
    }
    const measure = () => {
      const keyboard = inner.querySelector("[data-guide-keyboard]:not([hidden])");
      setScale(keyboard === null ? 1 : Math.min(1, outer.clientWidth / GUIDE_WIDTH));
    };
    measure();
    const resize = new ResizeObserver(measure);
    resize.observe(outer);
    const changes = new MutationObserver(measure);
    changes.observe(inner, { subtree: true, childList: true, attributes: true, attributeFilter: ["hidden"] });
    return () => {
      resize.disconnect();
      changes.disconnect();
    };
  }, []);

  return (
    <div className="flex min-w-0 flex-col gap-1">
      <div ref={frame} className="min-w-0">
        <div ref={content} data-preview-scale="" style={{ zoom: scale }}>
          {children}
        </div>
      </div>
      {scale < 1 && (
        <p className="text-xs text-muted">
          {t("settings.previewScale", { percent: formatNumber(Math.round(scale * 100)) })}
        </p>
      )}
    </div>
  );
}
