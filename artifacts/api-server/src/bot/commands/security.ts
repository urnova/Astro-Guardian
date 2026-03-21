import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ChatInputCommandInteraction,
  TextChannel,
} from "discord.js";
import { db } from "@workspace/db";
import { bannedWordsTable, guildConfigsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { getOrCreateConfig, addLog } from "../lib/db.js";

const adminPerm = PermissionFlagsBits.Administrator;
const FOOTER = "⬡ ASTRAL TECHNOLOGIE — NEXUS v2.0";

// ── Breach ON embed ───────────────────────────────────────────────────────────
function buildBreachOnEmbed(reason: string, operator: string) {
  const now = new Date();
  return new EmbedBuilder()
    .setTitle("🚨 ⬛ ALERTE CRITIQUE — BRÈCHE DE SÉCURITÉ DÉTECTÉE ⬛ 🚨")
    .setColor(0xff0000)
    .setDescription(
      [
        "```diff",
        "- ⚠ CONFINEMENT TOTAL ACTIVÉ",
        "- ACCÈS UTILISATEURS COUPÉS",
        "- PROTOCOLES DÉFENSIFS ENGAGÉS",
        "- SURVEILLANCE MAXIMALE ACTIVE",
        "- TOUTES LES COMMUNICATIONS BLOQUÉES",
        "```",
        "",
        "> 🔴 **Une brèche de sécurité a été détectée. Le serveur est en confinement total.**",
        "> Restez calmes. Les administrateurs gèrent la situation.",
      ].join("\n")
    )
    .addFields(
      {
        name: "🔴 RAPPORT DE BRÈCHE",
        value: [
          "```yaml",
          `Menace     : ${reason}`,
          `Officier   : ${operator}`,
          `Heure      : ${now.toLocaleTimeString("fr-FR")} — ${now.toLocaleDateString("fr-FR")}`,
          `Statut     : 🔴 CONFINEMENT ACTIF`,
          "```",
        ].join("\n"),
        inline: false,
      },
      {
        name: "🛡️ PROTOCOLES ENGAGÉS",
        value: "```css\n[VERROUILLÉ] Toutes les communications\n[ACTIF]      Surveillance renforcée\n[ENGAGÉ]     Mode défensif maximal\n[BLOQUÉ]     Accès membre standard```",
        inline: false,
      },
      {
        name: "⚠️ INSTRUCTIONS",
        value: "```fix\nNe pas paniquer. Ne pas tenter de contourner le confinement.\nAttenez les instructions des administrateurs.\n```",
        inline: false,
      },
    )
    .setFooter({ text: `${FOOTER} | 🔴 CONFINEMENT ACTIF — ACCÈS RESTREINT` })
    .setTimestamp();
}

// ── Breach OFF embed ──────────────────────────────────────────────────────────
function buildBreachOffEmbed(operator: string) {
  return new EmbedBuilder()
    .setTitle("✅ ⬡ CONFINEMENT LEVÉ — NEXUS SÉCURISÉ ✅ ⬡")
    .setColor(0x00ff66)
    .setDescription(
      [
        "```diff",
        "+ PROTOCOLE DE CONFINEMENT DÉSACTIVÉ",
        "+ ACCÈS UTILISATEURS RÉTABLIS",
        "+ COMMUNICATIONS NORMALISÉES",
        "+ NEXUS PLEINEMENT SÉCURISÉ",
        "```",
        "",
        "> ✅ **La menace a été neutralisée. Le serveur est de nouveau accessible.**",
        "> Merci de votre coopération pendant cette période.",
      ].join("\n")
    )
    .addFields(
      {
        name: "✅ RAPPORT DE RÉTABLISSEMENT",
        value: [
          "```yaml",
          `Autorisé par : ${operator}`,
          `Heure        : ${new Date().toLocaleTimeString("fr-FR")}`,
          `Statut       : ✅ SÉCURITÉ RÉTABLIE`,
          "```",
        ].join("\n"),
        inline: false,
      },
      {
        name: "🎊 SYSTÈMES RÉTABLIS",
        value: "```diff\n+ Communications rétablies\n+ Permissions restaurées\n+ Surveillance réduite\n+ Accès membres normalisé```",
        inline: false,
      },
    )
    .setFooter({ text: `${FOOTER} | ✅ SÉCURITÉ RÉTABLIE` })
    .setTimestamp();
}

export const lockdownCommand = {
  data: new SlashCommandBuilder()
    .setName("breach")
    .setDescription("🚨 ALERTE — Activer le protocole de confinement total")
    .setDefaultMemberPermissions(adminPerm)
    .addStringOption((o) => o.setName("raison").setDescription("Motif de la brèche").setRequired(true)),
  async execute(interaction: ChatInputCommandInteraction) {
    const reason = interaction.options.getString("raison", true);
    await interaction.deferReply({ ephemeral: true });

    try {
      await getOrCreateConfig(interaction.guildId!);
      await db.update(guildConfigsTable)
        .set({ breachMode: true, breachReason: reason })
        .where(eq(guildConfigsTable.guildId, interaction.guildId!));

      const embed = buildBreachOnEmbed(reason, interaction.user.username);

      const messageIds: { channelId: string; messageId: string }[] = [];
      for (const channel of interaction.guild!.channels.cache.values()) {
        if (channel instanceof TextChannel) {
          try {
            await channel.permissionOverwrites.edit(interaction.guild!.roles.everyone, { SendMessages: false });
            const msg = await channel.send({ embeds: [embed] });
            messageIds.push({ channelId: channel.id, messageId: msg.id });
          } catch {}
        }
      }

      await db.update(guildConfigsTable)
        .set({ breachMessageIds: JSON.stringify(messageIds) })
        .where(eq(guildConfigsTable.guildId, interaction.guildId!));

      await interaction.editReply({ content: `🚨 **BRÈCHE CONFINÉE** — ${messageIds.length} canal(aux) verrouillé(s)` });
      await addLog({ guildId: interaction.guildId!, action: "BREACH_ON", moderatorId: interaction.user.id, moderatorName: interaction.user.username, details: reason });
    } catch {
      await interaction.editReply({ content: "❌ Erreur lors du confinement. Vérifiez les permissions." });
    }
  },
};

export const unlockCommand = {
  data: new SlashCommandBuilder()
    .setName("unbreach")
    .setDescription("🔓 Lever le confinement — Rétablir le réseau")
    .setDefaultMemberPermissions(adminPerm),
  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true });

    try {
      const [config] = await db.select().from(guildConfigsTable)
        .where(eq(guildConfigsTable.guildId, interaction.guildId!));

      await db.update(guildConfigsTable)
        .set({ breachMode: false, breachReason: null, breachMessageIds: null })
        .where(eq(guildConfigsTable.guildId, interaction.guildId!));

      const offEmbed = buildBreachOffEmbed(interaction.user.username);
      let unlocked = 0;

      // Unlock all channels + edit stored messages
      for (const channel of interaction.guild!.channels.cache.values()) {
        if (channel instanceof TextChannel) {
          try {
            await channel.permissionOverwrites.edit(interaction.guild!.roles.everyone, { SendMessages: null });
            unlocked++;
          } catch {}
        }
      }

      // Edit stored messages
      let edited = 0;
      if (config?.breachMessageIds) {
        try {
          const stored: { channelId: string; messageId: string }[] = JSON.parse(config.breachMessageIds);
          for (const { channelId, messageId } of stored) {
            try {
              const ch = interaction.guild!.channels.cache.get(channelId) as TextChannel | undefined;
              if (ch) {
                const msg = await ch.messages.fetch(messageId);
                await msg.edit({ embeds: [offEmbed] });
                edited++;
              }
            } catch {}
          }
        } catch {}
      }

      // Fallback: if no stored messages, send to all
      if (edited === 0) {
        for (const channel of interaction.guild!.channels.cache.values()) {
          if (channel instanceof TextChannel) {
            try { await channel.send({ embeds: [offEmbed] }); } catch {}
          }
        }
      }

      await interaction.editReply({ content: `✅ **CONFINEMENT LEVÉ** — ${unlocked} canal(aux) rétabli(s)` });
      await addLog({ guildId: interaction.guildId!, action: "BREACH_OFF", moderatorId: interaction.user.id, moderatorName: interaction.user.username });
    } catch {
      await interaction.editReply({ content: "❌ Erreur lors du rétablissement." });
    }
  },
};

