import { pgTable, text, boolean, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const guildConfigsTable = pgTable("guild_configs", {
  guildId: text("guild_id").primaryKey(),
  logChannelId: text("log_channel_id"),
  surveyChannelId: text("survey_channel_id"),
  maintenanceMode: boolean("maintenance_mode").default(false).notNull(),
  maintenanceReason: text("maintenance_reason"),
  breachMode: boolean("breach_mode").default(false).notNull(),
  automodEnabled: boolean("automod_enabled").default(true).notNull(),
  antiRaidEnabled: boolean("anti_raid_enabled").default(true).notNull(),
  antiSpamEnabled: boolean("anti_spam_enabled").default(true).notNull(),
  maxMentions: integer("max_mentions").default(5).notNull(),
  maxMessagesPerMinute: integer("max_messages_per_minute").default(10).notNull(),
  welcomeChannelId: text("welcome_channel_id"),
  welcomeMessage: text("welcome_message"),
  goodbyeChannelId: text("goodbye_channel_id"),
  goodbyeMessage: text("goodbye_message"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertGuildConfigSchema = createInsertSchema(guildConfigsTable);
export type InsertGuildConfig = z.infer<typeof insertGuildConfigSchema>;
export type GuildConfig = typeof guildConfigsTable.$inferSelect;
