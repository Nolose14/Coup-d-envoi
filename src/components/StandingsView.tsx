"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ZONES, zoneFor } from "@/config/classements";
import { readFavorites, writeFavorites } from "@/lib/favorites";
import type { CompetitionId, StandingRow, StandingsPayload } from "@/lib/types";
import { FormDots } from "./FormDots";
import { PageHeader } from "./PageHeader";
import { TeamLogo } from "./TeamLogo";
import { TeamSheet } from "./TeamSheet";
import { useSwipeTabs } from "@/lib/useSwipeTabs";

const CACHE_KEY = "coup-d-envoi:classements";
const COMP_KEY = "coup-d-envoi:classements:competition";
type Mode = "forme" | "details";

const SHORT: Record<string, string> = { CL: "LDC", FL1: "Ligue 1", FL2: "Ligue 2", FL3: "Ligue 3", PL: "Premier League", PD: "Liga" };
const ORDER: CompetitionId[] = ["FL1", "FL2", "FL3", "CL", "PL", "PD"];

export function StandingsView() {
  const [data, setData] = useState<StandingsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [competition, setCompetition] = useState<CompetitionId>("FL1");
  const [mode, setMode] = useState<Mode>("forme");
  const [selected, setSelected] = useState<StandingRow | null>(null);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [, setTick] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/standings");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Classements indisponibles.");
      setData(json as StandingsPayload);
      setError(null);
      try { localStorage.setItem(CACHE_KEY, JSON.stringify(json)); } catch { /* ignoré */ }
    } catch (e) {
      setError(navigator.onLine ? (e as Error).message : "Hors connexion. Derniers classements enregistrés.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) setData(JSON.parse(cached) as StandingsPayload);
      const comp = localStorage.getItem(COMP_KEY) as CompetitionId | null;
      if (comp) setCompetition(comp);
    } catch { /* ignoré */ }
    setFavorites(readFavorites());
    load();
    const timer = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(timer);
  }, [load]);

  const chooseCompetition = (id: CompetitionId) => {
    setCompetition(id);
    try { localStorage.setItem(COMP_KEY, id); } catch { /* ignoré */ }
  };

  const tables = useMemo(
    () => [...(data?.tables ?? [])].sort((a, b) => ORDER.indexOf(a.competition) - ORDER.indexOf(b.competition)),
    [data],
  );
  const table = tables.find((t) => t.competition === competition) ?? tables[0] ?? null;

  const swipeRef = useSwipeTabs(
    tables.map((t) => t.competition),
    table?.competition,
    chooseCompetition,
  );

  // Garde le championnat choisi visible dans la barre (utile après un balayage)
  const chipsRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const row = chipsRef.current;
    const chip = row?.querySelector<HTMLElement>('[aria-pressed="true"]');
    if (!row || !chip) return;
    const left = chip.offsetLeft - 16;
    const right = chip.offsetLeft + chip.offsetWidth + 16 - row.clientWidth;
    if (row.scrollLeft > left) row.scrollTo({ left, behavior: "smooth" });
    else if (row.scrollLeft < right) row.scrollTo({ left: right, behavior: "smooth" });
  }, [table?.competition]);

  const toggleFollow = () => {
    if (!selected) return;
    const name = selected.team.name;
    const next = favorites.includes(name) ? favorites.filter((n) => n !== name) : [...favorites, name];
    setFavorites(next);
    writeFavorites(next);
  };

  const followedInTable = table?.rows.filter((r) => favorites.includes(r.team.name)) ?? [];
  const cols = mode === "forme"
    ? "grid-cols-[30px_minmax(0,1fr)_26px_38px_34px_96px]"
    : "grid-cols-[30px_minmax(0,1fr)_24px_24px_24px_52px_34px]";

  return (
    <div>
      <PageHeader title="Classements" onRefresh={load} refreshing={loading} />

      {/* Choix de la compétition + affichage, collés en haut */}
      <div data-filter-bar className="sticky z-10 border-b border-separator bg-bg/90 backdrop-blur-xl" style={{ top: "env(safe-area-inset-top)" }}>
        <div ref={chipsRef} className="flex gap-2 overflow-x-auto px-4 pt-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {tables.map((t) => (
            <button
              key={t.competition}
              type="button"
              onClick={() => chooseCompetition(t.competition)}
              aria-pressed={table?.competition === t.competition}
              className="chip"
            >
              {SHORT[t.competition] ?? t.name}
            </button>
          ))}
        </div>

        <div className="px-4 py-3">
          <div className="grid grid-cols-2 rounded-lg bg-surface p-0.5" role="tablist" aria-label="Affichage">
            {(["forme", "details"] as Mode[]).map((m) => (
              <button
                key={m}
                type="button"
                role="tab"
                aria-selected={mode === m}
                onClick={() => setMode(m)}
                className={`font-display h-7 rounded-md text-[13px] font-medium transition-colors ${
                  mode === m ? "bg-surface-3 text-label" : "text-label-3"
                }`}
              >
                {m === "forme" ? "Forme" : "Détails"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Zone de balayage : glisser à gauche ou à droite change de championnat */}
      <div ref={swipeRef} style={{ minHeight: "60dvh", touchAction: "pan-y" }}>
      {error && (
        <div className="mx-4 mb-2 rounded-xl bg-surface px-3.5 py-2.5 text-[13px] text-label-2">
          {error}
          <button type="button" onClick={load} className="ml-2 font-semibold text-accent active:opacity-60">
            Réessayer
          </button>
        </div>
      )}

      {data && data.warnings.length > 0 && !error && (
        <p className="mx-4 mb-2 text-[12px] text-label-3">
          Certains classements n&apos;ont pas pu être chargés : {data.warnings.join(" ")}
        </p>
      )}

      {!data && loading && (
        <div className="space-y-1.5 px-4 pt-2">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="h-11 animate-pulse rounded-xl bg-surface" />
          ))}
          <p className="pt-3 text-center text-[13px] text-label-3">
            Le tout premier chargement peut prendre une minute.
          </p>
        </div>
      )}

      {/* Raccourci vers les équipes suivies */}
      {followedInTable.length > 0 && (
        <div className="flex gap-2 overflow-x-auto px-4 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {followedInTable.map((r) => (
            <button
              key={r.team.name}
              type="button"
              onClick={() => setSelected(r)}
              className="flex shrink-0 items-center gap-2 rounded-lg bg-surface py-2 pl-2 pr-3 shadow-[inset_0_0_0_1px_var(--color-separator)] active:opacity-70"
            >
              <TeamLogo src={r.team.logo} name={r.team.name} small />
              <span className="text-[14px] font-semibold">{r.team.name}</span>
              <span className="text-[13px] text-label-2 tabular-nums">
                {r.position}<sup>{r.position === 1 ? "er" : "e"}</sup> · {r.points} pts
              </span>
            </button>
          ))}
        </div>
      )}

      {table && (
        <section className="px-4 pb-4 pt-3" aria-label={`Classement ${table.name}`}>
          <div className="overflow-hidden rounded-2xl bg-surface">
            {/* En-têtes */}
            <div className={`grid ${cols} items-center gap-x-1.5 border-b border-separator px-2 py-2 font-display text-[11px] font-medium text-label-3`}>
              <span className="text-center">#</span>
              <span>Équipe</span>
              {mode === "forme" ? (
                <>
                  <span className="text-center" title="Matchs joués">J</span>
                  <span className="text-center" title="Différence de buts">Diff</span>
                  <span className="text-center">Pts</span>
                  <span className="text-right">Forme</span>
                </>
              ) : (
                <>
                  <span className="text-center" title="Victoires">V</span>
                  <span className="text-center" title="Nuls">N</span>
                  <span className="text-center" title="Défaites">D</span>
                  <span className="text-center" title="Buts marqués : encaissés">Buts</span>
                  <span className="text-center">Pts</span>
                </>
              )}
            </div>

            {table.rows.map((r) => {
              const zone = zoneFor(table.competition, r.position);
              const followed = favorites.includes(r.team.name);
              return (
                <button
                  key={r.team.name}
                  type="button"
                  onClick={() => setSelected(r)}
                  className={`grid w-full ${cols} items-center gap-x-1.5 border-b border-separator px-2 py-2 text-left last:border-b-0 active:bg-surface-2 ${
                    followed ? "bg-accent/12" : ""
                  }`}
                >
                  <span className="relative flex items-center justify-center text-[14px] font-semibold tabular-nums">
                    {zone && (
                      <span className="absolute -left-2 h-6 w-[3px] rounded-r" style={{ backgroundColor: zone.color }} aria-hidden />
                    )}
                    {r.position}
                  </span>
                  <span className="flex min-w-0 items-center gap-2">
                    <TeamLogo src={r.team.logo} name={r.team.name} small />
                    <span className={`truncate text-[14px] ${followed ? "font-bold" : "font-medium"}`}>{r.team.name}</span>
                  </span>
                  {mode === "forme" ? (
                    <>
                      <span className="text-center text-[13px] text-label-2 tabular-nums">{r.played}</span>
                      <span className="text-center text-[13px] text-label-2 tabular-nums">
                        {r.goalDifference > 0 ? `+${r.goalDifference}` : r.goalDifference}
                      </span>
                      <span className="font-display text-center text-[16px] font-semibold tabular-nums">{r.points}</span>
                      <span className="flex justify-end"><FormDots form={r.form} size={15} /></span>
                    </>
                  ) : (
                    <>
                      <span className="text-center text-[13px] tabular-nums">{r.won}</span>
                      <span className="text-center text-[13px] text-label-2 tabular-nums">{r.draw}</span>
                      <span className="text-center text-[13px] text-label-2 tabular-nums">{r.lost}</span>
                      <span className="text-center text-[13px] text-label-2 tabular-nums">{r.goalsFor}:{r.goalsAgainst}</span>
                      <span className="font-display text-center text-[16px] font-semibold tabular-nums">{r.points}</span>
                    </>
                  )}
                </button>
              );
            })}
          </div>

          {/* Légende */}
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 px-1">
            {(ZONES[table.competition] ?? []).map((z) => (
              <span key={z.label} className="flex items-center gap-1.5 text-[12px] text-label-2">
                <span className="h-2.5 w-[3px] rounded" style={{ backgroundColor: z.color }} />
                {z.label}
              </span>
            ))}
          </div>
          <p className="mt-2 px-1 text-[12px] text-label-3">
            Touche une équipe pour voir sa fiche. Forme : le match le plus récent est à droite. Zones indicatives.
          </p>
        </section>
      )}
      </div>

      <TeamSheet
        row={selected}
        table={table}
        followed={!!selected && favorites.includes(selected.team.name)}
        onToggleFollow={toggleFollow}
        onClose={() => setSelected(null)}
      />
    </div>
  );
}
