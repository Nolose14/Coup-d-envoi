import type { ReactNode } from "react";

/** En-tête façon habillage TV : sur-titre, titre condensé, actions à droite. */
export function PageHeader({
  title,
  onRefresh,
  refreshing = false,
  action,
}: {
  title: string;
  onRefresh?: () => void;
  refreshing?: boolean;
  /** Bouton facultatif affiché à droite du titre (ex. « Mes équipes »). */
  action?: ReactNode;
}) {
  return (
    <header className="px-4 pb-2 pt-5">
      <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-label-3">
        <span className="h-3 w-1 rounded-sm bg-accent" aria-hidden />
        Coup d&apos;envoi
      </p>
      <div className="mt-1 flex items-center gap-2">
        <h1 className="font-display mr-auto text-[40px] font-semibold leading-none">{title}</h1>
        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing}
            aria-label="Actualiser"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface text-label-2 shadow-[inset_0_0_0_1px_var(--color-separator)] active:opacity-70"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4"
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
        {action}
      </div>
    </header>
  );
}
