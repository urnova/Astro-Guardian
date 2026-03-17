import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const bannedWordsTable = pgTable("banned_words", {
  id: serial("id").primaryKey(),
  guildId: text("guild_id").notNull(),
  word: text("word").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertBannedWordSchema = createInsertSchema(bannedWordsTable).omit({ id: true, createdAt: true });
export type InsertBannedWord = z.infer<typeof insertBannedWordSchema>;
export type BannedWord = typeof bannedWordsTable.$inferSelect;
