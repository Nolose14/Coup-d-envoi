/**
 * DIFFUSEURS TV EN FRANCE — saison 2026-2027
 * ------------------------------------------------------------
 * Les API football ne fournissent pas les chaînes : ce fichier fait le lien.
 * Vérifié début octobre 2026 :
 *  - Ligue des champions : Canal+ (100 % des matchs). Finale aussi en clair sur M6.
 *  - Ligue 1 : Ligue 1+ (les 9 matchs de chaque journée, plus de match sur beIN).
 *  - Premier League : Canal+.
 *  - Liga : DAZN et Disney+ (depuis 2026-2027, plus sur beIN).
 *  - Équipe de France : TF1 / TF1+.
 *  - Ligue des nations hors Bleus : L'Équipe (à revérifier, source unique).
 *
 * Pour modifier : change les listes ci-dessous puis pousse sur GitHub,
 * Vercel redéploie tout seul.
 */
import type { Broadcaster, CompetitionId, RawMatch } from "@/lib/types";

export const BROADCASTERS = {
  canal:      { name: "Canal+",   url: "https://www.canalplus.com" },
  m6:         { name: "M6" },
  ligue1plus: { name: "Ligue 1+" },
  dazn:       { name: "DAZN",     url: "https://www.dazn.com" },
  disney:     { name: "Disney+",  url: "https://www.disneyplus.com" },
  tf1:        { name: "TF1",      url: "https://www.tf1.fr" },
  lequipe:    { name: "L'Équipe", url: "https://www.lequipe.fr" },
  bein:       { name: "beIN Sports" },
} satisfies Record<string, Broadcaster>;

export type BroadcasterKey = keyof typeof BROADCASTERS;

/** Diffuseur(s) par défaut pour chaque compétition. */
export const COMPETITION_BROADCASTERS: Record<CompetitionId, BroadcasterKey[]> = {
  CL: ["canal"],
  FL1: ["ligue1plus"],
  PL: ["canal"],
  PD: ["dazn", "disney"],
  NL: ["lequipe"],
  WCQ: [],
  ECQ: [],
  FRIENDLY: [],
};

/**
 * Surcharges pour un match précis (prioritaires sur tout le reste).
 * La clé est l'identifiant du match, visible dans /api/matches?section=clubs
 * Exemple :  "fd-537812": ["canal", "m6"],
 */
export const MATCH_OVERRIDES: Record<string, BroadcasterKey[]> = {};

const isFrance = (name: string) => name === "France";

export function resolveBroadcasters(match: RawMatch): Broadcaster[] {
  let keys: BroadcasterKey[];

  if (MATCH_OVERRIDES[match.id]) {
    keys = MATCH_OVERRIDES[match.id];
  } else if (match.section === "selections" && (isFrance(match.home.name) || isFrance(match.away.name))) {
    keys = ["tf1"];
  } else if (match.competition === "CL" && match.stage === "FINAL") {
    keys = ["canal", "m6"];
  } else {
    keys = COMPETITION_BROADCASTERS[match.competition] ?? [];
  }

  return keys.map((k) => BROADCASTERS[k]);
}
