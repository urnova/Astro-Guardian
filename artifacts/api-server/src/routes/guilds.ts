import { Router } from "express";
import { db } from "@workspace/db";
import {
  guildConfigsTable,
  warnsTable,
  bannedWordsTable,
  giveawaysTable,
  surveysTable,
  surveyResponsesTable,
  logsTable,
  serverRulesTable,
} from "@workspace/db";
import { eq, and, desc, count } from "drizzle-orm";
import { getBotClient } from "../bot/index.js";
import { getOrCreateConfig } from "../bot/lib/db.js";
import { ChannelType, EmbedBuilder, TextChannel, ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";

const router = Router();

async function getGuild(guildId: string) {
  const client = getBotClient();
  if (!client) return null;
  return client.guilds.cache.get(guildId) ?? null;
}

router.get("/:guildId/config", async (req, res) => {
  try {
    const config = await getOrCreateConfig(req.params.guildId);
    res.json(config);
  } catch (e) {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

router.put("/:guildId/config", async (req, res) => {
  try {
    const { guildId } = req.params;
    await getOrCreateConfig(guildId);
    const updated = await db
      .update(guildConfigsTable)
      .set({ ...req.body, updatedAt: new Date() })
      .where(eq(guildConfigsTable.guildId, guildId))
      .returning();
    res.json(updated[0]);
  } catch {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

router.get("/:guildId/stats", async (req, res) => {
  try {
    const { guildId } = req.params;
    const guild = await getGuild(guildId);

    const [[warnRes], [giveRes], [survRes], [wordRes], [logRes]] = await Promise.all([
      db.select({ c: count() }).from(warnsTable).where(eq(warnsTable.guildId, guildId)),
      db.select({ c: count() }).from(giveawaysTable).where(eq(giveawaysTable.guildId, guildId)),
      db.select({ c: count() }).from(surveysTable).where(eq(surveysTable.guildId, guildId)),
      db.select({ c: count() }).from(bannedWordsTable).where(eq(bannedWordsTable.guildId, guildId)),
      db.select({ c: count() }).from(logsTable).where(eq(logsTable.guildId, guildId)),
    ]);

    res.json({
      memberCount: guild?.memberCount ?? 0,
      channelCount: guild?.channels.cache.size ?? 0,
      roleCount: guild?.roles.cache.size ?? 0,
      warnCount: Number(warnRes.c),
      giveawayCount: Number(giveRes.c),
      surveyCount: Number(survRes.c),
      bannedWordCount: Number(wordRes.c),
      logCount: Number(logRes.c),
      boostLevel: guild?.premiumTier ?? 0,
      boostCount: guild?.premiumSubscriptionCount ?? 0,
    });
  } catch {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

router.get("/:guildId/channels", async (req, res) => {
  try {
    const guild = await getGuild(req.params.guildId);
    if (!guild) return res.json([]);

    const channels = guild.channels.cache
      .filter((c) => c.type === ChannelType.GuildText)
      .map((c) => ({ id: c.id, name: (c as any).name, type: c.type }));

    res.json(channels);
  } catch {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

router.get("/:guildId/warns", async (req, res) => {
  try {
    const warns = await db
      .select()
      .from(warnsTable)
      .where(eq(warnsTable.guildId, req.params.guildId))
      .orderBy(desc(warnsTable.createdAt));
    res.json(warns);
  } catch {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

router.post("/:guildId/warns", async (req, res) => {
  try {
    const { guildId } = req.params;
    const { userId, reason, moderatorId, moderatorName } = req.body;

    const client = getBotClient();
    const guild = client?.guilds.cache.get(guildId);
    let username = userId;
    try {
      const member = await guild?.members.fetch(userId);
      if (member) username = member.user.username;
    } catch {}

    const [warn] = await db.insert(warnsTable).values({ guildId, userId, username, reason, moderatorId: moderatorId || 'panel', moderatorName: moderatorName || 'Panel' }).returning();

    const allWarns = await db.select().from(warnsTable).where(and(eq(warnsTable.guildId, guildId), eq(warnsTable.userId, userId)));
    if (allWarns.length >= 3 && guild) {
      try { await guild.members.ban(userId, { reason: '3 avertissements atteints' }); } catch {}
    }

    res.status(201).json(warn);
  } catch {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

router.delete("/:guildId/warns/:warnId", async (req, res) => {
  try {
    await db.delete(warnsTable).where(eq(warnsTable.id, parseInt(req.params.warnId)));
    res.json({ success: true, message: "Avertissement supprimé" });
  } catch {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

router.get("/:guildId/members", async (req, res) => {
  try {
    const client = getBotClient();
    if (!client) return res.status(503).json({ error: "Bot non connecté" });
    const guild = client.guilds.cache.get(req.params.guildId);
    if (!guild) return res.status(404).json({ error: "Serveur introuvable" });
    await guild.members.fetch();
    const members = guild.members.cache
      .filter(m => !m.user.bot)
      .sort((a, b) => a.user.username.localeCompare(b.user.username))
      .map(m => ({ id: m.id, username: m.user.username, displayName: m.displayName, avatar: m.user.displayAvatarURL() }));
    res.json(members);
  } catch {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

router.get("/:guildId/banned-words", async (req, res) => {
  try {
    const words = await db
      .select()
      .from(bannedWordsTable)
      .where(eq(bannedWordsTable.guildId, req.params.guildId));
    res.json(words);
  } catch {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

router.post("/:guildId/banned-words", async (req, res) => {
  try {
    const { word } = req.body;
    const [inserted] = await db
      .insert(bannedWordsTable)
      .values({ guildId: req.params.guildId, word: word.toLowerCase() })
      .returning();
    res.status(201).json(inserted);
  } catch {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

router.delete("/:guildId/banned-words/:wordId", async (req, res) => {
  try {
    await db
      .delete(bannedWordsTable)
      .where(eq(bannedWordsTable.id, parseInt(req.params.wordId)));
    res.json({ success: true, message: "Mot supprimé" });
  } catch {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

router.get("/:guildId/giveaways", async (req, res) => {
  try {
    const giveaways = await db
      .select()
      .from(giveawaysTable)
      .where(eq(giveawaysTable.guildId, req.params.guildId))
      .orderBy(desc(giveawaysTable.createdAt));
    res.json(giveaways);
  } catch {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

router.post("/:guildId/giveaways", async (req, res) => {
  try {
    const { channelId, prize, winnersCount, durationMinutes, createdBy } = req.body;
    const endsAt = new Date(Date.now() + durationMinutes * 60 * 1000);

    const client = getBotClient();
    let messageId: string | undefined;

    if (client) {
      try {
        const guild = client.guilds.cache.get(req.params.guildId);
        const channel = guild?.channels.cache.get(channelId) as TextChannel | undefined;
        if (channel) {
          const embed = new EmbedBuilder()
            .setTitle("🎉 GIVEAWAY 🎉")
            .setDescription(`**Prix:** ${prize}\n\nRéagissez avec 🎉 pour participer !\n\n**Se termine:** <t:${Math.floor(endsAt.getTime() / 1000)}:R>\n**Gagnants:** ${winnersCount}`)
            .setColor(0xffd700)
            .setFooter({ text: `Giveaway • ${winnersCount} gagnant(s)` })
            .setTimestamp(endsAt);

          const msg = await channel.send({ embeds: [embed] });
          await msg.react("🎉");
          messageId = msg.id;
        }
      } catch {}
    }

    const [inserted] = await db
      .insert(giveawaysTable)
      .values({ guildId: req.params.guildId, channelId, messageId, prize, winnersCount, endsAt, ended: false, createdBy, participants: 0 })
      .returning();

    res.status(201).json(inserted);
  } catch {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

router.post("/:guildId/giveaways/:giveawayId/end", async (req, res) => {
  try {
    await db
      .update(giveawaysTable)
      .set({ ended: true })
      .where(eq(giveawaysTable.id, parseInt(req.params.giveawayId)));
    res.json({ success: true, message: "Giveaway terminé" });
  } catch {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

router.get("/:guildId/surveys", async (req, res) => {
  try {
    const surveys = await db
      .select()
      .from(surveysTable)
      .where(eq(surveysTable.guildId, req.params.guildId))
      .orderBy(desc(surveysTable.createdAt));

    const withCounts = await Promise.all(
      surveys.map(async (s) => {
        const responses = await db
          .select()
          .from(surveyResponsesTable)
          .where(eq(surveyResponsesTable.surveyId, s.id));
        return { ...s, responseCount: responses.length };
      })
    );

    res.json(withCounts);
  } catch {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

router.post("/:guildId/surveys", async (req, res) => {
  try {
    const { title, description, channelId, responseChannelId, questions, type: surveyType } = req.body;
    const resolvedType = surveyType ?? "questionnaire";

    const [inserted] = await db
      .insert(surveysTable)
      .values({ guildId: req.params.guildId, title, description, channelId, responseChannelId, questions, type: resolvedType, active: true })
      .returning();

    // Post survey embed + button to Discord channel
    try {
      const client = getBotClient();
      const guild = client?.guilds.cache.get(req.params.guildId);
      const ch = guild?.channels.cache.get(channelId) as import("discord.js").TextChannel | undefined;
      if (ch) {
        const { EmbedBuilder: EB, ButtonBuilder: BB, ButtonStyle: BS, ActionRowBuilder: AR } = await import("discord.js");
        const isPhoto = resolvedType === "fil-reponse";
        const embed = new EB()
          .setTitle(`${isPhoto ? "📸" : "📝"} ${title}`)
          .setDescription(
            (description ? description + "\n\n" : "") +
            (isPhoto
              ? "Cliquez sur le bouton ci-dessous pour ouvrir votre fil de réponse privé.\nVous pourrez envoyer **texte et photos** pour chaque question."
              : "Répondez aux questions en cliquant sur le bouton ci-dessous.")
          )
          .setColor(isPhoto ? 0xff6b9d : 0x5865f2)
          .addFields(...(questions as string[]).map((q: string, i: number) => ({ name: `Question ${i + 1}`, value: q, inline: false })))
          .setFooter({ text: `${isPhoto ? "Questionnaire photo" : "Questionnaire"} #${inserted.id} • ASTRAL TECHNOLOGIE` })
          .setTimestamp();

        const button = new BB()
          .setCustomId(`survey_respond_${inserted.id}`)
          .setLabel(isPhoto ? "📸 Ouvrir mon fil de réponse" : "📝 Répondre au questionnaire")
          .setStyle(isPhoto ? BS.Secondary : BS.Primary);

        await ch.send({ embeds: [embed], components: [new AR<import("discord.js").ButtonBuilder>().addComponents(button)] });
      }
    } catch (botErr) {
      console.error("[survey panel] Discord post error:", botErr);
    }

    res.status(201).json({ ...inserted, responseCount: 0 });
  } catch (err) {
    console.error("[survey create]", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

router.get("/:guildId/surveys/:surveyId", async (req, res) => {
  try {
    const [survey] = await db
      .select()
      .from(surveysTable)
      .where(eq(surveysTable.id, parseInt(req.params.surveyId)));

    const responses = await db
      .select()
      .from(surveyResponsesTable)
      .where(eq(surveyResponsesTable.surveyId, parseInt(req.params.surveyId)));

    res.json({ ...survey, responses });
  } catch {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

router.post("/:guildId/actions/maintenance", async (req, res) => {
  try {
    const { guildId } = req.params;
    const { enabled, reason } = req.body;

    await getOrCreateConfig(guildId);
    await db
      .update(guildConfigsTable)
      .set({ maintenanceMode: enabled, maintenanceReason: reason ?? null })
      .where(eq(guildConfigsTable.guildId, guildId));

    const client = getBotClient();
    if (client) {
      const guild = client.guilds.cache.get(guildId);
      if (guild) {
        const embed = new EmbedBuilder()
          .setTitle(enabled ? "🚧 ⚠️ MAINTENANCE EN COURS ⚠️ 🚧" : "🎉 ✨ MAINTENANCE TERMINÉE ✨ 🎉")
          .setDescription(enabled
            ? `\`\`\`diff\n- SERVEUR EN MAINTENANCE\n- Raison: ${reason ?? "Maintenance technique"}\n\`\`\``
            : "```diff\n+ SERVEUR OPÉRATIONNEL\n+ Toutes les fonctionnalités rétablies\n```"
          )
          .setColor(enabled ? 0xffa500 : 0x00ff66)
          .setTimestamp();

        for (const ch of guild.channels.cache.values()) {
          if (ch instanceof TextChannel) {
            try { await ch.send({ embeds: [embed] }); } catch {}
          }
        }
      }
    }

    res.json({ success: true, message: `Mode maintenance ${enabled ? "activé" : "désactivé"}` });
  } catch {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

router.post("/:guildId/actions/breach", async (req, res) => {
  try {
    const { guildId } = req.params;
    const { enabled, reason } = req.body;

    await getOrCreateConfig(guildId);
    await db
      .update(guildConfigsTable)
      .set({ breachMode: enabled })
      .where(eq(guildConfigsTable.guildId, guildId));

    const client = getBotClient();
    if (client) {
      const guild = client.guilds.cache.get(guildId);
      if (guild) {
        const embed = new EmbedBuilder()
          .setTitle(enabled ? "🚨 ⚠️ ALERTE — BRÈCHE DE SÉCURITÉ" : "🎉 BRÈCHE RÉSOLUE — SERVEUR OPÉRATIONNEL")
          .setDescription(enabled
            ? `\`\`\`diff\n- CONFINEMENT TOTAL ACTIVÉ\n- Raison: ${reason ?? "Urgence sécuritaire"}\n\`\`\``
            : "```diff\n+ CONFINEMENT LEVÉ\n+ Accès rétabli\n```"
          )
          .setColor(enabled ? 0xff0000 : 0x00ff66)
          .setTimestamp();

        for (const ch of guild.channels.cache.values()) {
          if (ch instanceof TextChannel) {
            try {
              await ch.permissionOverwrites.edit(guild.roles.everyone, { SendMessages: enabled ? false : null });
              await ch.send({ embeds: [embed] });
            } catch {}
          }
        }
      }
    }

    res.json({ success: true, message: `Mode brèche ${enabled ? "activé" : "désactivé"}` });
  } catch {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

router.post("/:guildId/actions/embed", async (req, res) => {
  try {
    const { channelId, title, description, color, footer, imageUrl, thumbnailUrl } = req.body;
    const client = getBotClient();

    if (!client) return res.status(503).json({ error: "Bot non connecté" });

    const guild = client.guilds.cache.get(req.params.guildId);
    const channel = guild?.channels.cache.get(channelId) as TextChannel | undefined;

    if (!channel) return res.status(404).json({ error: "Canal introuvable" });

    let colorNum = 0x0099ff;
    if (color) {
      try { colorNum = parseInt(color.replace("#", ""), 16); } catch {}
    }

    const embed = new EmbedBuilder()
      .setTitle(title)
      .setDescription(description)
      .setColor(colorNum)
      .setTimestamp();

    if (footer) embed.setFooter({ text: footer });
    if (imageUrl) embed.setImage(imageUrl);
    if (thumbnailUrl) embed.setThumbnail(thumbnailUrl);

    await channel.send({ embeds: [embed] });
    res.json({ success: true, message: "Embed envoyé" });
  } catch {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

const ANNOUNCE_TYPES: Record<string, { label: string; icon: string; color: number; separator: string }> = {
  annonce:       { label: "ANNONCE OFFICIELLE",    icon: "📢", color: 0xffd700, separator: "🔔" },
  "mise-a-jour": { label: "MISE À JOUR",           icon: "🔄", color: 0x00aaff, separator: "🔵" },
  evenement:     { label: "ÉVÉNEMENT",             icon: "🎉", color: 0xff6b9d, separator: "🎊" },
  maintenance:   { label: "MAINTENANCE PLANIFIÉE", icon: "🔧", color: 0xffa500, separator: "⚙️" },
  urgent:        { label: "ALERTE URGENTE",        icon: "🚨", color: 0xff0000, separator: "🔴" },
  information:   { label: "INFORMATION",           icon: "ℹ️", color: 0x00f0ff, separator: "🔷" },
};

router.post("/:guildId/actions/announce", async (req, res) => {
  try {
    const { channelId, title, message, pingEveryone, type: typeKey } = req.body;
    const client = getBotClient();

    if (!client) return res.status(503).json({ error: "Bot non connecté" });

    const guild = client.guilds.cache.get(req.params.guildId);
    const channel = guild?.channels.cache.get(channelId) as TextChannel | undefined;

    if (!channel) return res.status(404).json({ error: "Canal introuvable" });

    const typeInfo = ANNOUNCE_TYPES[typeKey ?? "annonce"] ?? ANNOUNCE_TYPES["annonce"];
    const sep = typeInfo.separator.repeat(8);

    const embed = new EmbedBuilder()
      .setTitle(`${typeInfo.icon} ${title}`)
      .setDescription(message)
      .setColor(typeInfo.color)
      .setAuthor({ name: typeInfo.label, iconURL: guild?.iconURL() ?? undefined })
      .setFooter({ text: `${typeInfo.label} • ${guild?.name}` })
      .setTimestamp();

    await channel.send(sep);
    await channel.send({ content: pingEveryone ? "@everyone" : "", embeds: [embed] });
    await channel.send(sep);

    res.json({ success: true, message: `Annonce [${typeInfo.label}] envoyée` });
  } catch {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

router.post("/:guildId/actions/say", async (req, res) => {
  try {
    const { channelId, message } = req.body;
    const client = getBotClient();

    if (!client) return res.status(503).json({ error: "Bot non connecté" });

    const guild = client.guilds.cache.get(req.params.guildId);
    const channel = guild?.channels.cache.get(channelId) as TextChannel | undefined;

    if (!channel) return res.status(404).json({ error: "Canal introuvable" });

    await channel.send(message);
    res.json({ success: true, message: "Message envoyé" });
  } catch {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

router.post("/:guildId/actions/kick", async (req, res) => {
  try {
    const { guildId } = req.params;
    const { userId, reason } = req.body;
    const client = getBotClient();
    if (!client) return res.status(503).json({ error: "Bot non connecté" });
    const guild = client.guilds.cache.get(guildId);
    if (!guild) return res.status(404).json({ error: "Serveur introuvable" });
    const member = await guild.members.fetch(userId).catch(() => null);
    if (!member) return res.status(404).json({ error: "Membre introuvable" });
    await member.kick(reason ?? "Expulsion via panel");
    res.json({ success: true, message: `${member.user.username} exclu du serveur` });
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? "Erreur serveur" });
  }
});

router.post("/:guildId/actions/ban", async (req, res) => {
  try {
    const { guildId } = req.params;
    const { userId, reason } = req.body;
    const client = getBotClient();
    if (!client) return res.status(503).json({ error: "Bot non connecté" });
    const guild = client.guilds.cache.get(guildId);
    if (!guild) return res.status(404).json({ error: "Serveur introuvable" });
    await guild.members.ban(userId, { reason: reason ?? "Ban via panel" });
    res.json({ success: true, message: `Utilisateur ${userId} banni` });
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? "Erreur serveur" });
  }
});

router.post("/:guildId/actions/unban", async (req, res) => {
  try {
    const { guildId } = req.params;
    const { userId, reason } = req.body;
    const client = getBotClient();
    if (!client) return res.status(503).json({ error: "Bot non connecté" });
    const guild = client.guilds.cache.get(guildId);
    if (!guild) return res.status(404).json({ error: "Serveur introuvable" });
    await guild.members.unban(userId, reason ?? "Déban via panel");
    res.json({ success: true, message: `Utilisateur ${userId} débanni` });
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? "Introuvable dans les bans ou erreur" });
  }
});

router.post("/:guildId/actions/mute", async (req, res) => {
  try {
    const { guildId } = req.params;
    const { userId, minutes, reason } = req.body;
    const client = getBotClient();
    if (!client) return res.status(503).json({ error: "Bot non connecté" });
    const guild = client.guilds.cache.get(guildId);
    if (!guild) return res.status(404).json({ error: "Serveur introuvable" });
    const member = await guild.members.fetch(userId).catch(() => null);
    if (!member) return res.status(404).json({ error: "Membre introuvable" });
    const duration = Math.min(parseInt(minutes) || 10, 40320);
    await member.timeout(duration * 60 * 1000, reason ?? "Timeout via panel");
    res.json({ success: true, message: `${member.user.username} mis en timeout pour ${duration} minute(s)` });
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? "Erreur serveur" });
  }
});

router.post("/:guildId/actions/unmute", async (req, res) => {
  try {
    const { guildId } = req.params;
    const { userId } = req.body;
    const client = getBotClient();
    if (!client) return res.status(503).json({ error: "Bot non connecté" });
    const guild = client.guilds.cache.get(guildId);
    if (!guild) return res.status(404).json({ error: "Serveur introuvable" });
    const member = await guild.members.fetch(userId).catch(() => null);
    if (!member) return res.status(404).json({ error: "Membre introuvable" });
    await member.timeout(null);
    res.json({ success: true, message: `${member.user.username} - timeout retiré` });
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? "Erreur serveur" });
  }
});

router.post("/:guildId/actions/clear", async (req, res) => {
  try {
    const { guildId } = req.params;
    const { channelId, amount } = req.body;
    const client = getBotClient();
    if (!client) return res.status(503).json({ error: "Bot non connecté" });
    const guild = client.guilds.cache.get(guildId);
    const channel = guild?.channels.cache.get(channelId) as TextChannel | undefined;
    if (!channel) return res.status(404).json({ error: "Canal introuvable" });
    const count = Math.min(parseInt(amount) || 10, 100);
    const deleted = await channel.bulkDelete(count, true);
    res.json({ success: true, message: `${deleted.size} message(s) supprimé(s)` });
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? "Erreur serveur" });
  }
});

router.post("/:guildId/actions/massban", async (req, res) => {
  try {
    const { guildId } = req.params;
    const { userIds, reason } = req.body;
    const client = getBotClient();
    if (!client) return res.status(503).json({ error: "Bot non connecté" });
    const guild = client.guilds.cache.get(guildId);
    if (!guild) return res.status(404).json({ error: "Serveur introuvable" });
    const ids: string[] = Array.isArray(userIds) ? userIds : String(userIds).split(/[\s,]+/).filter(Boolean);
    let count = 0;
    for (const id of ids) {
      try { await guild.members.ban(id, { reason: reason ?? "Ban de masse via panel" }); count++; } catch {}
    }
    res.json({ success: true, message: `${count} utilisateur(s) banni(s)` });
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? "Erreur serveur" });
  }
});

router.post("/:guildId/actions/nuke", async (req, res) => {
  try {
    const { guildId } = req.params;
    const { channelId } = req.body;
    const client = getBotClient();
    if (!client) return res.status(503).json({ error: "Bot non connecté" });
    const guild = client.guilds.cache.get(guildId);
    const channel = guild?.channels.cache.get(channelId) as TextChannel | undefined;
    if (!channel) return res.status(404).json({ error: "Canal introuvable" });
    const channelName = channel.name;
    const position = channel.position;
    const parent = channel.parent;
    await channel.delete();
    const newChannel = await guild!.channels.create({ name: channelName, position, parent, type: 0 }) as TextChannel;
    const embed = new EmbedBuilder()
      .setTitle("💥 CANAL NUCLÉARISÉ")
      .setDescription(`\`\`\`diff\n+ Canal #${channelName} recréé et purifié\n+ Historique supprimé\n\`\`\``)
      .setColor(0xff4500)
      .setFooter({ text: "💥 SYSTÈME ASTRAL | NUKE via Panel" })
      .setTimestamp();
    await newChannel.send({ embeds: [embed] });
    res.json({ success: true, message: `Canal #${channelName} nucléarisé et recréé` });
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? "Erreur serveur" });
  }
});

router.post("/:guildId/actions/dm", async (req, res) => {
  try {
    const { guildId } = req.params;
    const { userId, message } = req.body;
    const client = getBotClient();
    if (!client) return res.status(503).json({ error: "Bot non connecté" });
    const guild = client.guilds.cache.get(guildId);
    if (!guild) return res.status(404).json({ error: "Serveur introuvable" });
    const member = await guild.members.fetch(userId).catch(() => null);
    if (!member) return res.status(404).json({ error: "Membre introuvable" });
    const embed = new EmbedBuilder()
      .setTitle("📨 Message du serveur")
      .setDescription(message)
      .setColor(0x0099ff)
      .setAuthor({ name: guild.name, iconURL: guild.iconURL() ?? undefined })
      .setFooter({ text: `Message officiel de ${guild.name}` })
      .setTimestamp();
    await member.send({ embeds: [embed] });
    res.json({ success: true, message: `Message privé envoyé à ${member.user.username}` });
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? "MP impossible (fermés ou bloqué)" });
  }
});

router.get("/:guildId/rules", async (req, res) => {
  try {
    const rules = await db.select().from(serverRulesTable).where(eq(serverRulesTable.guildId, req.params.guildId)).limit(1);
    res.json(rules[0] ?? null);
  } catch {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

router.put("/:guildId/rules", async (req, res) => {
  try {
    const { guildId } = req.params;
    const existing = await db.select().from(serverRulesTable).where(eq(serverRulesTable.guildId, guildId)).limit(1);
    if (existing.length > 0) {
      const updated = await db.update(serverRulesTable).set({ ...req.body, updatedAt: new Date() }).where(eq(serverRulesTable.guildId, guildId)).returning();
      res.json(updated[0]);
    } else {
      const created = await db.insert(serverRulesTable).values({ guildId, ...req.body }).returning();
      res.json(created[0]);
    }
  } catch {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

router.post("/:guildId/rules/send", async (req, res) => {
  try {
    const { guildId } = req.params;
    const { channelId, title, description, memberRoleId } = req.body;
    const client = getBotClient();
    if (!client) return res.status(503).json({ error: "Bot non connecté" });

    const guild = client.guilds.cache.get(guildId);
    const channel = guild?.channels.cache.get(channelId) as TextChannel | undefined;
    if (!channel) return res.status(404).json({ error: "Canal introuvable" });

    const embed = new EmbedBuilder()
      .setTitle(`📋 ${title}`)
      .setDescription(description)
      .setColor(0x00f0ff)
      .setFooter({ text: "En cliquant sur ✅ J'accepte les règles, vous recevrez accès au serveur." })
      .setTimestamp();

    const button = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`rules_accept_${guildId}`)
        .setLabel("✅  J'accepte les règles")
        .setStyle(ButtonStyle.Success)
    );

    const existing = await db.select().from(serverRulesTable).where(eq(serverRulesTable.guildId, guildId)).limit(1);
    let messageId: string | undefined;

    if (existing.length > 0 && existing[0].messageId) {
      try {
        const oldChannel = guild?.channels.cache.get(existing[0].channelId) as TextChannel | undefined;
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

    const data = { channelId, title, description, memberRoleId: memberRoleId || null, messageId, enabled: true, updatedAt: new Date() };
    if (existing.length > 0) {
      await db.update(serverRulesTable).set(data).where(eq(serverRulesTable.guildId, guildId));
    } else {
      await db.insert(serverRulesTable).values({ guildId, ...data });
    }

    res.json({ success: true, messageId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

router.get("/:guildId/roles", async (req, res) => {
  try {
    const client = getBotClient();
    if (!client) return res.status(503).json({ error: "Bot non connecté" });
    const guild = client.guilds.cache.get(req.params.guildId);
    if (!guild) return res.status(404).json({ error: "Serveur introuvable" });
    const roles = guild.roles.cache
      .filter(r => r.name !== "@everyone" && !r.managed)
      .sort((a, b) => b.position - a.position)
      .map(r => ({ id: r.id, name: r.name, color: r.hexColor }));
    res.json(roles);
  } catch {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

router.get("/:guildId/logs", async (req, res) => {
  try {
    const limit = parseInt(String(req.query.limit ?? "50"));
    const logs = await db
      .select()
      .from(logsTable)
      .where(eq(logsTable.guildId, req.params.guildId))
      .orderBy(desc(logsTable.createdAt))
      .limit(Math.min(limit, 200));
    res.json(logs);
  } catch {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

export default router;
