import { Suspense, useEffect, useMemo, useState } from "react";
import { Activity, Bell, Check, ChevronDown, ChevronRight, CircleHelp, Crown, Gamepad2, Globe2, Menu, Settings, Shield, ShoppingBag, Sparkles, Swords, Trophy, UserRound, Users, Zap } from "lucide-react";
import LobbyScene from "./LobbyScene";
import { formatSeasonDate } from "./seasons/seasonResolver";
import { seasonRegistry } from "./seasons/seasonRegistry";
import { outfits, type Outfit } from "./outfits";
import "./styles.css";

const navItems = [
  { label: "Jouer", icon: Gamepad2 }, { label: "Compétitions", icon: Trophy },
  { label: "Carrière", icon: Activity }, { label: "Classement", icon: Crown },
  { label: "Boutique", icon: ShoppingBag }, { label: "Casier", icon: Shield },
  { label: "Profil", icon: UserRound }
];

const CAREER_STORAGE_KEY = "dropzone-career-v1";
const SEASON_DURATION_MS = 24 * 60 * 60 * 1000;
type CareerSave = { startingSeasonIndex: number; startedAt: number };

function readCareerSave(): CareerSave | null {
  try {
    const raw = window.localStorage.getItem(CAREER_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CareerSave;
    if (!Number.isInteger(parsed.startingSeasonIndex) || parsed.startingSeasonIndex < 0 ||
        parsed.startingSeasonIndex >= seasonRegistry.length || !Number.isFinite(parsed.startedAt)) return null;
    return parsed;
  } catch { return null; }
}

function App() {
  const [career, setCareer] = useState<CareerSave | null>(readCareerSave);
  const [selectedStartingSeason, setSelectedStartingSeason] = useState(0);
  const [clock, setClock] = useState(Date.now());
  const [activeNav, setActiveNav] = useState("Jouer");
  const [mode, setMode] = useState("Solo");
  const [ready, setReady] = useState(false);
  const [skinId, setSkinId] = useState("nova");
  const [owned, setOwned] = useState<string[]>(["nova", "mistral"]);
  const [vbucks, setVbucks] = useState(3850);
  const [wardrobeTab, setWardrobeTab] = useState<"shop" | "locker" | null>(null);
  const [notice, setNotice] = useState("");
  const equipped = outfits.find(item => item.id === skinId) ?? outfits[0];
  const [victory, setVictory] = useState(false);
  const [quality, setQuality] = useState<"low" | "medium" | "high">("medium");
  const [mobileMenu, setMobileMenu] = useState(false);
  const [notifications, setNotifications] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [panelMessage, setPanelMessage] = useState("");
  const elapsedSeasons = career ? Math.floor(Math.max(0, clock - career.startedAt) / SEASON_DURATION_MS) : 0;
  const activeSeasonIndex = career
    ? Math.min(seasonRegistry.length - 1, career.startingSeasonIndex + elapsedSeasons)
    : selectedStartingSeason;
  const season = useMemo(() => seasonRegistry[activeSeasonIndex], [activeSeasonIndex]);
  const hoursUntilNextSeason = career && activeSeasonIndex < seasonRegistry.length - 1
    ? Math.max(0, 24 - Math.floor((Math.max(0, clock - career.startedAt) % SEASON_DURATION_MS) / 3_600_000))
    : null;

  // Le temps de carrière continue même lorsque le joueur ferme le jeu.
  useEffect(() => {
    const refreshClock = () => setClock(Date.now());
    const interval = window.setInterval(refreshClock, 15_000);
    window.addEventListener("focus", refreshClock);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshClock);
    };
  }, []);

  const startCareer = () => {
    const save = { startingSeasonIndex: selectedStartingSeason, startedAt: Date.now() };
    window.localStorage.setItem(CAREER_STORAGE_KEY, JSON.stringify(save));
    setCareer(save);
    setClock(Date.now());
  };
  const chooseNav = (label: string) => {
    setActiveNav(label);
    setMobileMenu(false);
    if (label === "Boutique") { setWardrobeTab("shop"); setPanelMessage(""); }
    else if (label === "Casier") { setWardrobeTab("locker"); setPanelMessage(""); }
    else { setWardrobeTab(null); setPanelMessage(label === "Jouer" ? "" : label + " — espace de jeu en cours de construction"); }
  };

  const buyOutfit = (item: Outfit) => { if (owned.includes(item.id)) { setSkinId(item.id); setNotice(item.name+" équipé !"); return; } if(vbucks<item.price){setNotice("Crédits insuffisants.");return;} setVbucks(v=>v-item.price);setOwned(v=>[...v,item.id]);setSkinId(item.id);setNotice(item.name+" ajouté au casier !"); };
  if (!career) {
    return <main style={{minHeight:"100vh",display:"grid",placeItems:"center",padding:24,background:"radial-gradient(ellipse at 50% 15%, #25465b 0%, #101827 48%, #080d16 100%)",color:"#fff",fontFamily:"Inter,system-ui,sans-serif"}}>
      <section style={{width:"min(680px,100%)",padding:"clamp(24px,5vw,48px)",border:"1px solid #ffffff24",borderRadius:24,background:"#101a2beF",boxShadow:"0 24px 90px #0009"}}>
        <div style={{fontSize:12,letterSpacing:3,color:"#8edcff",fontWeight:800}}>DROPZONE · MODE CARRIÈRE</div>
        <h1 style={{fontSize:"clamp(30px,5vw,48px)",lineHeight:1.05,margin:"14px 0 10px",fontWeight:900}}>Crée ton joueur</h1>
        <p style={{color:"#aebdce",lineHeight:1.6,marginBottom:28}}>Choisis l'époque à laquelle ta carrière commence. L'île changera automatiquement à chaque nouvelle journée réelle.</p>
        <label htmlFor="starting-season" style={{display:"block",fontSize:12,fontWeight:800,letterSpacing:1.5,marginBottom:10,color:"#b8c9dc"}}>SAISON DE DÉPART</label>
        <select id="starting-season" value={selectedStartingSeason} onChange={event=>setSelectedStartingSeason(Number(event.target.value))} style={{width:"100%",padding:"16px 14px",borderRadius:12,border:"1px solid #ffffff30",background:"#17263a",color:"#fff",fontSize:16}}>
          {seasonRegistry.map((item,index)=><option key={item.id} value={index}>{item.label} — {item.title}</option>)}
        </select>
        <div style={{marginTop:22,padding:20,borderRadius:16,background:"linear-gradient(120deg,#ffffff12,#ffffff05)",border:"1px solid #ffffff1a"}}>
          <div style={{fontSize:11,letterSpacing:2,color:season.accent,fontWeight:800}}>{season.subtitle}</div>
          <h2 style={{fontSize:25,margin:"8px 0"}}>{season.title}</h2>
          <div style={{color:"#b7c6d8",fontSize:13}}>{season.label} · {season.location}</div>
          <p style={{color:"#aebdce",lineHeight:1.5,marginBottom:0}}>{season.description}</p>
        </div>
        <button onClick={startCareer} style={{width:"100%",marginTop:24,padding:17,border:0,borderRadius:12,background:"linear-gradient(90deg,#26a9e0,#5379f5)",color:"#fff",fontSize:15,fontWeight:900,letterSpacing:1.2,cursor:"pointer"}}>CRÉER MA CARRIÈRE</button>
        <p style={{fontSize:11,color:"#8193a8",textAlign:"center",margin:"14px 0 0"}}>Une saison dure 24 heures réelles · progression sauvegardée sur cet appareil</p>
      </section>
    </main>;
  }

  return <main className="lobby-shell" style={{ "--accent": season.accent, "--sky": season.sky } as React.CSSProperties}>
    <div className="scene-layer"><Suspense fallback={<div className="scene-loading"><span className="loading-orb"/>Chargement de l'île…</div>}><LobbyScene season={season} skin={equipped} victory={victory} quality={quality}/></Suspense></div>
    <div className="scene-vignette"/>
    <header className="lobby-top">
      <button className="game-brand" onClick={() => chooseNav("Jouer")} aria-label="Retour au lobby"><span className="brand-emblem"><Gamepad2 size={22}/></span><span><strong>DROPZONE</strong><small>COMPETITIVE UNIVERSE</small></span></button>
      <nav className="top-navigation">
        {["Jouer","Compétitions","Carrière","Classement"].map((item)=><button key={item} className={activeNav===item?"top-link active":"top-link"} onClick={()=>chooseNav(item)}>{item.toUpperCase()}</button>)}
      </nav>
      <div className="top-right">
        <div className="currency"><span className="coin">D</span><strong>{vbucks.toLocaleString("fr-FR")}</strong><button aria-label="Ouvrir la boutique" onClick={()=>{setWardrobeTab("shop");chooseNav("Boutique");}}>+</button></div>
        <button className="top-icon" aria-label="Notifications" onClick={()=>setNotifications(v=>!v)}><Bell size={19}/><i/></button>
        <button className="top-icon" aria-label="Paramètres" onClick={()=>setSettingsOpen(v=>!v)}><Settings size={19}/></button>
        <button className="player-chip" onClick={()=>chooseNav("Profil")}><span className="player-avatar">P1</span><span><b>PLAYER_01</b><small>NIVEAU 42</small></span><ChevronDown size={14}/></button>
        <button className="mobile-nav-toggle" onClick={()=>setMobileMenu(v=>!v)} aria-label="Menu"><Menu/></button>
      </div>
    </header>
    {mobileMenu&&<nav className="mobile-nav">{navItems.map(({label,icon:Icon})=><button key={label} onClick={()=>chooseNav(label)}><Icon size={17}/>{label}</button>)}</nav>}
    {notifications&&<div className="floating-popover notification-pop"><strong>Centre de notifications</strong><p>Aucune nouvelle notification.</p><button onClick={()=>setNotifications(false)}>Fermer</button></div>}
    {settingsOpen&&<div className="floating-popover settings-pop"><strong>Qualité graphique</strong><p>Adapte le rendu aux performances de ton PC.</p><div className="quality-options">{(["low","medium","high"] as const).map(item=><button key={item} className={quality===item?"selected":""} onClick={()=>setQuality(item)}>{item==="low"?"Faible":item==="medium"?"Moyenne":"Élevée"}</button>)}</div><button className="popover-close" onClick={()=>setSettingsOpen(false)}>Fermer</button></div>}

    <aside className="lobby-sidebar">
      <div className="sidebar-season-label">UNIVERS SAISONNIER</div>
      <div className="season-selector season-current"><span className="season-glyph"><Sparkles size={18}/></span><span><small>SAISON EN COURS</small><strong>{season.label.toUpperCase()}</strong></span><span className="online-dot"/></div>
      <div className="season-story"><span className="eyebrow">SAISON {season.year}</span><h1>{season.title}</h1><p>{season.description}</p><div className="location-line"><Globe2 size={14}/>{season.location}</div></div>
      <div className="side-divider"/>
      <div className="side-section-title">MENU PRINCIPAL</div>
      <nav className="side-nav">{navItems.map(({label,icon:Icon})=><button key={label} className={activeNav===label?"side-link active":"side-link"} onClick={()=>{if(label==="Boutique"||label==="Casier"){setWardrobeTab(label==="Boutique"?"shop":"locker");setPanelMessage("");}else setWardrobeTab(null);chooseNav(label);}}><Icon size={18}/><span>{label}</span>{label==="Compétitions"&&<i className="nav-live-dot"/>}</button>)}</nav>
      <div className="sidebar-footer"><span className="online-dot"/><span>RÉGION EUROPE</span><b>ONLINE</b></div>
    </aside>

    <section className="right-rail">
      <div className="profile-panel"><div className="profile-panel-head"><span>TON PROFIL · DÉMO</span><span className="online-dot"/></div><div className="profile-identity"><div className="large-avatar">P1</div><div><strong>PLAYER_01</strong><small>JOUEUR COMPÉTITIF</small></div></div><div className="level-row"><span>NIVEAU 42</span><b>7 240 / 10 000 XP</b></div><div className="xp-track"><span style={{width:"72.4%"}}/></div><div className="profile-stats"><div><b>12</b><small>VICTOIRES</small></div><div><b>4.8</b><small>K/D</small></div><div><b>68%</b><small>TOP 10</small></div></div></div>
      <div className="rail-card challenges"><div className="rail-heading"><span>DÉFIS DISPONIBLES</span><Zap size={15}/></div><div className="challenge-item"><span className="challenge-icon"><Trophy size={15}/></span><span><b>Objectif quotidien</b><small>Terminer une partie</small><i><em style={{width:"35%"}}/></i></span><strong>1/3</strong></div><div className="challenge-item"><span className="challenge-icon"><Swords size={15}/></span><span><b>Défi compétitif</b><small>Jouer avec ton escouade</small><i><em style={{width:"0%"}}/></i></span><strong>0/5</strong></div></div>
      <div className="rail-card friends-card"><div className="rail-heading"><span>AMIS CONNECTÉS</span><Users size={15}/></div><div className="empty-friends"><Users size={23}/><span>Aucun ami connecté</span><small>Ton escouade t'attend.</small></div></div>
      <div className="season-next season-auto"><span><span className="online-dot"/> ROTATION AUTOMATIQUE</span><strong>{season.subtitle}</strong><small>{hoursUntilNextSeason === null ? "Dernière saison de la chronologie" : "Prochaine saison dans " + hoursUntilNextSeason + " h"}</small></div>
    </section>

    {wardrobeTab && <section className="wardrobe-panel"><div className="wardrobe-head"><div><span className="eyebrow">{wardrobeTab==="shop"?"COLLECTION COSMÉTIQUE":"TON INVENTAIRE"}</span><h2>{wardrobeTab==="shop"?"Boutique des tenues":"Casier"}</h2><p>{wardrobeTab==="shop"?"Découvre des styles originaux pour ton personnage.":"Équipe une tenue que tu possèdes."}</p></div><button className="wardrobe-close" onClick={()=>setWardrobeTab(null)}>×</button></div><div className="wardrobe-tabs"><span>◈ {vbucks.toLocaleString("fr-FR")} crédits</span><small> ACHATS DE DÉMONSTRATION </small></div><div className="outfit-grid">{outfits.filter(item=>wardrobeTab==="shop"||owned.includes(item.id)).map(item=><article className="outfit-card" key={item.id}><div className="outfit-art" style={{"--outfit-a":item.colors[0],"--outfit-b":item.colors[1],"--outfit-c":item.colors[2]} as React.CSSProperties}><div className="mini-character"><i/><b/><em/><span/></div><label>{item.rarity}</label></div><div className="outfit-info"><strong>{item.name}</strong><p>{item.description}</p><button onClick={()=>{if(wardrobeTab==="shop")buyOutfit(item);else if(owned.includes(item.id)){setSkinId(item.id);setNotice(item.name+" équipé !");}}}>{skinId===item.id?"ÉQUIPÉ":owned.includes(item.id)?"ÉQUIPER":item.price.toLocaleString("fr-FR")+" CRÉDITS"}</button></div></article>)}</div><p className="wardrobe-foot">Aucun paiement réel · les crédits sont fictifs et locaux.</p></section>}
    {notice&&<div className="wardrobe-toast">{notice}<button onClick={()=>setNotice("")}>×</button></div>}
    {panelMessage&&<div className="coming-panel"><button className="panel-x" onClick={()=>setPanelMessage("")}>×</button><span className="eyebrow">DROPZONE · APERÇU</span><h2>{panelMessage}</h2><p>Le lobby 3D et le système de saisons sont prioritaires dans cette première étape.</p><button onClick={()=>chooseNav("Jouer")}>Retourner au lobby</button></div>}

    <footer className="lobby-bottom">
      <div className="mode-block"><span className="bottom-kicker">MODE DE JEU</span><div className="mode-options">{["Solo","Duo","Trio","Squad"].map(item=><button key={item} className={mode===item?"mode-selected":""} onClick={()=>{setMode(item);setReady(false);}}>{item}</button>)}</div></div>
      <div className="queue-status"><span className={ready?"status-dot searching":"status-dot"}/><span><b>{ready?"PRÊT POUR LE MATCH":"EN ATTENTE"}</b><small>{ready?`File ${mode} · Aperçu local`:"Choisis ton mode et prépare-toi"}</small></span></div>
      <button className={ready?"ready-button is-ready":"ready-button"} onClick={()=>setReady(v=>!v)}>{ready?<><Check size={20}/> PRÊT</>:<><Zap size={20}/> JOUER</>}</button>
    </footer>
    <div className="character-actions"><button onClick={()=>{setWardrobeTab("locker");setActiveNav("Casier");}}><UserRound size={15}/> OUVRIR LE CASIER</button><button onClick={()=>setVictory(v=>!v)}><Sparkles size={15}/>{victory?"ARRÊTER L'EMOTE":"EMOTE VICTOIRE"}</button></div>
    <div className="lobby-season-stamp"><span>SAISON ACTIVE</span><strong>{season.label}</strong><small>{season.subtitle}</small><div>{formatSeasonDate(season.startsAt)}</div></div>
    <div className="quality-hint"><CircleHelp size={13}/> Rendu 3D temps réel · {quality==="low"?"Faible":quality==="medium"?"Moyen":"Élevé"}</div>
  </main>;
}
export default App;
