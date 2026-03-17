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

export const maintenanceCommand = {
  data: new SlashCommandBuilder()
    .setName("maintenance")
    .setDescription("🔧 Activer le mode maintenance sur le serveur")
    .setDefaultMemberPermissions(adminPerm)
    .addStringOption((o) => o.setName("raison").setDescription("Raison de la maintenance").setRequired(false)),
  async execute(interaction: ChatInputCommandInteraction) {
    const reason = interaction.options.getString("raison") ?? "Maintenance technique";
    await interaction.reply({ content: "🔧 **INITIALISATION DU MODE MAINTENANCE...**", ephemeral: true });

    await getOrCreateConfig(interaction.guildId!);
    await db.update(guildConfigsTable)
      .set({ maintenanceMode: true, maintenanceReason: reason })
      .where(eq(guildConfigsTable.guildId, interaction.guildId!));

    const embed = new EmbedBuilder()
      .setTitle("🚧 ⚠️ MAINTENANCE EN COURS ⚠️ 🚧")
      .setDescription(`\`\`\`diff\n- SERVEUR EN MAINTENANCE TECHNIQUE\n- ACCÈS UTILISATEUR SUSPENDU\n- INTERVENTIONS ADMINISTRATIVES EN COURS\n\`\`\`\n\n**🔧 RAISON:** \`${reason}\`\n**⚙️ STATUT:** \`MAINTENANCE ACTIVE\`\n**⏰ DÉBUT:** <t:${Math.floor(Date.now() / 1000)}:F>\n**👨‍💻 TECHNICIEN:** ${interaction.user}`)
      .setColor(0xffa500)
      .addFields(
        { name: "⚙️ OPÉRATIONS EN COURS", value: "```yaml\n🔧 Maintenance système active\n🛠️ Interventions techniques\n🔄 Optimisations serveur\n⏸️ Communications suspendues```", inline: false },
        { name: "🚫 RESTRICTIONS ACTIVES", value: "```css\n[BLOQUÉ] Messages utilisateurs\n[AUTORISÉ] Communications admin\n[ACTIF] Surveillance système```", inline: false },
      )
      .setFooter({ text: "🔧 SYSTÈME ASTRAL TECHNOLOGIE | MAINTENANCE ACTIVE" })
      .setTimestamp();

    for (const channel of interaction.guild!.channels.cache.values()) {
      if (channel instanceof TextChannel) {
        try { await channel.send({ embeds: [embed] }); } catch {}
      }
    }

    await interaction.followUp({ content: "✅ **MODE MAINTENANCE ACTIVÉ**", ephemeral: true });
    await addLog({ guildId: interaction.guildId!, action: "MAINTENANCE_ON", moderatorId: interaction.user.id, moderatorName: interaction.user.username, details: reason });
  },
};

export const maintenanceOffCommand = {
  data: new SlashCommandBuilder()
    .setName("maintenance_off")
    .setDescription("✅ Désactiver le mode maintenance")
    .setDefaultMemberPermissions(adminPerm),
  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.reply({ content: "✅ **FINALISATION DE LA MAINTENANCE...**", ephemeral: true });

    await getOrCreateConfig(interaction.guildId!);
    await db.update(guildConfigsTable)
      .set({ maintenanceMode: false, maintenanceReason: null })
      .where(eq(guildConfigsTable.guildId, interaction.guildId!));

    const embed = new EmbedBuilder()
      .setTitle("🎉 ✨ MAINTENANCE TERMINÉE ✨ 🎉")
      .setDescription(`\`\`\`diff\n+ MAINTENANCE TECHNIQUE COMPLÉTÉE\n+ SERVEUR PLEINEMENT OPÉRATIONNEL\n+ COMMUNICATIONS RÉTABLIES\n\`\`\`\n\n**✅ STATUT:** \`OPÉRATIONNEL\`\n**⏰ FIN:** <t:${Math.floor(Date.now() / 1000)}:F>\n**👨‍💻 TECHNICIEN:** ${interaction.user}`)
      .setColor(0x00ff66)
      .addFields(
        { name: "🎊 MAINTENANCE RÉUSSIE", value: "```yaml\n✅ Système entièrement opérationnel\n✅ Communications restaurées\n✅ Optimisations appliquées\n✅ Serveur stabilisé```", inline: false },
        { name: "📢 ANNONCE", value: "```fix\nLe serveur est maintenant pleinement fonctionnel !\nMerci de votre patience pendant la maintenance.```", inline: false },
      )
      .setFooter({ text: "✅ SYSTÈME ASTRAL TECHNOLOGIE | SERVEUR OPÉRATIONNEL" })
      .setTimestamp();

    for (const channel of interaction.guild!.channels.cache.values()) {
      if (channel instanceof TextChannel) {
        try { await channel.send({ embeds: [embed] }); } catch {}
      }
    }

    await interaction.followUp({ content: "✅ **MAINTENANCE TERMINÉE — Serveur opérationnel**", ephemeral: true });
    await addLog({ guildId: interaction.guildId!, action: "MAINTENANCE_OFF", moderatorId: interaction.user.id, moderatorName: interaction.user.username });
  },
};

export const setlogchannelCommand = {
  data: new SlashCommandBuilder()
    .setName("setlogchannel")
    .setDescription("📝 Définir le canal de logs")
    .setDefaultMemberPermissions(adminPerm)
    .addChannelOption((o) => o.setName("canal").setDescription("Canal de logs").setRequired(true)),
  async execute(interaction: ChatInputCommandInteraction) {
    const channel = interaction.options.getChannel("canal", true);
    await getOrCreateConfig(interaction.guildId!);
    await db.update(guildConfigsTable)
      .set({ logChannelId: channel.id })
      .where(eq(guildConfigsTable.guildId, interaction.guildId!));

    const embed = new EmbedBuilder()
      .setTitle("📝 Canal de logs défini")
      .setDescription(`Les logs seront envoyés dans <#${channel.id}>`)
      .setColor(0x0099ff)
      .setTimestamp();
    await interaction.reply({ embeds: [embed] });
  },
};
