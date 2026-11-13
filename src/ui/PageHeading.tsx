import type { ReactNode } from "react";

export function PageHeading({ children }: { children: ReactNode }) {
  return (
    <h1 tabIndex={-1} className="text-2xl font-normal tracking-tight">
      {children}
    </h1>
  );
}
