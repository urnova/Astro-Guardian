import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ChatInputCommandInteraction,
  TextChannel,
} from "discord.js";
import { db } from "@workspace/db";
import { guildConfigsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { getOrCreateConfig, addLog } from "../lib/db.js";

const adminPerm = PermissionFlagsBits.Administrator;
const FOOTER = "⬡ ASTRAL TECHNOLOGIE — NEXUS v2.0";

export const maintenanceCommand = {
  data: new SlashCommandBuilder()
    .setName("maintenance")
    .setDescription("🔧 Activer le protocole de maintenance système")
    .setDefaultMemberPermissions(adminPerm)
    .addStringOption((o) => o.setName("raison").setDescription("Motif de la maintenance").setRequired(false)),
  async execute(interaction: ChatInputCommandInteraction) {
    const reason = interaction.options.getString("raison") ?? "Maintenance technique programmée";
    await interaction.deferReply({ ephemeral: true });

    await getOrCreateConfig(interaction.guildId!);
    await db.update(guildConfigsTable)
      .set({ maintenanceMode: true, maintenanceReason: reason })
      .where(eq(guildConfigsTable.guildId, interaction.guildId!));

    const embed = new EmbedBuilder()
      .setTitle("🔧 ⬡ PROTOCOLE MAINTENANCE — SYSTÈME SUSPENDU ⬡ 🔧")
      .setColor(0xffa500)
      .setDescription(
        `\`\`\`diff\n- ⬡ NŒUD EN MAINTENANCE TECHNIQUE\n- COMMUNICATIONS UTILISATEURS SUSPENDUES\n- INTERVENTIONS ADMINISTRATIVES EN COURS\n- ACCÈS RESTREINT AUX OPÉRATEURS ACCRÉDITÉS\n\`\`\``
      )
      .addFields(
        {
          name: "📋 RAPPORT TECHNIQUE",
          value: `\`\`\`yaml\nMotif     : ${reason}\nInitié par: ${interaction.user.username}\nHeure     : ${new Date().toLocaleTimeString("fr-FR")}\nStatut    : MAINTENANCE ACTIVE\`\`\``,
          inline: false,
        },
        {
          name: "🔒 RESTRICTIONS SYSTÈME",
          value: "```css\n[BLOQUÉ] Transmissions utilisateurs\n[ACTIF] Accès administrateur\n[EN COURS] Opérations techniques\n[SURVEILLÉ] Intégrité du réseau```",
          inline: false,
        },
      )
      .setFooter({ text: `${FOOTER} | MAINTENANCE ACTIVE` })
      .setTimestamp();

    let notified = 0;
    for (const channel of interaction.guild!.channels.cache.values()) {
      if (channel instanceof TextChannel) {
        try { await channel.send({ embeds: [embed] }); notified++; } catch {}
      }
    }

    await interaction.editReply({ content: `✅ **PROTOCOLE MAINTENANCE ACTIVÉ** — ${notified} canal(aux) notifié(s)` });
    await addLog({ guildId: interaction.guildId!, action: "MAINTENANCE_ON", moderatorId: interaction.user.id, moderatorName: interaction.user.username, details: reason });
  },
};

export const maintenanceOffCommand = {
  data: new SlashCommandBuilder()
    .setName("maintenance_off")
    .setDescription("✅ Terminer la maintenance — Remettre le système en ligne")
    .setDefaultMemberPermissions(adminPerm),
  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true });

    await getOrCreateConfig(interaction.guildId!);
    await db.update(guildConfigsTable)
      .set({ maintenanceMode: false, maintenanceReason: null })
      .where(eq(guildConfigsTable.guildId, interaction.guildId!));

    const embed = new EmbedBuilder()
      .setTitle("⬡ ✅ MAINTENANCE COMPLÈTE — NEXUS PLEINEMENT OPÉRATIONNEL ✅ ⬡")
      .setColor(0x00ff66)
      .setDescription(
        `\`\`\`diff\n+ MAINTENANCE TECHNIQUE ACCOMPLIE\n+ NŒUD PLEINEMENT OPÉRATIONNEL\n+ COMMUNICATIONS RÉTABLIES\n+ ACCÈS COMPLET RESTAURÉ\n\`\`\``
      )
      .addFields(
        {
          name: "📊 RAPPORT DE FIN DE MAINTENANCE",
          value: `\`\`\`yaml\nComplété par : ${interaction.user.username}\nHeure        : ${new Date().toLocaleTimeString("fr-FR")}\nDurée        : Opération terminée\nStatut       : SYSTÈME NOMINAL\`\`\``,
          inline: false,
        },
        {
          name: "✅ SYSTÈMES EN LIGNE",
          value: "```diff\n+ Communications rétablies\n+ Permissions restaurées\n+ Optimisations appliquées\n+ Surveillance active```",
          inline: false,
        },
      )
      .setFooter({ text: `${FOOTER} | SERVEUR OPÉRATIONNEL` })
      .setTimestamp();

    let notified = 0;
    for (const channel of interaction.guild!.channels.cache.values()) {
      if (channel instanceof TextChannel) {
        try { await channel.send({ embeds: [embed] }); notified++; } catch {}
      }
    }

    await interaction.editReply({ content: `✅ **MAINTENANCE TERMINÉE** — ${notified} canal(aux) notifié(s)` });
    await addLog({ guildId: interaction.guildId!, action: "MAINTENANCE_OFF", moderatorId: interaction.user.id, moderatorName: interaction.user.username });
  },
};

