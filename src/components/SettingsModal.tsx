import Modal, { CheckboxRow, DoneButton, FIELD, NAME, ROW, SelectRow } from "~/components/Modal.tsx";
import { TIERS, type Tier } from "~/engine/corpus/normalize.ts";
import { clampFontSize, FONT_SIZES, FONTS, fontOption, isFontId } from "~/engine/fonts.ts";
import { isMode, type Settings } from "~/storage/profile.ts";

export interface SettingsModalProps {
  open: boolean;
  settings: Settings;
  autoTier: Tier;
  onChange: (patch: Partial<Settings>) => void;
  onOpenRecitation: () => void;
  onOpenCustomText: () => void;
  onReset: () => void;
  onClose: () => void;
}

function SubSettings({ label, cy, onOpen }: { label: string; cy: string; onOpen: () => void }) {
  return (
    <div className={ROW}>
      <span className={NAME}>{label}</span>
      <button
        type="button"
        data-cy={cy}
        onClick={onOpen}
        className={`${FIELD} hover:bg-stone-200 dark:hover:bg-stone-700`}
      >
        Open Settings
      </button>
    </div>
  );
}

export default function SettingsModal({
  open,
  settings,
  autoTier,
  onChange,
  onOpenRecitation,
  onOpenCustomText,
  onReset,
  onClose,
}: SettingsModalProps) {
  return (
    <Modal
      open={open}
      cy="settings"
      title="Settings"
      onClose={onClose}
      footer={
        <>
          <button
            type="button"
            data-cy="reset-profile"
            onClick={() => {
              onReset();
              onClose();
            }}
            className="text-xs text-stone-400 hover:text-red-600 dark:hover:text-red-400"
          >
            Reset progress
          </button>
          <DoneButton cy="settings-done" onClick={onClose} />
        </>
      }
    >
      <SelectRow
        label="Mode"
        cy="setting-mode"
        value={settings.mode}
        onChange={(value) => onChange(isMode(value) ? { mode: value } : {})}
      >
        <option value="adaptive">Practice · adaptive</option>
        <option value="recite">Recitation · surah by surah</option>
        <option value="custom">Custom · your own text</option>
      </SelectRow>

      <SelectRow
        label="Diacritics"
        cy="setting-tier"
        value={settings.tierOverride ?? "auto"}
        onChange={(value) => onChange({ tierOverride: value === "auto" ? null : (value as Tier) })}
      >
        <option value="auto">{`Auto (${autoTier})`}</option>
        {TIERS.map((tier) => (
          <option key={tier} value={tier}>
            {tier}
          </option>
        ))}
      </SelectRow>

      <SubSettings label="Recitation" cy="open-recitation-settings" onOpen={onOpenRecitation} />

      <SubSettings label="Custom text" cy="open-custom-text-settings" onOpen={onOpenCustomText} />

      <CheckboxRow
        label="Show keyboard"
        cy="setting-show-keyboard"
        checked={settings.showKeyboard}
        onChange={(showKeyboard) => onChange({ showKeyboard })}
      />

      <SelectRow
        label="Font"
        cy="setting-font"
        value={settings.font}
        onChange={(value) => onChange(isFontId(value) ? { font: value } : {})}
      >
        {FONTS.map((f) => (
          <option key={f.id} value={f.id}>
            {f.name}
          </option>
        ))}
      </SelectRow>

      <SelectRow
        label="Font size"
        cy="setting-font-size"
        value={clampFontSize(settings.fontSize)}
        onChange={(value) => onChange({ fontSize: clampFontSize(value) })}
      >
        {FONT_SIZES.map((size) => (
          <option key={size} value={size}>
            {`${size} px`}
          </option>
        ))}
      </SelectRow>

      <div className="flex items-baseline justify-between gap-6 py-3">
        <span className="text-xs text-stone-400">{fontOption(settings.font).note}</span>
        <span
          lang="ar"
          data-cy="font-sample"
          className="font-arabic leading-tight text-stone-800 dark:text-stone-200"
          style={{ fontSize: `min(${clampFontSize(settings.fontSize)}px, 3rem)` }}
        >
          بِسْمِ اللَّهِ
        </span>
      </div>
    </Modal>
  );
}
