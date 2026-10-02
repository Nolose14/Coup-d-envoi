/**
 * Noms français des sélections (API-Football renvoie les noms en anglais).
 * Sert aussi de filtre pour les matchs amicaux : seuls ceux impliquant une
 * nation de cette liste sont gardés, pour éviter des dizaines d'amicaux lointains.
 */
export const NATION_NAMES_FR: Record<string, string> = {
  France: "France", Belgium: "Belgique", Switzerland: "Suisse", Germany: "Allemagne",
  Spain: "Espagne", Italy: "Italie", Portugal: "Portugal", England: "Angleterre",
  Netherlands: "Pays-Bas", Croatia: "Croatie", Denmark: "Danemark", Sweden: "Suède",
  Norway: "Norvège", Austria: "Autriche", Poland: "Pologne", Scotland: "Écosse",
  Wales: "Pays de Galles", "Northern Ireland": "Irlande du Nord", Ireland: "Irlande",
  "Republic of Ireland": "Irlande", Serbia: "Serbie", Turkey: "Turquie", "Türkiye": "Turquie",
  Ukraine: "Ukraine", "Czech Republic": "Tchéquie", Czechia: "Tchéquie", Hungary: "Hongrie",
  Greece: "Grèce", Romania: "Roumanie", Slovakia: "Slovaquie", Slovenia: "Slovénie",
  Albania: "Albanie", Georgia: "Géorgie", Iceland: "Islande", Finland: "Finlande",
  Bosnia: "Bosnie-Herzégovine", "Bosnia and Herzegovina": "Bosnie-Herzégovine",
  "North Macedonia": "Macédoine du Nord", Montenegro: "Monténégro", Israel: "Israël",
  Luxembourg: "Luxembourg", Kosovo: "Kosovo", Armenia: "Arménie", Azerbaijan: "Azerbaïdjan",
  Brazil: "Brésil", Argentina: "Argentine", Uruguay: "Uruguay", Colombia: "Colombie",
  USA: "États-Unis", "United States": "États-Unis", Mexico: "Mexique", Canada: "Canada",
  Morocco: "Maroc", Algeria: "Algérie", Tunisia: "Tunisie", Senegal: "Sénégal",
  "Ivory Coast": "Côte d'Ivoire", "Côte d'Ivoire": "Côte d'Ivoire", Cameroon: "Cameroun",
  Egypt: "Égypte", Nigeria: "Nigeria", Japan: "Japon", "South Korea": "Corée du Sud",
  "Korea Republic": "Corée du Sud", Australia: "Australie", "Saudi Arabia": "Arabie saoudite",
  Qatar: "Qatar", Iran: "Iran", "Faroe Islands": "Îles Féroé", Cyprus: "Chypre", Malta: "Malte",
  Estonia: "Estonie", Latvia: "Lettonie", Lithuania: "Lituanie", Belarus: "Biélorussie", Moldova: "Moldavie",
  Kazakhstan: "Kazakhstan", Andorra: "Andorre", "San Marino": "Saint-Marin", Gibraltar: "Gibraltar",
  Liechtenstein: "Liechtenstein", Bulgaria: "Bulgarie", "Macedonia": "Macédoine du Nord",
};

export const toFrenchNation = (name: string) => NATION_NAMES_FR[name] ?? name;
export const isNotableNation = (name: string) => name in NATION_NAMES_FR;

/** Codes pays pour afficher les drapeaux (flagcdn.com, gratuit). */
const FLAG_CODES: Record<string, string> = {
  France: "fr", Belgique: "be", Suisse: "ch", Allemagne: "de", Espagne: "es", Italie: "it",
  Portugal: "pt", Angleterre: "gb-eng", "Pays-Bas": "nl", Croatie: "hr", Danemark: "dk",
  Suède: "se", Norvège: "no", Autriche: "at", Pologne: "pl", Écosse: "gb-sct",
  "Pays de Galles": "gb-wls", "Irlande du Nord": "gb-nir", Irlande: "ie", Serbie: "rs",
  Turquie: "tr", Ukraine: "ua", Tchéquie: "cz", Hongrie: "hu", Grèce: "gr", Roumanie: "ro",
  Slovaquie: "sk", Slovénie: "si", Albanie: "al", Géorgie: "ge", Islande: "is", Finlande: "fi",
  Brésil: "br", Argentine: "ar", Uruguay: "uy", Colombie: "co", "États-Unis": "us",
  Mexique: "mx", Canada: "ca", Maroc: "ma", Algérie: "dz", Tunisie: "tn", Sénégal: "sn",
  "Côte d'Ivoire": "ci", Cameroun: "cm", Égypte: "eg", Nigeria: "ng", Japon: "jp",
  "Corée du Sud": "kr", Australie: "au", "Bosnie-Herzégovine": "ba", "Macédoine du Nord": "mk",
  Monténégro: "me", Israël: "il", Luxembourg: "lu", Kosovo: "xk", Arménie: "am", Azerbaïdjan: "az",
  "Îles Féroé": "fo", Chypre: "cy", Malte: "mt", Estonie: "ee", Lettonie: "lv", Lituanie: "lt",
  Biélorussie: "by", Moldavie: "md", Kazakhstan: "kz", Andorre: "ad", "Saint-Marin": "sm",
  Gibraltar: "gi", Liechtenstein: "li", Bulgarie: "bg",
};

export function flagUrl(nameFr: string): string | null {
  const code = FLAG_CODES[nameFr];
  return code ? `https://flagcdn.com/w80/${code}.png` : null;
}
