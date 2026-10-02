"use client";

import { useEffect, useMemo, useState } from "react";
import { TeamLogo } from "./TeamLogo";

export interface TeamOption {
  name: string;
  logo: string | null;
  count: number;
}

const normalize = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

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

  // Bloque le défilement de la page derrière la feuille
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
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

  return (
    <div className="fixed inset-0 z-30" role="dialog" aria-modal="true" aria-label="Choisir des équipes">
      <button type="button" aria-label="Fermer" onClick={onClose} className="absolute inset-0 bg-black/60" />

      <div
        className="sheet-up absolute inset-x-0 bottom-0 mx-auto flex max-h-[85dvh] max-w-xl flex-col rounded-t-3xl bg-surface"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="mx-auto mt-2 h-1.5 w-10 rounded-full bg-surface-2" />

        <header className="flex items-center justify-between px-4 pb-2 pt-3">
          <button
            type="button"
            onClick={() => onChange([])}
            disabled={selected.length === 0}
            className="min-w-16 text-left text-[16px] text-accent disabled:text-label-3"
          >
            Effacer
          </button>
          <h2 className="text-[17px] font-semibold">Équipes</h2>
          <button type="button" onClick={onClose} className="min-w-16 text-right text-[16px] font-semibold text-accent">
            OK
          </button>
        </header>

        <div className="px-4 pb-2">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher une équipe"
            className="h-10 w-full rounded-xl bg-surface-2 px-3.5 text-[16px] text-label placeholder:text-label-3 focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>

        <ul className="flex-1 overflow-y-auto overscroll-contain px-2 pb-3">
          {visible.length === 0 && (
            <li className="px-3 py-8 text-center text-[15px] text-label-2">Aucune équipe ne correspond.</li>
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
