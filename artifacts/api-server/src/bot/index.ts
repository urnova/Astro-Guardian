import {
  Client,
  GatewayIntentBits,
  Partials,
  Collection,
  REST,
  Routes,
} from "discord.js";
import { registerCommands } from "./commands/index.js";
import { registerEvents } from "./events/index.js";
import { recoverGiveaways } from "./commands/giveaway.js";

declare module "discord.js" {
  interface Client {
    commands: Collection<string, any>;
  }
}

let botClient: Client | null = null;

export function getBotClient(): Client | null {
  return botClient;
}

export async function startBot(): Promise<void> {
  const token = process.env.DISCORD_TOKEN;
  const clientId = process.env.DISCORD_CLIENT_ID;

  if (!token || !clientId) {
    console.warn("⚠️  DISCORD_TOKEN or DISCORD_CLIENT_ID not set — bot disabled");
    return;
  }

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.GuildPresences,
      GatewayIntentBits.DirectMessages,
      GatewayIntentBits.GuildMessageReactions,
    ],
    partials: [Partials.Channel, Partials.Message, Partials.Reaction],
  });

  client.commands = new Collection();

  const commands = registerCommands(client);
  registerEvents(client);

  client.once("ready", async () => {
    console.log(`✅ Bot connecté en tant que ${client.user?.tag}`);

    const rest = new REST().setToken(token);
    try {
      await rest.put(Routes.applicationCommands(clientId), {
        body: commands.map((c: any) => c.data.toJSON()),
      });
      console.log(`✅ ${commands.length} commandes slash synchronisées globalement`);
    } catch (err) {
      console.error("❌ Erreur lors de la sync des commandes:", err);
    }

    await recoverGiveaways(client);
  });

  await client.login(token);
  botClient = client;
}
