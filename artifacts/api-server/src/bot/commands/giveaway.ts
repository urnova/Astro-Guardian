import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ChatInputCommandInteraction,
  TextChannel,
  Client,
} from "discord.js";
import { db } from "@workspace/db";
import { giveawaysTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { addLog } from "../lib/db.js";

const adminPerm = PermissionFlagsBits.Administrator;

async function endGiveaway(giveawayId: number, guildId: string, channelId: string, messageId: string, prize: string, winnersCount: number) {
  try {
    const { getBotClient } = await import("../index.js");
    const client = getBotClient();
    if (!client) return;

    const guild = client.guilds.cache.get(guildId);
    if (!guild) return;

    const channel = guild.channels.cache.get(channelId) as TextChannel;
    if (!channel) return;

    const message = await channel.messages.fetch(messageId).catch(() => null);
    if (!message) {
      await db.update(giveawaysTable).set({ ended: true }).where(eq(giveawaysTable.id, giveawayId));
      return;
    }

    const reaction = message.reactions.cache.get("🎉") ?? (await message.fetch()).reactions.cache.get("🎉");
    if (!reaction) {
      await channel.send("❌ Aucun participant — giveaway annulé.");
      await db.update(giveawaysTable).set({ ended: true, participants: 0 }).where(eq(giveawaysTable.id, giveawayId));
      return;
    }

    const users = await reaction.users.fetch();
    const participants = users.filter((u) => !u.bot);

    if (participants.size === 0) {
      await channel.send("❌ Aucun participant — giveaway annulé.");
      await db.update(giveawaysTable).set({ ended: true, participants: 0 }).where(eq(giveawaysTable.id, giveawayId));
      return;
    }

    const shuffled = participants.random(Math.min(winnersCount, participants.size));
    const winners = Array.isArray(shuffled) ? shuffled : [shuffled];

    await db.update(giveawaysTable)
      .set({ ended: true, participants: participants.size })
      .where(eq(giveawaysTable.id, giveawayId));

    const winEmbed = new EmbedBuilder()
      .setTitle("🎉 🏆 GIVEAWAY TERMINÉ 🏆 🎉")
      .setDescription(`**Prix:** ${prize}\n**Gagnant(s):** ${winners.map((w) => `<@${w!.id}>`).join(", ")}\n\n🎊 Félicitations aux gagnants !`)
      .setColor(0xffd700)
      .addFields({ name: "👥 Participants", value: `**${participants.size}**`, inline: true })
      .setTimestamp();

    await channel.send({ content: winners.map((w) => `<@${w!.id}>`).join(" "), embeds: [winEmbed] });
  } catch (err) {
    console.error("Erreur fin giveaway:", err);
  }
}

function scheduleGiveawayEnd(giveawayId: number, guildId: string, channelId: string, messageId: string, prize: string, winnersCount: number, delay: number) {
  const safeDelay = Math.max(0, delay);
  setTimeout(() => endGiveaway(giveawayId, guildId, channelId, messageId, prize, winnersCount), safeDelay);
}

export async function recoverGiveaways(client: Client) {
  try {
    const active = await db.select().from(giveawaysTable).where(eq(giveawaysTable.ended, false));
    const now = Date.now();
    let recovered = 0;

    for (const g of active) {
      const endsAt = g.endsAt.getTime();
      const delay = endsAt - now;

      if (delay <= 0) {
        void endGiveaway(g.id, g.guildId, g.channelId, g.messageId ?? "", g.prize, g.winnersCount);
      } else {
        scheduleGiveawayEnd(g.id, g.guildId, g.channelId, g.messageId ?? "", g.prize, g.winnersCount, delay);
      }
      recovered++;
    }

    if (recovered > 0) {
      console.log(`[Giveaway] ${recovered} giveaway(s) récupéré(s) au redémarrage.`);
    }
  } catch (err) {
    console.error("[Giveaway] Erreur récupération au démarrage:", err);
  }
}

export const giveawayCommand = {
  data: new SlashCommandBuilder()
    .setName("giveaway")
    .setDescription("🎉 Gestion des giveaways")
    .setDefaultMemberPermissions(adminPerm)
    .addSubcommand((sub) =>
      sub
        .setName("create")
        .setDescription("Créer un giveaway")
        .addStringOption((o) => o.setName("prix").setDescription("Le prix à gagner").setRequired(true))
        .addIntegerOption((o) => o.setName("duree").setDescription("Durée en minutes").setRequired(true))
        .addChannelOption((o) => o.setName("canal").setDescription("Canal du giveaway").setRequired(false))
        .addIntegerOption((o) => o.setName("gagnants").setDescription("Nombre de gagnants").setRequired(false))
    )
    .addSubcommand((sub) =>
      sub
        .setName("list")
        .setDescription("Voir les giveaways actifs")
    ),
  async execute(interaction: ChatInputCommandInteraction) {
    const sub = interaction.options.getSubcommand();

    if (sub === "create") {
      const prize = interaction.options.getString("prix", true);
      const durationMin = interaction.options.getInteger("duree", true);
      const channel = (interaction.options.getChannel("canal") ?? interaction.channel) as TextChannel;
      const winnersCount = interaction.options.getInteger("gagnants") ?? 1;

      if (durationMin <= 0) {
        return interaction.reply({ content: "❌ La durée doit être supérieure à 0 minutes.", ephemeral: true });
      }

      const endsAt = new Date(Date.now() + durationMin * 60 * 1000);

      const embed = new EmbedBuilder()
        .setTitle("🎉 GIVEAWAY 🎉")
        .setDescription(`**Prix:** ${prize}\n\nRéagissez avec 🎉 pour participer !\n\n**Se termine:** <t:${Math.floor(endsAt.getTime() / 1000)}:R>\n**Gagnants:** ${winnersCount}`)
        .setColor(0xffd700)
        .addFields({ name: "🏅 Organisé par", value: interaction.user.toString(), inline: true })
        .setFooter({ text: `Giveaway • ${winnersCount} gagnant(s)` })
        .setTimestamp(endsAt);

      const msg = await channel.send({ embeds: [embed] });
      await msg.react("🎉");

      const [inserted] = await db.insert(giveawaysTable).values({
        guildId: interaction.guildId!,
        channelId: channel.id,
        messageId: msg.id,
        prize,
        winnersCount,
        endsAt,
        ended: false,
        createdBy: interaction.user.id,
        participants: 0,
      }).returning();

      scheduleGiveawayEnd(inserted.id, interaction.guildId!, channel.id, msg.id, prize, winnersCount, durationMin * 60 * 1000);

      await interaction.reply({ content: `✅ Giveaway créé dans <#${channel.id}> — se termine dans **${durationMin} minutes**`, ephemeral: true });
      await addLog({ guildId: interaction.guildId!, action: "GIVEAWAY_CREATE", moderatorId: interaction.user.id, moderatorName: interaction.user.username, details: prize });

    } else if (sub === "list") {
      const giveaways = await db.select().from(giveawaysTable)
        .where(and(eq(giveawaysTable.guildId, interaction.guildId!), eq(giveawaysTable.ended, false)));

      if (giveaways.length === 0) {
        return interaction.reply({ content: "Aucun giveaway actif en ce moment.", ephemeral: true });
      }

      const embed = new EmbedBuilder()
        .setTitle("🎉 Giveaways actifs")
        .setColor(0xffd700);

      for (const g of giveaways) {
        embed.addFields({
          name: g.prize,
          value: `ID: **#${g.id}** | Canal: <#${g.channelId}>\nSe termine: <t:${Math.floor(g.endsAt.getTime() / 1000)}:R>\nGagnants: **${g.winnersCount}**`,
          inline: false,
        });
      }

      await interaction.reply({ embeds: [embed], ephemeral: true });
    }
  },
};

export const giveawayEndCommand = {
  data: new SlashCommandBuilder()
    .setName("giveaway_end")
    .setDescription("🏆 Terminer manuellement un giveaway")
    .setDefaultMemberPermissions(adminPerm)
    .addIntegerOption((o) => o.setName("id").setDescription("ID du giveaway (visible avec /giveaway list)").setRequired(true)),
  async execute(interaction: ChatInputCommandInteraction) {
    const id = interaction.options.getInteger("id", true);

    const [giveaway] = await db.select().from(giveawaysTable)
      .where(and(eq(giveawaysTable.id, id), eq(giveawaysTable.guildId, interaction.guildId!)));

    if (!giveaway) {
      return interaction.reply({ content: "❌ Giveaway introuvable. Utilisez `/giveaway list` pour voir les IDs.", ephemeral: true });
    }
    if (giveaway.ended) {
      return interaction.reply({ content: "❌ Ce giveaway est déjà terminé.", ephemeral: true });
    }

    await db.update(giveawaysTable).set({ endsAt: new Date() }).where(eq(giveawaysTable.id, id));
    await interaction.reply({ content: "✅ Giveaway terminé manuellement.", ephemeral: true });
    await endGiveaway(id, interaction.guildId!, giveaway.channelId, giveaway.messageId ?? "", giveaway.prize, giveaway.winnersCount);
  },
};
