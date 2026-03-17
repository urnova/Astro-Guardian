import { pgTable, text, integer, serial, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const giveawaysTable = pgTable("giveaways", {
  id: serial("id").primaryKey(),
  guildId: text("guild_id").notNull(),
  channelId: text("channel_id").notNull(),
  messageId: text("message_id"),
  prize: text("prize").notNull(),
  winnersCount: integer("winners_count").default(1).notNull(),
  endsAt: timestamp("ends_at").notNull(),
  ended: boolean("ended").default(false).notNull(),
  createdBy: text("created_by").notNull(),
  participants: integer("participants").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertGiveawaySchema = createInsertSchema(giveawaysTable).omit({ id: true, createdAt: true });
export type InsertGiveaway = z.infer<typeof insertGiveawaySchema>;
export type Giveaway = typeof giveawaysTable.$inferSelect;
