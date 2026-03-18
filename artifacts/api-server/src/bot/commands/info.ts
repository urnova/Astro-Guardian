import {
  SlashCommandBuilder,
  EmbedBuilder,
  ChatInputCommandInteraction,
  GuildMember,
  PermissionFlagsBits,
} from "discord.js";
import { db } from "@workspace/db";
import { warnsTable, bannedWordsTable, giveawaysTable, surveysTable, logsTable } from "@workspace/db";
import { eq, count } from "drizzle-orm";

const ASTRAL_COLOR = 0x00f0ff;
const FOOTER = "⬡ ASTRAL TECHNOLOGIE — NEXUS v2.0";

export const serverinfoCommand = {
  data: new SlashCommandBuilder()
    .setName("serverinfo")
    .setDescription("📡 Scanner et analyser les données du serveur"),
  async execute(interaction: ChatInputCommandInteraction) {
    const guild = interaction.guild!;
    await guild.members.fetch().catch(() => {});

    const textChannels = guild.channels.cache.filter((c) => c.type === 0).size;
    const voiceChannels = guild.channels.cache.filter((c) => c.type === 2).size;
    const botCount = guild.members.cache.filter((m) => m.user.bot).size;
    const humanCount = guild.memberCount - botCount;

    const embed = new EmbedBuilder()
      .setTitle(`⬡ SCAN SERVEUR — ${guild.name.toUpperCase()}`)
      .setThumbnail(guild.iconURL({ size: 256 }))
      .setColor(ASTRAL_COLOR)
      .setDescription(
        `\`\`\`css\n[ANALYSE COMPLÈTE DU NŒUD : ${guild.id}]\n[STATUT : OPÉRATIONNEL]\n\`\`\``
      )
      .addFields(
        {
          name: "👥 POPULATION",
          value: `\`\`\`yaml\nHumains : ${humanCount}\nBots    : ${botCount}\nTotal   : ${guild.memberCount}\`\`\``,
          inline: true,
        },
        {
          name: "📡 INFRASTRUCTURE",
          value: `\`\`\`yaml\nTexte : ${textChannels}\nVoix  : ${voiceChannels}\nRôles : ${guild.roles.cache.size}\`\`\``,
          inline: true,
        },
        {
          name: "🚀 STATUT BOOST",
          value: `\`\`\`fix\nNiveau ${guild.premiumTier} — ${guild.premiumSubscriptionCount ?? 0} boost(s) actif(s)\`\`\``,
          inline: false,
        },
        {
          name: "📅 CRÉATION DU NŒUD",
          value: `<t:${Math.floor(guild.createdAt.getTime() / 1000)}:F>`,
          inline: true,
        },
        {
          name: "👑 PROPRIÉTAIRE",
          value: `<@${guild.ownerId}>`,
          inline: true,
        },
        {
          name: "🔒 NIVEAU DE VÉRIFICATION",
          value: `\`NIVEAU ${guild.verificationLevel}\``,
          inline: true,
        },
      )
      .setFooter({ text: FOOTER })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};

export const userinfoCommand = {
  data: new SlashCommandBuilder()
    .setName("userinfo")
    .setDescription("🔍 Scanner le profil d'un utilisateur")
    .addUserOption((o) =>
      o.setName("membre").setDescription("La cible à analyser (optionnel)").setRequired(false)
    ),
  async execute(interaction: ChatInputCommandInteraction) {
    const member = (interaction.options.getMember("membre") ?? interaction.member) as GuildMember;
    const user = member.user;

    const joinedTimestamp = member.joinedAt
      ? `<t:${Math.floor(member.joinedAt.getTime() / 1000)}:R>`
      : "Inconnu";

    const roles = member.roles.cache
      .filter((r) => r.id !== interaction.guildId)
      .sort((a, b) => b.position - a.position)
      .first(5)
      .map((r) => r.toString())
      .join(" ") || "Aucun";

    const embed = new EmbedBuilder()
      .setTitle(`🔍 ANALYSE AGENT — ${user.username.toUpperCase()}`)
      .setThumbnail(user.displayAvatarURL({ size: 256 }))
      .setColor(member.displayColor || ASTRAL_COLOR)
      .setDescription(
        `\`\`\`css\n[RAPPORT DE SCAN : ${user.id}]\n[STATUT : ${user.bot ? "BOT ENREGISTRÉ" : "AGENT HUMAIN"}]\n\`\`\``
      )
      .addFields(
        {
          name: "🆔 IDENTIFIANT",
          value: `\`\`\`fix\n${user.id}\`\`\``,
          inline: true,
        },
        {
          name: "🏷️ NOM D'AFFICHAGE",
          value: `\`${member.displayName}\``,
          inline: true,
        },
        {
          name: "📅 CRÉATION DU COMPTE",
          value: `<t:${Math.floor(user.createdAt.getTime() / 1000)}:R>`,
          inline: true,
        },
        {
          name: "📥 ARRIVÉE SUR LE NŒUD",
          value: joinedTimestamp,
          inline: true,
        },
        {
          name: "🎭 RANG PRINCIPAL",
          value: member.roles.highest.toString(),
          inline: true,
        },
        {
          name: "🎖️ ACCRÉDITATIONS (Top 5)",
          value: roles,
          inline: false,
        },
      )
      .setFooter({ text: FOOTER })
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};

export const helpCommand = {
  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription("⬡ Centre de commandes ASTRAL — Accès interactif"),
  async execute(interaction: ChatInputCommandInteraction) {
    const isAdmin = (interaction.member as GuildMember).permissions.has(
      PermissionFlagsBits.Administrator
    );

    const embed = new EmbedBuilder()
      .setTitle("⬡ ASTRAL-BOT — CENTRE DE COMMANDEMENT")
      .setColor(ASTRAL_COLOR)
      .setDescription(
        `\`\`\`ansi\n\u001b[1;36m╔══════════════════════════════════════╗\n║   NEXUS OPÉRATIONNEL — v2.0          ║\n║   ${isAdmin ? "ACCÈS : ADMINISTRATEUR" : "ACCÈS : UTILISATEUR"}${isAdmin ? "  " : "      "}║\n╚══════════════════════════════════════╝\u001b[0m\`\`\``
      );

    if (isAdmin) {
      embed.addFields(
        {
          name: "⚡ PROTOCOLE MODÉRATION",
          value:
            "`/kick` `/ban` `/unban` `/mute` `/unmute` `/clear` `/warn` `/warns` `/unwarn` `/massban`",
          inline: false,
        },
        {
          name: "🚨 PROTOCOLE SÉCURITÉ",
          value:
            "`/breach` `/unbreach` `/nuke` `/antiraid` `/automod` `/addword` `/removeword` `/bannedwords`",
          inline: false,
        },
        {
          name: "🔧 PROTOCOLE SYSTÈME",
          value: "`/maintenance` `/maintenance_off` `/setlogchannel`",
          inline: false,
        },
        {
          name: "📢 PROTOCOLE MESSAGERIE",
          value: "`/say` `/embed` `/announce` `/dm`",
          inline: false,
        },
        {
          name: "🎉 PROTOCOLE GIVEAWAY",
          value: "`/giveaway create` `/giveaway list` `/giveaway_end`",
          inline: false,
        },
        {
          name: "📋 PROTOCOLE QUESTIONNAIRE",
          value: "`/survey create` `/survey list`",
          inline: false,
        },
        {
          name: "📜 RÈGLEMENT",
          value: "`/rules` — Envoyer le règlement du serveur",
          inline: false,
        },
        {
          name: "🔗 PANEL & STATISTIQUES",
          value: "`/panel` — Lien du panneau de contrôle\n`/stats` — Statistiques du serveur",
          inline: false,
        }
      );
    }

    embed.addFields(
      {
        name: "📡 INTEL & RECONNAISSANCE",
        value: "`/serverinfo` `/userinfo` `/help`",
        inline: false,
      },
      {
        name: "🤖 INTERFACE IA",
        value: "`/chat` — Dialoguer avec l'intelligence ASTRAL",
        inline: false,
      }
    );

    embed
      .setFooter({ text: `${FOOTER} | Panel : Accès via le panneau web` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};

export const statsCommand = {
  data: new SlashCommandBuilder()
    .setName("stats")
    .setDescription("📊 Afficher les statistiques complètes du serveur"),
  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();
    const guildId = interaction.guildId!;
    const guild = interaction.guild!;
    await guild.members.fetch().catch(() => {});

    const [[warnRes], [wordRes], [giveRes], [survRes], [logRes]] = await Promise.all([
      db.select({ c: count() }).from(warnsTable).where(eq(warnsTable.guildId, guildId)),
      db.select({ c: count() }).from(bannedWordsTable).where(eq(bannedWordsTable.guildId, guildId)),
      db.select({ c: count() }).from(giveawaysTable).where(eq(giveawaysTable.guildId, guildId)),
      db.select({ c: count() }).from(surveysTable).where(eq(surveysTable.guildId, guildId)),
      db.select({ c: count() }).from(logsTable).where(eq(logsTable.guildId, guildId)),
    ]);

    const bots = guild.members.cache.filter(m => m.user.bot).size;
    const humans = guild.memberCount - bots;

    const embed = new EmbedBuilder()
      .setTitle(`📊 STATISTIQUES — ${guild.name.toUpperCase()}`)
      .setThumbnail(guild.iconURL({ size: 256 }))
      .setColor(ASTRAL_COLOR)
      .setDescription(`\`\`\`css\n[RAPPORT STATISTIQUE COMPLET]\n[ID : ${guildId}]\n\`\`\``)
      .addFields(
        {
          name: "👥 MEMBRES",
          value: `\`\`\`yaml\nHumains : ${humans}\nBots    : ${bots}\nTotal   : ${guild.memberCount}\`\`\``,
          inline: true,
        },
        {
          name: "📡 INFRASTRUCTURE",
          value: `\`\`\`yaml\nSalons : ${guild.channels.cache.size}\nRôles  : ${guild.roles.cache.size}\nBoosts : ${guild.premiumSubscriptionCount ?? 0}\`\`\``,
          inline: true,
        },
        {
          name: "⚠️ MODÉRATION",
          value: `\`\`\`yaml\nAvertissements : ${warnRes.c}\nMots bannis    : ${wordRes.c}\`\`\``,
          inline: true,
        },
        {
          name: "🎉 ACTIVITÉS",
          value: `\`\`\`yaml\nGiveaways      : ${giveRes.c}\nQuestionnaires : ${survRes.c}\`\`\``,
          inline: true,
        },
        {
          name: "📋 JOURNAL",
          value: `\`\`\`yaml\nÉvénements loggés : ${logRes.c}\`\`\``,
          inline: true,
        },
        {
          name: "🚀 BOOST",
          value: `\`\`\`fix\nNiveau ${guild.premiumTier} — ${guild.premiumSubscriptionCount ?? 0} boost(s)\`\`\``,
          inline: true,
        },
      )
      .setFooter({ text: FOOTER })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },
};

export const commandsListCommand = helpCommand;
