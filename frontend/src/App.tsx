import { useMemo, useState } from "react";
import {
  Activity, ArrowDownRight, ArrowRight, Bell, CalendarDays, ChevronDown,
  ChevronLeft, ChevronRight, CircleHelp, Crown, Gamepad2, Globe2, LayoutDashboard,
  Menu, Search, Settings, Shield, ShoppingBag, Swords, Trophy, Users, Wallet
} from "lucide-react";
import { resolveSeason, formatSeasonDate } from "./seasons/seasonResolver";
import { seasonRegistry } from "./seasons/seasonRegistry";

const navigation = [
  { label: "Vue d'ensemble", icon: LayoutDashboard, active: true },
  { label: "Mon organisation", icon: Shield },
  { label: "Effectif", icon: Users },
  { label: "Compétitions", icon: Trophy },
  { label: "Marché des joueurs", icon: ShoppingBag },
];

function App() {
  const [careerDate, setCareerDate] = useState("2019-03-28");
  const [activeNav, setActiveNav] = useState("Vue d'ensemble");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const activeSeason = useMemo(() => resolveSeason(careerDate), [careerDate]);
  const seasonIndex = seasonRegistry.findIndex((season) => season.id === activeSeason.id);
  const nextSeason = seasonRegistry[Math.min(seasonIndex + 1, seasonRegistry.length - 1)];

  const moveSeason = (direction: -1 | 1) => {
    const target = seasonRegistry[Math.max(0, Math.min(seasonRegistry.length - 1, seasonIndex + direction))];
    setCareerDate(target.startsAt);
  };

  return (
    <main className="app-shell" style={{ "--season-accent": activeSeason.accent, "--season-accent-soft": activeSeason.accentSoft } as React.CSSProperties}>
      <aside className={`sidebar ${sidebarOpen ? "sidebar--open" : ""}`}>
        <div className="brand">
          <div className="brand-mark"><Gamepad2 size={22} strokeWidth={2.5} /></div>
          <div><strong>FORTNITE<span>MANAGER</span></strong><small>BUILD YOUR LEGACY</small></div>
          <button className="mobile-close icon-button" onClick={() => setSidebarOpen(false)} aria-label="Fermer le menu">×</button>
        </div>

        <div className="career-label">CARRIÈRE EN COURS</div>
        <div className="career-card">
          <div className="career-avatar"><Crown size={19} /></div>
          <div className="career-copy"><strong>Nouvelle carrière</strong><span>Europe · Solo</span></div>
          <ChevronDown size={16} className="muted-icon" />
        </div>

        <div className="nav-label">MENU PRINCIPAL</div>
        <nav className="main-nav">
          {navigation.map(({ label, icon: Icon }) => (
            <button key={label} className={`nav-item ${activeNav === label ? "nav-item--active" : ""}`} onClick={() => { setActiveNav(label); setSidebarOpen(false); }}>
              <Icon size={18} /><span>{label}</span>{label === "Compétitions" && <i className="nav-dot" />}
            </button>
          ))}
        </nav>

        <div className="nav-label tools-label">GESTION</div>
        <nav className="main-nav">
          <button className="nav-item" onClick={() => setActiveNav("Finances")}><Wallet size={18}/><span>Finances</span></button>
          <button className="nav-item" onClick={() => setActiveNav("Analyses")}><Activity size={18}/><span>Analyses</span></button>
          <button className="nav-item" onClick={() => setActiveNav("Paramètres")}><Settings size={18}/><span>Paramètres</span></button>
        </nav>

        <div className="sidebar-bottom">
          <div className="season-mini">
            <div className="season-mini-top"><span>SAISON ACTUELLE</span><span className="live-dot" /> </div>
            <strong>{activeSeason.subtitle}</strong>
            <small>{activeSeason.name}</small>
            <div className="season-progress"><span style={{ width: "38%" }} /></div>
            <div className="season-mini-foot"><span>Progression de carrière</span><b>38%</b></div>
          </div>
          <button className="profile-row"><div className="profile-pic">FM</div><div><strong>Manager</strong><small>Directeur général</small></div><ChevronDown size={16}/></button>
        </div>
      </aside>

      {sidebarOpen && <button className="sidebar-scrim" aria-label="Fermer le menu" onClick={() => setSidebarOpen(false)} />}

      <section className="main-area">
        <header className="topbar">
          <div className="topbar-left">
            <button className="mobile-menu icon-button" onClick={() => setSidebarOpen(true)} aria-label="Ouvrir le menu"><Menu size={20}/></button>
            <div className="breadcrumb">CARRIÈRE <ChevronRight size={13}/> <span>{activeNav.toUpperCase()}</span></div>
          </div>
          <div className="topbar-actions">
            <div className="date-chip"><CalendarDays size={15}/><span>{formatSeasonDate(careerDate)}</span></div>
            <button className="icon-button notification-button" aria-label="Notifications"><Bell size={18}/><i /></button>
            <div className="top-avatar">FM</div>
          </div>
        </header>

        <div className="content">
          <div className="welcome-row">
            <div><div className="eyebrow"><span className="eyebrow-line"/> SAISON {activeSeason.chapter}.{activeSeason.season}</div><h1>Bienvenue, Manager.</h1><p>Chaque légende commence quelque part. Écris la tienne.</p></div>
            <button className="outline-button" onClick={() => setActiveNav("Mon organisation")}><Shield size={16}/> Gérer mon organisation</button>
          </div>

          <section className="season-hero" key={activeSeason.id}>
            <div className="hero-art">
              <div className="hero-orbit hero-orbit-one"/><div className="hero-orbit hero-orbit-two"/>
              <div className="hero-sun"/>
              <div className="hero-mountain mountain-back"/><div className="hero-mountain mountain-front"/>
              <div className="hero-grid"/>
              <div className="hero-art-caption"><span className="caption-line"/> {activeSeason.location.toUpperCase()}</div>
              <div className="hero-season-stamp"><span>CHAPITRE</span><strong>{String(activeSeason.chapter).padStart(2, "0")}</strong><small>SAISON {activeSeason.season}</small></div>
            </div>
            <div className="hero-copy">
              <div className="hero-tag"><span className="live-dot"/> {activeSeason.badge}</div>
              <div className="hero-kicker">{activeSeason.subtitle}</div>
              <h2>{activeSeason.headline}</h2>
              <p>{activeSeason.description}</p>
              <div className="hero-meta"><span><Globe2 size={14}/>{activeSeason.atmosphere}</span><span><CalendarDays size={14}/>{formatSeasonDate(activeSeason.startsAt)}</span></div>
              <button className="primary-button" onClick={() => setActiveNav("Compétitions")}>Découvrir la saison <ArrowRight size={17}/></button>
            </div>
            <div className="hero-index">0{seasonIndex + 1}<span> / 0{seasonRegistry.length}</span></div>
          </section>

          <div className="section-heading"><div><div className="section-kicker">TON UNIVERS COMPÉTITIF</div><h3>Le tableau de bord</h3></div><button className="text-button" onClick={() => setActiveNav("Analyses")}>Voir les analyses <ArrowRight size={15}/></button></div>

          <section className="dashboard-grid">
            <article className="stat-card organization-card"><div className="stat-top"><span>ORGANISATION</span><Shield size={17}/></div><div className="stat-main"><strong>—</strong><span>À créer</span></div><div className="stat-foot">Construis ton équipe et ton identité <ArrowRight size={14}/></div></article>
            <article className="stat-card"><div className="stat-top"><span>JOUEURS</span><Users size={17}/></div><div className="stat-main"><strong>0</strong><span>dans l'effectif</span></div><div className="stat-foot">Ton recrutement commence ici <ArrowRight size={14}/></div></article>
            <article className="stat-card"><div className="stat-top"><span>PALMARÈS</span><Trophy size={17}/></div><div className="stat-main"><strong>0</strong><span>titres remportés</span></div><div className="stat-foot">Le premier reste à écrire <ArrowRight size={14}/></div></article>
            <article className="stat-card"><div className="stat-top"><span>RÉPUTATION</span><Activity size={17}/></div><div className="stat-main"><strong>—</strong><span>Nouvelle structure</span></div><div className="stat-foot">Fais-toi une place sur la scène <ArrowRight size={14}/></div></article>
          </section>

          <section className="lower-grid">
            <article className="panel timeline-panel">
              <div className="panel-heading"><div><div className="section-kicker">LE TEMPS PASSE</div><h3>Voyage entre les saisons</h3></div><span className="history-pill"><span className="live-dot"/> CHRONOLOGIE</span></div>
              <p className="panel-description">La direction artistique suit automatiquement la date de ta carrière.</p>
              <div className="season-switcher">
                <button className="round-arrow" onClick={() => moveSeason(-1)} disabled={seasonIndex === 0} aria-label="Saison précédente"><ChevronLeft size={18}/></button>
                <div className="current-season"><span>SAISON SÉLECTIONNÉE</span><strong>{activeSeason.subtitle}</strong><small>{activeSeason.name}</small></div>
                <button className="round-arrow" onClick={() => moveSeason(1)} disabled={seasonIndex === seasonRegistry.length - 1} aria-label="Saison suivante"><ChevronRight size={18}/></button>
              </div>
              <label className="date-label" htmlFor="career-date">Date de la carrière</label>
              <input id="career-date" className="date-input" type="date" value={careerDate} min="2019-02-28" max="2020-02-19" onChange={(event) => setCareerDate(event.target.value)}/>
              <div className="timeline-track"><span className="timeline-fill" style={{ width: `${((seasonIndex + 1) / seasonRegistry.length) * 100}%` }}/>{seasonRegistry.map((season, index) => <button key={season.id} className={`timeline-point ${index <= seasonIndex ? "timeline-point--passed" : ""} ${index === seasonIndex ? "timeline-point--current" : ""}`} style={{ left: `${(index / (seasonRegistry.length - 1)) * 100}%` }} onClick={() => setCareerDate(season.startsAt)} title={season.subtitle}/>)}</div>
              <div className="timeline-labels"><span>FÉV. 2019</span><span>OCT. 2019</span></div>
            </article>
            <article className="panel next-panel"><div className="next-top"><div className="section-kicker">PROCHAINE ÈRE</div><ArrowDownRight size={18}/></div><div className="next-season-art"><div className="next-glow"/><span>À VENIR</span><strong>{nextSeason.subtitle}</strong></div><div className="next-copy"><h3>{nextSeason.name}</h3><p>{nextSeason.description}</p><button className="text-button" onClick={() => setCareerDate(nextSeason.startsAt)}>Passer à cette saison <ArrowRight size={15}/></button></div></article>
          </section>

          <footer className="footer-note"><CircleHelp size={14}/> Aperçu frontend — données de carrière et calendrier historique complets à connecter au moteur du jeu.</footer>
        </div>
      </section>
    </main>
  );
}

export default App;