export const nukeCommand = {
  data: new SlashCommandBuilder()
    .setName("nuke")
    .setDescription("💥 PROTOCOLE NUKE — Purification totale du canal")
    .setDefaultMemberPermissions(adminPerm),
  async execute(interaction: ChatInputCommandInteraction) {
    const channel = interaction.channel as TextChannel;
    const channelName = channel.name;
    const channelPosition = channel.position;
    const channelCategory = channel.parent;

    await interaction.reply({ content: "💥 **PROTOCOLE NUKE INITIALISÉ — COMPTE À REBOURS ACTIVÉ**", ephemeral: true });

    const countdownEmbed = new EmbedBuilder()
      .setTitle("💣 ⬡ ALERTE — DÉTONATION IMMINENTE ⬡ 💣")
      .setColor(0xff4500)
      .setDescription(`\`\`\`diff\n- ⬡ PROTOCOLE DE PURIFICATION ACTIVÉ\n- DESTRUCTION DU CANAL IMMINENTE\n- ÉVACUATION DES DONNÉES EN COURS\n\`\`\``)
      .addFields({ name: "⏱️ SÉQUENCE DE DÉTONATION", value: "```fix\n[3] Systèmes d'armement chargés...\n[2] Coordonnées verrouillées...\n[1] Détonation imminente...\n[0] ██████████ 💥 BOOM\n```" })
      .setFooter({ text: `${FOOTER} | ⚠️ PURIFICATION EN COURS` })
      .setTimestamp();

    await channel.send({ embeds: [countdownEmbed] });
    await new Promise((r) => setTimeout(r, 3000));

    try {
      await channel.delete();
      const newChannel = await interaction.guild!.channels.create({ name: channelName, position: channelPosition, parent: channelCategory, type: 0 }) as TextChannel;

      const nukeEmbed = new EmbedBuilder()
        .setTitle("🌋 ⬡ DÉTONATION RÉUSSIE — CANAL PURIFIÉ ⬡ 🌋")
        .setColor(0xff4500)
        .setDescription(`\`\`\`diff\n+ CANAL COMPLÈTEMENT PURIFIÉ\n+ HISTORIQUE EFFACÉ À 100%\n+ NOUVEAU NŒUD INITIALISÉ\n\`\`\``)
        .addFields(
          { name: "💥 CANAL PURIFIÉ", value: `\`#${channelName}\``, inline: true },
          { name: "☢️ STATUT", value: "`PURIFICATION TOTALE`", inline: true },
          { name: "📊 RAPPORT D'OPÉRATION", value: "```yaml\nMessages éliminés : TOUS\nHistorique effacé : 100%\nCanal purifié     : OUI\nNœud recréé       : OUI```" },
        )
        .setFooter({ text: `${FOOTER} | 💥 NUKE RÉUSSI` })
        .setTimestamp();

      await newChannel.send({ embeds: [nukeEmbed] });
      await addLog({ guildId: interaction.guildId!, action: "NUKE", targetName: channelName, moderatorId: interaction.user.id, moderatorName: interaction.user.username });
    } catch {}
  },
};

