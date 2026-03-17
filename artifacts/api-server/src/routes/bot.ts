import { Router } from "express";
import { getBotClient } from "../bot/index.js";

const router = Router();

router.get("/status", (_req, res) => {
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

router.get("/guilds", (_req, res) => {
  const client = getBotClient();
  if (!client || !client.isReady()) return res.json([]);

  const guilds = client.guilds.cache.map((g) => ({
    id: g.id,
    name: g.name,
    icon: g.iconURL(),
    memberCount: g.memberCount,
    maintenanceMode: false,
    breachMode: false,
  }));

  res.json(guilds);
});

export default router;
