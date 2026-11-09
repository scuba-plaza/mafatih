import { HARAKAT } from "~/engine/layout.ts";
import { LETTER_ORDER, type Progress, recentAccuracy } from "~/engine/progression.ts";

export function StatsView({ progress }: { progress: Progress }) {
  const rows = (chars: readonly string[]) =>
    chars.map((char) => {
      const stat = progress.stats[char];
      return (
        <tr key={char}>
          <td lang="ar" className="py-1">
            {char}
          </td>
          <td className="py-1 text-stone-500 dark:text-stone-400">
            {stat === undefined ? "—" : `${Math.round(recentAccuracy(stat) * 100)}%`}
          </td>
          <td className="py-1 text-stone-500 dark:text-stone-400">{stat?.attempts ?? 0}</td>
        </tr>
      );
    });

  return (
    <section aria-labelledby="stats-heading" className="mx-auto max-w-3xl px-4">
      <h1 id="stats-heading" className="mb-4 text-xl font-semibold">
        Stats
      </h1>
      <p className="mb-6 text-sm text-stone-600 dark:text-stone-300">
        {progress.unlocked.length} of 36 letters unlocked · harakat tier: {progress.tier}. Recent accuracy is the mean
        over your last attempts; a letter unlocks at 95%.
      </p>
      <div className="grid gap-8 sm:grid-cols-2">
        <div>
          <h2 className="mb-2 font-medium">Letters</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-start text-stone-500 dark:text-stone-400">
                <th scope="col" className="text-start">
                  Letter
                </th>
                <th scope="col" className="text-start">
                  Recent
                </th>
                <th scope="col" className="text-start">
                  Attempts
                </th>
              </tr>
            </thead>
            <tbody>{rows(LETTER_ORDER)}</tbody>
          </table>
        </div>
        <div>
          <h2 className="mb-2 font-medium">Harakat</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-stone-500 dark:text-stone-400">
                <th scope="col" className="text-start">
                  Mark
                </th>
                <th scope="col" className="text-start">
                  Recent
                </th>
                <th scope="col" className="text-start">
                  Attempts
                </th>
              </tr>
            </thead>
            <tbody>{rows([...HARAKAT])}</tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
