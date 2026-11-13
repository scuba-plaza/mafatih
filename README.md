# مفاتيح · Mafatih

THIS PROJECT IS MOSTLY AI GENERATED. Dont use it if you care about quality code or souls.

**Learn to touch-type Arabic.**

Mafatih ("keys") is a free typing trainer that runs in your browser. It has two ways to learn, and they are kept apart on purpose:

- **Recitation** (the default). You type the Qur'an, passage by passage, exactly as it is written, whole and in order, while you can listen to Abdul Basit ʿAbd us-Samad recite each ayah.
- **Practice.** You drill everyday, fully vocalized words, never the Qur'an. A new learner can start at once with the ten home-row letters; every other letter and mark unlocks as you type it quickly and accurately.

**Try it: <https://mafatih.tasrif.xyz/>**

**Status: not human verified.** The Practice word list was chosen by a program and skimmed by the owner, not checked word by word. The Arabic wording of the interface has not been read by a native speaker. The manual device checklist (`docs/QA-DEVICES.md`) has not been run, and the Firefox and WebKit projects have never run. Reports of mistakes are welcome.

## What you can do

- **Recitation:** a map of the 114 surahs with your progress, passages of 1 to 4 ayat, previous and next passage, go to an ayah, a quiet panel when you complete a surah, and audio (Murattal or Mujawwad) with play and pause, previous and next ayah, volume, mute and "play the whole passage".
- **Practice:** a ladder of 44 keys (36 letters and 8 marks), a short readout of what you are working on, and lessons of everyday words built for the keys you have unlocked.
- **Custom:** paste any Arabic text (up to 5,000 characters) and type it.
- **Stats:** time per key, how often you were right first time and the attempts, for each mode, and your last ten lessons.
- **Settings:** English or Arabic interface, how many marks you are asked to type (auto, letters only, harakat, full), whether mistakes stay until you press Backspace, three Arabic fonts, text size, an on-screen keyboard that shows the next key and the finger to use (on wide screens with a mouse or trackpad), backup and restore of your progress as a file, and reset.

## Before you start

Mafatih uses the **Arabic (101)** keyboard layout, the standard Arabic keyboard on Windows. Add it in your system's language settings and switch to it before typing. If your keyboard types Latin letters, Mafatih says so. On a phone or tablet, use the Arabic keyboard that comes with the device.

## Your data

There is no account and nothing to sign up for, no cookies and no analytics. Your progress and settings stay in your browser, in local storage, and the audio you have played, or that is about to play, is kept in its IndexedDB. The only request to another site is for the recitation audio, from EveryAyah, which sees your address as any site you visit does. Backup and restore in Settings makes a file that you keep yourself. The About page says the same in the app.

## Credits

- Qur'an text: [Tanzil Project](https://tanzil.net), simple text 1.1, Creative Commons Attribution 3.0, unchanged.
- Recitation: Abdul Basit ʿAbd us-Samad, from the [EveryAyah](https://everyayah.com) archive.
- Practice words: the English Wiktionary via [kaikki.org](https://kaikki.org/dictionary/Arabic/) (CC BY-SA 4.0 and GFDL) and the [FrequencyWords](https://github.com/hermitdave/FrequencyWords) list (CC BY-SA 4.0).
- Fonts: Noto Naskh Arabic, Amiri, Scheherazade New (SIL Open Font License), through Fontsource.

## Licence

The code is MIT (see `LICENSE`). The Qur'an text, the word list, the audio and the fonts keep the licences named under Credits.

## For developers

```sh
pnpm install
pnpm dev
```

How it works, every command, the data pipeline and the rules the code follows are in [docs/TECHNICAL.md](docs/TECHNICAL.md). The manual device checklist is [docs/QA-DEVICES.md](docs/QA-DEVICES.md).
