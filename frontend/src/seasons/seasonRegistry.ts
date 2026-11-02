export type EnvironmentKind =
  | "tropical" | "ocean" | "alien" | "chrome"
  | "jungle" | "wasteland" | "neon" | "future";

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

type SeasonDefinition = {
  id: string;
  label: string;
  title: string;
  subtitle: string;
  startsAt: string;
  endsAt: string;
  chapter: number;
  backgroundCell: number;
};

const environments: Record<number, Omit<FortniteSeason, keyof SeasonDefinition | "id" | "label" | "title" | "subtitle" | "startsAt" | "endsAt" | "year">> = {
  1: { accent:"#ffb347",sky:"#f39a62",horizon:"#e76b4c",ground:"#477c54",water:"#269ba5",atmosphere:"Tropical · Volcanique · Futuriste",location:"Archipel des brumes",environment:"tropical",description:"Une île sauvage, des reliefs volcaniques et des lieux emblématiques à redécouvrir.",backgroundCell:0 },
  2: { accent:"#62d8c2",sky:"#73c5d5",horizon:"#3d8d9d",ground:"#4b9b7a",water:"#247d9e",atmosphere:"Insulaire · Aquatique · Mystérieux",location:"Les îles du renouveau",environment:"ocean",description:"Un vaste archipel, des criques lumineuses et des zones secrètes à explorer.",backgroundCell:1 },
  3: { accent:"#b9f36b",sky:"#202d55",horizon:"#5749a8",ground:"#454c67",water:"#4c83b8",atmosphere:"Énergétique · Futuriste · Épique",location:"La nouvelle île",environment:"alien",description:"Une île renouvelée, des points d'intérêt inédits et une nouvelle aventure.",backgroundCell:2 },
  4: { accent:"#e58bff",sky:"#5a4c91",horizon:"#bb75bd",ground:"#8d719f",water:"#a5d4df",atmosphere:"Chromatique · Onirique · Médiéval",location:"Les terres changeantes",environment:"chrome",description:"Une frontière irréelle où la pierre, les reflets et la végétation changent de nature.",backgroundCell:3 },
  5: { accent:"#b6e66b",sky:"#79b6a7",horizon:"#4d8974",ground:"#477d4d",water:"#378e8d",atmosphere:"Jungle · Ruines · Exploration",location:"La canopée oubliée",environment:"jungle",description:"Une jungle dense, des ruines enfouies et des passages secrets sous la canopée.",backgroundCell:4 },
  6: { accent:"#ff9c4a",sky:"#d8875d",horizon:"#a94e37",ground:"#a96d43",water:"#557b80",atmosphere:"Désertique · Urbain · Aventure",location:"Les plaines du levant",environment:"wasteland",description:"Des falaises chaudes, des routes oubliées et des citadelles à explorer.",backgroundCell:5 },
  7: { accent:"#ff70c8",sky:"#25264d",horizon:"#593e83",ground:"#34364f",water:"#2b7b91",atmosphere:"Urbain · Néon · Futuriste",location:"District des lanternes",environment:"neon",description:"Une métropole verticale, des jardins suspendus et des enseignes lumineuses.",backgroundCell:6 },
};

