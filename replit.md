# ASTRAL-BOT — Astral Technologie

## Overview

Système complet de bot Discord + panel de contrôle web pour Astral Technologie. Style science-fiction cyberpunk (Orbitron + Rajdhani, cyan électrique #00F0FF, magenta accent, fond deep space).

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
- **Auth**: Discord OAuth2 (express-session)

## Structure

```text
artifacts-monorepo/
├── artifacts/
│   ├── api-server/          # Express API + Discord Bot
│   │   └── src/
│   │       ├── bot/         # Discord.js bot
│   │       │   ├── commands/ # Toutes les commandes slash
│   │       │   ├── events/   # Handlers d'événements
│   │       │   └── lib/      # Utilitaires DB + addLog (envoie aussi sur Discord)
│   │       └── routes/       # API REST routes
│   │           ├── auth.ts   # OAuth2 Discord (/api/auth/discord, /callback, /me, /logout)
│   │           ├── bot.ts    # Statut bot + guilds filtrées par session user
│   │           └── guilds.ts # Actions par serveur
│   └── astral-panel/        # Panel React sci-fi
└── lib/
    ├── api-spec/            # OpenAPI spec + Orval codegen config
    ├── api-client-react/    # Generated React Query hooks
    ├── api-zod/             # Generated Zod schemas
    └── db/                  # Drizzle ORM schema + DB connection
        └── src/schema/
            ├── guildConfigs.ts
            ├── warns.ts
            ├── bannedWords.ts
            ├── giveaways.ts
            ├── surveys.ts
            └── logs.ts
```

## Authentification Discord OAuth2

### Flow
1. L'utilisateur clique "Se connecter avec Discord"
2. Redirigé vers `/api/auth/discord` → Discord OAuth2
3. Discord redirige vers `/api/auth/callback` avec le code
4. Le serveur échange le code, récupère les guilds de l'utilisateur
5. Session stockée côté serveur, cookie sécurisé
6. Seuls les serveurs où l'utilisateur est **Administrateur** ET où le bot est présent s'affichent

### Configuration requise (Discord Developer Portal)
- Aller sur https://discord.com/developers/applications
- Sélectionner l'application du bot
- Aller dans **OAuth2** → **Redirects**
- Ajouter : `https://VOTRE_DOMAINE/api/auth/callback`

## Bot Discord — Commandes

### ⚡ Modération
- `/kick` `/ban` `/unban` `/mute` `/unmute` `/clear`
- `/warn` `/warns` `/unwarn` `/massban`

### 🚨 Sécurité
- `/breach` — Confinement total du serveur
- `/unbreach` — Lever le confinement
- `/nuke` — Détruire et recréer un canal
- `/antiraid` `/automod` `/addword` `/removeword` `/bannedwords`

### 🔧 Système
- `/maintenance` `/maintenance_off`
- `/setlogchannel` — Définir le canal de logs Discord

### 📢 Messagerie
- `/say` `/embed` `/announce` `/dm`

### 🎉 Giveaway
- `/giveaway create` `/giveaway list` `/giveaway_end`

### 📋 Questionnaire
- `/survey create` `/survey list`

### ℹ️ Info & Aide
- `/serverinfo` `/userinfo`
- `/help` — Centre de commandement (liste toutes les commandes)

### 🤖 Chat IA
- `/chat` — Dialoguer avec l'IA ASTRAL-BOT

## Système de logs

Les logs sont enregistrés en base de données ET envoyés automatiquement dans le canal Discord configuré via `/setlogchannel`.

Actions loggées : KICK, BAN, UNBAN, MUTE, UNMUTE, WARN, CLEAR, NUKE, MASSBAN, BREACH_ON/OFF, MAINTENANCE_ON/OFF, AUTOMOD_DELETE, MEMBER_JOIN/LEAVE.

## Panel Web (astral-panel)

- Connexion via compte Discord (OAuth2) — pas de mot de passe
- Dashboard : statut bot + liste des serveurs où l'utilisateur est admin
- Page serveur avec tabs : overview, config, modération, sécurité, messagerie, giveaways, questionnaires, règles, logs
- Toutes les actions peuvent être déclenchées depuis le panel

## Architecture DB (par serveur)

- `guild_configs` — Configuration unique par serveur
- `warns` — Avertissements par serveur/utilisateur
- `banned_words` — Mots bannis par serveur
- `giveaways` — Giveaways par serveur
- `surveys` + `survey_responses` — Questionnaires et réponses
- `logs` — Historique des actions (envoyé aussi sur Discord)

## Secrets nécessaires

- `DISCORD_TOKEN` — Token du bot
- `DISCORD_CLIENT_ID` — ID de l'application Discord
- `DISCORD_CLIENT_SECRET` — Secret OAuth2 de l'application Discord
- `SESSION_SECRET` — Secret pour les sessions Express
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
