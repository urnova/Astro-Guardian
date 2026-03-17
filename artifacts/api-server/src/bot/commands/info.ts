import {
  SlashCommandBuilder,
  EmbedBuilder,
  ChatInputCommandInteraction,
  GuildMember,
} from "discord.js";

export const serverinfoCommand = {
  data: new SlashCommandBuilder()
    .setName("serverinfo")
    .setDescription("📊 Informations détaillées du serveur"),
  async execute(interaction: ChatInputCommandInteraction) {
    const guild = interaction.guild!;

    const embed = new EmbedBuilder()
      .setTitle(`📊 ${guild.name}`)
      .setThumbnail(guild.iconURL())
      .setColor(0x0099ff)
      .addFields(
        { name: "👥 Membres", value: `**${guild.memberCount}**`, inline: true },
        { name: "📺 Canaux", value: `**${guild.channels.cache.size}**`, inline: true },
        { name: "🎭 Rôles", value: `**${guild.roles.cache.size}**`, inline: true },
        { name: "📅 Créé le", value: `<t:${Math.floor(guild.createdAt.getTime() / 1000)}:D>`, inline: true },
        { name: "👑 Propriétaire", value: `<@${guild.ownerId}>`, inline: true },
        { name: "🔒 Vérification", value: guild.verificationLevel.toString(), inline: true },
        { name: "🚀 Boost", value: `Niveau **${guild.premiumTier}** — **${guild.premiumSubscriptionCount ?? 0}** boosts`, inline: false },
        { name: "🆔 ID", value: `\`${guild.id}\``, inline: false },
      )
      .setFooter({ text: "ASTRAL TECHNOLOGIE — Analyse serveur" })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};

export const userinfoCommand = {
  data: new SlashCommandBuilder()
    .setName("userinfo")
    .setDescription("👤 Analyser un utilisateur")
    .addUserOption((o) => o.setName("membre").setDescription("Le membre à analyser (optionnel)").setRequired(false)),
  async execute(interaction: ChatInputCommandInteraction) {
    const member = (interaction.options.getMember("membre") ?? interaction.member) as GuildMember;
    const user = member.user;

    const embed = new EmbedBuilder()
      .setTitle(`👤 Analyse — ${user.username}`)
      .setThumbnail(user.displayAvatarURL())
      .setColor(member.displayColor || 0x0099ff)
      .addFields(
        { name: "🆔 ID", value: `\`${user.id}\``, inline: true },
        { name: "🏷️ Surnom", value: member.nickname ?? "Aucun", inline: true },
        { name: "🤖 Bot", value: user.bot ? "Oui" : "Non", inline: true },
        { name: "📅 Compte créé", value: `<t:${Math.floor(user.createdAt.getTime() / 1000)}:D>`, inline: true },
        { name: "📥 Rejoint le", value: member.joinedAt ? `<t:${Math.floor(member.joinedAt.getTime() / 1000)}:D>` : "Inconnu", inline: true },
        { name: "🎭 Rôles", value: `**${member.roles.cache.size - 1}**`, inline: true },
        { name: "🎭 Rôle principal", value: member.roles.highest.toString(), inline: false },
      )
      .setFooter({ text: "ASTRAL TECHNOLOGIE — Analyse utilisateur" })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};

export const commandsListCommand = {
  data: new SlashCommandBuilder()
    .setName("commands")
    .setDescription("📋 Liste complète de toutes les commandes"),
  async execute(interaction: ChatInputCommandInteraction) {
    const isAdmin = (interaction.member as GuildMember).permissions.has("Administrator");

    const embed = new EmbedBuilder()
      .setTitle("🚀 ASTRAL-BOT — Commandes disponibles")
      .setColor(0x5865f2)
      .setDescription("```css\n[SYSTÈME DE COMMANDES ASTRAL TECHNOLOGIE]\n```");

    if (isAdmin) {
      embed.addFields(
        { name: "🔨 Modération", value: "`/kick` `/ban` `/unban` `/mute` `/unmute` `/clear` `/warn` `/warns` `/unwarn` `/massban`", inline: false },
        { name: "🚨 Sécurité", value: "`/breach` `/unbreach` `/nuke` `/antiraid` `/automod` `/addword` `/removeword` `/bannedwords`", inline: false },
        { name: "🔧 Système", value: "`/maintenance` `/maintenance_off` `/setlogchannel`", inline: false },
        { name: "📢 Messagerie", value: "`/say` `/embed` `/announce` `/dm`", inline: false },
        { name: "🎉 Giveaway", value: "`/giveaway create` `/giveaway end`", inline: false },
        { name: "📝 Questionnaire", value: "`/survey create` `/survey list`", inline: false },
      );
    }

    embed.addFields(
      { name: "ℹ️ Informations", value: "`/serverinfo` `/userinfo` `/commands`", inline: false },
      { name: "🤖 Chat", value: "`/chat` — Parler avec le bot IA", inline: false },
    );

    embed.setFooter({ text: "ASTRAL TECHNOLOGIE | Panel: /astral-panel" }).setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
