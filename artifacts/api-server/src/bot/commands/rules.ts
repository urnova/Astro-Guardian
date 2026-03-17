import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChatInputCommandInteraction,
  ButtonInteraction,
  TextChannel,
} from "discord.js";
import { db } from "@workspace/db";
import { serverRulesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { addLog } from "../lib/db.js";

const ACCEPT_BUTTON_PREFIX = "rules_accept_";

export const rulesCommand = {
  data: new SlashCommandBuilder()
    .setName("rules")
    .setDescription("Gérer le message de règles du serveur")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand((sub) =>
      sub
        .setName("setup")
        .setDescription("Créer ou mettre à jour le message de règles")
        .addChannelOption((o) =>
          o.setName("salon").setDescription("Salon où envoyer les règles").setRequired(true)
        )
        .addStringOption((o) =>
          o.setName("titre").setDescription("Titre du message de règles").setRequired(true)
        )
        .addStringOption((o) =>
          o.setName("description").setDescription("Contenu des règles (utilisez \\n pour les sauts de ligne)").setRequired(true)
        )
        .addRoleOption((o) =>
          o.setName("role").setDescription("Rôle attribué automatiquement à l'acceptation").setRequired(false)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("info")
        .setDescription("Afficher les règles configurées pour ce serveur")
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const subcommand = interaction.options.getSubcommand();
    const guildId = interaction.guildId!;

    if (subcommand === "setup") {
      await interaction.deferReply({ ephemeral: true });

      const channel = interaction.options.getChannel("salon") as TextChannel;
      const title = interaction.options.getString("titre", true);
      const rawDescription = interaction.options.getString("description", true);
      const description = rawDescription.replace(/\\n/g, "\n");
      const role = interaction.options.getRole("role");

      const existing = await db
        .select()
        .from(serverRulesTable)
        .where(eq(serverRulesTable.guildId, guildId))
        .limit(1);

      const embed = new EmbedBuilder()
        .setTitle(`📋 ${title}`)
        .setDescription(description)
        .setColor(0x00f0ff)
        .setFooter({ text: "En cliquant sur ✅ J'accepte les règles, vous recevrez accès au serveur." })
        .setTimestamp();

      const button = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(`${ACCEPT_BUTTON_PREFIX}${guildId}`)
          .setLabel("✅  J'accepte les règles")
          .setStyle(ButtonStyle.Success)
      );

      let messageId: string | undefined;

      if (existing.length > 0 && existing[0].messageId) {
        try {
          const oldChannel = interaction.guild?.channels.cache.get(existing[0].channelId) as TextChannel | undefined;
          const oldMessage = await oldChannel?.messages.fetch(existing[0].messageId).catch(() => null);
          if (oldMessage) {
            await oldMessage.edit({ embeds: [embed], components: [button] });
            messageId = oldMessage.id;
          }
        } catch {}
      }

      if (!messageId) {
        const sent = await channel.send({ embeds: [embed], components: [button] });
        messageId = sent.id;
      }

      const data = {
        channelId: channel.id,
        messageId,
        title,
        description,
        memberRoleId: role?.id ?? existing[0]?.memberRoleId ?? null,
        enabled: true,
        updatedAt: new Date(),
      };

      if (existing.length > 0) {
        await db.update(serverRulesTable).set(data).where(eq(serverRulesTable.guildId, guildId));
      } else {
        await db.insert(serverRulesTable).values({ guildId, ...data });
      }

      await addLog({
        guildId,
        action: "RULES_SETUP",
        moderatorId: interaction.user.id,
        moderatorName: interaction.user.username,
        details: `Règles configurées dans #${channel.name}${role ? ` • Rôle: ${role.name}` : ""}`,
      });

      await interaction.editReply({
        content: `✅ Les règles ont été ${existing.length > 0 ? "mises à jour" : "publiées"} dans ${channel}${role ? ` • Rôle d'acceptation : **${role.name}**` : ""}.`,
      });
    }

    if (subcommand === "info") {
      const existing = await db
        .select()
        .from(serverRulesTable)
        .where(eq(serverRulesTable.guildId, guildId))
        .limit(1);

      if (existing.length === 0) {
        return interaction.reply({ content: "❌ Aucune règle configurée. Utilisez `/rules setup` pour en créer.", ephemeral: true });
      }

      const r = existing[0];
      const embed = new EmbedBuilder()
        .setTitle("ℹ️ Configuration des règles")
        .addFields(
          { name: "Salon", value: `<#${r.channelId}>`, inline: true },
          { name: "Message", value: r.messageId ? `[Voir le message](https://discord.com/channels/${guildId}/${r.channelId}/${r.messageId})` : "Non envoyé", inline: true },
          { name: "Rôle d'acceptation", value: r.memberRoleId ? `<@&${r.memberRoleId}>` : "Aucun", inline: true },
          { name: "Statut", value: r.enabled ? "✅ Actif" : "❌ Désactivé", inline: true }
        )
        .setColor(0x00f0ff)
        .setTimestamp();

      await interaction.reply({ embeds: [embed], ephemeral: true });
    }
  },
};

export async function handleRulesButton(interaction: ButtonInteraction): Promise<boolean> {
  if (!interaction.customId.startsWith(ACCEPT_BUTTON_PREFIX)) return false;

  const guildId = interaction.guildId!;
  await interaction.deferReply({ ephemeral: true });

  try {
    const rules = await db
      .select()
      .from(serverRulesTable)
      .where(eq(serverRulesTable.guildId, guildId))
      .limit(1);

    if (rules.length === 0 || !rules[0].memberRoleId) {
      await interaction.editReply({ content: "✅ Règles acceptées ! Bienvenue sur le serveur." });
      return true;
    }

    const roleId = rules[0].memberRoleId;
    const guild = interaction.guild;

    if (!guild) {
      await interaction.editReply({ content: "❌ Impossible de trouver le serveur." });
      return true;
    }

    const member = await guild.members.fetch(interaction.user.id);

    if (member.roles.cache.has(roleId)) {
      await interaction.editReply({ content: "✅ Tu as déjà accepté les règles et possèdes déjà le rôle Membre." });
      return true;
    }

    await member.roles.add(roleId);

    await addLog({
      guildId,
      action: "RULES_ACCEPTED",
      targetId: interaction.user.id,
      targetName: interaction.user.username,
      details: `Rôle <@&${roleId}> attribué suite à l'acceptation des règles`,
    });

    await interaction.editReply({ content: "✅ Tu as accepté les règles ! Le rôle Membre t'a été attribué. Bienvenue !" });
  } catch (err) {
    console.error("Erreur attribution rôle rules:", err);
    await interaction.editReply({ content: "✅ Règles acceptées ! (Le rôle n'a pas pu être attribué automatiquement, contacte un administrateur.)" });
  }

  return true;
}
