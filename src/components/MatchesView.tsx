"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { dayLabel, groupByDay, relativeUpdate } from "@/lib/dates";
import { DayHeader } from "./DayHeader";
import { PageHeader } from "./PageHeader";
import type { MatchesPayload, Section } from "@/lib/types";
import { MatchCard } from "./MatchCard";
import { TeamLogo } from "./TeamLogo";
import { TeamPicker, type TeamOption } from "./TeamPicker";

interface Filter { id: string; label: string }

const storageKey = (section: Section) => `coup-d-envoi:${section}`;
const teamsKey = (section: Section) => `coup-d-envoi:equipes:${section}`;
const STALE_AFTER_MS = 5 * 60 * 1000;

function readCache(section: Section): MatchesPayload | null {
  try {
    const raw = localStorage.getItem(storageKey(section));
    return raw ? (JSON.parse(raw) as MatchesPayload) : null;
  } catch {
    return null;
  }
}

export function MatchesView({ section, title, filters }: { section: Section; title: string; filters: Filter[] }) {
  const [data, setData] = useState<MatchesPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);
  const [filter, setFilter] = useState("all");
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [, setTick] = useState(0);
  const lastFetch = useRef(0);

  const load = useCallback(async () => {
    lastFetch.current = Date.now();
    setLoading(true);
    try {
      const res = await fetch(`/api/matches?section=${section}`);
      const json = await res.json();
      const payload: MatchesPayload | null = res.ok ? (json as MatchesPayload) : null;
      if (!payload) throw new Error(json.error ?? "Le serveur n'a pas répondu correctement.");
      setData(payload);
      setError(null);
      try { localStorage.setItem(storageKey(section), JSON.stringify(payload)); } catch { /* stockage plein ou désactivé */ }
    } catch (e) {
      setError(navigator.onLine ? (e as Error).message : "Pas de connexion. Affichage des dernières données enregistrées.");
    } finally {
      setLoading(false);
    }
  }, [section]);

  // Affichage instantané depuis le cache local, puis mise à jour réseau
  useEffect(() => {
    const cached = readCache(section);
    if (cached) setData(cached);
    setOffline(!navigator.onLine);
    load();
  }, [section, load]);

  // Équipes choisies : gardées sur l'appareil, séparément pour Clubs et Sélections
  useEffect(() => {
    try {
      const raw = localStorage.getItem(teamsKey(section));
      if (raw) setSelectedTeams(JSON.parse(raw) as string[]);
    } catch { /* ignoré */ }
  }, [section]);

  const updateTeams = useCallback(
    (next: string[]) => {
      setSelectedTeams(next);
      try { localStorage.setItem(teamsKey(section), JSON.stringify(next)); } catch { /* ignoré */ }
    },
    [section],
  );

  // Rafraîchit quand on rouvre l'app, et suit l'état de la connexion
  useEffect(() => {
    const onVisible = () => {
      if (!document.hidden && Date.now() - lastFetch.current > STALE_AFTER_MS) load();
    };
    const onOnline = () => { setOffline(false); load(); };
    const onOffline = () => setOffline(true);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    const timer = setInterval(() => setTick((t) => t + 1), 60_000); // met à jour "il y a X min"
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      clearInterval(timer);
    };
  }, [load]);

  const upcoming = useMemo(() => {
    const now = Date.now();
    return (data?.matches ?? []).filter((m) => new Date(m.kickoff).getTime() >= now - 2 * 3600_000);
  }, [data]);

  const matchesFilter = (m: MatchesPayload["matches"][number], id: string) => {
    if (id === "all") return true;
    if (id === "france") return m.home.name === "France" || m.away.name === "France";
    return m.competition === id;
  };

  // On n'affiche que les filtres qui contiennent au moins un match
  const availableFilters = useMemo(
    () => filters.filter((f) => f.id === "all" || upcoming.some((m) => matchesFilter(m, f.id))),
    [filters, upcoming],
  );
  const activeFilter = availableFilters.some((f) => f.id === filter) ? filter : "all";

  // Garde la compétition choisie visible dans la barre (utile pour celles tout à droite)
  const chipsRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const row = chipsRef.current;
    const chip = row?.querySelector<HTMLElement>('[aria-pressed="true"]');
    if (!row || !chip) return;
    const left = chip.offsetLeft - 16;
    const right = chip.offsetLeft + chip.offsetWidth + 40 - row.clientWidth;
    if (row.scrollLeft > left) row.scrollTo({ left, behavior: "smooth" });
    else if (row.scrollLeft < right) row.scrollTo({ left: right, behavior: "smooth" });
  }, [activeFilter]);

  // Messages techniques du serveur (« Ligue 3 : TheSportsDB : trop de requêtes… ») → juste le nom
  const unavailable = useMemo(
    () => [...new Set((data?.warnings ?? [])
          .map((w) => w.split(" : ")[0].trim())
          .map((n) => (/thesportsdb|football-data|requ[eê]te|http/i.test(n) || n.length > 30 ? "Certains matchs" : n))
          .filter(Boolean))],
    [data],
  );

  // Liste des équipes présentes dans les prochains matchs, triée par nom
  const teamOptions = useMemo<TeamOption[]>(() => {
    const map = new Map<string, TeamOption>();
    for (const m of upcoming) {
      for (const t of [m.home, m.away]) {
        if (t.name === "À déterminer") continue;
        const entry = map.get(t.name) ?? { name: t.name, logo: t.logo, count: 0 };
        entry.count++;
        entry.logo ??= t.logo;
        map.set(t.name, entry);
      }
    }
    // Les équipes choisies restent visibles même sans match à venir
    for (const name of selectedTeams) if (!map.has(name)) map.set(name, { name, logo: null, count: 0 });
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, "fr"));
  }, [upcoming, selectedTeams]);

  const teamLogo = (name: string) => teamOptions.find((t) => t.name === name)?.logo ?? null;

  const days = useMemo(
    () =>
      groupByDay(
        upcoming.filter(
          (m) =>
            matchesFilter(m, activeFilter) &&
            (selectedTeams.length === 0 || selectedTeams.includes(m.home.name) || selectedTeams.includes(m.away.name)),
        ),
      ),
    [upcoming, activeFilter, selectedTeams],
  );

  let cardIndex = 0;

  return (
    <div>
      <PageHeader
        title={title}
        onRefresh={load}
        refreshing={loading}
        status={loading && !data ? "Chargement…" : data ? relativeUpdate(data.updatedAt) : ""}
        live={upcoming.some((m) => {
          const t = new Date(m.kickoff).getTime();
          return Date.now() >= t && Date.now() < t + 2 * 3600_000;
        })}
      />

      {/* Filtres, collés en haut au défilement */}
      <div
        className="sticky z-10 border-b border-separator bg-bg/90 backdrop-blur-xl"
        style={{ top: "env(safe-area-inset-top)" }}
      >
        <div className="flex items-center">
          {/* Compétitions : défilent horizontalement, fondu à droite pour montrer qu'il y en a d'autres */}
          <div
            ref={chipsRef}
            className="flex min-w-0 flex-1 gap-2 overflow-x-auto py-3 pl-4 pr-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            style={{
              WebkitMaskImage: "linear-gradient(to right, #000 calc(100% - 32px), transparent)",
              maskImage: "linear-gradient(to right, #000 calc(100% - 32px), transparent)",
            }}
          >
            {availableFilters.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                aria-pressed={activeFilter === f.id}
                className="chip"
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Équipes : toujours visible à droite, ne défile pas avec les compétitions */}
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            aria-haspopup="dialog"
            aria-label={selectedTeams.length > 0 ? `Équipes, ${selectedTeams.length} choisie(s)` : "Choisir des équipes"}
            className={`chip relative mr-4 ${selectedTeams.length > 0 ? "chip-accent" : ""}`}
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden>
              <path d="M4 6h16M7 12h10M10 18h4" />
            </svg>
            Équipes
            {selectedTeams.length > 0 && (
              <span className="-mr-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1 text-[12px] font-semibold text-accent">
                {selectedTeams.length}
              </span>
            )}
          </button>
        </div>

        {selectedTeams.length > 0 && (
          <div className="flex gap-2 overflow-x-auto px-4 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {selectedTeams.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => updateTeams(selectedTeams.filter((n) => n !== name))}
                aria-label={`Retirer ${name}`}
                className="chip pl-1.5 normal-case"
              >
                <TeamLogo src={teamLogo(name)} name={name} small />
                {name}
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-label-2" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" aria-hidden>
                  <path d="M6 6l12 12M18 6 6 18" />
                </svg>
              </button>
            ))}
          </div>
        )}
      </div>

      {(offline || error) && (
        <div className="mx-4 mt-3 rounded-xl bg-surface px-3.5 py-2.5 text-[13px] text-label-2">
          {offline ? "Hors connexion. Ce sont les derniers matchs enregistrés." : error}
          {!offline && (
            <button type="button" onClick={load} className="ml-2 font-semibold text-accent active:opacity-60">
              Réessayer
            </button>
          )}
        </div>
      )}

      {unavailable.length > 0 && !error && !offline && (
        <div className="mx-4 mt-3 flex items-center gap-2.5 rounded-xl bg-surface px-3.5 py-2.5 text-[13px] text-label-2">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-warning" aria-hidden />
          <span className="flex-1">
            {unavailable.join(", ")} {unavailable.length > 1 ? "momentanément indisponibles" : "momentanément indisponible"}
          </span>
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="font-semibold text-accent active:opacity-60 disabled:text-label-3"
          >
            {loading ? "…" : "Réessayer"}
          </button>
        </div>
      )}

      {/* Squelettes au premier chargement */}
      {!data && loading && (
        <div className="space-y-2.5 px-4 pt-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-[148px] animate-pulse rounded-2xl bg-surface" />
          ))}
        </div>
      )}

      {data && days.length === 0 && (
        <div className="px-8 pt-16 text-center">
          <p className="text-[17px] font-semibold">Aucun match à venir</p>
          <p className="mt-1 text-[15px] text-label-2">
            {selectedTeams.length > 0
              ? "Pas de match prévu pour les équipes choisies avec ce filtre."
              : activeFilter === "all"
                ? "Le calendrier n'est pas encore publié."
                : "Rien de prévu pour ce filtre. Essaie « Tout »."}
          </p>
        </div>
      )}

      <div className="space-y-7 px-4 pb-6 pt-4">
        {days.map((day) => (
          <section key={day.key}>
            <h2 className="sr-only">{dayLabel(day.key)}</h2>
            <DayHeader dayKey={day.key} label={dayLabel(day.key)} count={day.matches.length} />
            <div className="space-y-3">
              {day.matches.map((m) => (
                <MatchCard key={m.id} match={m} index={cardIndex++} />
              ))}
            </div>
          </section>
        ))}
      </div>
      <TeamPicker
        open={pickerOpen}
        teams={teamOptions}
        selected={selectedTeams}
        onChange={updateTeams}
        onClose={() => setPickerOpen(false)}
      />
    </div>
  );
}