export const massbanCommand = {
  data: new SlashCommandBuilder()
    .setName("massban")
    .setDescription("☠️ PROTOCOLE PURGE — Bannir plusieurs agents simultanément")
    .setDefaultMemberPermissions(adminPerm)
    .addStringOption((o) => o.setName("ids").setDescription("IDs Discord séparés par des espaces").setRequired(true))
    .addStringOption((o) => o.setName("raison").setDescription("Motif de la purge").setRequired(false)),
  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();
    const ids = interaction.options.getString("ids", true).split(/\s+/).filter(Boolean);
    const reason = interaction.options.getString("raison") ?? "Purge de masse autorisée";
    let count = 0;
    let failed = 0;

    for (const id of ids) {
      try { await interaction.guild!.members.ban(id, { reason }); count++; } catch { failed++; }
    }

    const embed = new EmbedBuilder()
      .setTitle("☠️ ⬡ PROTOCOLE PURGE — EXÉCUTION TERMINÉE ⬡ ☠️")
      .setColor(0xff0000)
      .setDescription(`\`\`\`diff\n- PURGE DE MASSE EXÉCUTÉE\n- ${count} AGENT(S) BANNI(S) DU RÉSEAU\n${failed > 0 ? `- ${failed} ÉCHEC(S) ENREGISTRÉ(S)\n` : ""}\`\`\``)
      .addFields(
        { name: "☠️ BANNIS", value: `\`${count}\``, inline: true },
        { name: "⚠️ ÉCHECS", value: `\`${failed}\``, inline: true },
        { name: "📋 MOTIF", value: `\`${reason}\``, inline: false },
      )
      .setFooter({ text: FOOTER })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
    await addLog({ guildId: interaction.guildId!, action: "MASSBAN", moderatorId: interaction.user.id, moderatorName: interaction.user.username, details: `${count} agents bannis — ${reason}` });
  },
};

