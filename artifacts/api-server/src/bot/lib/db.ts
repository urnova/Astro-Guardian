import { db } from "@workspace/db";
import { guildConfigsTable, logsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

export async function getOrCreateConfig(guildId: string) {
  const existing = await db
    .select()
    .from(guildConfigsTable)
    .where(eq(guildConfigsTable.guildId, guildId))
    .limit(1);

  if (existing.length > 0) return existing[0];

  const inserted = await db
    .insert(guildConfigsTable)
    .values({ guildId })
    .returning();

  return inserted[0];
}

export async function addLog(data: {
  guildId: string;
  action: string;
  targetId?: string;
  targetName?: string;
  moderatorId?: string;
  moderatorName?: string;
  details?: string;
}) {
  await db.insert(logsTable).values(data);
}
