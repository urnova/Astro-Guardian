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

export const kickCommand = {
  data: new SlashCommandBuilder()
    .setName("kick")
    .setDescription("Exclure un membre du serveur")
    .setDefaultMemberPermissions(adminPerm)
    .addUserOption((o) => o.setName("membre").setDescription("Le membre à exclure").setRequired(true))
    .addStringOption((o) => o.setName("raison").setDescription("Raison de l'exclusion").setRequired(false)),
  async execute(interaction: ChatInputCommandInteraction) {
    const member = interaction.options.getMember("membre") as GuildMember | null;
    if (!member) return interaction.reply({ content: "❌ Membre introuvable.", ephemeral: true });
    const reason = interaction.options.getString("raison") ?? "Aucune raison fournie";
    try {
      await member.kick(reason);
      const embed = new EmbedBuilder()
        .setTitle("👢 Membre exclu")
        .setDescription(`${member} a été exclu du serveur`)
        .addFields({ name: "Raison", value: reason }, { name: "Modérateur", value: interaction.user.toString() })
        .setColor(0xff6b6b)
        .setTimestamp();
      await interaction.reply({ embeds: [embed] });
      await addLog({ guildId: interaction.guildId!, action: "KICK", targetId: member.id, targetName: member.user.username, moderatorId: interaction.user.id, moderatorName: interaction.user.username, details: reason });
    } catch {
      await interaction.reply({ content: "❌ Impossible d'exclure ce membre.", ephemeral: true });
    }
  },
};

export const banCommand = {
  data: new SlashCommandBuilder()
    .setName("ban")
    .setDescription("Bannir un membre du serveur")
    .setDefaultMemberPermissions(adminPerm)
    .addUserOption((o) => o.setName("membre").setDescription("Le membre à bannir").setRequired(true))
    .addStringOption((o) => o.setName("raison").setDescription("Raison du ban").setRequired(false)),
  async execute(interaction: ChatInputCommandInteraction) {
    const member = interaction.options.getMember("membre") as GuildMember | null;
    if (!member) return interaction.reply({ content: "❌ Membre introuvable.", ephemeral: true });
    const reason = interaction.options.getString("raison") ?? "Aucune raison fournie";
    try {
      await member.ban({ reason });
      const embed = new EmbedBuilder()
        .setTitle("🔨 Membre banni")
        .setDescription(`${member} a été banni du serveur`)
        .addFields({ name: "Raison", value: reason }, { name: "Modérateur", value: interaction.user.toString() })
        .setColor(0xff0000)
        .setTimestamp();
      await interaction.reply({ embeds: [embed] });
      await addLog({ guildId: interaction.guildId!, action: "BAN", targetId: member.id, targetName: member.user.username, moderatorId: interaction.user.id, moderatorName: interaction.user.username, details: reason });
    } catch {
      await interaction.reply({ content: "❌ Impossible de bannir ce membre.", ephemeral: true });
    }
  },
};

export const unbanCommand = {
  data: new SlashCommandBuilder()
    .setName("unban")
    .setDescription("Débannir un utilisateur")
    .setDefaultMemberPermissions(adminPerm)
    .addStringOption((o) => o.setName("user_id").setDescription("L'ID Discord de l'utilisateur").setRequired(true))
    .addStringOption((o) => o.setName("raison").setDescription("Raison").setRequired(false)),
  async execute(interaction: ChatInputCommandInteraction) {
    const userId = interaction.options.getString("user_id", true);
    const reason = interaction.options.getString("raison") ?? "Aucune raison";
    try {
      await interaction.guild!.members.unban(userId, reason);
      const embed = new EmbedBuilder()
        .setTitle("✅ Utilisateur débanni")
        .setDescription(`L'utilisateur \`${userId}\` a été débanni`)
        .setColor(0x00ff00)
        .setTimestamp();
      await interaction.reply({ embeds: [embed] });
      await addLog({ guildId: interaction.guildId!, action: "UNBAN", targetId: userId, moderatorId: interaction.user.id, moderatorName: interaction.user.username, details: reason });
    } catch {
      await interaction.reply({ content: "❌ Impossible de débannir cet utilisateur.", ephemeral: true });
    }
  },
};

