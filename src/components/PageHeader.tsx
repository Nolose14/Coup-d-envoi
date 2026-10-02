/** En-tête façon habillage TV : sur-titre, titre condensé, état de mise à jour. */
export function PageHeader({
  title,
  status,
  live = false,
  onRefresh,
  refreshing = false,
}: {
  title: string;
  status: string;
  live?: boolean;
  onRefresh?: () => void;
  refreshing?: boolean;
}) {
  return (
    <header className="px-4 pb-1 pt-5">
      <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-label-3">
        <span className="h-3 w-1 rounded-sm bg-accent" aria-hidden />
        Coup d&apos;envoi
      </p>
      <h1 className="font-display mt-1 text-[40px] font-semibold leading-none">{title}</h1>
      <p className="mt-2 flex h-5 items-center gap-1.5 text-[13px] text-label-2" aria-live="polite">
        {live && <span className="live-dot h-1.5 w-1.5 rounded-full bg-live" aria-hidden />}
        {status}
        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing}
            aria-label="Actualiser"
            className="-my-2 ml-0.5 flex h-8 w-8 items-center justify-center rounded-full text-label-3 active:bg-surface active:text-label"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-3.5 w-3.5"
              style={refreshing ? { animation: "spin 0.9s linear infinite" } : undefined}
              fill="none"
              stroke="currentColor"
              strokeWidth={2.4}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M20 12a8 8 0 1 1-2.34-5.66" />
              <path d="M20 4v4.5h-4.5" />
            </svg>
          </button>
        )}
      </p>
    </header>
  );
}
