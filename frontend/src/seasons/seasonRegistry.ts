export type FortniteSeason = {
  id: string;
  chapter: number;
  season: number | "X";
  name: string;
  subtitle: string;
  startsAt: string;
  endsAt: string;
  accent: string;
  accentSoft: string;
  atmosphere: string;
  location: string;
  headline: string;
  description: string;
  badge: string;
};

/**
 * Initial visual catalogue used by the frontend preview.
 * The full historical calendar (all seasons, including special seasons)
 * should be completed from a verified source before production use.
 */
export const seasonRegistry: FortniteSeason[] = [
  {
    id: "c1s8",
    chapter: 1,
    season: 8,
    name: "X marque l'endroit",
    subtitle: "Chapitre 1 · Saison 8",
    startsAt: "2019-02-28",
    endsAt: "2019-05-08",
    accent: "#f0a33a",
    accentSoft: "rgba(240, 163, 58, .18)",
    atmosphere: "Tropicale · Aventure · Exploration",
    location: "L'île aux trésors",
    headline: "UNE NOUVELLE AVENTURE COMMENCE",
    description: "Explore une nouvelle ère, découvre les rivalités et prépare ton organisation pour la scène compétitive.",
    badge: "SAISON HISTORIQUE"
  },
  {
    id: "c1s9",
    chapter: 1,
    season: 9,
    name: "Le futur est là",
    subtitle: "Chapitre 1 · Saison 9",
    startsAt: "2019-05-09",
    endsAt: "2019-08-01",
    accent: "#43d8d0",
    accentSoft: "rgba(67, 216, 208, .18)",
    atmosphere: "Futuriste · Néon · Technologie",
    location: "Neo Tilted",
    headline: "LE FUTUR CHANGE LA COMPÉTITION",
    description: "Une nouvelle ville, de nouvelles stratégies et une scène qui accélère. À toi de prendre l'avantage.",
    badge: "SAISON HISTORIQUE"
  },
  {
    id: "c1sx",
    chapter: 1,
    season: "X",
    name: "Hors du temps",
    subtitle: "Chapitre 1 · Saison X",
    startsAt: "2019-08-01",
    endsAt: "2019-10-14",
    accent: "#b28cff",
    accentSoft: "rgba(178, 140, 255, .18)",
    atmosphere: "Rétro · Instable · Temporel",
    location: "L'île fragmentée",
    headline: "LE TEMPS EST ENTRE TES MAINS",
    description: "Les repères changent. Construis ton héritage dans une saison qui bouleverse les habitudes.",
    badge: "SAISON HISTORIQUE"
  },
  {
    id: "c2s1",
    chapter: 2,
    season: 1,
    name: "Nouveau monde",
    subtitle: "Chapitre 2 · Saison 1",
    startsAt: "2019-10-15",
    endsAt: "2020-02-19",
    accent: "#55b9a5",
    accentSoft: "rgba(85, 185, 165, .18)",
    atmosphere: "Nature · Découverte · Renouveau",
    location: "Une île inexplorée",
    headline: "UN NOUVEAU MONDE À CONQUÉRIR",
    description: "Une nouvelle île ouvre ses portes. Recrute, entraîne et mène ton équipe vers les sommets.",
    badge: "SAISON HISTORIQUE"
  }
];