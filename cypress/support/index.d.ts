/// <reference types="cypress" />

import type { ArabicTypeOptions, LessonLoopOptions } from "./commands.ts";

declare global {
  namespace Cypress {
    interface Chainable {
      typeArabic(text: string, options?: ArabicTypeOptions): Chainable<void>;
      typeLigature(ligature: string): Chainable<void>;
      typeRawKey(key: string, code?: string, shift?: boolean): Chainable<void>;
      targetText(): Chainable<string>;
      typeTarget(options?: ArabicTypeOptions): Chainable<void>;
      completeLesson(options?: ArabicTypeOptions): Chainable<void>;
      completeLessonsUntilUnlocked(count: number, options?: LessonLoopOptions): Chainable<number>;
      openSettings(): Chainable<void>;
      openRecitationSettings(): Chainable<void>;
      closeRecitationSettings(): Chainable<void>;
      openCustomTextSettings(): Chainable<void>;
      closeCustomTextSettings(): Chainable<void>;
      closeSettings(): Chainable<void>;
      showStats(): Chainable<void>;
      showPractice(): Chainable<void>;
    }
  }
}
