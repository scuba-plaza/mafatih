# Feedback log

## Round 1 (2026-11-23), from the owner, verbatim

1. I like "B Master and detail" the most but I also like the live preview however I think it should be only shown in one of the details sections and then all the settings that impact the preview/the actual ui should be in that same section.
2. The "By what it changes" grouping makes the most sense. "Unlock all letters" applies exclusivley to practice mode. Audio applies exclusivley to recitation mode.
3. yes seems right (the UX targets: any setting within 2 actions, tallest screen at most 1.5 screens on a phone and 1 on desktop, at most 7 groups, every control in exactly one group, no new persisted state)
4. No I dont want a seperate page, the lesson should not be left.

Request: next round of mock-ups, at most 4, honing in on different final designs.

### How round 2 reads this

- Structure: master and detail (B). Settings stays a dialog over the lesson (rules out H).
- One detail section holds the live preview, and every setting that changes the preview or the live typing UI sits in that same section: lesson font, text size, vocalization, correcting mistakes with Backspace, and the keyboard guide switches.
- Grouping: "by what it changes", with "Unlock all letters" in a Practice group (not in data) and audio kept with Recitation.
- The UX targets are confirmed as proposed.

## Round 2 (2026-11-23), from the owner, verbatim

1. for both I like desing 2 the most.
2. push list (but make sure that the title of the currently active section e.g. the top of the stack so to speak is centered in the middle of the dialog on phone.
3. Lets move the "Unlock all letters" out of the settings modal and onto the "Stats" Page.
4. General first is better.

For the actual implementation of the preview it is of utmost importance that drift between how the preview is displayed and how the actual ui is displayed is IMPOSSIBLE. WE NEED THE PREVIEW TO BE TRUTHFUL!

Now give me one final mockup of the final design, also show me where you will put the "Unlock all letters" button on the "Practice" page.

## While building the final mock-up (2026-11-23), from the owner, verbatim

Your mock up is weird, it says "x of y KEYS unlocked" but then the button says "unlock all letters". Choose one or the other: keys or letters, append a step to the current plan to check the user facing strings everywhere in the page and make sure they present one cohrent vocabulary (in english and in arabic)

### How the final mock-up reads this

- Design 2 for phone and desktop; push list with a centred title; General first; four groups (General, Lesson, Recitation, Your data).
- "Unlock all letters" moves out of Settings. The owner wrote both "Stats page" and "Practice page": main design is the Practice view of the Stats page; the Practice-page progress row is shown as the alternative.
- Vocabulary: "keys" is what the app counts, so the button became "Unlock all letter keys" (the 8 mark keys stay locked). Added as UX target 11 and Task 7.
- The preview must be truthful: UX target 10 and the Global Constraints of the plan.