export const antiraidCommand = {
  data: new SlashCommandBuilder()
    .setName("antiraid")
    .setDescription("🛡️ Configurer le bouclier anti-raid")
    .setDefaultMemberPermissions(adminPerm)
    .addBooleanOption((o) => o.setName("activer").setDescription("Activer ou désactiver le bouclier").setRequired(true)),
  async execute(interaction: ChatInputCommandInteraction) {
    const enabled = interaction.options.getBoolean("activer", true);
    await getOrCreateConfig(interaction.guildId!);
    await db.update(guildConfigsTable).set({ antiRaidEnabled: enabled }).where(eq(guildConfigsTable.guildId, interaction.guildId!));

    const embed = new EmbedBuilder()
      .setTitle(`🛡️ BOUCLIER ANTI-RAID — ${enabled ? "ACTIVÉ" : "DÉSACTIVÉ"}`)
      .setColor(enabled ? 0x00ff00 : 0xff0000)
      .setDescription(`\`\`\`${enabled ? "diff\n+ PROTECTION ANTI-RAID ENGAGÉE\n+ FLUX D'ENTRÉE SURVEILLÉ\n+ MENACES AUTOMATIQUEMENT BLOQUÉES" : "diff\n- PROTECTION ANTI-RAID DÉSACTIVÉE\n- SURVEILLANCE ALLÉGÉE"}\n\`\`\``)
      .addFields({ name: "🔰 STATUT", value: `\`${enabled ? "BOUCLIER ACTIF" : "BOUCLIER INACTIF"}\``, inline: true })
      .setFooter({ text: FOOTER })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
    await addLog({ guildId: interaction.guildId!, action: "ANTIRAID", moderatorId: interaction.user.id, moderatorName: interaction.user.username, details: enabled ? "Activé" : "Désactivé" });
  },
};

export const automodCommand = {
  data: new SlashCommandBuilder()
    .setName("automod")
    .setDescription("🤖 Configurer le système d'automodération IA")
    .setDefaultMemberPermissions(adminPerm)
    .addBooleanOption((o) => o.setName("activer").setDescription("Activer ou désactiver l'IA de modération").setRequired(true)),
  async execute(interaction: ChatInputCommandInteraction) {
    const enabled = interaction.options.getBoolean("activer", true);
    await getOrCreateConfig(interaction.guildId!);
    await db.update(guildConfigsTable).set({ automodEnabled: enabled }).where(eq(guildConfigsTable.guildId, interaction.guildId!));

    const embed = new EmbedBuilder()
      .setTitle(`🤖 IA D'AUTOMODÉRATION — ${enabled ? "EN LIGNE" : "HORS LIGNE"}`)
      .setColor(enabled ? 0x9900ff : 0x666666)
      .setDescription(`\`\`\`${enabled ? "diff\n+ SYSTÈME IA OPÉRATIONNEL\n+ SURVEILLANCE DES TRANSMISSIONS ACTIVE\n+ FILTRAGE AUTOMATIQUE EN COURS" : "diff\n- SYSTÈME IA DÉSACTIVÉ\n- FILTRAGE AUTOMATIQUE SUSPENDU"}\n\`\`\``)
      .addFields(
        { name: "🧠 ÉTAT IA", value: `\`${enabled ? "OPÉRATIONNEL" : "SUSPENDU"}\``, inline: true },
        { name: "🔍 FILTRAGE", value: `\`${enabled ? "ACTIF" : "INACTIF"}\``, inline: true },
      )
      .setFooter({ text: FOOTER })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
    await addLog({ guildId: interaction.guildId!, action: "AUTOMOD", moderatorId: interaction.user.id, moderatorName: interaction.user.username, details: enabled ? "Activé" : "Désactivé" });
  },
};

