export type EnvironmentKind =
  | "tropical"
  | "ocean"
  | "alien"
  | "chrome"
  | "jungle"
  | "wasteland"
  | "neon"
  | "future";

export type FortniteSeason = {
  id: string;
  year: number;
  label: string;
  title: string;
  subtitle: string;
  startsAt: string;
  endsAt: string;
  accent: string;
  sky: string;
  horizon: string;
  ground: string;
  water: string;
  atmosphere: string;
  location: string;
  environment: EnvironmentKind;
  description: string;
  backgroundCell: number;
};

export const seasonRegistry: FortniteSeason[] = [
  {
    id: "era-2019", year: 2019, label: "2019 · Chapitre 1",
    title: "L'âge des découvertes", subtitle: "TROPICAL FRONTIER",
    startsAt: "2019-02-28", endsAt: "2019-12-31",
    accent: "#ffb347", sky: "#f39a62", horizon: "#e76b4c",
    ground: "#477c54", water: "#269ba5", atmosphere: "Tropical · Volcanique · Futuriste",
    location: "Archipel des brumes", environment: "tropical",
    description: "Une côte sauvage, des reliefs volcaniques et des vestiges d'une technologie oubliée."
    backgroundCell: 0,
  },
  {
    id: "era-2020", year: 2020, label: "2020 · Chapitre 2",
    title: "Un monde à explorer", subtitle: "NEW HORIZONS",
    startsAt: "2020-01-01", endsAt: "2020-12-31",
    accent: "#62d8c2", sky: "#73c5d5", horizon: "#3d8d9d",
    ground: "#4b9b7a", water: "#247d9e", atmosphere: "Insulaire · Aquatique · Hivernal",
    location: "Les îles du renouveau", environment: "ocean",
    description: "Un vaste archipel, des criques lumineuses et des sommets glacés à l'horizon."
    backgroundCell: 1,
  },
  {
    id: "era-2021", year: 2021, label: "2021 · Invasion",
    title: "Signal venu du ciel", subtitle: "ALIEN SIGNAL",
    startsAt: "2021-01-01", endsAt: "2021-12-31",
    accent: "#b9f36b", sky: "#202d55", horizon: "#5749a8",
    ground: "#454c67", water: "#4c83b8", atmosphere: "Extraterrestre · Énergétique · Mystérieux",
    location: "Zone de contact", environment: "alien",
    description: "Des structures inconnues émergent du sol tandis que des lumières parcourent le ciel."
    backgroundCell: 2,
  },
  {
    id: "era-2022", year: 2022, label: "2022 · Réalité chromatique",
    title: "La matière se transforme", subtitle: "CHROMATIC SHIFT",
    startsAt: "2022-01-01", endsAt: "2022-12-31",
    accent: "#e58bff", sky: "#5a4c91", horizon: "#bb75bd",
    ground: "#8d719f", water: "#a5d4df", atmosphere: "Chromatique · Onirique · Médiéval",
    location: "Les terres changeantes", environment: "chrome",
    description: "Une frontière irréelle où la pierre, les reflets et la végétation semblent changer de nature."
    backgroundCell: 3,
  },
  {
    id: "era-2023", year: 2023, label: "2023 · Frontière sauvage",
    title: "La nature reprend ses droits", subtitle: "WILD FRONTIER",
    startsAt: "2023-01-01", endsAt: "2023-12-31",
    accent: "#b6e66b", sky: "#79b6a7", horizon: "#4d8974",
    ground: "#477d4d", water: "#378e8d", atmosphere: "Jungle · Ruines · Exploration",
    location: "La canopée oubliée", environment: "jungle",
    description: "Une jungle dense, des ruines enfouies et des passages secrets sous la canopée."
    backgroundCell: 4,
  },
  {
    id: "era-2024", year: 2024, label: "2024 · Terres désolées",
    title: "Survivre à la poussière", subtitle: "DUST & THUNDER",
    startsAt: "2024-01-01", endsAt: "2024-12-31",
    accent: "#ff9c4a", sky: "#d8875d", horizon: "#a94e37",
    ground: "#a96d43", water: "#557b80", atmosphere: "Méditerranéen · Désertique · Post-apocalyptique",
    location: "Les plaines du levant", environment: "wasteland",
    description: "Des falaises chaudes, des routes oubliées et une citadelle dressée au milieu des dunes."
    backgroundCell: 5,
  },
  {
    id: "era-2025", year: 2025, label: "2025 · Métropole néon",
    title: "La ville ne dort jamais", subtitle: "NEON SHOGUN",
    startsAt: "2025-01-01", endsAt: "2025-12-31",
    accent: "#ff70c8", sky: "#25264d", horizon: "#593e83",
    ground: "#34364f", water: "#2b7b91", atmosphere: "Urbain · Japonisant · Néon",
    location: "District des lanternes", environment: "neon",
    description: "Une mégalopole verticale, des jardins suspendus et des enseignes qui percent la nuit."
    backgroundCell: 6,
  },
  {
    id: "era-2026", year: 2026, label: "2026 · Nouvelle frontière",
    title: "L'horizon appartient aux audacieux", subtitle: "SKYLINE ZERO",
    startsAt: "2026-01-01", endsAt: "2026-12-31",
    accent: "#70c7ff", sky: "#537fba", horizon: "#263f76",
    ground: "#536c7b", water: "#3288ae", atmosphere: "Contemporain · Aérien · Évolutif",
    location: "L'archipel des hauteurs", environment: "future",
    description: "Des îlots suspendus, des tours élancées et un ciel traversé par des courants lumineux."
    backgroundCell: 7,
  }
];
