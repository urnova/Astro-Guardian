import path from "path";
import fs from "fs";
import express, { type Express } from "express";
import cors from "cors";
import session from "express-session";
import router from "./routes/index.js";
import { startBot } from "./bot/index.js";

const app: Express = express();

app.use(cors({
  origin: true,
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  name: "astral.sid",
  secret: process.env.SESSION_SECRET || "astral-fallback-secret-change-me",
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    sameSite: "lax",
  },
}));

app.use("/api", router);

if (process.env.NODE_ENV === "production") {
  const panelDist = path.resolve(process.cwd(), "artifacts/astral-panel/dist/public");
  if (fs.existsSync(panelDist)) {
    app.use(express.static(panelDist));
    app.get("/{*splat}", (_req, res) => {
      res.sendFile(path.join(panelDist, "index.html"));
    });
  }
}

startBot().catch((err) => {
  console.error("❌ Erreur démarrage bot:", err);
});

export default app;
