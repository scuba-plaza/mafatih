export function StarIcon({ className = "size-4" }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={`${className} shrink-0 text-accent`} fill="currentColor">
      <path d="M12 2.6l2.9 6.1 6.7.8-4.9 4.6 1.3 6.6L12 17.5l-6 3.2 1.3-6.6L2.4 9.5l6.7-.8z" />
    </svg>
  );
}
