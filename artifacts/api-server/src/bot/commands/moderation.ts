import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ChatInputCommandInteraction,
  GuildMember,
} from "discord.js";
import { db } from "@workspace/db";
import { warnsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { getOrCreateConfig, addLog } from "../lib/db.js";

const adminPerm = PermissionFlagsBits.Administrator;
const ASTRAL_COLOR = 0x00f0ff;
const FOOTER = "⬡ ASTRAL TECHNOLOGIE — NEXUS v2.0";

export const kickCommand = {
  data: new SlashCommandBuilder()
    .setName("kick")
    .setDescription("⚡ Éjecter un agent du nœud")
    .setDefaultMemberPermissions(adminPerm)
    .addUserOption((o) => o.setName("membre").setDescription("La cible à éjecter").setRequired(true))
    .addStringOption((o) => o.setName("raison").setDescription("Motif de l'éjection").setRequired(false)),
  async execute(interaction: ChatInputCommandInteraction) {
    const member = interaction.options.getMember("membre") as GuildMember | null;
    if (!member) return interaction.reply({ content: "❌ Agent introuvable dans le système.", ephemeral: true });
    const reason = interaction.options.getString("raison") ?? "Aucun motif fourni";
    try {
      await member.kick(reason);
      const embed = new EmbedBuilder()
        .setTitle("⚡ ÉJECTION EXÉCUTÉE")
        .setColor(0xff6b35)
        .setDescription(`\`\`\`diff\n- AGENT ÉJECTÉ DU NŒUD\n- ACCÈS RÉVOQUÉ\n\`\`\``)
        .addFields(
          { name: "🎯 CIBLE", value: `${member} — \`${member.user.username}\``, inline: true },
          { name: "⚖️ MOTIF", value: `\`${reason}\``, inline: true },
          { name: "👤 OPÉRATEUR", value: interaction.user.toString(), inline: true },
        )
        .setThumbnail(member.user.displayAvatarURL())
        .setFooter({ text: FOOTER })
        .setTimestamp();
      await interaction.reply({ embeds: [embed] });
      await addLog({ guildId: interaction.guildId!, action: "KICK", targetId: member.id, targetName: member.user.username, moderatorId: interaction.user.id, moderatorName: interaction.user.username, details: reason });
    } catch {
      await interaction.reply({ content: "❌ Impossible d'éjecter cet agent. Permissions insuffisantes.", ephemeral: true });
    }
  },
};

export const banCommand = {
  data: new SlashCommandBuilder()
    .setName("ban")
    .setDescription("☠️ Bannir définitivement un agent du réseau")
    .setDefaultMemberPermissions(adminPerm)
    .addUserOption((o) => o.setName("membre").setDescription("La cible à bannir").setRequired(true))
    .addStringOption((o) => o.setName("raison").setDescription("Motif du ban").setRequired(false)),
  async execute(interaction: ChatInputCommandInteraction) {
    const member = interaction.options.getMember("membre") as GuildMember | null;
    if (!member) return interaction.reply({ content: "❌ Agent introuvable.", ephemeral: true });
    const reason = interaction.options.getString("raison") ?? "Aucun motif fourni";
    try {
      await member.ban({ reason });
      const embed = new EmbedBuilder()
        .setTitle("☠️ BAN EXÉCUTÉ — ACCÈS TERMINAL RÉVOQUÉ")
        .setColor(0xff0000)
        .setDescription(`\`\`\`diff\n- AGENT BANNI DU RÉSEAU\n- ACCÈS DÉFINITIVEMENT RÉVOQUÉ\n- EMPREINTE SYSTÈME MARQUÉE\n\`\`\``)
        .addFields(
          { name: "🎯 CIBLE", value: `${member} — \`${member.user.username}\``, inline: true },
          { name: "⚖️ MOTIF", value: `\`${reason}\``, inline: true },
          { name: "👤 OPÉRATEUR", value: interaction.user.toString(), inline: true },
        )
        .setThumbnail(member.user.displayAvatarURL())
        .setFooter({ text: FOOTER })
        .setTimestamp();
      await interaction.reply({ embeds: [embed] });
      await addLog({ guildId: interaction.guildId!, action: "BAN", targetId: member.id, targetName: member.user.username, moderatorId: interaction.user.id, moderatorName: interaction.user.username, details: reason });
    } catch {
      await interaction.reply({ content: "❌ Protocole de ban échoué. Vérifiez les permissions.", ephemeral: true });
    }
  },
};

export const unbanCommand = {
  data: new SlashCommandBuilder()
    .setName("unban")
    .setDescription("🔓 Lever le ban — Restaurer l'accès réseau")
    .setDefaultMemberPermissions(adminPerm)
    .addStringOption((o) => o.setName("user_id").setDescription("ID Discord de la cible").setRequired(true))
    .addStringOption((o) => o.setName("raison").setDescription("Motif du déban").setRequired(false)),
  async execute(interaction: ChatInputCommandInteraction) {
    const userId = interaction.options.getString("user_id", true);
    const reason = interaction.options.getString("raison") ?? "Réhabilitation approuvée";
    try {
      await interaction.guild!.members.unban(userId, reason);
      const embed = new EmbedBuilder()
        .setTitle("🔓 ACCÈS RESTAURÉ — RÉHABILITATION VALIDÉE")
        .setColor(0x00ff88)
        .setDescription(`\`\`\`diff\n+ BAN LEVÉ AVEC SUCCÈS\n+ ACCÈS RÉSEAU RESTAURÉ\n+ AGENT RÉHABILITÉ\n\`\`\``)
        .addFields(
          { name: "🆔 ID CIBLE", value: `\`${userId}\``, inline: true },
          { name: "⚖️ MOTIF", value: `\`${reason}\``, inline: true },
          { name: "👤 OPÉRATEUR", value: interaction.user.toString(), inline: true },
        )
        .setFooter({ text: FOOTER })
        .setTimestamp();
      await interaction.reply({ embeds: [embed] });
      await addLog({ guildId: interaction.guildId!, action: "UNBAN", targetId: userId, moderatorId: interaction.user.id, moderatorName: interaction.user.username, details: reason });
    } catch {
      await interaction.reply({ content: "❌ Agent introuvable dans les fichiers de ban.", ephemeral: true });
    }
  },
};

export const muteCommand = {
  data: new SlashCommandBuilder()
    .setName("mute")
    .setDescription("🔇 Mettre un agent en silence forcé")
    .setDefaultMemberPermissions(adminPerm)
    .addUserOption((o) => o.setName("membre").setDescription("La cible à museler").setRequired(true))
    .addIntegerOption((o) => o.setName("minutes").setDescription("Durée en minutes (défaut: 10)").setRequired(false))
    .addStringOption((o) => o.setName("raison").setDescription("Motif").setRequired(false)),
  async execute(interaction: ChatInputCommandInteraction) {
    const member = interaction.options.getMember("membre") as GuildMember | null;
    if (!member) return interaction.reply({ content: "❌ Agent introuvable.", ephemeral: true });
    const minutes = interaction.options.getInteger("minutes") ?? 10;
    const reason = interaction.options.getString("raison") ?? "Silence forcé par protocole";
    try {
      await member.timeout(minutes * 60 * 1000, reason);
      const embed = new EmbedBuilder()
        .setTitle("🔇 PROTOCOLE SILENCE ACTIVÉ")
        .setColor(0xff9900)
        .setDescription(`\`\`\`diff\n- COMMUNICATIONS DE L'AGENT COUPÉES\n- TIMEOUT SYSTÈME APPLIQUÉ\n\`\`\``)
        .addFields(
          { name: "🎯 CIBLE", value: `${member} — \`${member.user.username}\``, inline: true },
          { name: "⏱️ DURÉE", value: `\`${minutes} minute(s)\``, inline: true },
          { name: "⚖️ MOTIF", value: `\`${reason}\``, inline: false },
        )
        .setFooter({ text: FOOTER })
        .setTimestamp();
      await interaction.reply({ embeds: [embed] });
      await addLog({ guildId: interaction.guildId!, action: "MUTE", targetId: member.id, targetName: member.user.username, moderatorId: interaction.user.id, moderatorName: interaction.user.username, details: `${minutes}min — ${reason}` });
    } catch {
      await interaction.reply({ content: "❌ Échec du protocole silence.", ephemeral: true });
    }
  },
};

export const unmuteCommand = {
  data: new SlashCommandBuilder()
    .setName("unmute")
    .setDescription("🔊 Rétablir les communications d'un agent")
    .setDefaultMemberPermissions(adminPerm)
    .addUserOption((o) => o.setName("membre").setDescription("L'agent à rétablir").setRequired(true)),
  async execute(interaction: ChatInputCommandInteraction) {
    const member = interaction.options.getMember("membre") as GuildMember | null;
    if (!member) return interaction.reply({ content: "❌ Agent introuvable.", ephemeral: true });
    try {
      await member.timeout(null);
      const embed = new EmbedBuilder()
        .setTitle("🔊 COMMUNICATIONS RÉTABLIES")
        .setColor(0x00ff88)
        .setDescription(`\`\`\`diff\n+ SILENCE LEVÉ\n+ COMMUNICATIONS RESTAURÉES\n\`\`\``)
        .addFields(
          { name: "🎯 AGENT", value: `${member} — \`${member.user.username}\``, inline: true },
          { name: "👤 OPÉRATEUR", value: interaction.user.toString(), inline: true },
        )
        .setFooter({ text: FOOTER })
        .setTimestamp();
      await interaction.reply({ embeds: [embed] });
      await addLog({ guildId: interaction.guildId!, action: "UNMUTE", targetId: member.id, targetName: member.user.username, moderatorId: interaction.user.id, moderatorName: interaction.user.username });
    } catch {
      await interaction.reply({ content: "❌ Erreur lors du rétablissement.", ephemeral: true });
    }
  },
};

export const clearCommand = {
  data: new SlashCommandBuilder()
    .setName("clear")
    .setDescription("🧹 Purger les transmissions du canal")
    .setDefaultMemberPermissions(adminPerm)
    .addIntegerOption((o) => o.setName("nombre").setDescription("Nombre de messages à purger (max 100)").setRequired(false)),
  async execute(interaction: ChatInputCommandInteraction) {
    const amount = Math.min(interaction.options.getInteger("nombre") ?? 10, 100);
    await interaction.deferReply({ ephemeral: true });
    try {
      const deleted = await (interaction.channel as any).bulkDelete(amount, true);
      const embed = new EmbedBuilder()
        .setTitle("🧹 PURGE DE CANAL EXÉCUTÉE")
        .setColor(0x00aaff)
        .setDescription(
          `\`\`\`diff\n+ ${deleted.size} TRANSMISSION(S) PURGÉE(S)\n+ CANAL NETTOYÉ AVEC SUCCÈS\n\`\`\``
        )
        .addFields({ name: "📡 CANAL", value: `<#${interaction.channelId}>`, inline: true })
        .setFooter({ text: FOOTER })
        .setTimestamp();
      await interaction.editReply({ embeds: [embed] });
      await addLog({ guildId: interaction.guildId!, action: "CLEAR", moderatorId: interaction.user.id, moderatorName: interaction.user.username, details: `${deleted.size} messages dans #${(interaction.channel as any)?.name}` });
    } catch {
      await interaction.editReply("❌ Erreur lors de la purge. Les messages trop anciens ne peuvent être supprimés.");
    }
  },
};

export const warnCommand = {
  data: new SlashCommandBuilder()
    .setName("warn")
    .setDescription("⚠️ Émettre un avertissement officiel")
    .setDefaultMemberPermissions(adminPerm)
    .addUserOption((o) => o.setName("membre").setDescription("La cible").setRequired(true))
    .addStringOption((o) => o.setName("raison").setDescription("Motif de l'avertissement").setRequired(false)),
  async execute(interaction: ChatInputCommandInteraction) {
    const member = interaction.options.getMember("membre") as GuildMember | null;
    if (!member) return interaction.reply({ content: "❌ Agent introuvable.", ephemeral: true });
    const reason = interaction.options.getString("raison") ?? "Violation du protocole";
    const guildId = interaction.guildId!;

    await db.insert(warnsTable).values({
      guildId,
      userId: member.id,
      username: member.user.username,
      reason,
      moderatorId: interaction.user.id,
      moderatorName: interaction.user.username,
    }).returning();

    const allWarns = await db.select().from(warnsTable)
      .where(and(eq(warnsTable.guildId, guildId), eq(warnsTable.userId, member.id)));

    const warnLevel = allWarns.length;
    const dangerColor = warnLevel >= 3 ? 0xff0000 : warnLevel >= 2 ? 0xff6600 : 0xffdd00;

    const embed = new EmbedBuilder()
      .setTitle(`⚠️ AVERTISSEMENT OFFICIEL ÉMIS — ALERTE NIVEAU ${warnLevel}`)
      .setColor(dangerColor)
      .setDescription(`\`\`\`yaml\nSTATUT : AVERTISSEMENT ENREGISTRÉ\nNIVEAU MENACE : ${warnLevel}/3\n${warnLevel >= 3 ? "SEUIL CRITIQUE ATTEINT — BAN AUTOMATIQUE\n" : ""}\`\`\``)
      .addFields(
        { name: "🎯 CIBLE", value: `${member} — \`${member.user.username}\``, inline: true },
        { name: "⚖️ MOTIF", value: `\`${reason}\``, inline: true },
        { name: "📊 COMPTEUR", value: `\`${warnLevel}/3 avertissements\``, inline: true },
      )
      .setFooter({ text: FOOTER })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
    await addLog({ guildId, action: "WARN", targetId: member.id, targetName: member.user.username, moderatorId: interaction.user.id, moderatorName: interaction.user.username, details: reason });

    if (allWarns.length >= 3) {
      try {
        await member.ban({ reason: "Seuil critique atteint — 3 avertissements automatiques" });
        const banEmbed = new EmbedBuilder()
          .setTitle("☠️ BAN AUTOMATIQUE — SEUIL CRITIQUE ATTEINT")
          .setColor(0xff0000)
          .setDescription(`\`\`\`diff\n- PROTOCOLE D'URGENCE ACTIVÉ\n- AGENT ${member.user.username.toUpperCase()} BANNI AUTOMATIQUEMENT\n- 3 AVERTISSEMENTS CONSÉCUTIFS ENREGISTRÉS\n\`\`\``)
          .setFooter({ text: FOOTER })
          .setTimestamp();
        await interaction.followUp({ embeds: [banEmbed] });
      } catch {}
    }
  },
};

export const warnsCommand = {
  data: new SlashCommandBuilder()
    .setName("warns")
    .setDescription("📋 Consulter le dossier d'avertissements d'un agent")
    .setDefaultMemberPermissions(adminPerm)
    .addUserOption((o) => o.setName("membre").setDescription("L'agent à consulter").setRequired(true)),
  async execute(interaction: ChatInputCommandInteraction) {
    const member = interaction.options.getMember("membre") as GuildMember | null;
    if (!member) return interaction.reply({ content: "❌ Agent introuvable.", ephemeral: true });
    const guildId = interaction.guildId!;

    const memberWarns = await db.select().from(warnsTable)
      .where(and(eq(warnsTable.guildId, guildId), eq(warnsTable.userId, member.id)));

    if (memberWarns.length === 0) {
      const embed = new EmbedBuilder()
        .setTitle("📋 DOSSIER D'AVERTISSEMENTS — VIDE")
        .setColor(0x00ff88)
        .setDescription(`\`\`\`diff\n+ AGENT ${member.user.username.toUpperCase()} — CASIER VIERGE\n+ AUCUNE INFRACTION ENREGISTRÉE\n\`\`\``)
        .setFooter({ text: FOOTER });
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    const embed = new EmbedBuilder()
      .setTitle(`📋 DOSSIER D'AVERTISSEMENTS — ${member.user.username.toUpperCase()}`)
      .setColor(memberWarns.length >= 3 ? 0xff0000 : 0xffdd00)
      .setDescription(`\`\`\`yaml\nNIVEAU MENACE : ${memberWarns.length}/3\n\`\`\``)
      .setThumbnail(member.user.displayAvatarURL());

    for (let i = 0; i < memberWarns.length; i++) {
      const w = memberWarns[i];
      embed.addFields({
        name: `⚠️ INFRACTION #${i + 1}`,
        value: `**Motif:** \`${w.reason}\`\n**Opérateur:** \`${w.moderatorName}\`\n**Date:** <t:${Math.floor(w.createdAt.getTime() / 1000)}:f>`,
        inline: false,
      });
    }

    embed.setFooter({ text: FOOTER }).setTimestamp();
    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};

export const unwarnCommand = {
  data: new SlashCommandBuilder()
    .setName("unwarn")
    .setDescription("✅ Effacer un avertissement du dossier")
    .setDefaultMemberPermissions(adminPerm)
    .addUserOption((o) => o.setName("membre").setDescription("L'agent concerné").setRequired(true))
    .addIntegerOption((o) => o.setName("numero").setDescription("Numéro de l'infraction à effacer").setRequired(true)),
  async execute(interaction: ChatInputCommandInteraction) {
    const member = interaction.options.getMember("membre") as GuildMember | null;
    if (!member) return interaction.reply({ content: "❌ Agent introuvable.", ephemeral: true });
    const numero = interaction.options.getInteger("numero", true);
    const guildId = interaction.guildId!;

    const memberWarns = await db.select().from(warnsTable)
      .where(and(eq(warnsTable.guildId, guildId), eq(warnsTable.userId, member.id)));

    if (numero < 1 || numero > memberWarns.length) {
      return interaction.reply({ content: "❌ Numéro d'infraction invalide.", ephemeral: true });
    }

    const warnToRemove = memberWarns[numero - 1];
    await db.delete(warnsTable).where(eq(warnsTable.id, warnToRemove.id));

    const embed = new EmbedBuilder()
      .setTitle("✅ INFRACTION EFFACÉE DU DOSSIER")
      .setColor(0x00ff88)
      .setDescription(`\`\`\`diff\n+ AVERTISSEMENT #${numero} SUPPRIMÉ\n+ DOSSIER MIS À JOUR\n\`\`\``)
      .addFields(
        { name: "🎯 AGENT", value: `${member} — \`${member.user.username}\``, inline: true },
        { name: "🗑️ INFRACTION RETIRÉE", value: `\`${warnToRemove.reason}\``, inline: true },
      )
      .setFooter({ text: FOOTER })
      .setTimestamp();
    await interaction.reply({ embeds: [embed] });
  },
};
