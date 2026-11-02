export type Outfit = { id:string; name:string; rarity:"Atypique"|"Rare"|"Épique"|"Légendaire"; price:number; colors:[string,string,string]; accent:string; style:"runner"|"tech"|"scout"|"guardian"|"pilot"|"street"; description:string };
export const outfits:Outfit[]=[
{id:"nova",name:"Nova éclatante",rarity:"Rare",price:1200,colors:["#e9edf4","#26364c","#9bd8ff"],accent:"#70c7ff",style:"runner",description:"Tenue de compétition légère aux détails lumineux."},
{id:"volt",name:"Volt zéro",rarity:"Épique",price:1500,colors:["#202b42","#101722","#f2b94b"],accent:"#f2b94b",style:"tech",description:"Équipement tactique aux lignes énergétiques."},
{id:"mistral",name:"Éclaireuse Mistral",rarity:"Atypique",price:800,colors:["#8ac4a0","#263b35","#d7e8c4"],accent:"#a5e0bd",style:"scout",description:"Tenue d'exploration inspirée des grands espaces."},
{id:"atlas",name:"Gardien Atlas",rarity:"Légendaire",price:2000,colors:["#c9b08a","#39404c","#f2d28c"],accent:"#e6c17a",style:"guardian",description:"Armure de prestige aux matériaux contrastés."},
{id:"aero",name:"Pilote Aéro",rarity:"Rare",price:1200,colors:["#e5a06d","#39465b","#f4e2c5"],accent:"#ffb17a",style:"pilot",description:"Combinaison de pilote moderne et colorée."},
{id:"pulse",name:"Pulse urbaine",rarity:"Épique",price:1500,colors:["#d889bd","#28233d","#8fe8e1"],accent:"#f18acb",style:"street",description:"Look streetwear futuriste aux accents néon."}
];