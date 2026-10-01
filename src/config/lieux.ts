/**
 * VILLES DES STADES
 * football-data.org donne le nom du stade mais pas la ville.
 * Ce tableau complète la ville à partir d'un morceau du nom du stade
 * (sans accents ni majuscules). Ajoute une ligne si une ville manque.
 */
export const STADIUM_CITIES: [fragment: string, city: string][] = [
  ["parc des princes", "Paris"],
  ["velodrome", "Marseille"],
  ["groupama stadium", "Décines-Charpieu"],
  ["pierre-mauroy", "Villeneuve-d'Ascq"],
  ["pierre mauroy", "Villeneuve-d'Ascq"],
  ["allianz riviera", "Nice"],
  ["louis-ii", "Monaco"],
  ["louis ii", "Monaco"],
  ["bollaert", "Lens"],
  ["roazhon", "Rennes"],
  ["route de lorient", "Rennes"],
  ["beaujoire", "Nantes"],
  ["meinau", "Strasbourg"],
  ["stade de france", "Saint-Denis"],
  ["santiago bernabeu", "Madrid"],
  ["metropolitano", "Madrid"],
  ["camp nou", "Barcelone"],
  ["mestalla", "Valence"],
  ["sanchez-pizjuan", "Séville"],
  ["san mames", "Bilbao"],
  ["anfield", "Liverpool"],
  ["etihad", "Manchester"],
  ["old trafford", "Manchester"],
  ["emirates stadium", "Londres"],
  ["stamford bridge", "Londres"],
  ["tottenham hotspur stadium", "Londres"],
  ["london stadium", "Londres"],
  ["st. james", "Newcastle"],
  ["villa park", "Birmingham"],
  ["goodison", "Liverpool"],
  ["allianz arena", "Munich"],
  ["signal iduna", "Dortmund"],
  ["bayarena", "Leverkusen"],
  ["san siro", "Milan"],
  ["giuseppe meazza", "Milan"],
  ["allianz stadium", "Turin"],
  ["olimpico", "Rome"],
  ["maradona", "Naples"],
  ["da luz", "Lisbonne"],
  ["jose alvalade", "Lisbonne"],
  ["dragao", "Porto"],
  ["johan cruijff", "Amsterdam"],
  ["philips stadion", "Eindhoven"],
  ["celtic park", "Glasgow"],
  ["ibrox", "Glasgow"],
];

const normalize = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

export function cityForStadium(stadium: string | null): string | null {
  if (!stadium) return null;
  const n = normalize(stadium);
  return STADIUM_CITIES.find(([fragment]) => n.includes(fragment))?.[1] ?? null;
}
