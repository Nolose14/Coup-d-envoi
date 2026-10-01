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
  Qatar: "Qatar", Iran: "Iran",
};

export const toFrenchNation = (name: string) => NATION_NAMES_FR[name] ?? name;
export const isNotableNation = (name: string) => name in NATION_NAMES_FR;
