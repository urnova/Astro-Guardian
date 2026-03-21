import {
  Client, Events, GuildMember, PartialGuildMember,
  ChatInputCommandInteraction, ButtonInteraction, ModalSubmitInteraction,
  TextChannel, VoiceChannel, PartialMessage, Message, Role, GuildChannel,
  GuildEmoji, Guild,
} from "discord.js";
import { handleSurveyButton, handleSurveyModal } from "../commands/survey.js";
import { handleRulesButton } from "../commands/rules.js";
import { db } from "@workspace/db";
import { bannedWordsTable, guildConfigsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { getOrCreateConfig, addLog } from "../lib/db.js";

function applyPlaceholders(template: string, userId: string, username: string, serverName: string): string {
  return template
    .replace(/{user}/g, `<@${userId}>`)
    .replace(/{username}/g, username)
    .replace(/{server}/g, serverName);
}

export function registerEvents(client: Client): void {

  // ─── Interactions ────────────────────────────────────────────────────────────
  client.on(Events.InteractionCreate, async (interaction) => {
    try {
      if (interaction.isChatInputCommand()) {
        const command = client.commands.get(interaction.commandName);
        if (!command) return;
        await command.execute(interaction as ChatInputCommandInteraction);
      } else if (interaction.isButton()) {
        const handledByRules = await handleRulesButton(interaction as ButtonInteraction);
        if (!handledByRules) await handleSurveyButton(interaction as ButtonInteraction);
      } else if (interaction.isModalSubmit()) {
        await handleSurveyModal(interaction as ModalSubmitInteraction);
      }
    } catch (err) {
      console.error("Erreur interaction:", err);
      try {
        if ((interaction as any).replied || (interaction as any).deferred) {
          await (interaction as any).followUp({ content: "❌ Une erreur est survenue.", ephemeral: true });
        } else {
          await (interaction as any).reply({ content: "❌ Une erreur est survenue.", ephemeral: true });
        }
      } catch {}
    }
  });

  // ─── Automod + message create ────────────────────────────────────────────────
  client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot || !message.guildId) return;
    try {
      const config = await getOrCreateConfig(message.guildId);
      if (!config.automodEnabled) return;
      const bannedWords = await db.select().from(bannedWordsTable).where(eq(bannedWordsTable.guildId, message.guildId));
      const content = message.content.toLowerCase();
      for (const { word } of bannedWords) {
        if (content.includes(word)) {
          await message.delete();
          const warning = await message.channel.send(`⚠️ ${message.author}, ce message a été supprimé par l'automodération.`);
          setTimeout(() => warning.delete().catch(() => {}), 5000);
          await addLog({ guildId: message.guildId, action: "AUTOMOD_DELETE", targetId: message.author.id, targetName: message.author.username, details: `Mot banni: "${word}" dans #${(message.channel as TextChannel).name ?? message.channelId}` });
          return;
        }
      }
    } catch {}
  });

  // ─── Message supprimé ────────────────────────────────────────────────────────
  client.on(Events.MessageDelete, async (message: Message | PartialMessage) => {
    if (!message.guildId || message.author?.bot) return;
    try {
      const channelName = (message.channel as TextChannel).name ?? message.channelId;
      await addLog({ guildId: message.guildId, action: "MESSAGE_DELETE", targetId: message.author?.id, targetName: message.author?.username, details: `#${channelName} — "${(message.content ?? "").substring(0, 120)}"` });
    } catch {}
  });

  // ─── Message modifié ─────────────────────────────────────────────────────────
  client.on(Events.MessageUpdate, async (oldMsg: Message | PartialMessage, newMsg: Message | PartialMessage) => {
    if (!newMsg.guildId || newMsg.author?.bot) return;
    if (oldMsg.content === newMsg.content) return;
    try {
      const channelName = (newMsg.channel as TextChannel).name ?? newMsg.channelId;
      await addLog({ guildId: newMsg.guildId, action: "MESSAGE_EDIT", targetId: newMsg.author?.id, targetName: newMsg.author?.username, details: `#${channelName} | Avant: "${(oldMsg.content ?? "").substring(0, 80)}" → Après: "${(newMsg.content ?? "").substring(0, 80)}"` });
    } catch {}
  });

  // ─── Membre rejoint ──────────────────────────────────────────────────────────
  client.on(Events.GuildMemberAdd, async (member) => {
    try {
      const accountAge = Math.floor((Date.now() - member.user.createdAt.getTime()) / (1000 * 60 * 60 * 24));
      await addLog({ guildId: member.guild.id, action: "MEMBER_JOIN", targetId: member.id, targetName: member.user.username, details: `Compte créé il y a ${accountAge} jour(s)` });

      const config = await db.select().from(guildConfigsTable).where(eq(guildConfigsTable.guildId, member.guild.id)).then(r => r[0]);
      if (config?.welcomeChannelId) {
        const channel = member.guild.channels.cache.get(config.welcomeChannelId) as TextChannel | undefined;
        if (channel) {
          const msg = config.welcomeMessage || "Bienvenue {user} sur **{server}** ! 👋";
          await channel.send(applyPlaceholders(msg, member.id, member.user.username, member.guild.name));
        }
      }
    } catch {}
  });

  // ─── Membre parti ────────────────────────────────────────────────────────────
  client.on(Events.GuildMemberRemove, async (member) => {
    try {
      const roles = member.roles.cache.filter(r => r.id !== member.guild.id).map(r => r.name).join(", ");
      await addLog({ guildId: member.guild.id, action: "MEMBER_LEAVE", targetId: member.id, targetName: member.user.username, details: roles ? `Rôles: ${roles}` : undefined });

      const config = await db.select().from(guildConfigsTable).where(eq(guildConfigsTable.guildId, member.guild.id)).then(r => r[0]);
      if (config?.goodbyeChannelId) {
        const channel = member.guild.channels.cache.get(config.goodbyeChannelId) as TextChannel | undefined;
        if (channel) {
          const msg = config.goodbyeMessage || "**{username}** a quitté **{server}**. 👋";
          await channel.send(applyPlaceholders(msg, member.id, member.user.username, member.guild.name));
        }
      }
    } catch {}
  });

  // ─── Mise à jour d'un membre (rôles, pseudo, timeout) ───────────────────────
  client.on(Events.GuildMemberUpdate, async (oldMember: GuildMember | PartialGuildMember, newMember: GuildMember) => {
    try {
      const guildId = newMember.guild.id;

      // Nickname changed
      if (oldMember.nickname !== newMember.nickname) {
        await addLog({ guildId, action: "NICKNAME_CHANGE", targetId: newMember.id, targetName: newMember.user.username, details: `"${oldMember.nickname ?? oldMember.user?.username}" → "${newMember.nickname ?? newMember.user.username}"` });
      }

      // Timeout added/modified
      const oldTimeout = (oldMember as GuildMember).communicationDisabledUntilTimestamp;
      const newTimeout = newMember.communicationDisabledUntilTimestamp;
      if (newTimeout && !oldTimeout) {
        const duration = Math.round(((newTimeout ?? 0) - Date.now()) / 60000);
        await addLog({ guildId, action: "MEMBER_TIMEOUT", targetId: newMember.id, targetName: newMember.user.username, details: `Timeout: ${duration > 0 ? `${duration} minute(s)` : "expiré"}` });
      } else if (!newTimeout && oldTimeout) {
        await addLog({ guildId, action: "MEMBER_TIMEOUT_REMOVE", targetId: newMember.id, targetName: newMember.user.username, details: "Timeout levé" });
      }

      // Roles added
      const addedRoles = newMember.roles.cache.filter(r => !oldMember.roles.cache.has(r.id) && r.id !== guildId);
      for (const role of addedRoles.values()) {
        await addLog({ guildId, action: "ROLE_ADDED", targetId: newMember.id, targetName: newMember.user.username, details: `Rôle ajouté: ${role.name}` });
      }

      // Roles removed
      const removedRoles = oldMember.roles.cache?.filter(r => !newMember.roles.cache.has(r.id) && r.id !== guildId);
      if (removedRoles) {
        for (const role of removedRoles.values()) {
          await addLog({ guildId, action: "ROLE_REMOVED", targetId: newMember.id, targetName: newMember.user.username, details: `Rôle retiré: ${role.name}` });
        }
      }
    } catch {}
  });

  // ─── Ban Discord ──────────────────────────────────────────────────────────────
  client.on(Events.GuildBanAdd, async (ban) => {
    try {
      await addLog({ guildId: ban.guild.id, action: "BAN", targetId: ban.user.id, targetName: ban.user.username, details: ban.reason ? `Raison: ${ban.reason}` : "Banni du serveur" });
    } catch {}
  });

  // ─── Déban Discord ────────────────────────────────────────────────────────────
  client.on(Events.GuildBanRemove, async (ban) => {
    try {
      await addLog({ guildId: ban.guild.id, action: "UNBAN", targetId: ban.user.id, targetName: ban.user.username, details: "Ban levé" });
    } catch {}
  });

  // ─── Rôle créé ───────────────────────────────────────────────────────────────
  client.on(Events.GuildRoleCreate, async (role: Role) => {
    try {
      await addLog({ guildId: role.guild.id, action: "ROLE_CREATE", details: `Rôle créé: ${role.name} (couleur: ${role.hexColor})` });
    } catch {}
  });

  // ─── Rôle supprimé ───────────────────────────────────────────────────────────
  client.on(Events.GuildRoleDelete, async (role: Role) => {
    try {
      await addLog({ guildId: role.guild.id, action: "ROLE_DELETE", details: `Rôle supprimé: ${role.name}` });
    } catch {}
  });

  // ─── Rôle modifié ────────────────────────────────────────────────────────────
  client.on(Events.GuildRoleUpdate, async (oldRole: Role, newRole: Role) => {
    try {
      const changes: string[] = [];
      if (oldRole.name !== newRole.name) changes.push(`Nom: "${oldRole.name}" → "${newRole.name}"`);
      if (oldRole.hexColor !== newRole.hexColor) changes.push(`Couleur: ${oldRole.hexColor} → ${newRole.hexColor}`);
      if (oldRole.permissions.bitfield !== newRole.permissions.bitfield) changes.push("Permissions modifiées");
      if (oldRole.hoist !== newRole.hoist) changes.push(`Affiché séparément: ${newRole.hoist ? "oui" : "non"}`);
      if (oldRole.mentionable !== newRole.mentionable) changes.push(`Mentionnable: ${newRole.mentionable ? "oui" : "non"}`);
      if (changes.length === 0) return;
      await addLog({ guildId: newRole.guild.id, action: "ROLE_UPDATE", details: `@${newRole.name} — ${changes.join(" | ")}` });
    } catch {}
  });

  // ─── Salon créé ──────────────────────────────────────────────────────────────
  client.on(Events.ChannelCreate, async (channel) => {
    if (!('guildId' in channel) || !channel.guildId) return;
    try {
      await addLog({ guildId: channel.guildId, action: "CHANNEL_CREATE", details: `Salon créé: #${(channel as GuildChannel).name}` });
    } catch {}
  });

  // ─── Salon supprimé ──────────────────────────────────────────────────────────
  client.on(Events.ChannelDelete, async (channel) => {
    if (!('guildId' in channel) || !channel.guildId) return;
    try {
      await addLog({ guildId: channel.guildId, action: "CHANNEL_DELETE", details: `Salon supprimé: #${(channel as GuildChannel).name}` });
    } catch {}
  });

  // ─── Salon modifié ────────────────────────────────────────────────────────────
  client.on(Events.ChannelUpdate, async (oldChannel, newChannel) => {
    if (!('guildId' in newChannel) || !newChannel.guildId) return;
    try {
      const changes: string[] = [];
      const oldCh = oldChannel as GuildChannel;
      const newCh = newChannel as GuildChannel;
      if (oldCh.name !== newCh.name) changes.push(`Nom: "#${oldCh.name}" → "#${newCh.name}"`);
      if ('topic' in oldCh && 'topic' in newCh && oldCh.topic !== newCh.topic) changes.push(`Sujet modifié`);
      if ('nsfw' in oldCh && 'nsfw' in newCh && oldCh.nsfw !== newCh.nsfw) changes.push(`NSFW: ${newCh.nsfw ? "activé" : "désactivé"}`);
      if (changes.length === 0) return;
      await addLog({ guildId: newChannel.guildId, action: "CHANNEL_UPDATE", details: `#${newCh.name} — ${changes.join(" | ")}` });
    } catch {}
  });

  // ─── Vocal join/leave/move ───────────────────────────────────────────────────
  client.on(Events.VoiceStateUpdate, async (oldState, newState) => {
    if (!newState.guild) return;
    const guildId = newState.guild.id;
    const member = newState.member;
    if (!member || member.user.bot) return;
    try {
      if (!oldState.channelId && newState.channelId) {
        await addLog({ guildId, action: "VOICE_JOIN", targetId: member.id, targetName: member.user.username, details: `A rejoint: #${newState.channel?.name ?? newState.channelId}` });
      } else if (oldState.channelId && !newState.channelId) {
        await addLog({ guildId, action: "VOICE_LEAVE", targetId: member.id, targetName: member.user.username, details: `A quitté: #${oldState.channel?.name ?? oldState.channelId}` });
      } else if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
        await addLog({ guildId, action: "VOICE_MOVE", targetId: member.id, targetName: member.user.username, details: `#${oldState.channel?.name} → #${newState.channel?.name}` });
      }
    } catch {}
  });

  // ─── Invitation créée ────────────────────────────────────────────────────────
  client.on(Events.InviteCreate, async (invite) => {
    if (!invite.guild) return;
    try {
      await addLog({ guildId: invite.guild.id, action: "INVITE_CREATE", targetId: invite.inviter?.id, targetName: invite.inviter?.username, details: `Code: ${invite.code} | Max: ${invite.maxUses ?? "∞"} | Expire: ${invite.maxAge ? `${invite.maxAge / 3600}h` : "jamais"}` });
    } catch {}
  });

  // ─── Emoji créé ──────────────────────────────────────────────────────────────
  client.on(Events.GuildEmojiCreate, async (emoji: GuildEmoji) => {
    try {
      await addLog({ guildId: emoji.guild.id, action: "EMOJI_CREATE", details: `Emoji ajouté: :${emoji.name}: (${emoji.animated ? "animé" : "statique"})` });
    } catch {}
  });

  // ─── Emoji supprimé ──────────────────────────────────────────────────────────
  client.on(Events.GuildEmojiDelete, async (emoji: GuildEmoji) => {
    try {
      await addLog({ guildId: emoji.guild.id, action: "EMOJI_DELETE", details: `Emoji supprimé: :${emoji.name}:` });
    } catch {}
  });

  // ─── Serveur modifié ─────────────────────────────────────────────────────────
  client.on(Events.GuildUpdate, async (oldGuild: Guild, newGuild: Guild) => {
    try {
      const changes: string[] = [];
      if (oldGuild.name !== newGuild.name) changes.push(`Nom: "${oldGuild.name}" → "${newGuild.name}"`);
      if (oldGuild.description !== newGuild.description) changes.push("Description modifiée");
      if (oldGuild.icon !== newGuild.icon) changes.push("Icône modifiée");
      if (oldGuild.banner !== newGuild.banner) changes.push("Bannière modifiée");
      if (oldGuild.verificationLevel !== newGuild.verificationLevel) changes.push(`Niveau vérification: ${newGuild.verificationLevel}`);
      if (changes.length === 0) return;
      await addLog({ guildId: newGuild.id, action: "SERVER_UPDATE", details: changes.join(" | ") });
    } catch {}
  });

  // ─── Événement Discord créé ──────────────────────────────────────────────────
  client.on(Events.GuildScheduledEventCreate, async (event) => {
    try {
      await addLog({ guildId: event.guild?.id ?? event.guildId, action: "EVENT_CREATE", details: `Événement créé: "${event.name}"${event.scheduledStartAt ? ` — le ${event.scheduledStartAt.toLocaleDateString("fr-FR")}` : ""}` });
    } catch {}
  });
}
