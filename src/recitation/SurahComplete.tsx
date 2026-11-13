import { type CSSProperties, useEffect, useId, useRef } from "react";
import { useI18n } from "~/i18n/I18nProvider.tsx";
import { useProfile } from "~/storage/ProfileProvider.tsx";
import { announceDialogChange } from "~/ui/dialogs.ts";
import { StarIcon } from "~/ui/StarIcon.tsx";
import { PRIMARY_BUTTON, SHEET } from "~/ui/styles.ts";
import { accuracyOf, completedSurahs, STAR_ACCURACY } from "./progress.ts";
import { SURAH_COUNT, type SurahMeta, surahName } from "./quran.ts";
import type { SurahFinish } from "./useRecitation.ts";

const RAYS = 18;
const MINUTE_MS = 60_000;

type RayStyle = CSSProperties & { "--angle": string; "--delay": string };

const RAY_LIST: readonly { readonly id: string; readonly style: RayStyle }[] = Array.from(
  { length: RAYS },
  (_, index) => ({
    id: `ray-${index}`,
    style: { "--angle": `${(360 / RAYS) * index}deg`, "--delay": `${(index % 3) * 60}ms` },
  }),
);

export interface SurahCompleteProps {
  readonly meta: SurahMeta;
  readonly finish: SurahFinish | null;
  readonly next: SurahMeta;
  readonly endsTheOrder: boolean;
  readonly onContinue: () => void;
  readonly onAgain: () => void;
}

export function SurahComplete({ meta, finish, next, endsTheOrder, onContinue, onAgain }: SurahCompleteProps) {
  const { t, language, formatNumber, formatPercent, formatDuration } = useI18n();
  const { recitation } = useProfile().profile;
  const dialog = useRef<HTMLDialogElement>(null);
  const primary = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const open = finish !== null;
  const openNow = useRef(open);

  useEffect(() => {
    openNow.current = open;
    const element = dialog.current;
    if (element === null) {
      return;
    }
    if (open && !element.open) {
      element.showModal();
      element.scrollTop = 0;
      primary.current?.focus();
      announceDialogChange();
    } else if (!open && element.open) {
      element.close();
    }
  }, [open]);

  const accuracy = finish === null ? 0 : accuracyOf(finish.tally);
  const starred = accuracy >= STAR_ACCURACY;
  const minutes = finish === null ? 0 : finish.tally.ms / MINUTE_MS;
  const speed = minutes > 0 && finish !== null ? finish.tally.total / minutes : 0;

  return (
    <dialog
      ref={dialog}
      aria-labelledby={titleId}
      closedby="any"
      onClose={() => {
        announceDialogChange();
        if (openNow.current) {
          onContinue();
        }
      }}
      className={`${SHEET} md:w-md`}
    >
      {finish !== null && (
        <div className="celebration-card relative flex flex-col items-center gap-5 px-6 pt-14 pb-[max(1.5rem,env(safe-area-inset-bottom))] text-center">
          <div className="relative flex items-center justify-center">
            <span
              aria-hidden="true"
              className="celebration-halo pointer-events-none absolute top-1/2 left-1/2 size-44 -translate-x-1/2 -translate-y-1/2 rounded-full"
            />
            <span aria-hidden="true" className="pointer-events-none absolute top-1/2 left-1/2">
              {RAY_LIST.map((ray) => (
                <span
                  key={ray.id}
                  data-ray=""
                  className="celebration-ray absolute h-3 w-1.5 rounded-full"
                  style={ray.style}
                />
              ))}
            </span>
            <span lang="ar" data-surah-name="" className="celebration-name relative text-5xl leading-tight text-ink">
              {meta.name}
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <h2 id={titleId} className="text-lg font-medium">
              {t("celebration.title", { surah: surahName(meta, language) })}
            </h2>
            <p className="text-sm text-muted">
              {finish.completions === 1
                ? `${language === "en" ? `${meta.ename}. ` : ""}${t("celebration.first")}`
                : t("celebration.repeat", { count: finish.completions })}
            </p>
          </div>
          <dl className="grid w-full grid-cols-4 gap-2 border-y border-faint py-4">
            {[
              { label: t("celebration.ayat"), value: formatNumber(meta.ayat) },
              { label: t("celebration.accuracy"), value: formatPercent(accuracy) },
              { label: t("celebration.speed"), value: `${formatNumber(speed)}${t("celebration.perMinute")}` },
              { label: t("celebration.time"), value: formatDuration(finish.tally.ms) },
            ].map((figure) => (
              <div key={figure.label} className="flex min-w-0 flex-col-reverse items-center gap-1">
                <dt className="text-[0.65rem] tracking-widest text-muted uppercase">{figure.label}</dt>
                <dd className="font-mono text-lg tabular-nums">{figure.value}</dd>
              </div>
            ))}
          </dl>
          <p className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-sm text-muted">
            {starred && (
              <>
                <span className="celebration-star flex">
                  <StarIcon className="size-5" />
                </span>
                <span>{t("celebration.star", { percent: Math.round(STAR_ACCURACY * 100) })}</span>
                <span aria-hidden="true">·</span>
              </>
            )}
            <span>{t("map.tally", { done: completedSurahs(recitation), total: SURAH_COUNT })}</span>
          </p>
          {endsTheOrder && <p className="text-sm text-muted">{t("recitation.orderEnds")}</p>}
          <div className="flex w-full flex-col items-stretch gap-2">
            <button ref={primary} type="button" onClick={onContinue} className={`${PRIMARY_BUTTON} w-full`}>
              {endsTheOrder
                ? t("recitation.startAgain")
                : t("celebration.continue", { surah: surahName(next, language) })}
            </button>
            <button
              type="button"
              onClick={onAgain}
              className="min-h-11 rounded-xl px-5 text-sm text-muted hover:text-ink"
            >
              {t("celebration.again")}
            </button>
          </div>
        </div>
      )}
    </dialog>
  );
}
