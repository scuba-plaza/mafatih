import { type ReactNode, useId } from "react";
import { useI18n } from "~/i18n/I18nProvider.tsx";
import { PageHeading } from "~/ui/PageHeading.tsx";
import { CREDITS, WORD_LIST_DATE } from "./credits.ts";

function Section({ title, children }: { title: string; children: ReactNode }) {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-2">
      <h2 id={headingId} className="text-lg font-semibold">
        {title}
      </h2>
      {children}
    </section>
  );
}

export function AboutPage() {
  const { t, formatDate } = useI18n();
  const date = formatDate(WORD_LIST_DATE, "UTC");

  return (
    <div className="flex max-w-prose flex-col gap-6">
      <PageHeading>{t("nav.about")}</PageHeading>
      <Section title={t("about.contentHeading")}>
        <p>{t("about.intro")}</p>
        <p>{t("about.quran")}</p>
      </Section>
      <Section title={t("about.privacyHeading")}>
        <p>{t("about.privacy")}</p>
      </Section>
      <Section title={t("about.creditsHeading")}>
        <dl className="flex flex-col gap-4">
          {CREDITS.map((credit) => (
            <div key={credit.label} className="flex flex-col gap-1">
              <dt className="font-medium">{t(credit.label)}</dt>
              <dd className="flex flex-col gap-1">
                <span className="text-sm text-muted">{t(credit.note, { date })}</span>
                <span className="flex flex-wrap gap-x-4">
                  {credit.links.map((link) => (
                    <a
                      key={link.href}
                      href={link.href}
                      lang="en"
                      dir="ltr"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-11 items-center text-sm underline underline-offset-2"
                    >
                      {link.name}
                    </a>
                  ))}
                </span>
              </dd>
            </div>
          ))}
        </dl>
      </Section>
    </div>
  );
}
