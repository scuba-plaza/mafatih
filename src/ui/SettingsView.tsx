import { useRef, useState } from "react";
import { TIERS } from "~/engine/normalize.ts";
import { Confirm } from "./Confirm.tsx";
import { emptyProfile, exportProfile, type Profile, parseProfile, type TierOverride } from "./storage.ts";

interface SettingsViewProps {
  profile: Profile;
  onProfile: (profile: Profile) => void;
}

export function SettingsView({ profile, onProfile }: SettingsViewProps) {
  const [confirmReset, setConfirmReset] = useState(false);
  const [importTarget, setImportTarget] = useState<Profile | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const setTierOverride = (tierOverride: TierOverride) => {
    onProfile({ ...profile, settings: { ...profile.settings, tierOverride } });
  };

  const download = () => {
    const blob = new Blob([exportProfile(profile)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "mafatih-progress.json";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section aria-labelledby="settings-heading" className="mx-auto flex max-w-xl flex-col gap-8 px-4">
      <h1 id="settings-heading" className="text-xl font-semibold">
        Settings
      </h1>

      <div>
        <h2 className="mb-2 font-medium">Harakat</h2>
        <label className="text-sm text-stone-600 dark:text-stone-300" htmlFor="tier-select">
          On Auto, harakat join in once all 36 letters are unlocked and each mark is practised. Choosing a tier always
          shows that tier.
        </label>
        <select
          id="tier-select"
          value={profile.settings.tierOverride}
          onChange={(event) => setTierOverride(event.target.value as TierOverride)}
          className="mt-2 rounded-lg border border-stone-300 bg-white px-3 py-2 dark:border-stone-700 dark:bg-stone-900"
        >
          <option value="auto">Auto</option>
          {TIERS.map((tier) => (
            <option key={tier} value={tier} lang="ar">
              {tier === "none" ? "Letters only" : tier === "core" ? "Core harakat" : "Full vocalization"}
            </option>
          ))}
        </select>
      </div>

      <div>
        <h2 className="mb-2 font-medium">Keyboard</h2>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={profile.settings.fingerColors}
            onChange={(event) =>
              onProfile({
                ...profile,
                settings: { ...profile.settings, fingerColors: event.target.checked },
              })
            }
          />
          Colour the on-screen keys by the finger that presses them
        </label>
      </div>

      <div>
        <h2 className="mb-2 font-medium">Your data</h2>
        <p className="mb-3 text-sm text-stone-600 dark:text-stone-300">
          Your progress stays in this browser. Export it to move it to another device.
        </p>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={download}
            className="rounded-lg border border-stone-300 px-4 py-2 hover:border-stone-400 dark:border-stone-700"
          >
            Export progress
          </button>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="rounded-lg border border-stone-300 px-4 py-2 hover:border-stone-400 dark:border-stone-700"
          >
            Import progress…
          </button>
          <button
            type="button"
            onClick={() => setConfirmReset(true)}
            className="rounded-lg border border-red-700 px-4 py-2 text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
          >
            Reset all progress…
          </button>
        </div>
        {importError !== null ? (
          <p role="alert" className="mt-3 text-sm text-red-700 dark:text-red-400">
            {importError}
          </p>
        ) : null}
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={async (event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file === undefined) {
              return;
            }
            const parsed = parseProfile(await file.text());
            if (parsed === null) {
              setImportError("That file is not a Mafatih progress export.");
              return;
            }
            setImportError(null);
            setImportTarget(parsed);
          }}
        />
      </div>

      {importTarget !== null ? (
        <Confirm
          title="Replace your progress?"
          body="The imported file overwrites everything you have typed so far in this browser: letters, harakat and every surah. This cannot be undone."
          confirmLabel="Replace progress"
          onConfirm={() => {
            onProfile(importTarget);
            setImportTarget(null);
          }}
          onCancel={() => setImportTarget(null)}
        />
      ) : null}

      {confirmReset ? (
        <Confirm
          title="Reset all progress?"
          body="Every unlocked letter, every harakat tier and every surah's ✓ and ★ is deleted, in both Practice and Recitation. This cannot be undone."
          confirmLabel="Delete everything"
          onConfirm={() => {
            onProfile(emptyProfile());
            setConfirmReset(false);
          }}
          onCancel={() => setConfirmReset(false)}
        />
      ) : null}
    </section>
  );
}
