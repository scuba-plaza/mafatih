# Device checklist

The automated suite runs in Chromium (a desktop and a Pixel 7 profile) and, with `PW_FULL=1`, in Firefox and WebKit.
It cannot press keys on a phone keyboard, hear audio, or tell whether Arabic letters join correctly on a real screen.
This checklist is what the owner runs on physical devices before cut-over. Record each result next to the step: the
date, the device and OS version, the browser version, pass or fail, and what was seen when it failed.

Run every step in both languages unless a step says otherwise. Use **Recitation** on Al-Faatiha for the typing steps and
**Practice** for a fresh profile (Settings, Reset progress).

## All devices

| # | Step | Expected | Result |
|---|------|----------|--------|
| A1 | Open the site on a fresh profile. | The map of surahs shows at once; Practice offers a lesson of home-row words with no setup. | |
| A2 | Type the first ayah of Al-Faatiha, including one deliberate wrong key and its correction. | Typed text brightens, the wrong key makes the caret flash red and shake once (red and ringed, without movement, when the system asks for reduced motion), and nothing else is written about it. | |
| A3 | Turn the device to dark mode, then to forced or high-contrast colours where the system has them. | Text stays readable; the typed part, the marks that are not typed and the mistake are still told apart without colour. | |
| A4 | Settings: change the font three times and the size to the largest step. | The lesson text changes at once, letters stay joined, nothing is clipped. | |
| A5 | Settings, Backup and restore: download a backup, change a setting, restore the backup. | The file saves (check the Downloads list), the confirmation appears, the setting returns. | |
| A6 | Recitation: press Play on an ayah, then on a passage of four. | Audio starts on the first press. Pause, resume, restart and the highlight of the ayah being heard all work. | |
| A7 | Zoom the page text to 200 % in the browser settings. | No sideways scrolling; every control is still reachable and readable. | |
| A8 | Recitation: play a passage, then lock the screen or open the system media controls. | Title and the play, pause controls show and work; the passage keeps playing with the screen locked. | |
| A9 | Play an ayah, go offline, play the same ayah again. Then repeat in a private window. | Offline, the ayah heard before plays from the cache; in a private window playback still works (it may download again) and no error screen appears. | |
| A10 | Recitation: finish a passage that is not the last of its surah, with the keyboard open. | After a moment the next passage opens by itself and the keyboard stays open. Audio that was playing carries on. | |
| A11 | Recitation: finish a whole short surah (Al-Kawthar). | The celebration opens: the Arabic name with rays that keep bursting, the figures, a star at 95 % accuracy or better. On a phone it is a bottom sheet with a full-width Continue. With reduced motion it is still and the rays are not drawn. Continue and Type it again both work. | |
| A12 | Before typing, press wrong keys, then the right first key. Hold a letter key down. | Wrong keys before the first right one count for nothing. A held key types one letter. | |
| A13 | Open the site with `?lang=ar` added to the address, on a fresh browser. | It opens in Arabic, the address loses the parameter, and a reload stays in Arabic. | |
| A14 | Tap the text on a phone, with no button first. | The keyboard opens and typing starts; while it is open the bottom tab bar is hidden and the audio row stays reachable. | |

## iOS Safari (iPhone), with the Arabic keyboard added

| # | Step | Expected | Result |
|---|------|----------|--------|
| I1 | Tap the text to start; the on-screen keyboard opens. | The page does not zoom, the current line stays visible above the keyboard, in portrait and in landscape. | |
| I2 | Type with the Arabic keyboard, including a letter with a long-press mark (fatha, damma, kasra, shadda, sukun, tanween). | Each long-press mark is accepted when the lesson asks for it. | |
| I3 | Press Backspace on an empty line and on a correct letter. | Nothing is lost; a correct letter is not deleted unless a mistake is pending. | |
| I4 | Press Play on a passage after the audio has not been loaded yet. | The recitation starts on that first press. If it does not, unlock the audio element in the click handler with a short silent clip played before the first fetch. | |
| I5 | Finish a Practice lesson with the keyboard open. | The next lesson appears and the keyboard stays open (the input is disabled for one render when a lesson ends). If the keyboard closes, stop disabling the input and ignore keys through the session instead. | |
| I6 | Download a backup and restore it through the file picker. | Both work; the file opens from Files. | |
| I7 | Optional (the site is not an offline app): add the site to the home screen. | The icon, the name and the colours are right; it opens without the browser bar. | |

## Android Chrome with Gboard

| # | Step | Expected | Result |
|---|------|----------|--------|
| G1 | Type a lesson with Gboard in Arabic. | Composition does not insert doubled or lost letters. | |
| G2 | Type by swiping across the keys. | The swipe is ignored (or refused gently); no wrong word is accepted. | |
| G3 | Long-press for marks, and use the Backspace key. | Same results as I2 and I3. | |
| G4 | Finish a Practice lesson with the keyboard open. | Same as I5. | |

## iPad with a hardware keyboard

| # | Step | Expected | Result |
|---|------|----------|--------|
| P1 | Type a lesson with an Arabic hardware layout. | Keys land as on the Windows layout; the on-screen guide keyboard shows. | |
| P2 | Press Shift for the shifted layer, and the lam-alef key. | The guide names the finger and the right key; the lesson accepts them. | |

## Windows, Arabic (101) layout

| # | Step | Expected | Result |
|---|------|----------|--------|
| W1 | Add the Arabic (101) layout and type a Practice lesson. | Every letter is accepted from the key the guide shows. | |
| W2 | Type words that need the lam-alef key and Shift with a letter. | Accepted as one unit; the guide highlights the key. | |
| W3 | Use the English layout by mistake. | The page says the keyboard does not type Arabic and asks to switch layout. | |

## Linux, `setxkbmap ara`

| # | Step | Expected | Result |
|---|------|----------|--------|
| L1 | Run `setxkbmap ara`, then type a Practice lesson in Firefox and in Chromium. | Same result as W1. The guide keyboard matches the keys pressed, and when the lesson ends the caret and focus stay in the typing input. | |
| L2 | Compose a mark with the layout's own dead keys, where it has any. | Accepted when asked for; otherwise ignored, never double counted. | |

## Browsers on a desktop

| # | Step | Expected | Result |
|---|------|----------|--------|
| B1 | Firefox, Safari, Chrome, Edge: type part of a lesson. | Typed letters change colour (the CSS Custom Highlight API); if a browser does not support it, record which and what is shown instead. | |
| B2 | Same browsers: Arabic joins correctly in all three fonts. | No broken joins, no marks on the wrong letter. | |
| B3 | Screen reader (VoiceOver or NVDA) on About, Stats and Settings. | Headings, tables, groups and the status messages read sensibly; the mark names are spoken. | |
| B4 | Firefox, Safari, Chrome and Edge: finish a Practice lesson, then start typing the next one without clicking. | Focus never leaves the typing input when a lesson ends (the input is disabled for one render); the next lesson takes keys at once. If a browser blurs it, stop disabling the input and ignore keys through the session instead. | |

## Owner review of the Arabic wording (no device needed)

| # | Step | Expected | Result |
|---|------|----------|--------|
| R1 | Read every Arabic message in `src/i18n/ar.ts`, the About page and the error screen with Arabic selected. | Natural, correct Arabic: the plural of "حرف", the stats title `stats.mode` ("اعرض إحصاءات"), "استبدال", "أبقِ تقدّمي" against "تقدمك", the backup messages (`backup.notJson`, `backup.wrongVersion`), the privacy and credit notes, the style names "مرتل" and "مجوّد". | |
