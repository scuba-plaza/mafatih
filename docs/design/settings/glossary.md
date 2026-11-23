# Glossary: one word for one thing (English and Arabic)

Written in Task 11 of the Settings restructure. Every user-facing string follows it. The Arabic is **not human verified**; a native reader should confirm it.

The tests in `src/i18n/i18n.test.ts` pin the decisions marked (test).

| Concept | English | Arabic | Do not use | Notes |
|---|---|---|---|---|
| A key of the 44 Practice keys, and what the app counts | key | مفتاح | letter (for a count of keys) | (test) The HUD, the unlock flow and Stats say "keys". "Letter keys" and "mark keys" name the two kinds when it matters. A letter shown on a keycap is a "letter on the key" (`settings.keyLabels`), which is a different thing. |
| Unlock | unlock, unlocked | فتح، مفتوح | open, free | "Unlock all keys" unlocks all 44, marks included. |
| A diacritic | mark | حركة | sign | In Arabic the same word also names the Harakat level; the hint under the level lists the five marks, so the two are told apart by the hint. |
| Vocalization setting and its levels | Vocalization: Auto, Letters only, Harakat, Full | التشكيل: تلقائي، الحروف فقط، الحركات، تشكيل كامل | | "Letters only" means the text to type, not keys. |
| A wrong key that was counted | mistake | خطأ | error (outside the error page) | (test) Live line "Mistakes 1", result "Mistakes", status "Mistake." The key itself, while it waits, is a "wrong key". |
| Correcting a mistake | Backspace | مفتاح الحذف الخلفي | | |
| Typing the same text again | Type again | اكتب مجددًا | Type it again | (test) Same label on the result and the surah-complete card. |
| Go back to the first surah of the order | Start again | ابدأ من جديد | | Non-destructive. |
| Erase the whole profile (error page) | Start over, then Erase | ابدأ من الصفر، ثم مسح | Start again | (test) Never shares a label with "Start again". |
| Clear progress, keep settings | Reset progress | إعادة ضبط التقدم | erase, delete | |
| Remove the saved audio files | Delete saved recitations | حذف التلاوات المحفوظة | reset, erase | |
| Save and bring back a file | Backup, restore | نسخ احتياطي، استعادة | export, import | "Replace" is the confirm button of a restore. |
| A typing exercise | lesson (Practice, Custom, history rows); passage (a run of ayat in Recitation) | درس؛ مقطع | | |
| Speed | characters per minute; "cpm" only in the live line | حرف في الدقيقة؛ حرف/د في السطر الحي | | The short form exists only where space is tight. |
| Statistics | "Stats" as a page and tab name; "statistics" in a sentence | الإحصاءات | | |
| Settings groups | General, Lesson, Recitation | عام، الدرس، التلاوة | Practice (no such group), Your data (merged into General on the owner's request) | |
