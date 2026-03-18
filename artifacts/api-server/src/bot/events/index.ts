import { Client, Events, ChatInputCommandInteraction, ButtonInteraction, ModalSubmitInteraction, TextChannel } from "discord.js";
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
  client.on(Events.InteractionCreate, async (interaction) => {
    try {
      if (interaction.isChatInputCommand()) {
        const command = client.commands.get(interaction.commandName);
        if (!command) return;
        await command.execute(interaction as ChatInputCommandInteraction);
      } else if (interaction.isButton()) {
        const handledByRules = await handleRulesButton(interaction as ButtonInteraction);
        if (!handledByRules) {
          await handleSurveyButton(interaction as ButtonInteraction);
        }
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

  client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot || !message.guildId) return;

    try {
      const config = await getOrCreateConfig(message.guildId);
      if (!config.automodEnabled) return;

      const bannedWords = await db.select().from(bannedWordsTable)
        .where(eq(bannedWordsTable.guildId, message.guildId));

      const content = message.content.toLowerCase();
      for (const { word } of bannedWords) {
        if (content.includes(word)) {
          await message.delete();
          const warning = await message.channel.send(`⚠️ ${message.author}, ce message a été supprimé par l'automodération.`);
          setTimeout(() => warning.delete().catch(() => {}), 5000);
          await addLog({
            guildId: message.guildId,
            action: "AUTOMOD_DELETE",
            targetId: message.author.id,
            targetName: message.author.username,
            details: `Mot banni: "${word}"`,
          });
          return;
        }
      }
    } catch {}
  });

  client.on(Events.GuildMemberAdd, async (member) => {
    try {
      await addLog({
        guildId: member.guild.id,
        action: "MEMBER_JOIN",
        targetId: member.id,
        targetName: member.user.username,
      });

      const config = await db.select().from(guildConfigsTable)
        .where(eq(guildConfigsTable.guildId, member.guild.id))
        .then(r => r[0]);

      if (config?.welcomeChannelId) {
        const channel = member.guild.channels.cache.get(config.welcomeChannelId) as TextChannel | undefined;
        if (channel) {
          const msg = config.welcomeMessage || "Bienvenue {user} sur **{server}** ! 👋";
          await channel.send(applyPlaceholders(msg, member.id, member.user.username, member.guild.name));
        }
      }
    } catch {}
  });

  client.on(Events.GuildMemberRemove, async (member) => {
    try {
      await addLog({
        guildId: member.guild.id,
        action: "MEMBER_LEAVE",
        targetId: member.id,
        targetName: member.user.username,
      });

      const config = await db.select().from(guildConfigsTable)
        .where(eq(guildConfigsTable.guildId, member.guild.id))
        .then(r => r[0]);

      if (config?.goodbyeChannelId) {
        const channel = member.guild.channels.cache.get(config.goodbyeChannelId) as TextChannel | undefined;
        if (channel) {
          const msg = config.goodbyeMessage || "**{username}** a quitté **{server}**. 👋";
          await channel.send(applyPlaceholders(msg, member.id, member.user.username, member.guild.name));
        }
      }
    } catch {}
  });
}
