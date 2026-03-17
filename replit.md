# ASTRAL-BOT — Astral Technologie

## Overview

Système complet de bot Discord + panel de contrôle web pour Astral Technologie. Style science-fiction cyberpunk.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Bot**: discord.js v14
- **Frontend**: React + Vite (framer-motion, recharts, date-fns)

## Structure

```text
artifacts-monorepo/
├── artifacts/
│   ├── api-server/          # Express API + Discord Bot
│   │   └── src/
│   │       ├── bot/         # Discord.js bot
│   │       │   ├── commands/ # Toutes les commandes slash
│   │       │   ├── events/   # Handlers d'événements
│   │       │   └── lib/      # Utilitaires DB
│   │       └── routes/       # API REST routes
│   └── astral-panel/        # Panel React sci-fi
├── lib/
│   ├── api-spec/            # OpenAPI spec + Orval codegen config
│   ├── api-client-react/    # Generated React Query hooks
│   ├── api-zod/             # Generated Zod schemas
│   └── db/                  # Drizzle ORM schema + DB connection
│       └── src/schema/
│           ├── guildConfigs.ts
│           ├── warns.ts
│           ├── bannedWords.ts
│           ├── giveaways.ts
│           ├── surveys.ts
│           └── logs.ts
└── lib/api-spec/openapi.yaml  # Source de vérité API
```

## Bot Discord — Commandes

### 🔨 Modération
- `/kick` `/ban` `/unban` `/mute` `/unmute` `/clear`
- `/warn` `/warns` `/unwarn` `/massban`

### 🚨 Sécurité
- `/breach` — Confiner le serveur (brèche)
- `/unbreach` — Sortir de brèche
- `/nuke` — Détruire et recréer un canal
- `/antiraid` `/automod` `/addword` `/removeword` `/bannedwords`

### 🔧 Système
- `/maintenance` `/maintenance_off`
- `/setlogchannel`

### 📢 Messagerie
- `/say` `/embed` `/announce` `/dm`

### 🎉 Giveaway
- `/giveaway create` — Créer avec timer auto
- `/giveaway list` `/giveaway_end`

### 📝 Questionnaire
- `/survey create` — Questions séparées par |, canal réponses configurable
- `/survey list`

### ℹ️ Info
- `/serverinfo` `/userinfo` `/commands`

### 🤖 Chat
- `/chat` — Parler avec l'IA ASTRAL-BOT

## Panel Web (astral-panel)

- Dashboard: statut bot, liste des serveurs
- Page serveur avec tabs: overview, config, modération, sécurité, messagerie, giveaways, questionnaires, logs
- Toutes les actions peuvent être déclenchées depuis le panel
- Configuration par serveur (isolé, non partagé entre serveurs)

## Architecture DB (par serveur)

- `guild_configs` — Configuration unique par serveur
- `warns` — Avertissements par serveur/utilisateur
- `banned_words` — Mots bannis par serveur
- `giveaways` — Giveaways par serveur
- `surveys` + `survey_responses` — Questionnaires et réponses
- `logs` — Historique des actions

## Secrets nécessaires

- `DISCORD_TOKEN` — Token du bot
- `DISCORD_CLIENT_ID` — ID de l'application Discord
- `DATABASE_URL` — Fourni automatiquement par Replit

## Développement

```bash
# Démarrer le serveur API + bot
pnpm --filter @workspace/api-server run dev

# Démarrer le panel web
pnpm --filter @workspace/astral-panel run dev

# Mettre à jour le schéma DB
pnpm --filter @workspace/db run push

# Régénérer les hooks API
pnpm --filter @workspace/api-spec run codegen
```
