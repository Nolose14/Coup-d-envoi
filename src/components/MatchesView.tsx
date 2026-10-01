"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { dayLabel, groupByDay, relativeUpdate } from "@/lib/dates";
import type { MatchesPayload, Section } from "@/lib/types";
import { MatchCard } from "./MatchCard";
import { PullToRefresh } from "./PullToRefresh";

interface Filter { id: string; label: string }

const storageKey = (section: Section) => `coup-d-envoi:${section}`;
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
  const [, setTick] = useState(0);
  const lastFetch = useRef(0);

  const load = useCallback(async () => {
    lastFetch.current = Date.now();
    setLoading(true);
    try {
      const res = await fetch(`/api/matches?section=${section}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Le serveur n'a pas répondu correctement.");
      setData(json as MatchesPayload);
      setError(null);
      try { localStorage.setItem(storageKey(section), JSON.stringify(json)); } catch { /* stockage plein ou désactivé */ }
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

  const days = useMemo(() => {
    if (!data) return [];
    const now = Date.now();
    const visible = data.matches.filter((m) => {
      if (new Date(m.kickoff).getTime() < now - 2 * 3600_000) return false; // match déjà fini
      if (filter === "all") return true;
      if (filter === "france") return m.home.name === "France" || m.away.name === "France";
      return m.competition === filter;
    });
    return groupByDay(visible);
  }, [data, filter]);

  let cardIndex = 0;

  return (
    <PullToRefresh onRefresh={load}>
      <header className="px-4 pt-4">
        <h1 className="text-[34px] font-bold leading-tight tracking-tight">{title}</h1>
        <p className="mt-0.5 h-5 text-[13px] text-label-2" aria-live="polite">
          {loading && !data ? "Chargement…" : data ? relativeUpdate(data.updatedAt) : ""}
        </p>
      </header>

      {/* Filtres, collés en haut au défilement */}
      <div
        className="sticky z-10 bg-bg/85 backdrop-blur-xl"
        style={{ top: "env(safe-area-inset-top)" }}
      >
        <div className="flex gap-2 overflow-x-auto px-4 py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {filters.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              aria-pressed={filter === f.id}
              className={`h-8 shrink-0 rounded-full px-3.5 text-[14px] font-medium transition-colors active:opacity-70 ${
                filter === f.id ? "bg-label text-bg" : "bg-surface text-label"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {(offline || error) && (
        <div className="mx-4 mb-2 rounded-xl bg-surface px-3.5 py-2.5 text-[13px] text-label-2">
          {offline ? "Hors connexion. Ce sont les derniers matchs enregistrés." : error}
          {!offline && (
            <button type="button" onClick={load} className="ml-2 font-semibold text-accent active:opacity-60">
              Réessayer
            </button>
          )}
        </div>
      )}

      {data && data.warnings.length > 0 && !error && (
        <p className="mx-4 mb-2 text-[12px] text-label-3">
          Certaines compétitions n&apos;ont pas pu être chargées : {data.warnings.join(" ")}
        </p>
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
            {filter === "all"
              ? "Le calendrier n'est pas encore publié. Tire vers le bas pour actualiser."
              : "Rien de prévu pour ce filtre. Essaie « Tout »."}
          </p>
        </div>
      )}

      <div className="space-y-6 px-4 pb-6">
        {days.map((day) => (
          <section key={day.key}>
            <h2 className="mb-2 px-1 text-[20px] font-bold tracking-tight">{dayLabel(day.key)}</h2>
            <div className="space-y-2.5">
              {day.matches.map((m) => (
                <MatchCard key={m.id} match={m} index={cardIndex++} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </PullToRefresh>
  );
}
