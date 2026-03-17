import { Router } from "express";
import type { Request, Response } from "express";

const router = Router();

const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID!;
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET!;

function getRedirectUri(req: Request): string {
  if (process.env.DISCORD_REDIRECT_URI) return process.env.DISCORD_REDIRECT_URI;
  const host = req.headers["x-forwarded-host"] || req.headers.host || process.env.REPLIT_DEV_DOMAIN;
  return `https://${host}/api/auth/callback`;
}

const DISCORD_SCOPES = ["identify", "guilds"].join("%20");

declare module "express-session" {
  interface SessionData {
    user?: {
      id: string;
      username: string;
      discriminator: string;
      avatar: string | null;
      global_name: string | null;
    };
    accessToken?: string;
    guilds?: Array<{
      id: string;
      name: string;
      icon: string | null;
      permissions: string;
    }>;
  }
}

router.get("/discord", (req: Request, res: Response) => {
  const redirectUri = getRedirectUri(req);
  const url = `https://discord.com/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=identify%20guilds`;
  res.redirect(url);
});

router.get("/callback", async (req: Request, res: Response) => {
  const { code } = req.query;

  if (!code || typeof code !== "string") {
    return res.redirect("/?error=no_code");
  }

  try {
    const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: DISCORD_CLIENT_ID,
        client_secret: DISCORD_CLIENT_SECRET,
        grant_type: "authorization_code",
        code,
        redirect_uri: getRedirectUri(req),
      }),
    });

    if (!tokenRes.ok) {
      console.error("Discord token error:", await tokenRes.text());
      return res.redirect("/?error=token_failed");
    }

    const tokenData = await tokenRes.json() as { access_token: string };
    const accessToken = tokenData.access_token;

    const [userRes, guildsRes] = await Promise.all([
      fetch("https://discord.com/api/users/@me", {
        headers: { Authorization: `Bearer ${accessToken}` },
      }),
      fetch("https://discord.com/api/users/@me/guilds", {
        headers: { Authorization: `Bearer ${accessToken}` },
      }),
    ]);

    if (!userRes.ok || !guildsRes.ok) {
      return res.redirect("/?error=api_failed");
    }

    const user = await userRes.json();
    const guilds = await guildsRes.json();

    req.session.user = {
      id: user.id,
      username: user.username,
      discriminator: user.discriminator,
      avatar: user.avatar,
      global_name: user.global_name,
    };
    req.session.accessToken = accessToken;
    req.session.guilds = guilds;

    await new Promise<void>((resolve, reject) => {
      req.session.save((err) => (err ? reject(err) : resolve()));
    });

    res.redirect("/");
  } catch (err) {
    console.error("OAuth callback error:", err);
    res.redirect("/?error=server_error");
  }
});

router.get("/me", (req: Request, res: Response) => {
  if (!req.session.user) {
    return res.status(401).json({ error: "Non authentifié" });
  }
  res.json({ user: req.session.user, guilds: req.session.guilds || [] });
});

router.post("/logout", (req: Request, res: Response) => {
  req.session.destroy((err) => {
    if (err) return res.status(500).json({ error: "Erreur lors de la déconnexion" });
    res.clearCookie("astral.sid");
    res.json({ success: true });
  });
});

export default router;
