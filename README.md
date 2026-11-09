# مفاتيح · Mafatih

**Learn to touch-type Arabic.**

Mafatih ("keys") is a free typing trainer that runs in your browser. It is built around one rule the
first version learned too late: **the Qur'an is sacred text and is never used as drill material.**

- **Recitation (the default mode).** Type the Qur'an surah by surah, ayah by ayah, in order, with its
  meaning intact. Press play to hear each ayah recited by Abdul Basit ʿAbd us-Samad while you type.
  Finish a surah to earn a ✓; keep 95% accuracy to earn a ★.
- **Practice.** Drills made of everyday, fully vocalized Modern Standard Arabic words — a secular
  corpus authored for Mafatih, never a scrambled Qur'an word. The progression engine decides what
  you type: only letters you have unlocked appear, weighted toward your focus letter, and the
  harakat tier (letters only → core harakat → full vocalization) follows what you have mastered.
- **Stats.** Recent accuracy and attempt counts for every letter and every haraka.
- **Your data.** No account, no server: progress stays in your browser, and you can export or
  import it as a file. Destructive actions — reset, import, retype — always ask first.

## Before you start

Mafatih reads the characters your OS produces and is built around the **Arabic (101)** keyboard
layout, the standard Arabic keyboard on Windows (on Linux: `setxkbmap ara`). An on-screen keyboard
shows which key to press next, including when you need Shift.

## Credits

- Qur'an text: [Tanzil Project](https://tanzil.net), used under Creative Commons Attribution 3.0 —
  shown complete and in order, never as drill material.
- Recitation: Abdul Basit ʿAbd us-Samad, from the [EveryAyah](https://everyayah.com) archive.
- Practice words: secular everyday Arabic, authored for Mafatih (CC0).

## For developers

```sh
pnpm install
pnpm dev
```

How it all works, and every command, is in [docs/REBUILD_PLAN.md](docs/REBUILD_PLAN.md) (the plan
this rebuild follows) and [docs/TECHNICAL.md](docs/TECHNICAL.md).
