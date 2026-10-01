# Coup d'envoi

PWA Next.js qui liste les prochains matchs de foot (heure de Paris, stade, ville, chaîne TV en France),
pensée pour s'installer sur l'écran d'accueil d'un iPhone. 100 % gratuite.

## Organisation du code

```
src/
  config/            ← ce que tu modifieras le plus souvent
    diffuseurs.ts      chaînes TV par compétition + surcharges par match
    competitions.ts    compétitions affichées, couleurs, fenêtre de jours
    lieux.ts           villes des stades (complète football-data.org)
  lib/
    providers/         récupération des données (une source = un fichier)
      football-data.ts   clubs
      api-football.ts    sélections
    matches.ts         cache + assemblage (logique métier)
    dates.ts           regroupement par jour, fuseau Europe/Paris
    nations.ts         noms français des sélections
  app/
    api/matches        route lue par l'app (les clés restent côté serveur)
    api/cron           mise à jour quotidienne automatique
    clubs, selections  les deux onglets
  components/          interface (cartes, onglets, tirer pour actualiser…)
public/
  sw.js                mode hors ligne
  manifest.webmanifest, icônes, splash/   installation iPhone
```

## Variables d'environnement (Vercel → Settings → Environment Variables)

| Nom | Où l'obtenir |
| --- | --- |
| `FOOTBALL_DATA_TOKEN` | football-data.org/client/register (mail) |
| `API_FOOTBALL_KEY` | dashboard.api-football.com → Account → My Access |
| `CRON_SECRET` | une longue chaîne au hasard de ton choix |

## Tester sur ton Mac (facultatif)

```
npm install
cp .env.example .env.local   # puis remplis les clés
npm run dev                   # http://localhost:3000
```

## Modifier une chaîne pour un match précis

1. Ouvre `https://TON-APP.vercel.app/api/matches?section=clubs` et repère l'`id` du match (ex. `fd-537812`).
2. Dans `src/config/diffuseurs.ts`, ajoute dans `MATCH_OVERRIDES` : `"fd-537812": ["canal", "m6"],`
3. Enregistre sur GitHub : Vercel redéploie seul en une minute.
