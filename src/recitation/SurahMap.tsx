import { formatRoute } from "~/app/routes.ts";
import { useI18n } from "~/i18n/I18nProvider.tsx";
import { useProfile } from "~/storage/ProfileProvider.tsx";
import { PageHeading } from "~/ui/PageHeading.tsx";
import { PRIMARY_BUTTON } from "~/ui/styles.ts";
import { surahOrder } from "./order.ts";
import { completionsOf, type RecitationProgress, startOf, typedAyat } from "./progress.ts";
import { requireSurahMeta, type SurahMeta, surahName } from "./quran.ts";

const RING_RADIUS = 11;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;

function Ring({ fraction }: { fraction: number }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 28 28" className="size-7 shrink-0 -rotate-90" fill="none" strokeWidth="3">
      <circle cx="14" cy="14" r={RING_RADIUS} className="stroke-line forced-colors:stroke-[GrayText]" />
      {fraction > 0 && (
        <circle
          cx="14"
          cy="14"
          r={RING_RADIUS}
          className="stroke-accent forced-colors:stroke-[Highlight]"
          strokeDasharray={`${fraction * RING_LENGTH} ${RING_LENGTH}`}
          strokeLinecap="round"
        />
      )}
    </svg>
  );
}

function SurahLink({ meta, progress }: { meta: SurahMeta; progress: RecitationProgress }) {
  const { t, language, formatNumber } = useI18n();
  const typed = typedAyat(progress, meta.n);
  const completed = completionsOf(progress, meta.n);
  const fraction = typed > 0 ? typed / meta.ayat : completed > 0 ? 1 : 0;
  return (
    <a
      href={formatRoute({ page: "recitation", surah: meta.n, ayah: null })}
      className="flex min-h-14 items-center gap-3 rounded-md border border-line bg-surface px-3 py-2 hover:bg-page"
    >
      <Ring fraction={fraction} />
      <span className="flex min-w-0 flex-col wrap-anywhere">
        <span className="font-medium">
          <span className="text-muted">{formatNumber(meta.n)}. </span>
          {language === "ar" ? (
            meta.name
          ) : (
            <>
              {meta.tname}{" "}
              <span lang="ar" dir="rtl" className="font-normal">
                {meta.name}
              </span>
            </>
          )}
        </span>
        <span className="text-sm text-muted">
          {typed > 0 ? t("map.typed", { typed, total: meta.ayat }) : t("map.ayat", { count: meta.ayat })}
        </span>
        {completed > 0 && <span className="text-sm">{t("map.completed", { count: completed })}</span>}
      </span>
    </a>
  );
}

export function SurahMap() {
  const { t, language } = useI18n();
  const { profile } = useProfile();
  const { recitation, settings } = profile;
  const start = startOf(recitation, settings.surahOrder);
  const startName = surahName(requireSurahMeta(start.surah), language);
  const label =
    recitation.position === null
      ? t("map.start", { surah: startName })
      : t("map.continue", { surah: startName, ayah: start.ayah });

  return (
    <div className="flex flex-col gap-4">
      <PageHeading>{t("nav.recitation")}</PageHeading>
      <div>
        <a
          href={formatRoute({ page: "recitation", surah: start.surah, ayah: start.ayah })}
          className={`${PRIMARY_BUTTON} inline-flex items-center`}
        >
          {label}
        </a>
      </div>
      <ul aria-label={t("map.list")} className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,15rem),1fr))] gap-2">
        {surahOrder(settings.surahOrder).map((number) => (
          <li key={number} className="min-w-0">
            <SurahLink meta={requireSurahMeta(number)} progress={recitation} />
          </li>
        ))}
      </ul>
    </div>
  );
}
