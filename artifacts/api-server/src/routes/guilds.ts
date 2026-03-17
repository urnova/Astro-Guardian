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
import { eq, and, desc } from "drizzle-orm";
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

    const [warnRows, giveawayRows, surveyRows, bannedWordRows] = await Promise.all([
      db.select().from(warnsTable).where(eq(warnsTable.guildId, guildId)),
      db.select().from(giveawaysTable).where(eq(giveawaysTable.guildId, guildId)),
      db.select().from(surveysTable).where(eq(surveysTable.guildId, guildId)),
      db.select().from(bannedWordsTable).where(eq(bannedWordsTable.guildId, guildId)),
    ]);

    res.json({
      memberCount: guild?.memberCount ?? 0,
      channelCount: guild?.channels.cache.size ?? 0,
      roleCount: guild?.roles.cache.size ?? 0,
      warnCount: warnRows.length,
      giveawayCount: giveawayRows.length,
      surveyCount: surveyRows.length,
      bannedWordCount: bannedWordRows.length,
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
    const { title, description, channelId, responseChannelId, questions } = req.body;
    const [inserted] = await db
      .insert(surveysTable)
      .values({ guildId: req.params.guildId, title, description, channelId, responseChannelId, questions, active: true })
      .returning();
    res.status(201).json({ ...inserted, responseCount: 0 });
  } catch {
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

router.post("/:guildId/actions/announce", async (req, res) => {
  try {
    const { channelId, title, message, pingEveryone } = req.body;
    const client = getBotClient();

    if (!client) return res.status(503).json({ error: "Bot non connecté" });

    const guild = client.guilds.cache.get(req.params.guildId);
    const channel = guild?.channels.cache.get(channelId) as TextChannel | undefined;

    if (!channel) return res.status(404).json({ error: "Canal introuvable" });

    const embed = new EmbedBuilder()
      .setTitle(`📢 ${title}`)
      .setDescription(message)
      .setColor(0xffd700)
      .setFooter({ text: `Annonce officielle • ${guild?.name}` })
      .setTimestamp();

    await channel.send("🔔".repeat(10));
    await channel.send({ content: pingEveryone ? "@everyone" : "", embeds: [embed] });
    await channel.send("🔔".repeat(10));

    res.json({ success: true, message: "Annonce envoyée" });
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
