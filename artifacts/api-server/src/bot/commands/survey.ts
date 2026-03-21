import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ChatInputCommandInteraction,
  TextChannel,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ModalSubmitInteraction,
  ButtonInteraction,
  ChannelType,
  ThreadChannel,
  Collection,
} from "discord.js";
import { db } from "@workspace/db";
import { surveysTable, surveyResponsesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { addLog } from "../lib/db.js";

const adminPerm = PermissionFlagsBits.Administrator;

// ─── /survey create ─────────────────────────────────────────────────────────
export const surveyCommand = {
  data: new SlashCommandBuilder()
    .setName("survey")
    .setDescription("📝 Gestion des questionnaires")
    .setDefaultMemberPermissions(adminPerm)
    .addSubcommand((sub) =>
      sub
        .setName("create")
        .setDescription("Créer un questionnaire (texte uniquement via modal)")
        .addStringOption((o) => o.setName("titre").setDescription("Titre").setRequired(true))
        .addStringOption((o) => o.setName("questions").setDescription("Questions séparées par | (max 5)").setRequired(true))
        .addChannelOption((o) => o.setName("canal").setDescription("Canal de publication").setRequired(false))
        .addChannelOption((o) => o.setName("reponses").setDescription("Canal de réception des réponses").setRequired(false))
        .addStringOption((o) => o.setName("description").setDescription("Description").setRequired(false))
    )
    .addSubcommand((sub) =>
      sub
        .setName("photo")
        .setDescription("Créer un questionnaire photo + texte (fil de réponse)")
        .addStringOption((o) => o.setName("titre").setDescription("Titre").setRequired(true))
        .addStringOption((o) => o.setName("questions").setDescription("Questions séparées par | (illimité)").setRequired(true))
        .addChannelOption((o) => o.setName("reponses").setDescription("Canal de réception des réponses").setRequired(true))
        .addChannelOption((o) => o.setName("canal").setDescription("Canal de publication").setRequired(false))
        .addStringOption((o) => o.setName("description").setDescription("Description").setRequired(false))
    )
    .addSubcommand((sub) =>
      sub.setName("list").setDescription("Voir les questionnaires actifs")
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const sub = interaction.options.getSubcommand();

    if (sub === "create") {
      const title = interaction.options.getString("titre", true);
      const questionsRaw = interaction.options.getString("questions", true);
      const channel = (interaction.options.getChannel("canal") ?? interaction.channel) as TextChannel;
      const responseChannel = interaction.options.getChannel("reponses") as TextChannel | null;
      const description = interaction.options.getString("description");

      const questions = questionsRaw.split("|").map((q) => q.trim()).filter(Boolean);
      if (questions.length === 0) return interaction.reply({ content: "❌ Aucune question valide.", ephemeral: true });
      if (questions.length > 5) return interaction.reply({ content: `❌ Maximum 5 questions pour ce type (modal Discord). Tu en as ${questions.length}. Utilise /survey photo pour plus de questions.`, ephemeral: true });

      const [survey] = await db.insert(surveysTable).values({
        guildId: interaction.guildId!,
        title, description,
        channelId: channel.id,
        responseChannelId: responseChannel?.id,
        questions,
        type: "questionnaire",
        active: true,
      }).returning();

      const embed = new EmbedBuilder()
        .setTitle(`📝 ${title}`)
        .setDescription(description ?? "Répondez aux questions en cliquant sur le bouton ci-dessous.")
        .setColor(0x5865f2)
        .addFields(...questions.map((q, i) => ({ name: `Question ${i + 1}`, value: q, inline: false })))
        .setFooter({ text: `Questionnaire #${survey.id} • ASTRAL TECHNOLOGIE` })
        .setTimestamp();

      const button = new ButtonBuilder()
        .setCustomId(`survey_respond_${survey.id}`)
        .setLabel("📝 Répondre au questionnaire")
        .setStyle(ButtonStyle.Primary);

      await channel.send({ embeds: [embed], components: [new ActionRowBuilder<ButtonBuilder>().addComponents(button)] });
      await interaction.reply({ content: `✅ Questionnaire créé dans <#${channel.id}>`, ephemeral: true });
      await addLog({ guildId: interaction.guildId!, action: "SURVEY_CREATE", moderatorId: interaction.user.id, moderatorName: interaction.user.username, details: title });

    } else if (sub === "photo") {
      const title = interaction.options.getString("titre", true);
      const questionsRaw = interaction.options.getString("questions", true);
      const responseChannel = interaction.options.getChannel("reponses", true) as TextChannel;
      const channel = (interaction.options.getChannel("canal") ?? interaction.channel) as TextChannel;
      const description = interaction.options.getString("description");

      const questions = questionsRaw.split("|").map((q) => q.trim()).filter(Boolean);
      if (questions.length === 0) return interaction.reply({ content: "❌ Aucune question valide.", ephemeral: true });

      const [survey] = await db.insert(surveysTable).values({
        guildId: interaction.guildId!,
        title, description,
        channelId: channel.id,
        responseChannelId: responseChannel.id,
        questions,
        type: "fil-reponse",
        active: true,
      }).returning();

      const embed = new EmbedBuilder()
        .setTitle(`📸 ${title}`)
        .setDescription(
          (description ? description + "\n\n" : "") +
          "Cliquez sur le bouton ci-dessous pour ouvrir votre fil de réponse privé.\n" +
          "Vous pourrez envoyer **texte et photos** pour chaque question."
        )
        .setColor(0xff6b9d)
        .addFields(...questions.map((q, i) => ({ name: `Question ${i + 1}`, value: q, inline: false })))
        .setFooter({ text: `Questionnaire photo #${survey.id} • ASTRAL TECHNOLOGIE` })
        .setTimestamp();

      const button = new ButtonBuilder()
        .setCustomId(`survey_respond_${survey.id}`)
        .setLabel("📸 Ouvrir mon fil de réponse")
        .setStyle(ButtonStyle.Secondary);

      await channel.send({ embeds: [embed], components: [new ActionRowBuilder<ButtonBuilder>().addComponents(button)] });
      await interaction.reply({ content: `✅ Questionnaire photo créé dans <#${channel.id}> — réponses → <#${responseChannel.id}>`, ephemeral: true });
      await addLog({ guildId: interaction.guildId!, action: "SURVEY_CREATE", moderatorId: interaction.user.id, moderatorName: interaction.user.username, details: `[PHOTO] ${title}` });

    } else if (sub === "list") {
      const surveys = await db.select().from(surveysTable)
        .where(and(eq(surveysTable.guildId, interaction.guildId!), eq(surveysTable.active, true)));

      if (surveys.length === 0) return interaction.reply({ content: "Aucun formulaire actif.", ephemeral: true });

      const embed = new EmbedBuilder().setTitle("📝 Formulaires actifs").setColor(0x5865f2);
      for (const s of surveys) {
        const count = await db.select().from(surveyResponsesTable).where(eq(surveyResponsesTable.surveyId, s.id));
        const icon = s.type === "soumission" ? "📬" : s.type === "fil-reponse" ? "📸" : "📝";
        embed.addFields({ name: `${icon} #${s.id} — ${s.title}`, value: `Type: **${s.type}** | Questions: **${(s.questions as string[]).length}** | Réponses: **${count.length}**\nCanal: <#${s.channelId}>`, inline: false });
      }
      await interaction.reply({ embeds: [embed], ephemeral: true });
    }
  },
};

// ─── /submit create ──────────────────────────────────────────────────────────
export const submitCommand = {
  data: new SlashCommandBuilder()
    .setName("submit")
    .setDescription("📬 Créer un formulaire de soumission (texte + images/vidéos)")
    .setDefaultMemberPermissions(adminPerm)
    .addSubcommand((sub) =>
      sub
        .setName("create")
        .setDescription("Créer un formulaire de soumission avec envoi de fichiers")
        .addStringOption((o) => o.setName("titre").setDescription("Titre du formulaire").setRequired(true))
        .addStringOption((o) => o.setName("description").setDescription("Instructions pour les participants").setRequired(false))
        .addChannelOption((o) => o.setName("canal").setDescription("Canal où poster le formulaire").setRequired(false))
        .addChannelOption((o) => o.setName("reponses").setDescription("Canal pour recevoir les soumissions").setRequired(false))
    ),
  async execute(interaction: ChatInputCommandInteraction) {
    const sub = interaction.options.getSubcommand();
    if (sub !== "create") return;

    const title = interaction.options.getString("titre", true);
    const description = interaction.options.getString("description") ?? "Soumettez votre candidature en cliquant sur le bouton ci-dessous.";
    const channel = (interaction.options.getChannel("canal") ?? interaction.channel) as TextChannel;
    const responseChannel = interaction.options.getChannel("reponses") as TextChannel | null;

    const [survey] = await db.insert(surveysTable).values({
      guildId: interaction.guildId!,
      title, description,
      channelId: channel.id,
      responseChannelId: responseChannel?.id,
      questions: ["Description de votre soumission"],
      type: "soumission",
      active: true,
    }).returning();

    const embed = new EmbedBuilder()
      .setTitle(`📬 ${title}`)
      .setDescription(description)
      .setColor(0x00ff88)
      .addFields(
        { name: "📎 Fichiers acceptés", value: "Images, vidéos, documents — envoyez-les directement dans le salon après avoir cliqué sur le bouton", inline: false },
        { name: "ℹ️ Comment ça marche", value: "1. Cliquez sur **Soumettre**\n2. Décrivez votre soumission\n3. Envoyez vos fichiers dans le salon dans les 5 minutes", inline: false },
      )
      .setFooter({ text: `Soumission #${survey.id} • ASTRAL TECHNOLOGIE` })
      .setTimestamp();

    const button = new ButtonBuilder()
      .setCustomId(`survey_respond_${survey.id}`)
      .setLabel("📬 Soumettre")
      .setStyle(ButtonStyle.Success);

    await channel.send({ embeds: [embed], components: [new ActionRowBuilder<ButtonBuilder>().addComponents(button)] });
    await interaction.reply({ content: `✅ Formulaire de soumission créé dans <#${channel.id}>`, ephemeral: true });
    await addLog({ guildId: interaction.guildId!, action: "SUBMIT_CREATE", moderatorId: interaction.user.id, moderatorName: interaction.user.username, details: title });
  },
};

// ─── Button handler ───────────────────────────────────────────────────────────
export async function handleSurveyButton(interaction: ButtonInteraction): Promise<boolean> {
  const customId: string = interaction.customId;
  if (!customId.startsWith("survey_respond_")) return false;

  const surveyId = parseInt(customId.replace("survey_respond_", ""));
  const [survey] = await db.select().from(surveysTable)
    .where(and(eq(surveysTable.id, surveyId), eq(surveysTable.active, true)));

  if (!survey) {
    await interaction.reply({ content: "❌ Ce formulaire n'est plus disponible.", ephemeral: true });
    return true;
  }

  if (survey.type === "soumission") {
    await handleSubmissionFlow(interaction, survey);
    return true;
  }

  if (survey.type === "fil-reponse") {
    await handleFilReponseFlow(interaction, survey);
    return true;
  }

  // Default: text questionnaire via modal
  const questions = survey.questions as string[];
  const modal = new ModalBuilder()
    .setCustomId(`survey_modal_${surveyId}`)
    .setTitle(survey.title.substring(0, 45));

  for (let i = 0; i < Math.min(questions.length, 5); i++) {
    modal.addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId(`q_${i}`)
          .setLabel(questions[i].substring(0, 45))
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true)
          .setMaxLength(500)
      )
    );
  }

  await interaction.showModal(modal);
  return true;
}

