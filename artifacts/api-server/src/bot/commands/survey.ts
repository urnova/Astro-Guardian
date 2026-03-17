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
  ComponentType,
} from "discord.js";
import { db } from "@workspace/db";
import { surveysTable, surveyResponsesTable, guildConfigsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { addLog } from "../lib/db.js";

const adminPerm = PermissionFlagsBits.Administrator;

export const surveyCommand = {
  data: new SlashCommandBuilder()
    .setName("survey")
    .setDescription("📝 Gestion des questionnaires")
    .setDefaultMemberPermissions(adminPerm)
    .addSubcommand((sub) =>
      sub
        .setName("create")
        .setDescription("Créer un questionnaire")
        .addStringOption((o) => o.setName("titre").setDescription("Titre du questionnaire").setRequired(true))
        .addStringOption((o) => o.setName("questions").setDescription("Questions séparées par | (ex: Q1|Q2|Q3)").setRequired(true))
        .addChannelOption((o) => o.setName("canal").setDescription("Canal pour envoyer le questionnaire").setRequired(false))
        .addChannelOption((o) => o.setName("reponses").setDescription("Canal pour recevoir les réponses").setRequired(false))
        .addStringOption((o) => o.setName("description").setDescription("Description du questionnaire").setRequired(false))
    )
    .addSubcommand((sub) =>
      sub
        .setName("list")
        .setDescription("Voir les questionnaires actifs")
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

      if (questions.length === 0) {
        return interaction.reply({ content: "❌ Aucune question valide.", ephemeral: true });
      }

      if (questions.length > 5) {
        return interaction.reply({ content: `❌ Discord limite les questionnaires à **5 questions maximum**. Tu en as fourni **${questions.length}**. Retire ${questions.length - 5} question(s) et réessaie.`, ephemeral: true });
      }

      const [survey] = await db.insert(surveysTable).values({
        guildId: interaction.guildId!,
        title,
        description,
        channelId: channel.id,
        responseChannelId: responseChannel?.id,
        questions,
        active: true,
      }).returning();

      const embed = new EmbedBuilder()
        .setTitle(`📝 ${title}`)
        .setDescription(description ?? "Répondez aux questions suivantes en cliquant sur le bouton ci-dessous.")
        .setColor(0x5865f2)
        .addFields(
          ...questions.map((q, i) => ({ name: `Question ${i + 1}`, value: q, inline: false }))
        )
        .setFooter({ text: `Questionnaire #${survey.id} • ASTRAL TECHNOLOGIE` })
        .setTimestamp();

      const button = new ButtonBuilder()
        .setCustomId(`survey_respond_${survey.id}`)
        .setLabel("📝 Répondre au questionnaire")
        .setStyle(ButtonStyle.Primary);

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(button);

      await channel.send({ embeds: [embed], components: [row] });
      await interaction.reply({ content: `✅ Questionnaire créé dans <#${channel.id}>`, ephemeral: true });
      await addLog({ guildId: interaction.guildId!, action: "SURVEY_CREATE", moderatorId: interaction.user.id, moderatorName: interaction.user.username, details: title });

    } else if (sub === "list") {
      const surveys = await db.select().from(surveysTable)
        .where(and(eq(surveysTable.guildId, interaction.guildId!), eq(surveysTable.active, true)));

      if (surveys.length === 0) {
        return interaction.reply({ content: "Aucun questionnaire actif.", ephemeral: true });
      }

      const embed = new EmbedBuilder()
        .setTitle("📝 Questionnaires actifs")
        .setColor(0x5865f2);

      for (const s of surveys) {
        const responseCount = await db.select().from(surveyResponsesTable)
          .where(eq(surveyResponsesTable.surveyId, s.id));
        embed.addFields({
          name: `#${s.id} — ${s.title}`,
          value: `Questions: **${(s.questions as string[]).length}** | Réponses: **${responseCount.length}**\nCanal: <#${s.channelId}>`,
          inline: false,
        });
      }

      await interaction.reply({ embeds: [embed], ephemeral: true });
    }
  },
};

export async function handleSurveyButton(interaction: any) {
  const customId: string = interaction.customId;
  if (!customId.startsWith("survey_respond_")) return false;

  const surveyId = parseInt(customId.replace("survey_respond_", ""));
  const [survey] = await db.select().from(surveysTable)
    .where(and(eq(surveysTable.id, surveyId), eq(surveysTable.active, true)));

  if (!survey) {
    await interaction.reply({ content: "❌ Ce questionnaire n'est plus disponible.", ephemeral: true });
    return true;
  }

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

export async function handleSurveyModal(interaction: ModalSubmitInteraction) {
  const customId = interaction.customId;
  if (!customId.startsWith("survey_modal_")) return false;

  const surveyId = parseInt(customId.replace("survey_modal_", ""));
  const [survey] = await db.select().from(surveysTable).where(eq(surveysTable.id, surveyId));

  if (!survey) {
    await interaction.reply({ content: "❌ Questionnaire introuvable.", ephemeral: true });
    return true;
  }

  const questions = survey.questions as string[];
  const answers: string[] = [];

  for (let i = 0; i < Math.min(questions.length, 5); i++) {
    try {
      answers.push(interaction.fields.getTextInputValue(`q_${i}`));
    } catch {
      answers.push("");
    }
  }

  await db.insert(surveyResponsesTable).values({
    surveyId,
    guildId: interaction.guildId!,
    userId: interaction.user.id,
    username: interaction.user.username,
    answers,
  });

  await interaction.reply({ content: "✅ Réponses enregistrées ! Merci de votre participation.", ephemeral: true });

  if (survey.responseChannelId) {
    try {
      const client = interaction.client;
      const guild = client.guilds.cache.get(interaction.guildId!);
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