export const setwelcomeCommand = {
  data: new SlashCommandBuilder()
    .setName("setwelcome")
    .setDescription("👋 Configurer le message de bienvenue")
    .setDefaultMemberPermissions(adminPerm)
    .addChannelOption((o) => o.setName("canal").setDescription("Canal de bienvenue").setRequired(true))
    .addStringOption((o) => o.setName("message").setDescription("Message (utilisez {user} et {server})").setRequired(false)),
  async execute(interaction: ChatInputCommandInteraction) {
    const channel = interaction.options.getChannel("canal", true);
    const message = interaction.options.getString("message") ?? "Bienvenue {user} sur **{server}** ! 👋";
    await getOrCreateConfig(interaction.guildId!);
    await db.update(guildConfigsTable)
      .set({ welcomeChannelId: channel.id, welcomeMessage: message })
      .where(eq(guildConfigsTable.guildId, interaction.guildId!));

    const embed = new EmbedBuilder()
      .setTitle("👋 MESSAGE DE BIENVENUE CONFIGURÉ")
      .setColor(0x00f0ff)
      .addFields(
        { name: "📡 Canal", value: `<#${channel.id}>`, inline: true },
        { name: "💬 Message", value: `\`${message}\``, inline: false },
        { name: "ℹ️ Variables", value: "`{user}` → mention | `{username}` → nom | `{server}` → serveur", inline: false },
      )
      .setFooter({ text: FOOTER })
      .setTimestamp();
    await interaction.reply({ embeds: [embed] });
  },
};

export const setgoodbyeCommand = {
  data: new SlashCommandBuilder()
    .setName("setgoodbye")
    .setDescription("👋 Configurer le message d'au revoir")
    .setDefaultMemberPermissions(adminPerm)
    .addChannelOption((o) => o.setName("canal").setDescription("Canal d'au revoir").setRequired(true))
    .addStringOption((o) => o.setName("message").setDescription("Message (utilisez {username} et {server})").setRequired(false)),
  async execute(interaction: ChatInputCommandInteraction) {
    const channel = interaction.options.getChannel("canal", true);
    const message = interaction.options.getString("message") ?? "**{username}** a quitté **{server}**. 👋";
    await getOrCreateConfig(interaction.guildId!);
    await db.update(guildConfigsTable)
      .set({ goodbyeChannelId: channel.id, goodbyeMessage: message })
      .where(eq(guildConfigsTable.guildId, interaction.guildId!));

    const embed = new EmbedBuilder()
      .setTitle("👋 MESSAGE D'AU REVOIR CONFIGURÉ")
      .setColor(0xff6b35)
      .addFields(
        { name: "📡 Canal", value: `<#${channel.id}>`, inline: true },
        { name: "💬 Message", value: `\`${message}\``, inline: false },
        { name: "ℹ️ Variables", value: "`{username}` → nom | `{server}` → serveur", inline: false },
      )
      .setFooter({ text: FOOTER })
      .setTimestamp();
    await interaction.reply({ embeds: [embed] });
  },
};

export const panelCommand = {
  data: new SlashCommandBuilder()
    .setName("panel")
    .setDescription("🔗 Obtenir le lien du panneau de contrôle Astral")
    .setDefaultMemberPermissions(adminPerm),
  async execute(interaction: ChatInputCommandInteraction) {
    const panelUrl = process.env.PANEL_URL ?? "https://astro-guardian--eoprivate42.replit.app";
    const embed = new EmbedBuilder()
      .setTitle("⬡ PANNEAU DE CONTRÔLE ASTRAL")
      .setColor(0x00f0ff)
      .setDescription(
        `\`\`\`css\n[ACCÈS AU NEXUS DE CONTRÔLE]\n[INTERFACE ADMINISTRATEUR]\n\`\`\``
      )
      .addFields(
        { name: "🔗 LIEN D'ACCÈS", value: panelUrl, inline: false },
        { name: "ℹ️ INFO", value: "Connexion via Discord OAuth — Réservé aux administrateurs", inline: false },
      )
      .setFooter({ text: `${FOOTER} | PANEL v2.0` })
      .setTimestamp();
    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};

export const setlogchannelCommand = {
  data: new SlashCommandBuilder()
    .setName("setlogchannel")
    .setDescription("📡 Configurer le canal de transmission des journaux")
    .setDefaultMemberPermissions(adminPerm)
    .addChannelOption((o) => o.setName("canal").setDescription("Canal de réception des logs").setRequired(true)),
  async execute(interaction: ChatInputCommandInteraction) {
    const channel = interaction.options.getChannel("canal", true);
    await getOrCreateConfig(interaction.guildId!);
    await db.update(guildConfigsTable)
      .set({ logChannelId: channel.id })
      .where(eq(guildConfigsTable.guildId, interaction.guildId!));

    const embed = new EmbedBuilder()
      .setTitle("📡 CANAL DE JOURNAL CONFIGURÉ")
      .setColor(0x00f0ff)
      .setDescription(`\`\`\`diff\n+ LIAISON DE JOURNAL ÉTABLIE\n+ TRANSMISSIONS REDIRIGÉES VERS LA CIBLE\n\`\`\``)
      .addFields(
        { name: "📡 CANAL CIBLE", value: `<#${channel.id}>`, inline: true },
        { name: "✅ STATUT", value: "`ACTIF`", inline: true },
      )
      .setFooter({ text: FOOTER })
      .setTimestamp();
    await interaction.reply({ embeds: [embed] });
  },
};
