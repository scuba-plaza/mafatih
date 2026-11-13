import type { ReactNode } from "react";

function Icon({ size = 22, children }: { readonly size?: number; readonly children: ReactNode }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

export function PlayIcon() {
  return (
    <Icon size={24}>
      <path d="M7.5 4.8v14.4L19.5 12z" fill="currentColor" stroke="none" />
    </Icon>
  );
}

export function PauseIcon() {
  return (
    <Icon size={24}>
      <path d="M7 5h3.6v14H7zM13.4 5H17v14h-3.6z" fill="currentColor" stroke="none" />
    </Icon>
  );
}

export function PreviousIcon() {
  return (
    <Icon>
      <path d="M7 5v14" />
      <path d="M19 5.5v13L9.5 12z" fill="currentColor" />
    </Icon>
  );
}

export function NextIcon() {
  return (
    <Icon>
      <path d="M17 5v14" />
      <path d="M5 5.5v13L14.5 12z" fill="currentColor" />
    </Icon>
  );
}

export function RepeatIcon() {
  return (
    <Icon>
      <path d="M17 3.5l3 3-3 3" />
      <path d="M4 11V9.5a3 3 0 0 1 3-3h13" />
      <path d="M7 20.5l-3-3 3-3" />
      <path d="M20 13v1.5a3 3 0 0 1-3 3H4" />
    </Icon>
  );
}

export function VolumeIcon({ muted = false }: { readonly muted?: boolean }) {
  return (
    <Icon>
      <path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5z" fill="currentColor" />
      {muted ? <path d="M16 9l5 6M21 9l-5 6" /> : <path d="M15.5 9a4.2 4.2 0 0 1 0 6M18 6.5a8 8 0 0 1 0 11" />}
    </Icon>
  );
}