const definitions: SeasonDefinition[] = [
  {id:"c1-s8",label:"Chapitre 1 · Saison 8",title:"X marque l'endroit",subtitle:"X MARKS THE SPOT",startsAt:"2019-02-28",endsAt:"2019-05-09",chapter:1,backgroundCell:0},
  {id:"c1-s9",label:"Chapitre 1 · Saison 9",title:"Le futur est à vous",subtitle:"THE FUTURE IS YOURS",startsAt:"2019-05-09",endsAt:"2019-08-01",chapter:1,backgroundCell:0},
  {id:"c1-sx",label:"Chapitre 1 · Saison X",title:"Hors du temps",subtitle:"OUT OF TIME",startsAt:"2019-08-01",endsAt:"2019-10-15",chapter:1,backgroundCell:0},
  {id:"c2-s1",label:"Chapitre 2 · Saison 1",title:"Nouveau monde",subtitle:"NEW WORLD",startsAt:"2019-10-15",endsAt:"2020-02-20",chapter:2,backgroundCell:1},
  {id:"c2-s2",label:"Chapitre 2 · Saison 2",title:"Top Secret",subtitle:"TOP SECRET",startsAt:"2020-02-20",endsAt:"2020-06-17",chapter:2,backgroundCell:1},
  {id:"c2-s3",label:"Chapitre 2 · Saison 3",title:"Faites des vagues",subtitle:"SPLASHDOWN",startsAt:"2020-06-17",endsAt:"2020-08-27",chapter:2,backgroundCell:1},
  {id:"c2-s4",label:"Chapitre 2 · Saison 4",title:"Le nœud du conflit",subtitle:"NEXUS WAR",startsAt:"2020-08-27",endsAt:"2020-12-02",chapter:2,backgroundCell:1},
  {id:"c2-s5",label:"Chapitre 2 · Saison 5",title:"Point zéro",subtitle:"ZERO POINT",startsAt:"2020-12-02",endsAt:"2021-03-16",chapter:2,backgroundCell:1},
  {id:"c2-s6",label:"Chapitre 2 · Saison 6",title:"Instinct primitif",subtitle:"PRIMAL",startsAt:"2021-03-16",endsAt:"2021-06-08",chapter:2,backgroundCell:1},
  {id:"c2-s7",label:"Chapitre 2 · Saison 7",title:"Invasion",subtitle:"INVASION",startsAt:"2021-06-08",endsAt:"2021-09-13",chapter:2,backgroundCell:1},
  {id:"c2-s8",label:"Chapitre 2 · Saison 8",title:"Incubation",subtitle:"CUBED",startsAt:"2021-09-13",endsAt:"2021-12-05",chapter:2,backgroundCell:1},
  {id:"c3-s1",label:"Chapitre 3 · Saison 1",title:"Retournement",subtitle:"FLIPPED",startsAt:"2021-12-05",endsAt:"2022-03-20",chapter:3,backgroundCell:2},
  {id:"c3-s2",label:"Chapitre 3 · Saison 2",title:"Résistance",subtitle:"RESISTANCE",startsAt:"2022-03-20",endsAt:"2022-06-05",chapter:3,backgroundCell:2},
  {id:"c3-s3",label:"Chapitre 3 · Saison 3",title:"Détente",subtitle:"VIBIN'",startsAt:"2022-06-05",endsAt:"2022-09-18",chapter:3,backgroundCell:2},
  {id:"c3-s4",label:"Chapitre 3 · Saison 4",title:"Paradis",subtitle:"PARADISE",startsAt:"2022-09-18",endsAt:"2022-12-04",chapter:3,backgroundCell:2},
  {id:"c4-s1",label:"Chapitre 4 · Saison 1",title:"Un nouveau départ",subtitle:"A NEW BEGINNING",startsAt:"2022-12-04",endsAt:"2023-03-10",chapter:4,backgroundCell:3},
  {id:"c4-s2",label:"Chapitre 4 · Saison 2",title:"MEGA",subtitle:"MEGA",startsAt:"2023-03-10",endsAt:"2023-06-09",chapter:4,backgroundCell:3},
  {id:"c4-s3",label:"Chapitre 4 · Saison 3",title:"Sauvage",subtitle:"WILDS",startsAt:"2023-06-09",endsAt:"2023-08-25",chapter:4,backgroundCell:3},
  {id:"c4-s4",label:"Chapitre 4 · Saison 4",title:"Dernier recours",subtitle:"LAST RESORT",startsAt:"2023-08-25",endsAt:"2023-11-03",chapter:4,backgroundCell:3},
  {id:"og-2023",label:"Fortnite OG · 2023",title:"Retour aux origines",subtitle:"FORTNITE OG",startsAt:"2023-11-03",endsAt:"2023-12-03",chapter:4,backgroundCell:3},
  {id:"c5-s1",label:"Chapitre 5 · Saison 1",title:"Subversion",subtitle:"UNDERGROUND",startsAt:"2023-12-03",endsAt:"2024-03-08",chapter:5,backgroundCell:4},
  {id:"c5-s2",label:"Chapitre 5 · Saison 2",title:"Mythes et mortels",subtitle:"MYTHS & MORTALS",startsAt:"2024-03-08",endsAt:"2024-05-24",chapter:5,backgroundCell:4},
  {id:"c5-s3",label:"Chapitre 5 · Saison 3",title:"Véhiculé",subtitle:"WRECKED",startsAt:"2024-05-24",endsAt:"2024-08-16",chapter:5,backgroundCell:4},
  {id:"c5-s4",label:"Chapitre 5 · Saison 4",title:"Absolute Doom",subtitle:"ABSOLUTE DOOM",startsAt:"2024-08-16",endsAt:"2024-11-02",chapter:5,backgroundCell:4},
  {id:"c2-remix",label:"Chapitre 2 · Remix",title:"Remix : le prélude",subtitle:"RELOAD THE MEMORIES",startsAt:"2024-11-02",endsAt:"2024-12-01",chapter:5,backgroundCell:4},
  {id:"c6-s1",label:"Chapitre 6 · Saison 1",title:"Chasseurs de démons",subtitle:"HUNTERS",startsAt:"2024-12-01",endsAt:"2025-02-21",chapter:6,backgroundCell:5},
  {id:"c6-s2",label:"Chapitre 6 · Saison 2",title:"Sans foi ni loi",subtitle:"LAWLESS",startsAt:"2025-02-21",endsAt:"2025-05-02",chapter:6,backgroundCell:5},
  {id:"c6-mini1",label:"Chapitre 6 · Mini-saison 1",title:"Galactic Battle",subtitle:"GALACTIC BATTLE",startsAt:"2025-05-02",endsAt:"2025-06-07",chapter:6,backgroundCell:5},
  {id:"c6-s3",label:"Chapitre 6 · Saison 3",title:"Super",subtitle:"SUPER",startsAt:"2025-06-07",endsAt:"2025-08-07",chapter:6,backgroundCell:5},
  {id:"c6-s4",label:"Chapitre 6 · Saison 4",title:"Choc et terreur",subtitle:"SHOCK 'N AWESOME",startsAt:"2025-08-07",endsAt:"2025-11-01",chapter:6,backgroundCell:5},
  {id:"c6-mini2",label:"Chapitre 6 · Mini-saison 2",title:"Les Simpson",subtitle:"WELCOME TO SPRINGFIELD",startsAt:"2025-11-01",endsAt:"2025-11-29",chapter:6,backgroundCell:5},
  {id:"c7-s1",label:"Chapitre 7 · Saison 1",title:"Pacific Break",subtitle:"PACIFIC BREAK",startsAt:"2025-11-29",endsAt:"2026-03-19",chapter:7,backgroundCell:6},
  {id:"c7-s2",label:"Chapitre 7 · Saison 2",title:"Showdown",subtitle:"SHOWDOWN",startsAt:"2026-03-19",endsAt:"2026-06-06",chapter:7,backgroundCell:6},
  {id:"c7-s3",label:"Chapitre 7 · Saison 3",title:"Runners",subtitle:"RUNNERS",startsAt:"2026-06-06",endsAt:"2026-08-20",chapter:7,backgroundCell:6},
  {id:"c7-s4",label:"Chapitre 7 · Saison 4",title:"Override",subtitle:"OVERRIDE",startsAt:"2026-08-20",endsAt:"2026-11-01",chapter:7,backgroundCell:6},
  {id:"c7-mini5",label:"Chapitre 7 · Mini-saison 5",title:"Treasure Hunters",subtitle:"TREASURE HUNTERS",startsAt:"2026-11-01",endsAt:"2026-12-05",chapter:7,backgroundCell:6},
];

export const seasonRegistry: FortniteSeason[] = definitions.map((definition) => {
  const year = Number(definition.startsAt.slice(0, 4));
  const theme = environments[definition.chapter] ?? environments[7];
  return {
    ...theme,
    ...definition,
    year,
    backgroundCell: definition.backgroundCell,
  };
});
