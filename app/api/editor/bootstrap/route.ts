import { count } from "drizzle-orm";
import { getChatGPTUser } from "@/app/chatgpt-auth";
import { getDb } from "@/db";
import { auditEvents, editorProfiles } from "@/db/schema";

export async function POST() {
  const user = await getChatGPTUser();
  if (!user) {
    return Response.json({ error: "Autenticação necessária." }, { status: 401 });
  }
  const db = getDb();
  const [{ total }] = await db.select({ total: count() }).from(editorProfiles);
  if (Number(total) > 0) {
    return Response.json(
      { error: "O administrador inicial já foi definido." },
      { status: 409 },
    );
  }
  const now = new Date().toISOString();
  await db.batch([
    db.insert(editorProfiles).values({
      userId: user.userId,
      email: user.email,
      displayName: user.displayName,
      role: "admin",
      createdAt: now,
      updatedAt: now,
    }),
    db.insert(auditEvents).values({
      actorId: user.userId,
      actorEmail: user.email,
      action: "bootstrap_admin",
      details: JSON.stringify({ role: "admin" }),
      createdAt: now,
    }),
  ]);
  return Response.json({ role: "admin" }, { status: 201 });
}
