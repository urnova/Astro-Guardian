import express, { type Express } from "express";
import cors from "cors";
import router from "./routes/index.js";
import { startBot } from "./bot/index.js";

const app: Express = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

startBot().catch((err) => {
  console.error("❌ Erreur démarrage bot:", err);
});

export default app;
