const TZ = "Europe/Paris";

const keyFmt = new Intl.DateTimeFormat("fr-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" });
const dayFmt = new Intl.DateTimeFormat("fr-FR", { timeZone: TZ, weekday: "long", day: "numeric", month: "long" });
const timeFmt = new Intl.DateTimeFormat("fr-FR", { timeZone: TZ, hour: "2-digit", minute: "2-digit" });

/** Clé "AAAA-MM-JJ" du jour, à l'heure de Paris. */
export const dayKey = (d: Date | string) => keyFmt.format(new Date(d));

export const formatTime = (iso: string) => timeFmt.format(new Date(iso));

function shiftKey(key: string, days: number) {
  const [y, m, d] = key.split("-").map(Number);
  return dayKey(new Date(Date.UTC(y, m - 1, d + days, 12)));
}

export function dayLabel(key: string, now = new Date()) {
  const today = dayKey(now);
  if (key === today) return "Aujourd'hui";
  if (key === shiftKey(today, 1)) return "Demain";
  const [y, m, d] = key.split("-").map(Number);
  const label = dayFmt.format(new Date(Date.UTC(y, m - 1, d, 12)));
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function groupByDay<T extends { kickoff: string }>(items: T[]) {
  const groups = new Map<string, T[]>();
  for (const item of [...items].sort((a, b) => a.kickoff.localeCompare(b.kickoff))) {
    const k = dayKey(item.kickoff);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(item);
  }
  return [...groups.entries()].map(([key, matches]) => ({ key, matches }));
}

export function relativeUpdate(iso: string, now = Date.now()) {
  const minutes = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60000));
  if (minutes < 1) return "Mis à jour à l'instant";
  if (minutes < 60) return `Mis à jour il y a ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `Mis à jour il y a ${hours} h`;
  return `Mis à jour le ${dayFmt.format(new Date(iso))}`;
}

/** "AAAA-MM-JJ" en UTC, pour les paramètres d'API. */
export function isoDay(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function addDays(d: Date, days: number) {
  return new Date(d.getTime() + days * 86_400_000);
}
