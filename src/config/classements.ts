/**
 * ZONES DES CLASSEMENTS (saison 2026-2027)
 * Indicatives : les places européennes peuvent bouger selon les vainqueurs de coupes.
 * from/to = positions incluses.
 */
import type { CompetitionId } from "@/lib/types";

export interface Zone {
  from: number;
  to: number;
  label: string;
  color: string;
}

export const ZONES: Partial<Record<CompetitionId, Zone[]>> = {
  CL: [
    { from: 1,  to: 8,  label: "Huitièmes de finale",  color: "#0A84FF" },
    { from: 9,  to: 24, label: "Barrages",              color: "#64D2FF" },
    { from: 25, to: 36, label: "Éliminé",               color: "#FF453A" },
  ],
  FL1: [
    { from: 1,  to: 3,  label: "Ligue des champions",          color: "#0A84FF" },
    { from: 4,  to: 4,  label: "Qualif. Ligue des champions",  color: "#64D2FF" },
    { from: 5,  to: 5,  label: "Ligue Europa",                 color: "#FF9F0A" },
    { from: 6,  to: 6,  label: "Ligue Conférence",             color: "#30D158" },
    { from: 16, to: 16, label: "Barrage de relégation",        color: "#FFD60A" },
    { from: 17, to: 18, label: "Relégation",                   color: "#FF453A" },
  ],
  FL2: [
    { from: 1,  to: 2,  label: "Montée en Ligue 1",       color: "#0A84FF" },
    { from: 3,  to: 5,  label: "Play-offs d'accession",   color: "#64D2FF" },
    { from: 16, to: 16, label: "Barrage de relégation",   color: "#FFD60A" },
    { from: 17, to: 18, label: "Relégation",              color: "#FF453A" },
  ],
  FL3: [
    { from: 1,  to: 2,  label: "Montée en Ligue 2",       color: "#0A84FF" },
  ],
  PL: [
    { from: 1,  to: 4,  label: "Ligue des champions",  color: "#0A84FF" },
    { from: 5,  to: 5,  label: "Ligue Europa",         color: "#FF9F0A" },
    { from: 6,  to: 6,  label: "Ligue Conférence",     color: "#30D158" },
    { from: 18, to: 20, label: "Relégation",           color: "#FF453A" },
  ],
  PD: [
    { from: 1,  to: 4,  label: "Ligue des champions",  color: "#0A84FF" },
    { from: 5,  to: 6,  label: "Ligue Europa",         color: "#FF9F0A" },
    { from: 7,  to: 7,  label: "Ligue Conférence",     color: "#30D158" },
    { from: 18, to: 20, label: "Relégation",           color: "#FF453A" },
  ],
};

export const zoneFor = (competition: CompetitionId, position: number) =>
  ZONES[competition]?.find((z) => position >= z.from && position <= z.to) ?? null;
