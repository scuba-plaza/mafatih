import { formatRoute } from "~/app/routes.ts";
import { useI18n } from "~/i18n/I18nProvider.tsx";
import { useProfile } from "~/storage/ProfileProvider.tsx";
import { PageHeading } from "~/ui/PageHeading.tsx";
import { Rail } from "~/ui/Rail.tsx";
import { PRIMARY_BUTTON } from "~/ui/styles.ts";
import { surahOrder } from "./order.ts";
import {
  completedSurahs,
  completionsOf,
  type RecitationProgress,
  starCount,
  starredOf,
  startOf,
  typedAyat,
} from "./progress.ts";
import { requireSurahMeta, SURAH_COUNT, type SurahMeta, surahName } from "./quran.ts";

function StarIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4 shrink-0 text-accent" fill="currentColor">
      <path d="M12 2.6l2.9 6.1 6.7.8-4.9 4.6 1.3 6.6L12 17.5l-6 3.2 1.3-6.6L2.4 9.5l6.7-.8z" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="size-4 shrink-0 text-muted"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  );
}

function SurahRow({ meta, progress }: { meta: SurahMeta; progress: RecitationProgress }) {
  const { t, language, formatNumber } = useI18n();
  const typed = typedAyat(progress, meta.n);
  const completed = completionsOf(progress, meta.n);
  const starred = starredOf(progress, meta.n);
  const fraction = typed > 0 ? typed / meta.ayat : completed > 0 ? 1 : 0;
  const detail =
    typed > 0
      ? t("map.typed", { typed, total: meta.ayat })
      : completed > 0
        ? t("map.completed", { count: completed })
        : t("map.ayat", { count: meta.ayat });
  return (
    <a
      href={formatRoute({ page: "recitation", surah: meta.n, ayah: null })}
      className="grid min-h-16 grid-cols-[2rem_1fr_auto] items-center gap-x-4 gap-y-3 border-t border-faint py-4"
    >
      <span className="font-mono text-xs text-muted tabular-nums">{formatNumber(meta.n)}</span>
      <span className="flex min-w-0 flex-col wrap-anywhere">
        <span className="flex items-center gap-2">
          {language === "ar" ? null : <span>{meta.tname}</span>}
          {starred ? (
            <>
              <StarIcon />
              <span className="sr-only">{t("map.starred")}</span>
            </>
          ) : completed > 0 ? (
            <CheckIcon />
          ) : null}
        </span>
        <span className="text-sm text-muted">{detail}</span>
      </span>
      <span lang="ar" dir="rtl" className="text-xl">
        {meta.name}
      </span>
      {fraction > 0 && <Rail value={fraction} className="col-start-2 col-end-4" />}
    </a>
  );
}

export function SurahMap() {
  const { t, language, formatNumber } = useI18n();
  const { profile } = useProfile();
  const { recitation, settings } = profile;
  const start = startOf(recitation, settings.surahOrder);
  const startName = surahName(requireSurahMeta(start.surah), language);
  const stars = starCount(recitation);
  const label =
    recitation.position === null
      ? t("map.start", { surah: startName })
      : t("map.continue", { surah: startName, ayah: start.ayah });

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
      <div className="flex flex-col gap-2">
        <PageHeading>{t("nav.recitation")}</PageHeading>
        <p className="flex items-center gap-2 text-sm text-muted">
          <span>{t("map.tally", { done: completedSurahs(recitation), total: SURAH_COUNT })}</span>
          {stars > 0 && (
            <>
              <span aria-hidden="true">·</span>
              <StarIcon />
              <span>{formatNumber(stars)}</span>
              <span className="sr-only">{t("map.stars")}</span>
            </>
          )}
        </p>
        <p className="hidden text-sm text-muted md:block">{t("map.rule")}</p>
      </div>
      <div>
        <a
          href={formatRoute({ page: "recitation", surah: start.surah, ayah: start.ayah })}
          className={`${PRIMARY_BUTTON} inline-flex items-center`}
        >
          {label}
        </a>
      </div>
      <ul aria-label={t("map.list")} className="flex flex-col">
        {surahOrder(settings.surahOrder).map((number) => (
          <li key={number} className="min-w-0">
            <SurahRow meta={requireSurahMeta(number)} progress={recitation} />
          </li>
        ))}
      </ul>
    </div>
  );
}