export const muteCommand = {
  data: new SlashCommandBuilder()
    .setName("mute")
    .setDescription("Timeout un membre")
    .setDefaultMemberPermissions(adminPerm)
    .addUserOption((o) => o.setName("membre").setDescription("Le membre à mute").setRequired(true))
    .addIntegerOption((o) => o.setName("minutes").setDescription("Durée en minutes").setRequired(false))
    .addStringOption((o) => o.setName("raison").setDescription("Raison").setRequired(false)),
  async execute(interaction: ChatInputCommandInteraction) {
    const member = interaction.options.getMember("membre") as GuildMember | null;
    if (!member) return interaction.reply({ content: "❌ Membre introuvable.", ephemeral: true });
    const minutes = interaction.options.getInteger("minutes") ?? 10;
    const reason = interaction.options.getString("raison") ?? "Aucune raison";
    try {
      await member.timeout(minutes * 60 * 1000, reason);
      const embed = new EmbedBuilder()
        .setTitle("🔇 Membre timeout")
        .setDescription(`${member} a été mis en timeout pour **${minutes} minute(s)**`)
        .addFields({ name: "Raison", value: reason })
        .setColor(0xffa500)
        .setTimestamp();
      await interaction.reply({ embeds: [embed] });
      await addLog({ guildId: interaction.guildId!, action: "MUTE", targetId: member.id, targetName: member.user.username, moderatorId: interaction.user.id, moderatorName: interaction.user.username, details: `${minutes}min - ${reason}` });
    } catch {
      await interaction.reply({ content: "❌ Impossible de mute ce membre.", ephemeral: true });
    }
  },
};

export const unmuteCommand = {
  data: new SlashCommandBuilder()
    .setName("unmute")
    .setDescription("Retirer le timeout d'un membre")
    .setDefaultMemberPermissions(adminPerm)
    .addUserOption((o) => o.setName("membre").setDescription("Le membre").setRequired(true)),
  async execute(interaction: ChatInputCommandInteraction) {
    const member = interaction.options.getMember("membre") as GuildMember | null;
    if (!member) return interaction.reply({ content: "❌ Membre introuvable.", ephemeral: true });
    try {
      await member.timeout(null);
      const embed = new EmbedBuilder()
        .setTitle("🔊 Timeout retiré")
        .setDescription(`${member} peut à nouveau parler`)
        .setColor(0x00ff00)
        .setTimestamp();
      await interaction.reply({ embeds: [embed] });
      await addLog({ guildId: interaction.guildId!, action: "UNMUTE", targetId: member.id, targetName: member.user.username, moderatorId: interaction.user.id, moderatorName: interaction.user.username });
    } catch {
      await interaction.reply({ content: "❌ Erreur.", ephemeral: true });
    }
  },
};

export const clearCommand = {
  data: new SlashCommandBuilder()
    .setName("clear")
    .setDescription("Supprimer des messages dans le canal")
    .setDefaultMemberPermissions(adminPerm)
    .addIntegerOption((o) => o.setName("nombre").setDescription("Nombre de messages à supprimer (max 100)").setRequired(false)),
  async execute(interaction: ChatInputCommandInteraction) {
    const amount = Math.min(interaction.options.getInteger("nombre") ?? 10, 100);
    await interaction.deferReply({ ephemeral: true });
    try {
      const deleted = await (interaction.channel as any).bulkDelete(amount, true);
      await interaction.editReply(`🧹 **${deleted.size}** messages supprimés.`);
      await addLog({ guildId: interaction.guildId!, action: "CLEAR", moderatorId: interaction.user.id, moderatorName: interaction.user.username, details: `${deleted.size} messages dans #${(interaction.channel as any)?.name}` });
    } catch {
      await interaction.editReply("❌ Erreur lors de la suppression.");
    }
  },
};

