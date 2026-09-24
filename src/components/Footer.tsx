import { hrefOf, PAGE_ROUTE } from "~/hooks/useRoute.ts";

export default function Footer() {
  return (
    <footer className="flex justify-center text-xs text-stone-400">
      <a
        data-cy="nav-privacy"
        href={hrefOf(PAGE_ROUTE.privacy)}
        className="transition-colors hover:text-stone-900 dark:hover:text-stone-100"
      >
        Privacy
      </a>
    </footer>
  );
}
