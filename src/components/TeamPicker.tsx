"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { TeamLogo } from "./TeamLogo";

export interface TeamOption {
  name: string;
  logo: string | null;
  count: number;
}

const normalize = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

/**
 * Zone réellement visible à l'écran. Sur iPhone, le clavier recouvre la page
 * sans la redimensionner : sans ce calcul, la feuille se retrouvait cachée
 * derrière le clavier dès qu'on touchait la recherche.
 */
function useVisibleArea(active: boolean) {
  const [area, setArea] = useState<{ top: number; height: number; keyboard: boolean } | null>(null);
  useEffect(() => {
    if (!active) return;
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () =>
      setArea({ top: vv.offsetTop, height: vv.height, keyboard: window.innerHeight - vv.height > 120 });
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, [active]);
  return area;
}

/** Feuille qui monte du bas de l'écran, comme dans les apps iOS. */
export function TeamPicker({
  open,
  teams,
  selected,
  onChange,
  onClose,
}: {
  open: boolean;
  teams: TeamOption[];
  selected: string[];
  onChange: (next: string[]) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const area = useVisibleArea(open);

  // Bloque le défilement de la page derrière la feuille
  useEffect(() => {
    if (!open) return;
    const scrollY = window.scrollY;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
      window.scrollTo(0, scrollY); // iOS peut décaler la page en ouvrant le clavier
      setQuery("");
    };
  }, [open]);

  const visible = useMemo(() => {
    const q = normalize(query.trim());
    const list = q ? teams.filter((t) => normalize(t.name).includes(q)) : teams;
    // Équipes sélectionnées en premier
    return [...list].sort((a, b) => Number(selected.includes(b.name)) - Number(selected.includes(a.name)));
  }, [teams, query, selected]);

  if (!open) return null;

  const toggle = (name: string) =>
    onChange(selected.includes(name) ? selected.filter((n) => n !== name) : [...selected, name]);

  const keyboard = area?.keyboard ?? false;

  return (
    <div
      className="fixed inset-x-0 top-0 z-30"
      style={{ top: area?.top ?? 0, height: area ? area.height : "100dvh" }}
      role="dialog"
      aria-modal="true"
      aria-label="Choisir des équipes"
    >
      <button type="button" aria-label="Fermer" onClick={onClose} className="absolute inset-0 bg-black/60" />

      <div
        className="sheet-up absolute inset-x-0 bottom-0 mx-auto flex max-w-xl flex-col rounded-t-3xl bg-surface"
        style={{
          // Clavier ouvert : la feuille prend toute la hauteur libre au-dessus du clavier
          height: keyboard ? "calc(100% - 8px)" : undefined,
          maxHeight: keyboard ? undefined : "calc(100% - env(safe-area-inset-top) - 24px)",
          paddingBottom: keyboard ? 0 : "env(safe-area-inset-bottom)",
        }}
      >
        <div className="mx-auto mt-2 h-1.5 w-10 shrink-0 rounded-full bg-surface-2" />

        <header className="flex shrink-0 items-center justify-between px-4 pb-2 pt-3">
          <button
            type="button"
            onClick={() => onChange([])}
            disabled={selected.length === 0}
            className="min-w-16 text-left text-[16px] text-accent disabled:text-label-3"
          >
            Effacer
          </button>
          <h2 className="font-display text-[18px] font-medium">
            Équipes{selected.length > 0 && <span className="text-label-3"> · {selected.length}</span>}
          </h2>
          <button type="button" onClick={onClose} className="min-w-16 text-right text-[16px] font-semibold text-accent">
            OK
          </button>
        </header>

        <div className="relative shrink-0 px-4 pb-2">
          <svg
            viewBox="0 0 24 24"
            className="pointer-events-none absolute left-7 top-[11px] h-[18px] w-[18px] text-label-3"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.2}
            strokeLinecap="round"
            aria-hidden
          >
            <circle cx="11" cy="11" r="6.5" />
            <path d="m16 16 4 4" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            inputMode="search"
            enterKeyHint="done"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur(); // ferme le clavier
            }}
            placeholder="Rechercher une équipe"
            aria-label="Rechercher une équipe"
            className="h-10 w-full rounded-xl bg-surface-2 pl-10 pr-10 text-[16px] text-label placeholder:text-label-3 focus:outline-none focus:ring-2 focus:ring-accent"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                inputRef.current?.focus();
              }}
              aria-label="Effacer la recherche"
              className="absolute right-6 top-0 flex h-10 w-8 items-center justify-center text-label-3"
            >
              <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" aria-hidden>
                <circle cx="12" cy="12" r="10" fill="currentColor" />
                <path d="m8.5 8.5 7 7m0-7-7 7" stroke="var(--color-surface-2)" strokeWidth={2.2} strokeLinecap="round" />
              </svg>
            </button>
          )}
        </div>

        <ul className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pb-3">
          {visible.length === 0 && (
            <li className="px-6 py-8 text-center text-[15px] text-label-2">
              Aucune équipe ne correspond. Seules les équipes qui ont un match à venir dans l&apos;app sont proposées.
            </li>
          )}
          {visible.map((team) => {
            const checked = selected.includes(team.name);
            return (
              <li key={team.name}>
                <button
                  type="button"
                  onClick={() => toggle(team.name)}
                  aria-pressed={checked}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left active:bg-surface-2"
                >
                  <TeamLogo src={team.logo} name={team.name} />
                  <span className="flex-1 truncate text-[16px]">{team.name}</span>
                  <span className="text-[13px] text-label-3">
                    {team.count} match{team.count > 1 ? "s" : ""}
                  </span>
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                      checked ? "border-accent bg-accent" : "border-label-3"
                    }`}
                    aria-hidden
                  >
                    {checked && (
                      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="white" strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round">
                        <path d="m5 12.5 4.5 4.5L19 7.5" />
                      </svg>
                    )}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