export const warnCommand = {
  data: new SlashCommandBuilder()
    .setName("warn")
    .setDescription("Avertir un membre")
    .setDefaultMemberPermissions(adminPerm)
    .addUserOption((o) => o.setName("membre").setDescription("Le membre à avertir").setRequired(true))
    .addStringOption((o) => o.setName("raison").setDescription("Raison").setRequired(false)),
  async execute(interaction: ChatInputCommandInteraction) {
    const member = interaction.options.getMember("membre") as GuildMember | null;
    if (!member) return interaction.reply({ content: "❌ Membre introuvable.", ephemeral: true });
    const reason = interaction.options.getString("raison") ?? "Aucune raison";
    const guildId = interaction.guildId!;

    const warn = await db.insert(warnsTable).values({
      guildId,
      userId: member.id,
      username: member.user.username,
      reason,
      moderatorId: interaction.user.id,
      moderatorName: interaction.user.username,
    }).returning();

    const allWarns = await db.select().from(warnsTable)
      .where(and(eq(warnsTable.guildId, guildId), eq(warnsTable.userId, member.id)));

    const embed = new EmbedBuilder()
      .setTitle("⚠️ Avertissement")
      .setColor(0xffff00)
      .addFields(
        { name: "Membre", value: member.toString(), inline: true },
        { name: "Raison", value: reason, inline: true },
        { name: "Total warns", value: `**${allWarns.length}**`, inline: true },
      )
      .setTimestamp();
    await interaction.reply({ embeds: [embed] });

    if (allWarns.length >= 3) {
      try {
        await member.ban({ reason: "3 avertissements atteints automatiquement" });
        await interaction.followUp(`🔨 ${member} banni automatiquement — 3 warns atteints.`);
      } catch {}
    }

    await addLog({ guildId, action: "WARN", targetId: member.id, targetName: member.user.username, moderatorId: interaction.user.id, moderatorName: interaction.user.username, details: reason });
  },
};

export const warnsCommand = {
  data: new SlashCommandBuilder()
    .setName("warns")
    .setDescription("Voir les avertissements d'un membre")
    .setDefaultMemberPermissions(adminPerm)
    .addUserOption((o) => o.setName("membre").setDescription("Le membre").setRequired(true)),
  async execute(interaction: ChatInputCommandInteraction) {
    const member = interaction.options.getMember("membre") as GuildMember | null;
    if (!member) return interaction.reply({ content: "❌ Membre introuvable.", ephemeral: true });
    const guildId = interaction.guildId!;

    const memberWarns = await db.select().from(warnsTable)
      .where(and(eq(warnsTable.guildId, guildId), eq(warnsTable.userId, member.id)));

    if (memberWarns.length === 0) {
      return interaction.reply({ content: `${member} n'a aucun avertissement.`, ephemeral: true });
    }

    const embed = new EmbedBuilder()
      .setTitle(`⚠️ Avertissements de ${member.user.username}`)
      .setColor(0xffff00);

    for (let i = 0; i < memberWarns.length; i++) {
      const w = memberWarns[i];
      embed.addFields({
        name: `Warn #${i + 1}`,
        value: `**Raison:** ${w.reason}\n**Modérateur:** ${w.moderatorName}\n**Date:** <t:${Math.floor(w.createdAt.getTime() / 1000)}:f>`,
        inline: false,
      });
    }

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};

export const unwarnCommand = {
  data: new SlashCommandBuilder()
    .setName("unwarn")
    .setDescription("Retirer un avertissement d'un membre")
    .setDefaultMemberPermissions(adminPerm)
    .addUserOption((o) => o.setName("membre").setDescription("Le membre").setRequired(true))
    .addIntegerOption((o) => o.setName("numero").setDescription("Numéro du warn à retirer").setRequired(true)),
  async execute(interaction: ChatInputCommandInteraction) {
    const member = interaction.options.getMember("membre") as GuildMember | null;
    if (!member) return interaction.reply({ content: "❌ Membre introuvable.", ephemeral: true });
    const numero = interaction.options.getInteger("numero", true);
    const guildId = interaction.guildId!;

    const memberWarns = await db.select().from(warnsTable)
      .where(and(eq(warnsTable.guildId, guildId), eq(warnsTable.userId, member.id)));

    if (numero < 1 || numero > memberWarns.length) {
      return interaction.reply({ content: "❌ Numéro d'avertissement invalide.", ephemeral: true });
    }

    const warnToRemove = memberWarns[numero - 1];
    await db.delete(warnsTable).where(eq(warnsTable.id, warnToRemove.id));

    const embed = new EmbedBuilder()
      .setTitle("✅ Avertissement retiré")
      .addFields(
        { name: "Membre", value: member.toString(), inline: true },
        { name: "Warn retiré", value: warnToRemove.reason, inline: true },
      )
      .setColor(0x00ff00)
      .setTimestamp();
    await interaction.reply({ embeds: [embed] });
  },
};
