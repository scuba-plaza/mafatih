const ATTRIBUTE = "data-modality";

export function trackInputModality(root: HTMLElement = document.documentElement): void {
  document.addEventListener(
    "keydown",
    (event) => {
      if (event.key === "Tab") {
        root.setAttribute(ATTRIBUTE, "keyboard");
      }
    },
    true,
  );
  document.addEventListener("pointerdown", () => root.removeAttribute(ATTRIBUTE), true);
}
