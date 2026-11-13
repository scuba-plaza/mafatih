import type { ReactNode } from "react";

export function PageHeading({ children, quiet = false }: { children: ReactNode; quiet?: boolean }) {
  return (
    <h1
      tabIndex={-1}
      className={
        quiet
          ? "text-center text-xs font-normal tracking-[0.18em] text-muted uppercase"
          : "text-2xl font-normal tracking-tight"
      }
    >
      {children}
    </h1>
  );
}
