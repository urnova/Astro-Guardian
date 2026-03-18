import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
} from "discord.js";

const ASTRAL_RESPONSES: Record<string, string[]> = {
  bonjour: ["Bonjour Agent ! Systèmes en ligne. Comment puis-je vous assister ?", "Salutations ! ASTRAL-BOT opérationnel. À votre service.", "Connexion établie. Bonsoir, Agent. Prêt pour la mission ?"],
  aide: ["Mes capacités incluent : modération avancée, sécurité, giveaways, questionnaires. Utilisez `/help` pour la liste complète.", "Je peux vous aider avec la gestion du serveur, les systèmes de sécurité, et bien plus. Tapez `/help`."],
  securite: ["Systèmes de sécurité ASTRAL actifs. Anti-raid, automod, mots filtrés — tout est sous contrôle.", "Protocoles de sécurité en ligne. Aucune menace détectée. Le serveur est sécurisé."],
  status: ["ASTRAL-BOT v2.0 — Tous les systèmes nominaux. ✅", "Statut : OPÉRATIONNEL | Ping : Ultra-faible | Systèmes : ACTIFS"],
  merci: ["C'est mon devoir, Agent. Je suis là pour servir.", "Mission accomplie. À votre service en permanence.", "Protocole de gratitude reçu. L'honneur est pour moi."],
};

const DEFAULT_RESPONSES = [
  "Requête reçue. Analyse en cours... Je traite votre demande.",
  "Données insuffisantes pour une réponse précise. Pouvez-vous reformuler ?",
  "Intéressant. Mes algorithmes ne trouvent pas de réponse directe. Essayez `/help` pour explorer mes capacités.",
  "Traitement de votre message... Résultat : Je suis ASTRAL-BOT, IA de sécurité. Ma spécialité : protéger ce serveur.",
  "Signal reçu 5/5. Malheureusement, je n'ai pas de réponse précise à ça. Mais je suis là si vous avez besoin de modération !",
  "Analyse linguistique terminée. Recommandation : utilisez `/help` pour voir ce que je peux faire.",
];

function getResponse(message: string): string {
  const lower = message.toLowerCase();
  for (const [key, responses] of Object.entries(ASTRAL_RESPONSES)) {
    if (lower.includes(key)) {
      return responses[Math.floor(Math.random() * responses.length)];
    }
  }
  return DEFAULT_RESPONSES[Math.floor(Math.random() * DEFAULT_RESPONSES.length)];
}

export const chatCommand = {
  data: new SlashCommandBuilder()
    .setName("chat")
    .setDescription("🤖 Parler avec ASTRAL-BOT")
    .addStringOption((o) => o.setName("message").setDescription("Votre message").setRequired(true)),
  async execute(interaction: ChatInputCommandInteraction) {
    const message = interaction.options.getString("message", true);
    const response = getResponse(message);
    await interaction.reply(response);
  },
};
