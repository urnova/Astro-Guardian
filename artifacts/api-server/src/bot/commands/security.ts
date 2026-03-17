import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ChatInputCommandInteraction,
  GuildMember,
  TextChannel,
} from "discord.js";
import { db } from "@workspace/db";
import { bannedWordsTable, guildConfigsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { getOrCreateConfig, addLog } from "../lib/db.js";

const adminPerm = PermissionFlagsBits.Administrator;

export const lockdownCommand = {
  data: new SlashCommandBuilder()
    .setName("breach")
    .setDescription("🚨 Confiner le serveur — BRÈCHE DE SÉCURITÉ")
    .setDefaultMemberPermissions(adminPerm)
    .addStringOption((o) => o.setName("raison").setDescription("Raison du confinement").setRequired(false)),
  async execute(interaction: ChatInputCommandInteraction) {
    const reason = interaction.options.getString("raison") ?? "Urgence sécuritaire";
    await interaction.reply({ content: "🔒 **INITIALISATION DU PROTOCOLE BRÈCHE...**", ephemeral: true });

    try {
      await getOrCreateConfig(interaction.guildId!);
      await db.update(guildConfigsTable)
        .set({ breachMode: true })
        .where(eq(guildConfigsTable.guildId, interaction.guildId!));

      const embed = new EmbedBuilder()
        .setTitle("🚨 ⚠️ ALERTE — BRÈCHE DE SÉCURITÉ ⚠️ 🚨")
        .setDescription(`\`\`\`diff\n- SERVEUR EN CONFINEMENT TOTAL\n- ACCÈS COMMUNICATION SUSPENDU\n- PROTOCOLES DE DÉFENSE ACTIVÉS\n\`\`\`\n\n**📋 RAISON:** \`${reason}\`\n**🔐 STATUT:** \`CONFINÉ\`\n**⏰ HEURE:** <t:${Math.floor(Date.now() / 1000)}:F>\n**👤 OFFICIER:** ${interaction.user}`)
        .setColor(0xff0000)
        .addFields({
          name: "🛡️ PROTOCOLE DE SÉCURITÉ ACTIVÉ",
          value: "```yaml\n✅ Communications bloquées\n✅ Permissions révoquées\n✅ Surveillance active\n✅ Mode défensif engagé```",
          inline: false,
        })
        .setFooter({ text: "🔒 SYSTÈME DE SÉCURITÉ ASTRAL TECHNOLOGIE | BRÈCHE CONFINÉE" })
        .setTimestamp();

      let locked = 0;
      for (const channel of interaction.guild!.channels.cache.values()) {
        if (channel instanceof TextChannel) {
          try {
            await channel.permissionOverwrites.edit(interaction.guild!.roles.everyone, { SendMessages: false });
            locked++;
          } catch {}
          try { await channel.send({ embeds: [embed] }); } catch {}
        }
      }

      await interaction.followUp({ content: `✅ **BRÈCHE CONFINÉE** — ${locked} canaux verrouillés`, ephemeral: true });
      await addLog({ guildId: interaction.guildId!, action: "BREACH_ON", moderatorId: interaction.user.id, moderatorName: interaction.user.username, details: reason });
    } catch (e) {
      await interaction.followUp({ content: "❌ Erreur lors du confinement.", ephemeral: true });
    }
  },
};

export const unlockCommand = {
  data: new SlashCommandBuilder()
    .setName("unbreach")
    .setDescription("🔓 Sortir de brèche — rétablir le serveur")
    .setDefaultMemberPermissions(adminPerm),
  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.reply({ content: "🔓 **SORTIE DE BRÈCHE EN COURS...**", ephemeral: true });

    try {
      await getOrCreateConfig(interaction.guildId!);
      await db.update(guildConfigsTable)
        .set({ breachMode: false })
        .where(eq(guildConfigsTable.guildId, interaction.guildId!));

      const embed = new EmbedBuilder()
        .setTitle("🎉 ✨ BRÈCHE RÉSOLUE — SERVEUR OPÉRATIONNEL ✨ 🎉")
        .setDescription(`\`\`\`diff\n+ CONFINEMENT LEVÉ AVEC SUCCÈS\n+ COMMUNICATIONS RÉTABLIES\n+ ACCÈS TOTAL RESTAURÉ\n\`\`\`\n\n**🔓 STATUT:** \`OPÉRATIONNEL\`\n**⏰ HEURE:** <t:${Math.floor(Date.now() / 1000)}:F>\n**👤 OFFICIER:** ${interaction.user}`)
        .setColor(0x00ff66)
        .addFields({
          name: "🎊 SYSTÈME RÉTABLI",
          value: "```yaml\n✅ Communications rétablies\n✅ Permissions restaurées\n✅ Mode normal activé\n✅ Activité autorisée```",
          inline: false,
        })
        .setFooter({ text: "🔓 SYSTÈME DE SÉCURITÉ ASTRAL TECHNOLOGIE | SERVEUR OPÉRATIONNEL" })
        .setTimestamp();

      let unlocked = 0;
      for (const channel of interaction.guild!.channels.cache.values()) {
        if (channel instanceof TextChannel) {
          try {
            await channel.permissionOverwrites.edit(interaction.guild!.roles.everyone, { SendMessages: null });
            unlocked++;
          } catch {}
          try { await channel.send({ embeds: [embed] }); } catch {}
        }
      }

      await interaction.followUp({ content: `✅ **BRÈCHE LEVÉE** — ${unlocked} canaux rétablis`, ephemeral: true });
      await addLog({ guildId: interaction.guildId!, action: "BREACH_OFF", moderatorId: interaction.user.id, moderatorName: interaction.user.username });
    } catch {
      await interaction.followUp({ content: "❌ Erreur.", ephemeral: true });
    }
  },
};

