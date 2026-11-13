import { useEffect, useId, useRef, useState } from "react";
import { useI18n } from "~/i18n/I18nProvider.tsx";
import type { Settings } from "~/settings/settings.ts";
import { Switch } from "~/ui/Switch.tsx";
import { VolumeIcon } from "./icons.tsx";
import type { Reciter } from "./reciters.ts";

const ICON_BUTTON = "flex min-h-11 min-w-11 items-center justify-center rounded-full text-muted";

export interface AudioPanelProps {
  readonly settings: Settings;
  readonly reciter: Reciter;
  readonly change: (patch: Partial<Settings>) => void;
}

export function AudioPanel({ settings, reciter, change }: AudioPanelProps) {
  const { t, language, formatPercent } = useI18n();
  const [open, setOpen] = useState(false);
  const wrapper = useRef<HTMLDivElement>(null);
  const opener = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const volumeId = useId();

  useEffect(() => {
    const area = wrapper.current;
    if (!open || area === null) {
      return;
    }
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !area.contains(event.target)) {
        setOpen(false);
      }
    };
    const closeOnEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        setOpen(false);
        opener.current?.focus();
      }
    };
    const leaves = (event: globalThis.FocusEvent) => {
      if (event.relatedTarget instanceof Node && !area.contains(event.relatedTarget)) {
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", outside, true);
    area.addEventListener("keydown", closeOnEscape);
    area.addEventListener("focusout", leaves);
    return () => {
      document.removeEventListener("pointerdown", outside, true);
      area.removeEventListener("keydown", closeOnEscape);
      area.removeEventListener("focusout", leaves);
    };
  }, [open]);

  const name = language === "ar" ? reciter.nameAr : reciter.name;
  const style = language === "ar" ? reciter.styleAr : reciter.style;

  return (
    <div ref={wrapper} className="relative">
      <button
        ref={opener}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen(!open)}
        className={`${ICON_BUTTON} ${open ? "text-accent" : ""}`}
      >
        <VolumeIcon muted={settings.muted} />
        <span className="sr-only">{t("player.options")}</span>
      </button>
      <fieldset
        id={panelId}
        hidden={!open}
        className="absolute end-0 bottom-full z-30 mb-3 flex w-64 flex-col gap-1 rounded-2xl border border-line bg-surface p-4 shadow-[0_18px_50px_rgba(0,0,0,0.55)] md:start-1/2 md:end-auto md:-translate-x-1/2 md:rtl:translate-x-1/2"
      >
        <legend className="sr-only">{t("player.panel")}</legend>
        <p aria-hidden="true" className="text-xs tracking-widest text-muted uppercase">
          {t("player.panel")}
        </p>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-pressed={settings.muted}
            onClick={() => change({ muted: !settings.muted })}
            className={`${ICON_BUTTON} aria-pressed:text-accent`}
          >
            <VolumeIcon muted={settings.muted} />
            <span className="sr-only">{t("player.mute")}</span>
          </button>
          <label htmlFor={volumeId} className="sr-only">
            {t("player.volume")}
          </label>
          <input
            id={volumeId}
            type="range"
            min={0}
            max={100}
            step={5}
            value={Math.round(settings.volume * 100)}
            aria-valuetext={formatPercent(settings.volume)}
            onChange={(event) => change({ volume: Number(event.target.value) / 100 })}
            className="h-11 min-w-0 flex-1 accent-accent"
          />
          <span aria-hidden="true" className="w-10 text-end font-mono text-xs tabular-nums">
            {formatPercent(settings.volume)}
          </span>
        </div>
        <Switch
          label={t("player.whole")}
          checked={settings.playWhole}
          onChange={(playWhole) => change({ playWhole })}
        />
        <p className="border-t border-faint pt-3 text-xs text-muted">
          {t("player.reciter", { reciter: name, style, kbps: reciter.kbps })}
        </p>
      </fieldset>
    </div>
  );
}
