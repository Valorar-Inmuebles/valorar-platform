export function PropertyImagePlaceholder() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 text-slate-400">
      <svg
        aria-hidden
        viewBox="0 0 24 24"
        className="h-10 w-10"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <path
          d="M3 9.5 12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5Z"
          strokeLinejoin="round"
        />
        <path d="M9 21V12h6v9" strokeLinejoin="round" />
      </svg>
    </div>
  );
}
