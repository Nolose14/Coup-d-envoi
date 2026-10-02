/** Équipes suivies (partagées avec le filtre « Équipes » de l'onglet Clubs). */
const KEY = "coup-d-envoi:equipes:clubs";

export function readFavorites(): string[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]") as string[];
  } catch {
    return [];
  }
}

export function writeFavorites(list: string[]) {
  try { localStorage.setItem(KEY, JSON.stringify(list)); } catch { /* ignoré */ }
}
