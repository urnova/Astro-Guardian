import { Router } from "express";
import type { Request, Response } from "express";
import { getBotClient } from "../bot/index.js";
import { db } from "@workspace/db";
import { guildConfigsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

const ADMIN_PERMISSION = BigInt(0x8);

router.get("/status", (_req: Request, res: Response) => {
  const client = getBotClient();
  if (!client || !client.isReady()) {
    return res.json({
      online: false,
      username: "ASTRAL-BOT",
      guildCount: 0,
      uptime: 0,
      ping: 0,
    });
  }

  res.json({
    online: true,
    username: client.user!.username,
    discriminator: client.user!.discriminator,
    avatar: client.user!.displayAvatarURL(),
    guildCount: client.guilds.cache.size,
    uptime: client.uptime ?? 0,
    ping: client.ws.ping,
  });
});

router.get("/guilds", async (req: Request, res: Response) => {
  const client = getBotClient();
  if (!client || !client.isReady()) return res.json([]);

  const sessionGuilds = req.session?.guilds;

  let botGuilds = client.guilds.cache.map((g) => ({
    id: g.id,
    name: g.name,
    icon: g.iconURL(),
    memberCount: g.memberCount,
    maintenanceMode: false,
    breachMode: false,
  }));

  if (sessionGuilds && sessionGuilds.length > 0) {
    const adminGuildIds = new Set(
      sessionGuilds
        .filter((g) => (BigInt(g.permissions) & ADMIN_PERMISSION) === ADMIN_PERMISSION)
        .map((g) => g.id)
    );
    botGuilds = botGuilds.filter((g) => adminGuildIds.has(g.id));
  }

  try {
    const configs = await db.select().from(guildConfigsTable);
    const configMap = new Map(configs.map((c) => [c.guildId, c]));

    botGuilds = botGuilds.map((g) => ({
      ...g,
      maintenanceMode: configMap.get(g.id)?.maintenanceMode ?? false,
      breachMode: configMap.get(g.id)?.breachMode ?? false,
    }));
  } catch {}

  res.json(botGuilds);
});

export default router;
