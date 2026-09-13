import { count, eq } from "drizzle-orm";
import { getChatGPTUser } from "@/app/chatgpt-auth";
import { getDb } from "@/db";
import { editorProfiles } from "@/db/schema";

export type EditorRole = "editor" | "reviewer" | "admin";

export async function getEditorContext() {
  const user = await getChatGPTUser();
  if (!user) return { user: null, role: null, bootstrapEligible: false };
  const db = getDb();
  const [profile] = await db.select().from(editorProfiles).where(eq(editorProfiles.userId, user.userId)).limit(1);
  if (profile) return { user, role: profile.role as EditorRole, bootstrapEligible: false };
  const [{ total }] = await db.select({ total: count() }).from(editorProfiles);
  return { user, role: null, bootstrapEligible: Number(total) === 0 };
}

export const canReview = (role: EditorRole) =>
  role === "reviewer" || role === "admin";
export const canPublish = (role: EditorRole) => role === "admin";