// ─── Fil de réponse (photo + texte) ──────────────────────────────────────────
async function handleFilReponseFlow(interaction: ButtonInteraction, survey: any) {
  const questions = survey.questions as string[];
  const guild = interaction.guild!;

  await interaction.deferReply({ flags: 64 }); // ephemeral

  // Create a thread in the channel
  const parentChannel = interaction.channel as TextChannel;
  let thread: ThreadChannel | null = null;

  try {
    thread = await parentChannel.threads.create({
      name: `📸 ${interaction.user.username} — ${survey.title.substring(0, 30)}`,
      autoArchiveDuration: 60,
      type: ChannelType.PrivateThread,
      invitable: false,
    });
    await thread.members.add(interaction.user.id);
  } catch {
    // Fallback to public thread if private threads not available
    try {
      thread = await parentChannel.threads.create({
        name: `📸 ${interaction.user.username} — ${survey.title.substring(0, 30)}`,
        autoArchiveDuration: 60,
      });
      await thread.members.add(interaction.user.id);
    } catch (err) {
      await interaction.editReply({ content: "❌ Impossible de créer un fil de réponse. Vérifiez que le bot a la permission de gérer les fils." });
      return;
    }
  }

  await interaction.editReply({
    content: `✅ Ton fil de réponse privé a été créé : ${thread}\n> Réponds à chaque question avec du texte et/ou des photos.`,
  });

  // Intro message in thread
  await thread.send({
    embeds: [
      new EmbedBuilder()
        .setTitle(`📸 ${survey.title}`)
        .setColor(0xff6b9d)
        .setDescription(
          `Bonjour ${interaction.user} ! 👋\n\n` +
          `Je vais te poser **${questions.length} question${questions.length > 1 ? "s" : ""}** une par une.\n` +
          `Pour chaque question, réponds avec du **texte** et/ou envoie des **photos/images** directement dans ce fil.\n\n` +
          `⏱️ Tu as **10 minutes** par question.\n` +
          `Tape \`annuler\` pour arrêter à tout moment.`
        )
        .setFooter({ text: "ASTRAL TECHNOLOGIE — Questionnaire photo+texte" })
    ]
  });

  // Sequential Q&A
  const allAnswers: { question: string; text: string; files: string[] }[] = [];

  for (let i = 0; i < questions.length; i++) {
    const qEmbed = new EmbedBuilder()
      .setColor(0xff6b9d)
      .setDescription(`**Question ${i + 1} / ${questions.length}**\n\n╔══════════════════╗\n**${questions[i]}**\n╚══════════════════╝`)
      .setFooter({ text: i < questions.length - 1 ? `Après ta réponse, la question ${i + 2} sera posée automatiquement.` : "Dernière question !" });

    await thread.send({ embeds: [qEmbed] });

    let collected: Collection<string, any> | null = null;
    try {
      collected = await thread.awaitMessages({
        filter: (m) => m.author.id === interaction.user.id,
        max: 1,
        time: 600_000,
        errors: ["time"],
      });
    } catch {
      await thread.send({
        embeds: [new EmbedBuilder()
          .setColor(0xff3333)
          .setDescription("⏰ **Temps écoulé.** Le questionnaire a été annulé. Tu peux recommencer en cliquant à nouveau sur le bouton.")
        ]
      });
      setTimeout(() => thread?.setArchived(true).catch(() => {}), 5000);
      return;
    }

    const msg = collected.first()!;

    if (msg.content.toLowerCase().trim() === "annuler") {
      await thread.send({
        embeds: [new EmbedBuilder()
          .setColor(0xff3333)
          .setDescription("❌ Questionnaire annulé à ta demande.")
        ]
      });
      setTimeout(() => thread?.setArchived(true).catch(() => {}), 3000);
      return;
    }

    const files = [...msg.attachments.values()].map(a => a.url);
    allAnswers.push({ question: questions[i], text: msg.content, files });

    if (i < questions.length - 1) {
      await thread.send({ content: `✅ Réponse ${i + 1}/${questions.length} enregistrée !` });
    }
  }

  // Save to DB
  await db.insert(surveyResponsesTable).values({
    surveyId: survey.id,
    guildId: interaction.guildId!,
    userId: interaction.user.id,
    username: interaction.user.username,
    answers: allAnswers.map(a => a.text || ""),
    fileUrls: allAnswers.flatMap(a => a.files),
  });

  // Send summary to response channel
  if (survey.responseChannelId) {
    try {
      const responseCh = guild.channels.cache.get(survey.responseChannelId) as TextChannel | undefined;
      if (responseCh) {
        const embed = new EmbedBuilder()
          .setTitle(`📸 Nouvelle réponse — ${survey.title}`)
          .setColor(0xff6b9d)
          .setAuthor({ name: `${interaction.user.username} (${interaction.user.id})`, iconURL: interaction.user.displayAvatarURL() })
          .setTimestamp();

        for (const { question, text, files } of allAnswers) {
          const val = (text || "*Aucun texte*") + (files.length > 0 ? `\n📎 ${files.length} image(s) ci-dessous` : "");
          embed.addFields({ name: question.substring(0, 256), value: val.substring(0, 1024), inline: false });
        }

        const allFiles = allAnswers.flatMap(a => a.files);
        const firstImage = allFiles.find(u => /\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(u));
        if (firstImage) embed.setImage(firstImage);

        await responseCh.send({ embeds: [embed], files: allFiles.slice(0, 10) });
      }
    } catch (err) {
      console.error("[fil-reponse] Erreur envoi canal réponses:", err);
    }
  }

  // Thank the user and archive
  await thread.send({
    embeds: [
      new EmbedBuilder()
        .setTitle("✅ Questionnaire complété !")
        .setColor(0x00ff88)
        .setDescription(`Merci ${interaction.user} ! Toutes tes réponses ont bien été enregistrées.\n\n*Ce fil va être archivé dans quelques secondes.*`)
        .setFooter({ text: "ASTRAL TECHNOLOGIE" })
    ]
  });

  setTimeout(() => {
    thread?.setArchived(true).catch(() => {});
  }, 5000);
}

