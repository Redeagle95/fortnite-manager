# Dropzone — lobby 3D saisonnier

Frontend React + TypeScript + Vite avec scène 3D temps réel (Three.js / React Three Fiber).

## Démarrage

```bash
cd frontend
npm install
npm run dev
```

Vite démarre sur http://localhost:5173.

## Lobby 3D

- `src/LobbyScene.tsx` : île procédurale 3D, avatar original stylisé, éclairage, nuages, particules et caméra orbitale.
- `src/App.tsx` : interface de lobby, navigation, profil de démonstration, modes de jeu, sélection de tenue, emote et réglages graphiques.
- `src/styles.css` : interface plein écran et responsive.
- `src/seasons/seasonRegistry.ts` : huit directions artistiques annuelles 2019–2026.
- `src/seasons/seasonResolver.ts` : choix de l'ère selon la date de carrière.

## Saisons et propriété intellectuelle

Les huit environnements sont des interprétations originales d'ambiances générales par période. Ils ne contiennent pas de modèles, personnages, cartes ou textures propriétaires de Fortnite. Le calendrier présenté est un sélecteur d'ères visuelles annuelles, pas une base exhaustive des dates officielles de chaque saison.

## Limites du prototype

Le personnage est un modèle procédural temporaire et stylisé, pas un skin Fortnite. Les statistiques, V-Bucks et le statut « prêt » sont des données locales de démonstration : aucun matchmaking, compte joueur, monnaie réelle ou boutique transactionnelle n'est connecté. Les options graphiques adaptent le nombre de particules, les ombres et le ratio de rendu.

Le frontend reste isolé du serveur et du moteur partagé du dépôt.