export const addwordCommand = {
  data: new SlashCommandBuilder()
    .setName("addword")
    .setDescription("🚫 Ajouter un terme à la liste noire du filtre IA")
    .setDefaultMemberPermissions(adminPerm)
    .addStringOption((o) => o.setName("mot").setDescription("Le terme à bannir").setRequired(true)),
  async execute(interaction: ChatInputCommandInteraction) {
    const word = interaction.options.getString("mot", true).toLowerCase();
    const guildId = interaction.guildId!;

    const existing = await db.select().from(bannedWordsTable)
      .where(and(eq(bannedWordsTable.guildId, guildId), eq(bannedWordsTable.word, word)));
    if (existing.length > 0) return interaction.reply({ content: "❌ Ce terme est déjà enregistré dans le filtre IA.", ephemeral: true });

    await db.insert(bannedWordsTable).values({ guildId, word });
    const embed = new EmbedBuilder()
      .setTitle("🚫 TERME AJOUTÉ AU FILTRE IA")
      .setColor(0xff6b6b)
      .setDescription(`\`\`\`diff\n- TERME "${word.toUpperCase()}" AJOUTÉ À LA LISTE NOIRE\n- FILTRAGE AUTOMATIQUE ACTIVÉ POUR CE MOT\n\`\`\``)
      .setFooter({ text: FOOTER })
      .setTimestamp();
    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};

export const removewordCommand = {
  data: new SlashCommandBuilder()
    .setName("removeword")
    .setDescription("✅ Retirer un terme de la liste noire du filtre IA")
    .setDefaultMemberPermissions(adminPerm)
    .addStringOption((o) => o.setName("mot").setDescription("Le terme à retirer").setRequired(true)),
  async execute(interaction: ChatInputCommandInteraction) {
    const word = interaction.options.getString("mot", true).toLowerCase();
    const guildId = interaction.guildId!;

    const deleted = await db.delete(bannedWordsTable)
      .where(and(eq(bannedWordsTable.guildId, guildId), eq(bannedWordsTable.word, word)))
      .returning();
    if (deleted.length === 0) return interaction.reply({ content: "❌ Ce terme n'est pas dans la liste noire.", ephemeral: true });

    const embed = new EmbedBuilder()
      .setTitle("✅ TERME RETIRÉ DU FILTRE IA")
      .setColor(0x00ff88)
      .setDescription(`\`\`\`diff\n+ TERME "${word.toUpperCase()}" RETIRÉ DE LA LISTE NOIRE\n+ FILTRAGE DÉSACTIVÉ POUR CE MOT\n\`\`\``)
      .setFooter({ text: FOOTER })
      .setTimestamp();
    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};

export const bannedwordsCommand = {
  data: new SlashCommandBuilder()
    .setName("bannedwords")
    .setDescription("📋 Consulter la liste noire du filtre IA")
    .setDefaultMemberPermissions(adminPerm),
  async execute(interaction: ChatInputCommandInteraction) {
    const guildId = interaction.guildId!;
    const words = await db.select().from(bannedWordsTable).where(eq(bannedWordsTable.guildId, guildId));

    if (words.length === 0) {
      const embed = new EmbedBuilder()
        .setTitle("📋 LISTE NOIRE — AUCUNE ENTRÉE")
        .setColor(0x00ff88)
        .setDescription("```diff\n+ LISTE NOIRE VIDE\n+ AUCUN TERME INTERDIT ENREGISTRÉ\n```")
        .setFooter({ text: FOOTER });
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    const embed = new EmbedBuilder()
      .setTitle(`🚫 LISTE NOIRE DU FILTRE IA — ${words.length} TERME(S)`)
      .setColor(0xff6b6b)
      .setDescription(`\`\`\`diff\n- TERMES BANNIS DU RÉSEAU :\n\`\`\`\n${words.map((w) => `\`${w.word}\``).join(" | ")}`)
      .setFooter({ text: FOOTER })
      .setTimestamp();
    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
