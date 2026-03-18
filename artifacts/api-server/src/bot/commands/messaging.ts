import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ChatInputCommandInteraction,
  TextChannel,
  GuildMember,
} from "discord.js";
import { addLog } from "../lib/db.js";

const adminPerm = PermissionFlagsBits.Administrator;

const ANNOUNCE_TYPES: Record<string, { label: string; icon: string; color: number; separator: string }> = {
  annonce:       { label: "ANNONCE OFFICIELLE",     icon: "📢", color: 0xffd700, separator: "🔔" },
  "mise-a-jour": { label: "MISE À JOUR",            icon: "🔄", color: 0x00aaff, separator: "🔵" },
  evenement:     { label: "ÉVÉNEMENT",              icon: "🎉", color: 0xff6b9d, separator: "🎊" },
  maintenance:   { label: "MAINTENANCE PLANIFIÉE",  icon: "🔧", color: 0xffa500, separator: "⚙️" },
  urgent:        { label: "ALERTE URGENTE",         icon: "🚨", color: 0xff0000, separator: "🔴" },
  information:   { label: "INFORMATION",            icon: "ℹ️", color: 0x00f0ff, separator: "🔷" },
};

export const sayCommand = {
  data: new SlashCommandBuilder()
    .setName("say")
    .setDescription("💬 Faire parler le bot")
    .setDefaultMemberPermissions(adminPerm)
    .addStringOption((o) => o.setName("message").setDescription("Le message à envoyer").setRequired(true))
    .addChannelOption((o) => o.setName("canal").setDescription("Canal cible (optionnel)").setRequired(false)),
  async execute(interaction: ChatInputCommandInteraction) {
    const message = interaction.options.getString("message", true);
    const channel = (interaction.options.getChannel("canal") ?? interaction.channel) as TextChannel;

    try {
      await channel.send(message);
      await interaction.reply({ content: `✅ Message envoyé dans <#${channel.id}>`, ephemeral: true });
      await addLog({ guildId: interaction.guildId!, action: "SAY", moderatorId: interaction.user.id, moderatorName: interaction.user.username, details: message.substring(0, 100) });
    } catch {
      await interaction.reply({ content: "❌ Impossible d'envoyer le message.", ephemeral: true });
    }
  },
};

export const embedCommand = {
  data: new SlashCommandBuilder()
    .setName("embed")
    .setDescription("📋 Envoyer un message embed stylisé")
    .setDefaultMemberPermissions(adminPerm)
    .addStringOption((o) => o.setName("titre").setDescription("Titre de l'embed").setRequired(true))
    .addStringOption((o) => o.setName("description").setDescription("Description").setRequired(true))
    .addChannelOption((o) => o.setName("canal").setDescription("Canal cible").setRequired(false))
    .addStringOption((o) => o.setName("couleur").setDescription("Couleur hex (ex: #ff0000)").setRequired(false))
    .addStringOption((o) => o.setName("image").setDescription("URL de l'image").setRequired(false))
    .addStringOption((o) => o.setName("footer").setDescription("Texte du footer").setRequired(false)),
  async execute(interaction: ChatInputCommandInteraction) {
    const title = interaction.options.getString("titre", true);
    const description = interaction.options.getString("description", true);
    const channel = (interaction.options.getChannel("canal") ?? interaction.channel) as TextChannel;
    const colorStr = interaction.options.getString("couleur") ?? "#0099ff";
    const imageUrl = interaction.options.getString("image");
    const footer = interaction.options.getString("footer");

    let color: number;
    try {
      color = parseInt(colorStr.replace("#", ""), 16);
    } catch {
      color = 0x0099ff;
    }

    const embed = new EmbedBuilder()
      .setTitle(title)
      .setDescription(description)
      .setColor(color)
      .setTimestamp();

    if (imageUrl) embed.setImage(imageUrl);
    if (footer) embed.setFooter({ text: footer });
    else embed.setFooter({ text: `Message officiel • ${interaction.guild!.name}` });

    try {
      await channel.send({ embeds: [embed] });
      await interaction.reply({ content: `✅ Embed envoyé dans <#${channel.id}>`, ephemeral: true });
      await addLog({ guildId: interaction.guildId!, action: "EMBED", moderatorId: interaction.user.id, moderatorName: interaction.user.username, details: title });
    } catch {
      await interaction.reply({ content: "❌ Impossible d'envoyer l'embed.", ephemeral: true });
    }
  },
};

