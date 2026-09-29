export function VelograMark({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 40 40"
      fill="none"
      aria-hidden="true"
    >
      <g
        stroke="currentColor"
        strokeWidth="2.35"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M7 7C13 7 14 25 20 27C26 25 27 7 33 7" />
        <path d="M7 14C13 14 14 29 20 31C26 29 27 14 33 14" />
        <path d="M7 21C13 21 14 33 20 35C26 33 27 21 33 21" />
      </g>
    </svg>
  );
}
