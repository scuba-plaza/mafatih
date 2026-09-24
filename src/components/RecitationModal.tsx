import Modal, { CheckboxRow, DoneButton, NAME, NOTE, ROW, SelectRow } from "~/components/Modal.tsx";
import { isReciterId, RECITERS, reciterOption } from "~/engine/audio/reciters.ts";
import { surahs } from "~/engine/corpus/corpus.ts";
import { formatBytes } from "~/engine/format.ts";
import { AYAT_PER_LESSON, clampAyatPerLesson } from "~/engine/lessons/lesson.ts";
import {
  ayatCount,
  isSurahOrder,
  progressOf,
  resumeOf,
  type Story,
  type StoryPosition,
  surahSequence,
} from "~/engine/story/story.ts";
import type { AudioCache } from "~/hooks/useAudioCache.ts";
import type { Settings } from "~/storage/profile.ts";

export interface RecitationModalProps {
  open: boolean;
  settings: Settings;
  story: Story;
  audioCache: AudioCache;
  onChange: (patch: Partial<Settings>) => void;
  onGoTo: (position: StoryPosition) => void;
  onBack: () => void;
  onClose: () => void;
}

const USAGE = "font-mono text-xs tabular-nums text-stone-400";

export default function RecitationModal({
  open,
  settings,
  story,
  audioCache,
  onChange,
  onGoTo,
  onBack,
  onClose,
}: RecitationModalProps) {
  const reciter = reciterOption(settings.reciter);
  const { surah, ayah } = story.position;
  const byNumber = new Map(surahs.map((s) => [s.n, s]));

  return (
    <Modal
      open={open}
      cy="recitation-settings"
      title="Recitation"
      onBack={onBack}
      onClose={onClose}
      footer={
        <>
          <span className="text-xs text-stone-400">{`${reciter.name} — ${reciter.note}.`}</span>
          <DoneButton cy="recitation-settings-done" onClick={onClose} />
        </>
      }
    >
      <SelectRow
        label="Surah"
        cy="setting-surah"
        value={surah}
        onChange={(value) => {
          const next = Number(value);
          onGoTo({ surah: next, ayah: resumeOf(story, next) });
        }}
      >
        {surahSequence(settings.surahOrder).map((n) => {
          const meta = byNumber.get(n);
          const done = progressOf(story, n).complete ? " ✓" : "";
          return meta === undefined ? null : (
            <option key={n} value={n}>
              {`${n}. ${meta.tname}${done}`}
            </option>
          );
        })}
      </SelectRow>

      <SelectRow
        label="Start at ayah"
        cy="setting-ayah"
        value={ayah}
        onChange={(value) => onGoTo({ surah, ayah: Number(value) })}
      >
        {Array.from({ length: ayatCount(surah) }, (_, i) => i + 1).map((n) => (
          <option key={n} value={n}>
            {`${surah}:${n}`}
          </option>
        ))}
      </SelectRow>

      <SelectRow
        label="Surah order"
        cy="setting-surah-order"
        value={settings.surahOrder}
        onChange={(value) => onChange(isSurahOrder(value) ? { surahOrder: value } : {})}
      >
        <option value="mushaf">Mushaf · Al-Fatiha to An-Nas</option>
        <option value="juz-amma">Juz ʿAmma first · An-Nas back to An-Naba</option>
      </SelectRow>

      <SelectRow
        label="Ayat per lesson"
        cy="setting-ayat"
        value={clampAyatPerLesson(settings.ayatPerLesson)}
        onChange={(value) => onChange({ ayatPerLesson: clampAyatPerLesson(value) })}
      >
        {AYAT_PER_LESSON.map((count) => (
          <option key={count} value={count}>
            {count === 1 ? "1 ayah" : `${count} ayat`}
          </option>
        ))}
      </SelectRow>

      <SelectRow
        label="Reciter"
        cy="setting-reciter"
        value={settings.reciter}
        onChange={(value) => onChange(isReciterId(value) ? { reciter: value } : {})}
      >
        {RECITERS.map((r) => (
          <option key={r.id} value={r.id}>
            {`${r.style} · ${r.kbps} kbps`}
          </option>
        ))}
      </SelectRow>

      <CheckboxRow
        label="Play the whole passage"
        cy="setting-auto-advance"
        checked={settings.autoAdvance}
        onChange={(autoAdvance) => onChange({ autoAdvance })}
      />

      <p className={NOTE} data-cy="reciter-note">
        {settings.autoAdvance ? "Playback runs on through the passage." : "Playback stops at the end of each ayah."}
      </p>

      {audioCache.supported ? (
        <div className={ROW}>
          <span className={NAME}>Cached audio</span>
          <span className="flex items-center gap-3">
            <span data-cy="audio-cache-usage" data-bytes={audioCache.usage.bytes} className={USAGE}>
              {`${formatBytes(audioCache.usage.bytes)} · ${audioCache.usage.files} ${
                audioCache.usage.files === 1 ? "ayah" : "ayat"
              }`}
            </span>
            <button
              type="button"
              data-cy="clear-audio-cache"
              disabled={audioCache.busy || audioCache.usage.files === 0}
              onClick={audioCache.clear}
              className="text-xs text-stone-400 hover:text-red-600 disabled:opacity-40 disabled:hover:text-stone-400 dark:hover:text-red-400"
            >
              Delete
            </button>
          </span>
        </div>
      ) : null}
    </Modal>
  );
}
