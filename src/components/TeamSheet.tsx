"use client";

import { useEffect } from "react";
import { zoneFor } from "@/config/classements";
import type { StandingRow, StandingTable } from "@/lib/types";
import { FormDots, RESULT_COLORS } from "./FormDots";
import { MatchCard } from "./MatchCard";
import { TeamLogo } from "./TeamLogo";

const dateFmt = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", day: "numeric", month: "short" });
const RESULT_WORD = { V: "Victoire", N: "Nul", D: "Défaite" } as const;

function Stat({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-xl bg-surface-2 px-3 py-2.5">
      <p className="text-[12px] text-label-2">{label}</p>
      <p className="font-display mt-0.5 text-[24px] font-semibold leading-tight tabular-nums">{value}</p>
      {sub && <p className="text-[11px] text-label-3">{sub}</p>}
    </div>
  );
}

export function TeamSheet({
  row,
  table,
  followed,
  onToggleFollow,
  onClose,
}: {
  row: StandingRow | null;
  table: StandingTable | null;
  followed: boolean;
  onToggleFollow: () => void;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!row) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [row, onClose]);

  if (!row || !table) return null;

  const zone = zoneFor(table.competition, row.position);
  const total = Math.max(1, row.won + row.draw + row.lost);
  const pct = (n: number) => `${(n / total) * 100}%`;
  const perGame = (n: number) => (row.played ? (n / row.played).toFixed(1).replace(".", ",") : "–");
  const leader = table.rows[0];
  const gap = leader && leader.team.name !== row.team.name ? leader.points - row.points : 0;

  return (
    <div className="fixed inset-0 z-30" role="dialog" aria-modal="true" aria-label={`Fiche ${row.team.name}`}>
      <button type="button" aria-label="Fermer" onClick={onClose} className="absolute inset-0 bg-black/60" />

      <div
        className="sheet-up absolute inset-x-0 bottom-0 mx-auto flex max-h-[92dvh] max-w-xl flex-col rounded-t-3xl bg-surface"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="mx-auto mt-2 h-1.5 w-10 shrink-0 rounded-full bg-surface-2" />

        <div className="flex justify-end px-4 pt-1">
          <button type="button" onClick={onClose} className="text-[16px] font-semibold text-accent active:opacity-60">
            Fermer
          </button>
        </div>

        <div className="overflow-y-auto overscroll-contain px-4 pb-6">
          {/* En-tête */}
          <header className="flex items-center gap-4">
            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-surface-2">
              <TeamLogo src={row.team.logo} name={row.team.name} size="lg" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="font-display truncate text-[26px] font-semibold leading-tight">{row.team.name}</h2>
              <p className="text-[14px] text-label-2">
                {row.position}
                <sup>{row.position === 1 ? "er" : "e"}</sup> de {table.name}
                {gap > 0 && <span> · à {gap} pt{gap > 1 ? "s" : ""} du 1er</span>}
              </p>
              {zone && (
                <span
                  className="mt-1.5 inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[12px] font-semibold"
                  style={{ backgroundColor: `${zone.color}26`, color: zone.color }}
                >
                  <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: zone.color }} />
                  {zone.label}
                </span>
              )}
            </div>
          </header>

          <button
            type="button"
            onClick={onToggleFollow}
            aria-pressed={followed}
            className={`mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-xl text-[15px] font-semibold transition-colors active:opacity-70 ${
              followed ? "bg-surface-2 text-label" : "bg-accent text-white"
            }`}
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill={followed ? "currentColor" : "none"} stroke="currentColor" strokeWidth={2} strokeLinejoin="round" aria-hidden>
              <path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z" />
            </svg>
            {followed ? "Équipe suivie" : "Suivre cette équipe"}
          </button>

          {/* Chiffres clés */}
          <section className="mt-5">
            <div className="grid grid-cols-3 gap-2">
              <Stat label="Points" value={row.points} sub={`${perGame(row.points)} par match`} />
              <Stat label="Matchs joués" value={row.played} />
              <Stat label="Différence" value={row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference} />
              <Stat label="Buts marqués" value={row.goalsFor} sub={`${perGame(row.goalsFor)} par match`} />
              <Stat label="Buts encaissés" value={row.goalsAgainst} sub={`${perGame(row.goalsAgainst)} par match`} />
              <Stat label="Victoires" value={`${Math.round((row.won / total) * 100)} %`} sub="des matchs" />
            </div>

            {/* Bilan victoires / nuls / défaites */}
            <div className="mt-3 rounded-xl bg-surface-2 px-3 py-3">
              <div className="flex h-2.5 overflow-hidden rounded-full bg-surface">
                <span style={{ width: pct(row.won), backgroundColor: RESULT_COLORS.V }} />
                <span style={{ width: pct(row.draw), backgroundColor: RESULT_COLORS.N }} />
                <span style={{ width: pct(row.lost), backgroundColor: RESULT_COLORS.D }} />
              </div>
              <div className="mt-2 flex justify-between text-[13px]">
                <span><b className="tabular-nums">{row.won}</b> <span className="text-label-2">victoires</span></span>
                <span><b className="tabular-nums">{row.draw}</b> <span className="text-label-2">nuls</span></span>
                <span><b className="tabular-nums">{row.lost}</b> <span className="text-label-2">défaites</span></span>
              </div>
            </div>
          </section>

          {/* Derniers matchs */}
          <section className="mt-6">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="font-display text-[17px] font-medium">Derniers matchs</h3>
              <FormDots form={row.form} />
            </div>
            {row.recent.length === 0 ? (
              <p className="rounded-xl bg-surface-2 px-3 py-4 text-center text-[14px] text-label-2">
                Pas encore de résultat cette saison.
              </p>
            ) : (
              <ul className="overflow-hidden rounded-xl bg-surface-2">
                {row.recent.map((r, i) => (
                  <li key={i} className="flex items-center gap-3 border-b border-separator px-3 py-2.5 last:border-b-0">
                    <span
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12px] font-bold text-white"
                      style={{ backgroundColor: RESULT_COLORS[r.result] }}
                      aria-label={RESULT_WORD[r.result]}
                    >
                      {r.result}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-2 text-[15px] font-medium">
                        <span className="text-label-2">{r.home ? "vs" : "à"}</span>
                        <span className="truncate">{r.opponent.name}</span>
                      </p>
                      <p className="text-[12px] text-label-3">
                        {dateFmt.format(new Date(r.date))} · {r.home ? "Domicile" : "Extérieur"}
                      </p>
                    </div>
                    <span className="text-[17px] font-bold tabular-nums">
                      {r.goalsFor}<span className="px-1 text-label-3">–</span>{r.goalsAgainst}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Prochain match */}
          <section className="mt-6">
            <h3 className="font-display mb-2 text-[17px] font-medium">Prochain match</h3>
            {row.nextMatch ? (
              <MatchCard match={row.nextMatch} index={0} />
            ) : (
              <p className="rounded-xl bg-surface-2 px-3 py-4 text-center text-[14px] text-label-2">
                Aucun match prévu dans les 30 prochains jours.
              </p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