// ─── Submission button flow ───────────────────────────────────────────────────
async function handleSubmissionFlow(interaction: ButtonInteraction, survey: any) {
  const modal = new ModalBuilder()
    .setCustomId(`submit_modal_${survey.id}`)
    .setTitle(survey.title.substring(0, 45));

  modal.addComponents(
    new ActionRowBuilder<TextInputBuilder>().addComponents(
      new TextInputBuilder()
        .setCustomId("submission_text")
        .setLabel("Décrivez votre soumission")
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(false)
        .setPlaceholder("Décrivez votre soumission ici (optionnel si vous envoyez des fichiers)")
        .setMaxLength(2000)
    )
  );

  await interaction.showModal(modal);
}

// ─── Modal handler ────────────────────────────────────────────────────────────
export async function handleSurveyModal(interaction: ModalSubmitInteraction): Promise<boolean> {
  const customId = interaction.customId;

  if (customId.startsWith("submit_modal_")) return handleSubmissionModal(interaction);
  if (!customId.startsWith("survey_modal_")) return false;

  const surveyId = parseInt(customId.replace("survey_modal_", ""));
  const [survey] = await db.select().from(surveysTable).where(eq(surveysTable.id, surveyId));
  if (!survey) { await interaction.reply({ content: "❌ Questionnaire introuvable.", ephemeral: true }); return true; }

  const questions = survey.questions as string[];
  const answers: string[] = [];
  for (let i = 0; i < Math.min(questions.length, 5); i++) {
    try { answers.push(interaction.fields.getTextInputValue(`q_${i}`)); } catch { answers.push(""); }
  }

  await db.insert(surveyResponsesTable).values({
    surveyId, guildId: interaction.guildId!,
    userId: interaction.user.id, username: interaction.user.username,
    answers, fileUrls: [],
  });

  await interaction.reply({ content: "✅ Réponses enregistrées ! Merci de votre participation.", flags: 64 });

  if (survey.responseChannelId) {
    try {
      const guild = interaction.client.guilds.cache.get(interaction.guildId!);
      const responseCh = guild?.channels.cache.get(survey.responseChannelId) as TextChannel | undefined;
      if (responseCh) {
        const embed = new EmbedBuilder()
          .setTitle(`📝 Nouvelle réponse — ${survey.title}`)
          .setColor(0x5865f2)
          .setAuthor({ name: interaction.user.username, iconURL: interaction.user.displayAvatarURL() })
          .setTimestamp();
        for (let i = 0; i < questions.length; i++) {
          embed.addFields({ name: questions[i], value: answers[i] || "*Sans réponse*", inline: false });
        }
        await responseCh.send({ embeds: [embed] });
      }
    } catch {}
  }
  return true;
}