export const nukeCommand = {
  data: new SlashCommandBuilder()
    .setName("nuke")
    .setDescription("💥 Supprimer et recréer le canal actuel")
    .setDefaultMemberPermissions(adminPerm),
  async execute(interaction: ChatInputCommandInteraction) {
    const channel = interaction.channel as TextChannel;
    const channelName = channel.name;
    const channelPosition = channel.position;
    const channelCategory = channel.parent;

    await interaction.reply({ content: "💥 **DÉTONATION IMMINENTE...**", ephemeral: true });

    const countdownEmbed = new EmbedBuilder()
      .setTitle("💣 ⚠️ ALERTE DÉTONATION ⚠️ 💣")
      .setDescription("```diff\n- DESTRUCTION IMMINENTE DU CANAL\n- ÉVACUATION EN COURS\n```")
      .setColor(0xff4500)
      .addFields({ name: "⚡ COMPTE À REBOURS", value: "```css\n[3] INITIALISATION...\n[2] CHARGEMENT...\n[1] DÉTONATION...\n[0] BOOM! 💥```" });

    await channel.send({ embeds: [countdownEmbed] });
    await new Promise((r) => setTimeout(r, 3000));

    try {
      await channel.delete();
      const newChannel = await interaction.guild!.channels.create({
        name: channelName,
        position: channelPosition,
        parent: channelCategory,
        type: 0,
      }) as TextChannel;

      const nukeEmbed = new EmbedBuilder()
        .setTitle("🌋 💥 DÉTONATION RÉUSSIE 💥 🌋")
        .setDescription(`\`\`\`diff\n+ CANAL COMPLÈTEMENT PURIFIÉ\n+ DESTRUCTION TOTALE ACCOMPLIE\n\`\`\`\n\n**💣 CANAL:** \`#${channelName}\`\n**⏰ HEURE:** <t:${Math.floor(Date.now() / 1000)}:F>`)
        .setColor(0xff0000)
        .addFields({ name: "☢️ RAPPORT", value: "```yaml\n✅ Messages éliminés: TOUS\n✅ Historique effacé: COMPLET\n✅ Canal purifié: 100%```" })
        .setFooter({ text: "💥 SYSTÈME DE PURIFICATION ASTRAL | NUKE RÉUSSI" });

      await newChannel.send({ embeds: [nukeEmbed] });
      await addLog({ guildId: interaction.guildId!, action: "NUKE", targetName: channelName, moderatorId: interaction.user.id, moderatorName: interaction.user.username });
    } catch {}
  },
};

export const massbanCommand = {
  data: new SlashCommandBuilder()
    .setName("massban")
    .setDescription("Bannir plusieurs utilisateurs par leurs IDs")
    .setDefaultMemberPermissions(adminPerm)
    .addStringOption((o) => o.setName("ids").setDescription("IDs séparés par des espaces").setRequired(true))
    .addStringOption((o) => o.setName("raison").setDescription("Raison").setRequired(false)),
  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();
    const ids = interaction.options.getString("ids", true).split(/\s+/);
    const reason = interaction.options.getString("raison") ?? "Ban de masse";
    let count = 0;
    for (const id of ids) {
      try {
        await interaction.guild!.members.ban(id, { reason });
        count++;
      } catch {}
    }
    const embed = new EmbedBuilder()
      .setTitle("🔨 Ban de masse")
      .setDescription(`**${count}** utilisateurs bannis`)
      .setColor(0xff0000)
      .setTimestamp();
    await interaction.editReply({ embeds: [embed] });
    await addLog({ guildId: interaction.guildId!, action: "MASSBAN", moderatorId: interaction.user.id, moderatorName: interaction.user.username, details: `${count} utilisateurs` });
  },
};

