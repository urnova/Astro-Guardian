import { pgTable, serial, text, boolean, timestamp } from "drizzle-orm/pg-core";

export const serverRulesTable = pgTable("server_rules", {
  id: serial("id").primaryKey(),
  guildId: text("guild_id").notNull().unique(),
  channelId: text("channel_id").notNull(),
  messageId: text("message_id"),
  title: text("title").notNull(),
  description: text("description").notNull(),
  memberRoleId: text("member_role_id"),
  enabled: boolean("enabled").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