export const announceCommand = {
  data: new SlashCommandBuilder()
    .setName("announce")
    .setDescription("📢 Envoyer une annonce officielle")
    .setDefaultMemberPermissions(adminPerm)
    .addStringOption((o) => o.setName("titre").setDescription("Titre de l'annonce").setRequired(true))
    .addStringOption((o) => o.setName("message").setDescription("Contenu de l'annonce").setRequired(true))
    .addStringOption((o) =>
      o.setName("type")
        .setDescription("Type d'annonce")
        .setRequired(false)
        .addChoices(
          { name: "📢 Annonce générale", value: "annonce" },
          { name: "🔄 Mise à jour", value: "mise-a-jour" },
          { name: "🎉 Événement", value: "evenement" },
          { name: "🔧 Maintenance planifiée", value: "maintenance" },
          { name: "🚨 Alerte urgente", value: "urgent" },
          { name: "ℹ️ Information", value: "information" },
        )
    )
    .addChannelOption((o) => o.setName("canal").setDescription("Canal cible").setRequired(false))
    .addBooleanOption((o) => o.setName("ping_everyone").setDescription("Mentionner @everyone ?").setRequired(false)),
  async execute(interaction: ChatInputCommandInteraction) {
    const title = interaction.options.getString("titre", true);
    const message = interaction.options.getString("message", true);
    const typeKey = interaction.options.getString("type") ?? "annonce";
    const channel = (interaction.options.getChannel("canal") ?? interaction.channel) as TextChannel;
    const pingEveryone = interaction.options.getBoolean("ping_everyone") ?? false;

    const typeInfo = ANNOUNCE_TYPES[typeKey] ?? ANNOUNCE_TYPES["annonce"];

    const embed = new EmbedBuilder()
      .setTitle(`${typeInfo.icon} ${title}`)
      .setDescription(message)
      .setColor(typeInfo.color)
      .setAuthor({ name: typeInfo.label, iconURL: interaction.guild!.iconURL() ?? undefined })
      .setFooter({ text: `${typeInfo.label} • ${interaction.guild!.name}` })
      .setTimestamp();

    const content = pingEveryone ? "@everyone" : "";
    const sep = typeInfo.separator.repeat(8);

    try {
      await channel.send(sep);
      await channel.send({ content, embeds: [embed] });
      await channel.send(sep);
      await interaction.reply({ content: `✅ Annonce **${typeInfo.label}** publiée dans <#${channel.id}>`, ephemeral: true });
      await addLog({ guildId: interaction.guildId!, action: "ANNOUNCE", moderatorId: interaction.user.id, moderatorName: interaction.user.username, details: `[${typeInfo.label}] ${title}` });
    } catch {
      await interaction.reply({ content: "❌ Impossible d'envoyer l'annonce.", ephemeral: true });
    }
  },
};

export const dmCommand = {
  data: new SlashCommandBuilder()
    .setName("dm")
    .setDescription("📨 Envoyer un message privé via le bot")
    .setDefaultMemberPermissions(adminPerm)
    .addUserOption((o) => o.setName("membre").setDescription("Le destinataire").setRequired(true))
    .addStringOption((o) => o.setName("message").setDescription("Le message").setRequired(true)),
  async execute(interaction: ChatInputCommandInteraction) {
    const member = interaction.options.getMember("membre") as GuildMember | null;
    if (!member) return interaction.reply({ content: "❌ Membre introuvable.", ephemeral: true });
    const message = interaction.options.getString("message", true);

    try {
      await member.send(message);
      await interaction.reply({ content: `✅ Message privé envoyé à ${member}`, ephemeral: true });
      await addLog({ guildId: interaction.guildId!, action: "DM", targetId: member.id, targetName: member.user.username, moderatorId: interaction.user.id, moderatorName: interaction.user.username });
    } catch {
      await interaction.reply({ content: `❌ Impossible d'envoyer un MP à ${member} (MP fermés ou bloqué)`, ephemeral: true });
    }
  },
};