export const antiraidCommand = {
  data: new SlashCommandBuilder()
    .setName("antiraid")
    .setDescription("Activer/désactiver la protection anti-raid")
    .setDefaultMemberPermissions(adminPerm)
    .addBooleanOption((o) => o.setName("activer").setDescription("Activer ou désactiver").setRequired(true)),
  async execute(interaction: ChatInputCommandInteraction) {
    const enabled = interaction.options.getBoolean("activer", true);
    await getOrCreateConfig(interaction.guildId!);
    await db.update(guildConfigsTable).set({ antiRaidEnabled: enabled }).where(eq(guildConfigsTable.guildId, interaction.guildId!));

    const embed = new EmbedBuilder()
      .setTitle("🛡️ Protection Anti-Raid")
      .setDescription(`Protection **${enabled ? "activée" : "désactivée"}**`)
      .setColor(enabled ? 0x00ff00 : 0xff0000)
      .setTimestamp();
    await interaction.reply({ embeds: [embed] });
  },
};

export const automodCommand = {
  data: new SlashCommandBuilder()
    .setName("automod")
    .setDescription("Activer/désactiver l'automodération")
    .setDefaultMemberPermissions(adminPerm)
    .addBooleanOption((o) => o.setName("activer").setDescription("Activer ou désactiver").setRequired(true)),
  async execute(interaction: ChatInputCommandInteraction) {
    const enabled = interaction.options.getBoolean("activer", true);
    await getOrCreateConfig(interaction.guildId!);
    await db.update(guildConfigsTable).set({ automodEnabled: enabled }).where(eq(guildConfigsTable.guildId, interaction.guildId!));

    const embed = new EmbedBuilder()
      .setTitle("🤖 Automodération")
      .setDescription(`Automod **${enabled ? "activée" : "désactivée"}**`)
      .setColor(enabled ? 0x00ff00 : 0xff0000)
      .setTimestamp();
    await interaction.reply({ embeds: [embed] });
  },
};

export const addwordCommand = {
  data: new SlashCommandBuilder()
    .setName("addword")
    .setDescription("Ajouter un mot banni")
    .setDefaultMemberPermissions(adminPerm)
    .addStringOption((o) => o.setName("mot").setDescription("Le mot à bannir").setRequired(true)),
  async execute(interaction: ChatInputCommandInteraction) {
    const word = interaction.options.getString("mot", true).toLowerCase();
    const guildId = interaction.guildId!;

    const existing = await db.select().from(bannedWordsTable)
      .where(and(eq(bannedWordsTable.guildId, guildId), eq(bannedWordsTable.word, word)));

    if (existing.length > 0) {
      return interaction.reply({ content: "❌ Ce mot est déjà dans la liste.", ephemeral: true });
    }

    await db.insert(bannedWordsTable).values({ guildId, word });
    const embed = new EmbedBuilder()
      .setTitle("🚫 Mot ajouté")
      .setDescription(`\`${word}\` ajouté à la liste des mots bannis`)
      .setColor(0xff6b6b);
    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};

export const removewordCommand = {
  data: new SlashCommandBuilder()
    .setName("removeword")
    .setDescription("Retirer un mot banni")
    .setDefaultMemberPermissions(adminPerm)
    .addStringOption((o) => o.setName("mot").setDescription("Le mot à retirer").setRequired(true)),
  async execute(interaction: ChatInputCommandInteraction) {
    const word = interaction.options.getString("mot", true).toLowerCase();
    const guildId = interaction.guildId!;

    const deleted = await db.delete(bannedWordsTable)
      .where(and(eq(bannedWordsTable.guildId, guildId), eq(bannedWordsTable.word, word)))
      .returning();

    if (deleted.length === 0) {
      return interaction.reply({ content: "❌ Ce mot n'est pas dans la liste.", ephemeral: true });
    }

    const embed = new EmbedBuilder()
      .setTitle("✅ Mot retiré")
      .setDescription(`\`${word}\` retiré de la liste des mots bannis`)
      .setColor(0x00ff00);
    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};

export const bannedwordsCommand = {
  data: new SlashCommandBuilder()
    .setName("bannedwords")
    .setDescription("Voir la liste des mots bannis")
    .setDefaultMemberPermissions(adminPerm),
  async execute(interaction: ChatInputCommandInteraction) {
    const guildId = interaction.guildId!;
    const words = await db.select().from(bannedWordsTable).where(eq(bannedWordsTable.guildId, guildId));

    if (words.length === 0) {
      return interaction.reply({ content: "Aucun mot banni pour ce serveur.", ephemeral: true });
    }

    const embed = new EmbedBuilder()
      .setTitle("🚫 Mots bannis")
      .setDescription(words.map((w) => `\`${w.word}\``).join(", "))
      .setColor(0xff6b6b)
      .setTimestamp();
    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
  },
};
