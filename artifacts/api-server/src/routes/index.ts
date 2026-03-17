import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import botRouter from "./bot.js";
import guildsRouter from "./guilds.js";
import authRouter from "./auth.js";

const router: IRouter = Router();

router.use("/auth", authRouter);
router.use(healthRouter);
router.use("/bot", botRouter);
router.use("/guilds", guildsRouter);

export default router;
