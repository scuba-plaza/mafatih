import { useEffect, useRef } from "react";

export function PrivacyDialog({ onClose }: { onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="privacy-title"
        className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl dark:bg-stone-900"
      >
        <h2 id="privacy-title" className="text-lg font-semibold">
          Privacy
        </h2>
        <div className="mt-2 space-y-2 text-sm text-stone-600 dark:text-stone-300">
          <p>
            There is no account and nothing to sign up for. Mafatih keeps your progress — unlocked letters, harakat
            statistics and surah positions — in your browser's local storage, on your own device, and nowhere else.
          </p>
          <p>
            No analytics, no cookies, no tracking. The only network requests are the page itself, its fonts, and the
            recitation audio, which is fetched from everyayah.com when you press play.
          </p>
          <p>
            Export your progress from Settings to move it to another device; import overwrites what is here, and asks
            first.
          </p>
        </div>
        <div className="mt-4 flex justify-end">
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm hover:bg-stone-100 dark:border-stone-700 dark:hover:bg-stone-800"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
