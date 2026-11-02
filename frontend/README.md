# Fortnite Manager — frontend

Frontend React isolé du serveur et du moteur partagé.

## Démarrage

```bash
cd frontend
npm install
npm run dev
```

Vite démarre sur http://localhost:5173.

## Architecture saisonnière

- `src/seasons/seasonRegistry.ts` : catalogue des thèmes saisonniers.
- `src/seasons/seasonResolver.ts` : sélection automatique du thème selon la date de carrière.
- `src/App.tsx` : premier tableau de bord React.
- `src/styles.css` : interface responsive et variables visuelles saisonnières.

Le catalogue fourni est un jeu de données de démonstration limité à quelques saisons historiques. Il ne prétend pas encore couvrir toutes les saisons 2019–2026. Les dates et métadonnées devront être complétées et vérifiées avant de brancher le calendrier au moteur de carrière.

Les illustrations actuelles sont générées en CSS afin de ne pas intégrer de visuels Fortnite non validés. Les emplacements pourront recevoir les illustrations officielles/licenciées ou des créations originales adaptées à chaque saison.

Ce frontend n'altère pas les dossiers `server/` et `shared/` ni le `package.json` racine.
