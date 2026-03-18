import { pgTable, text, integer, serial, boolean, timestamp, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const surveysTable = pgTable("surveys", {
  id: serial("id").primaryKey(),
  guildId: text("guild_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  channelId: text("channel_id").notNull(),
  responseChannelId: text("response_channel_id"),
  questions: json("questions").$type<string[]>().notNull().default([]),
  type: text("type").notNull().default("questionnaire"),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const surveyResponsesTable = pgTable("survey_responses", {
  id: serial("id").primaryKey(),
  surveyId: integer("survey_id").notNull(),
  guildId: text("guild_id").notNull(),
  userId: text("user_id").notNull(),
  username: text("username").notNull(),
  answers: json("answers").$type<string[]>().notNull().default([]),
  fileUrls: json("file_urls").$type<string[]>().default([]),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertSurveySchema = createInsertSchema(surveysTable).omit({ id: true, createdAt: true });
export const insertSurveyResponseSchema = createInsertSchema(surveyResponsesTable).omit({ id: true, createdAt: true });
export type InsertSurvey = z.infer<typeof insertSurveySchema>;
export type Survey = typeof surveysTable.$inferSelect;
export type SurveyResponse = typeof surveyResponsesTable.$inferSelect;
