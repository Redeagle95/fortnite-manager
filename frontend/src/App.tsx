import { Suspense, useMemo, useState } from "react";
import { Activity, Bell, Check, ChevronDown, ChevronRight, CircleHelp, Crown, Gamepad2, Globe2, Menu, Settings, Shield, ShoppingBag, Sparkles, Swords, Trophy, UserRound, Users, Zap } from "lucide-react";
import LobbyScene from "./LobbyScene";
import { formatSeasonDate, resolveSeason } from "./seasons/seasonResolver";
import { seasonRegistry } from "./seasons/seasonRegistry";
import "./styles.css";

const navItems = [
  { label: "Jouer", icon: Gamepad2 }, { label: "Compétitions", icon: Trophy },
  { label: "Carrière", icon: Activity }, { label: "Classement", icon: Crown },
  { label: "Boutique", icon: ShoppingBag }, { label: "Casier", icon: Shield },
  { label: "Profil", icon: UserRound }
];

function App() {
  const [careerDate, setCareerDate] = useState("2026-06-15");
  const [activeNav, setActiveNav] = useState("Jouer");
  const [mode, setMode] = useState("Solo");
  const [ready, setReady] = useState(false);
  const [skin, setSkin] = useState(0);
  const [victory, setVictory] = useState(false);
  const [quality, setQuality] = useState<"low" | "medium" | "high">("medium");
  const [seasonMenu, setSeasonMenu] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [notifications, setNotifications] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [panelMessage, setPanelMessage] = useState("");
  const season = useMemo(() => resolveSeason(careerDate), [careerDate]);
  const seasonIndex = seasonRegistry.findIndex((item) => item.id === season.id);
  const nextSeason = seasonRegistry[Math.min(seasonIndex + 1, seasonRegistry.length - 1)];

  const selectSeason = (id: string) => {
    const selected = seasonRegistry.find((item) => item.id === id);
    if (selected) setCareerDate(selected.startsAt);
    setSeasonMenu(false);
    setReady(false);
  };
  const moveSeason = (step: -1 | 1) => {
    const target = seasonRegistry[Math.max(0, Math.min(seasonRegistry.length - 1, seasonIndex + step))];
    setCareerDate(target.startsAt);
    setReady(false);
  };
  const chooseNav = (label: string) => {
    setActiveNav(label);
    setMobileMenu(false);
    setPanelMessage(label === "Jouer" ? "" : label + " — espace de jeu en cours de construction");
  };

  return <main className="lobby-shell" style={{ "--accent": season.accent, "--sky": season.sky } as React.CSSProperties}>
    <div className="scene-layer"><Suspense fallback={<div className="scene-loading"><span className="loading-orb"/>Chargement de l'île…</div>}><LobbyScene season={season} skin={skin} victory={victory} quality={quality}/></Suspense></div>
    <div className="scene-vignette"/>
    <header className="lobby-top">
      <button className="game-brand" onClick={() => chooseNav("Jouer")} aria-label="Retour au lobby"><span className="brand-emblem"><Gamepad2 size={22}/></span><span><strong>DROPZONE</strong><small>COMPETITIVE UNIVERSE</small></span></button>
      <nav className="top-navigation">
        {["Jouer","Compétitions","Carrière","Classement"].map((item)=><button key={item} className={activeNav===item?"top-link active":"top-link"} onClick={()=>chooseNav(item)}>{item.toUpperCase()}</button>)}
      </nav>
      <div className="top-right">
        <div className="currency"><span className="coin">V</span><strong>1 250</strong><button aria-label="Ouvrir la boutique" onClick={()=>chooseNav("Boutique")}>+</button></div>
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
      <button className="season-selector" onClick={()=>setSeasonMenu(v=>!v)}><span className="season-glyph"><Sparkles size={18}/></span><span><small>ÈRE SÉLECTIONNÉE</small><strong>{season.year} · {season.environment.toUpperCase()}</strong></span><ChevronDown size={16}/></button>
      {seasonMenu&&<div className="season-dropdown">{seasonRegistry.map(item=><button key={item.id} className={item.id===season.id?"chosen":""} onClick={()=>selectSeason(item.id)}><span className="season-swatch" style={{background:item.accent}}/><span><b>{item.label}</b><small>{item.subtitle}</small></span>{item.id===season.id&&<Check size={15}/>}</button>)}</div>}
      <div className="season-story"><span className="eyebrow">SAISON {season.year}</span><h1>{season.title}</h1><p>{season.description}</p><div className="location-line"><Globe2 size={14}/>{season.location}</div></div>
      <div className="side-divider"/>
      <div className="side-section-title">MENU PRINCIPAL</div>
      <nav className="side-nav">{navItems.map(({label,icon:Icon})=><button key={label} className={activeNav===label?"side-link active":"side-link"} onClick={()=>chooseNav(label)}><Icon size={18}/><span>{label}</span>{label==="Compétitions"&&<i className="nav-live-dot"/>}</button>)}</nav>
      <div className="sidebar-footer"><span className="online-dot"/><span>RÉGION EUROPE</span><b>ONLINE</b></div>
    </aside>

    <section className="right-rail">
      <div className="profile-panel"><div className="profile-panel-head"><span>TON PROFIL · DÉMO</span><span className="online-dot"/></div><div className="profile-identity"><div className="large-avatar">P1</div><div><strong>PLAYER_01</strong><small>JOUEUR COMPÉTITIF</small></div></div><div className="level-row"><span>NIVEAU 42</span><b>7 240 / 10 000 XP</b></div><div className="xp-track"><span style={{width:"72.4%"}}/></div><div className="profile-stats"><div><b>12</b><small>VICTOIRES</small></div><div><b>4.8</b><small>K/D</small></div><div><b>68%</b><small>TOP 10</small></div></div></div>
      <div className="rail-card challenges"><div className="rail-heading"><span>DÉFIS DISPONIBLES</span><Zap size={15}/></div><div className="challenge-item"><span className="challenge-icon"><Trophy size={15}/></span><span><b>Objectif quotidien</b><small>Terminer une partie</small><i><em style={{width:"35%"}}/></i></span><strong>1/3</strong></div><div className="challenge-item"><span className="challenge-icon"><Swords size={15}/></span><span><b>Défi compétitif</b><small>Jouer avec ton escouade</small><i><em style={{width:"0%"}}/></i></span><strong>0/5</strong></div></div>
      <div className="rail-card friends-card"><div className="rail-heading"><span>AMIS CONNECTÉS</span><Users size={15}/></div><div className="empty-friends"><Users size={23}/><span>Aucun ami connecté</span><small>Ton escouade t'attend.</small></div></div>
      <div className="season-next"><span>PROCHAINE ÈRE</span><strong>{nextSeason.year} · {nextSeason.subtitle}</strong><button onClick={()=>moveSeason(1)} disabled={seasonIndex===seasonRegistry.length-1}>Découvrir <ChevronRight size={14}/></button></div>
    </section>

    {panelMessage&&<div className="coming-panel"><button className="panel-x" onClick={()=>setPanelMessage("")}>×</button><span className="eyebrow">DROPZONE · APERÇU</span><h2>{panelMessage}</h2><p>Le lobby 3D et le système de saisons sont prioritaires dans cette première étape.</p><button onClick={()=>chooseNav("Jouer")}>Retourner au lobby</button></div>}

    <footer className="lobby-bottom">
      <div className="mode-block"><span className="bottom-kicker">MODE DE JEU</span><div className="mode-options">{["Solo","Duo","Trio","Squad"].map(item=><button key={item} className={mode===item?"mode-selected":""} onClick={()=>{setMode(item);setReady(false);}}>{item}</button>)}</div></div>
      <div className="queue-status"><span className={ready?"status-dot searching":"status-dot"}/><span><b>{ready?"PRÊT POUR LE MATCH":"EN ATTENTE"}</b><small>{ready?`File ${mode} · Aperçu local`:"Choisis ton mode et prépare-toi"}</small></span></div>
      <button className={ready?"ready-button is-ready":"ready-button"} onClick={()=>setReady(v=>!v)}>{ready?<><Check size={20}/> PRÊT</>:<><Zap size={20}/> JOUER</>}</button>
    </footer>
    <div className="character-actions"><button onClick={()=>{setSkin(v=>(v+1)%4);setVictory(false);}}><UserRound size={15}/> CHANGER DE TENUE</button><button onClick={()=>setVictory(v=>!v)}><Sparkles size={15}/>{victory?"ARRÊTER L'EMOTE":"EMOTE VICTOIRE"}</button></div>
    <div className="lobby-season-stamp"><span>SAISON ACTIVE</span><strong>{season.year}</strong><small>{season.subtitle}</small><div>{formatSeasonDate(season.startsAt)}</div></div>
    <div className="quality-hint"><CircleHelp size={13}/> Rendu 3D temps réel · {quality==="low"?"Faible":quality==="medium"?"Moyen":"Élevé"}</div>
  </main>;
}
export default App;
