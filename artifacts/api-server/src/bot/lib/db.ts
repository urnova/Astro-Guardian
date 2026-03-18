import { db } from "@workspace/db";
import { guildConfigsTable, logsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { EmbedBuilder, TextChannel } from "discord.js";

let getBotClientFn: (() => import("discord.js").Client | null) | null = null;

export function registerBotClientGetter(fn: () => import("discord.js").Client | null) {
  getBotClientFn = fn;
}

export async function getOrCreateConfig(guildId: string) {
  const existing = await db
    .select()
    .from(guildConfigsTable)
    .where(eq(guildConfigsTable.guildId, guildId))
    .limit(1);

  if (existing.length > 0) return existing[0];

  const inserted = await db
    .insert(guildConfigsTable)
    .values({ guildId })
    .returning();

  return inserted[0];
}

const ACTION_COLORS: Record<string, number> = {
  KICK: 0xff6b35,
  BAN: 0xff0000,
  UNBAN: 0x00ff88,
  MUTE: 0xff9900,
  UNMUTE: 0x00ff88,
  WARN: 0xffdd00,
  CLEAR: 0x00aaff,
  NUKE: 0xff4500,
  MASSBAN: 0xff0000,
  BREACH_ON: 0xff0000,
  BREACH_OFF: 0x00ff88,
  MAINTENANCE_ON: 0xffa500,
  MAINTENANCE_OFF: 0x00ff88,
  AUTOMOD_DELETE: 0xff9900,
  MEMBER_JOIN: 0x00ff88,
  MEMBER_LEAVE: 0xaaaaaa,
  ANTIRAID: 0xff6600,
  AUTOMOD: 0x9900ff,
  ANNOUNCE: 0xffd700,
  SAY: 0x00f0ff,
  EMBED: 0x0099ff,
  DM: 0x5865f2,
  RULES_SETUP: 0x00f0ff,
  RULES_ACCEPTED: 0x00ff88,
  SURVEY_CREATE: 0x5865f2,
  SUBMIT_CREATE: 0x00ff88,
  GIVEAWAY_START: 0xff6b9d,
  GIVEAWAY_END: 0xaaaaaa,
};

const ACTION_ICONS: Record<string, string> = {
  KICK: "⚡",
  BAN: "☠️",
  UNBAN: "🔓",
  MUTE: "🔇",
  UNMUTE: "🔊",
  WARN: "⚠️",
  CLEAR: "🧹",
  NUKE: "💥",
  MASSBAN: "☠️",
  BREACH_ON: "🚨",
  BREACH_OFF: "✅",
  MAINTENANCE_ON: "🔧",
  MAINTENANCE_OFF: "✅",
  AUTOMOD_DELETE: "🤖",
  MEMBER_JOIN: "📥",
  MEMBER_LEAVE: "📤",
  ANNOUNCE: "📢",
  SAY: "💬",
  EMBED: "📋",
  DM: "📨",
  RULES_SETUP: "📋",
  RULES_ACCEPTED: "✅",
  SURVEY_CREATE: "📝",
  SUBMIT_CREATE: "📬",
  GIVEAWAY_START: "🎉",
  GIVEAWAY_END: "🏁",
};

export async function addLog(data: {
  guildId: string;
  action: string;
  targetId?: string;
  targetName?: string;
  moderatorId?: string;
  moderatorName?: string;
  details?: string;
}) {
  try {
    await db.insert(logsTable).values(data);
  } catch (err) {
    console.error("[addLog] Erreur insertion DB:", err);
    return;
  }

  try {
    if (!getBotClientFn) return;
    const client = getBotClientFn();
    if (!client || !client.isReady()) return;

    const config = await getOrCreateConfig(data.guildId);
    if (!config.logChannelId) return;

    const guild = client.guilds.cache.get(data.guildId);
    if (!guild) return;

    const channel = guild.channels.cache.get(config.logChannelId);
    if (!(channel instanceof TextChannel)) return;

    const icon = ACTION_ICONS[data.action] || "📋";
    const color = ACTION_COLORS[data.action] || 0x0099ff;

    const embed = new EmbedBuilder()
      .setTitle(`${icon} JOURNAL — ${data.action.replace(/_/g, " ")}`)
      .setColor(color)
      .setTimestamp();

    const fields = [];

    if (data.targetName || data.targetId) {
      fields.push({
        name: "🎯 CIBLE",
        value: `\`${data.targetName || data.targetId}\`${data.targetId ? ` (<@${data.targetId}>)` : ""}`,
        inline: true,
      });
    }

    if (data.moderatorName || data.moderatorId) {
      fields.push({
        name: "👤 OPÉRATEUR",
        value: `\`${data.moderatorName || data.moderatorId}\`${data.moderatorId ? ` (<@${data.moderatorId}>)` : ""}`,
        inline: true,
      });
    }

    if (data.details) {
      fields.push({
        name: "📋 DÉTAILS",
        value: `\`\`\`${data.details}\`\`\``,
        inline: false,
      });
    }

    if (fields.length > 0) embed.addFields(fields);
    embed.setFooter({ text: `⬡ ASTRAL TECHNOLOGIE — SYSTÈME DE JOURNAL` });

    await channel.send({ embeds: [embed] });
  } catch (err) {
    console.error("[addLog] Erreur envoi Discord:", err);
  }
}
