import path from "path";
import fs from "fs";
import express, { type Express } from "express";
import cors from "cors";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import pg from "pg";
import router from "./routes/index.js";
import { startBot } from "./bot/index.js";

const app: Express = express();

app.set("trust proxy", 1);

app.use(cors({
  origin: true,
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const PgSession = connectPgSimple(session);

const pgPool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

pgPool.query(`
  CREATE TABLE IF NOT EXISTS "session" (
    "sid" varchar NOT NULL COLLATE "default",
    "sess" json NOT NULL,
    "expire" timestamp(6) NOT NULL,
    CONSTRAINT "session_pkey" PRIMARY KEY ("sid")
  )
`).catch((err) => console.error("Session table setup error:", err));

app.use(session({
  name: "astral.sid",
  store: new PgSession({ pool: pgPool, tableName: "session", createTableIfMissing: true }),
  secret: process.env.SESSION_SECRET || "astral-fallback-secret-change-me",
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,
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
