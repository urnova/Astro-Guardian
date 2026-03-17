import path from "path";
import fs from "fs";
import express, { type Express } from "express";
import cors from "cors";
import router from "./routes/index.js";
import { startBot } from "./bot/index.js";

const app: Express = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

if (process.env.NODE_ENV === "production") {
  const panelDist = path.resolve(process.cwd(), "artifacts/astral-panel/dist/public");
  if (fs.existsSync(panelDist)) {
    app.use(express.static(panelDist));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(panelDist, "index.html"));
    });
  }
}

startBot().catch((err) => {
  console.error("❌ Erreur démarrage bot:", err);
});

export default app;
