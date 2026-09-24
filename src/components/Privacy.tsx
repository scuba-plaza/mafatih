import type { ReactNode } from "react";

const HEADING = "text-sm font-medium text-stone-800 dark:text-stone-200";
const TEXT = "text-sm leading-relaxed text-stone-500";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className={HEADING}>{title}</h2>
      <div className={`flex flex-col gap-2 ${TEXT}`}>{children}</div>
    </section>
  );
}

export default function Privacy() {
  return (
    <article data-cy="privacy" className="flex max-w-2xl flex-col gap-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-400">Privacy policy</h1>
        <p className={TEXT}>
          Mafatih has no accounts, no cookies, no analytics and no advertising. This page explains the little data that
          is involved in using it.
        </p>
      </header>

      <Section title="Data stored on your device">
        <p>
          Your progress, statistics, lesson history and settings are saved in your browser's local storage, and
          recitation audio you have played is cached in your browser's IndexedDB so it does not have to be downloaded
          again. This data never leaves your device and is not sent to us or anyone else.
        </p>
        <p>
          You can delete it at any time with <strong>Reset progress</strong> in the settings,{" "}
          <strong>Reset recitation progress</strong> on the recitation page, the <strong>Delete</strong> button for
          cached audio in the recitation settings, or by clearing this site's data in your browser.
        </p>
      </Section>

      <Section title="Hosting">
        <p>
          The website is hosted on GitHub Pages, run by GitHub, Inc. When you open it, your browser sends GitHub the
          usual technical information needed to deliver a web page, including your IP address. GitHub may keep this in
          its server logs for security purposes. See GitHub's privacy statement for details.
        </p>
      </Section>

      <Section title="Recitation audio">
        <p>
          On the recitation pages, the audio for each ayah is loaded from everyayah.com. Your browser therefore connects
          to their servers, which receive your IP address and the ayah being requested. Nothing else is shared with
          them. The practice and custom pages make no such requests.
        </p>
      </Section>

      <Section title="Fonts">
        <p>All fonts are served from this website itself. No font or script is loaded from third-party services.</p>
      </Section>

      <Section title="Your rights">
        <p>
          Because we do not collect or store personal data ourselves, there is nothing held by us to access, correct or
          delete. For data processed by GitHub or everyayah.com, please refer to their privacy policies. You also have
          the right to lodge a complaint with a data protection supervisory authority.
        </p>
      </Section>
    </article>
  );
}