// ─── Submission modal handler ─────────────────────────────────────────────────
async function handleSubmissionModal(interaction: ModalSubmitInteraction): Promise<boolean> {
  const surveyId = parseInt(interaction.customId.replace("submit_modal_", ""));
  const [survey] = await db.select().from(surveysTable).where(eq(surveysTable.id, surveyId));
  if (!survey) { await interaction.reply({ content: "❌ Formulaire introuvable.", flags: 64 }); return true; }

  const submissionText = interaction.fields.getTextInputValue("submission_text").trim();

  await interaction.reply({
    content: `✅ **Texte enregistré !**\n📎 **Envoie maintenant tes fichiers dans ce salon** (images, vidéos, documents). Tu as **5 minutes**.\nSi tu n'as pas de fichier, ignore ce message.`,
    flags: 64,
  });

  const channel = interaction.channel as TextChannel | null;
  let fileUrls: string[] = [];

  if (channel) {
    try {
      const collected = await channel.awaitMessages({
        filter: (m) => m.author.id === interaction.user.id && m.attachments.size > 0,
        max: 1,
        time: 300_000,
      });
      const msg = collected.first();
      if (msg) {
        fileUrls = [...msg.attachments.values()].map(a => a.url);
        try { await msg.delete(); } catch {}
      }
    } catch {}
  }

  await db.insert(surveyResponsesTable).values({
    surveyId, guildId: interaction.guildId!,
    userId: interaction.user.id, username: interaction.user.username,
    answers: submissionText ? [submissionText] : [],
    fileUrls,
  });

  if (survey.responseChannelId) {
    try {
      const guild = interaction.client.guilds.cache.get(interaction.guildId!);
      const responseCh = guild?.channels.cache.get(survey.responseChannelId) as TextChannel | undefined;
      if (responseCh) {
        const embed = new EmbedBuilder()
          .setTitle(`📬 Nouvelle soumission — ${survey.title}`)
          .setDescription(submissionText || "*Aucun texte fourni*")
          .setColor(0x00ff88)
          .setAuthor({ name: `${interaction.user.username} (${interaction.user.id})`, iconURL: interaction.user.displayAvatarURL() })
          .setTimestamp();

        if (fileUrls.length > 0) {
          embed.addFields({ name: `📎 Fichiers (${fileUrls.length})`, value: fileUrls.map((u, i) => `[Fichier ${i + 1}](${u})`).join("\n"), inline: false });
        }

        const firstImage = fileUrls.find(u => /\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(u));
        if (firstImage) embed.setImage(firstImage);

        await responseCh.send({ embeds: [embed], files: fileUrls.slice(0, 10) });
      }
    } catch (err) {
      console.error("[submit] Erreur envoi canal réponses:", err);
    }
  }

  try {
    await interaction.followUp({ content: `✅ **Soumission enregistrée !** Merci ${interaction.user.username}.${fileUrls.length > 0 ? ` (${fileUrls.length} fichier(s) reçu(s))` : ""}`, flags: 64 });
  } catch {}

  return true;
}
