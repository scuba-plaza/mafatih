# Settings today: measurements (2026-11-23)

Measured in Chromium against the current build (`pnpm build`, `pnpm preview`), Settings opened from `#/practice`, English, default profile. Raw numbers are in `baseline.json`; the screenshots are `today-*.png`.

| Viewport | Dialog scroll height / visible height | Screens tall | Focusable controls | Tab presses to "Reset progress" |
|---|---|---|---|---|
| Phone 390 x 844 | 2121 / 758 px | 2.8 | 27 | 13 |
| Desktop 1440 x 900 | 2333 / 808 px | 2.9 | 27 | 17 |
| 320 x 568, text at 200% | 6178 / 509 px | 12.1 | 27 | 13 |

Distance from the top of the dialog before each control starts (px):

| Control | Phone | Desktop | 320, text 200% |
|---|---|---|---|
| Language | 90 | 78 | 242 |
| Vocalization | 226 | 214 | 514 |
| Correct mistakes with Backspace | 554 | 522 | 1766 |
| Lesson font | 614 | 582 | 2042 |
| Lesson text size | 954 | 922 | 3010 |
| Keyboard guide | not shown on touch | 986 | not shown |
| Ayat per passage | 1074 | 1306 | 3298 |
| Surah order | 1130 | 1362 | 3410 |
| Reciter | 1346 | 1578 | 4218 |
| Delete saved recitations | 1534 | 1766 | 4754 |
| Download backup | 1726 | 1938 | 5386 |
| Restore from a backup file | 1782 | 1994 | 5499 |
| Unlock all letters | 1878 | 2090 | 5691 |
| Reset progress | 1970 | 2182 | 5875 |
| About | 2062 | 2274 | 6059 |

## What is confusing (read from the screenshots)

- The box is only 808 px high on a 900 px desktop, so even on a large screen the learner scrolls almost three screens.
- The order is the order features were added. Language (about the app) is followed by Vocalization (typing), Lesson font (reading), Backspace (typing again) and text size (reading again).
- Every radio group prints a hint under every option, and each font shows a large Arabic preview, so the four tallest blocks (Vocalization, Lesson font, Surah order, Reciter) take about 60% of the height.
- "Unlock all letters" is a Practice shortcut that sits between Backup (data) and Reset (data).
- Recitation audio is not visibly part of Recitation.
- Nothing says how long the dialog is or what is below. There is no scroll indicator and no summary of current values.
- Reset progress is the thirteenth Tab stop on a phone and the seventeenth on desktop; it is the last thing a keyboard user reaches.
