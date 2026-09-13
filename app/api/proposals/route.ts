import { desc } from "drizzle-orm";
import { getEditorContext } from "@/lib/editor-auth";
import { getDb } from "@/db";
import { auditEvents, proposals } from "@/db/schema";

export const dynamic = "force-dynamic";

export async function GET() {
  const context = await getEditorContext();
  if (!context.user) {
    return Response.json({ error: "Autenticação necessária." }, { status: 401 });
  }
  if (!context.role) {
    return Response.json({ error: "Acesso editorial não concedido." }, { status: 403 });
  }
  const db = getDb();
  const rows = await db
    .select()
    .from(proposals)
    .orderBy(desc(proposals.updatedAt))
    .limit(200);
  return Response.json({ proposals: rows });
}

export async function POST(request: Request) {
  const context = await getEditorContext();
  if (!context.user) {
    return Response.json({ error: "Autenticação necessária." }, { status: 401 });
  }
  if (!context.role) {
    return Response.json({ error: "Acesso editorial não concedido." }, { status: 403 });
  }
  const body = await request.json() as Record<string, unknown>;
  const proposalKind = body.proposalKind === "note" ? "note" : "definition";
  const targetScope = body.targetScope === "norm" ? "norm" : body.targetScope === "definition" ? "definition" : null;
  const allowedNoteTypes = new Set(["historica", "comparativa", "jurisprudencial", "editorial", "bibliografica"]);
  const noteType = String(body.noteType ?? "");
  const termLabel = String(body.termLabel ?? "").trim();
  const dispositivo = String(body.dispositivo ?? "").trim();
  const proposedText = String(body.proposedText ?? "").trim();
  const justification = String(body.justification ?? "").trim();
  if (!termLabel || !dispositivo || !proposedText || !justification) {
    return Response.json(
      { error: "Termo, dispositivo, texto proposto e justificativa são obrigatórios." },
      { status: 400 },
    );
  }
  if (proposalKind === "note" && (!targetScope || !allowedNoteTypes.has(noteType))) {
    return Response.json(
      { error: "Escopo e tipo da nota são obrigatórios." },
      { status: 400 },
    );
  }
  const baseDefinitionId = typeof body.baseDefinitionId === "number" ? body.baseDefinitionId : null;
  const targetNormId = typeof body.targetNormId === "number" ? body.targetNormId : null;
  if (proposalKind === "note" && targetScope === "definition" && !baseDefinitionId) {
    return Response.json({ error: "A definição vinculada à nota é obrigatória." }, { status: 400 });
  }
  if (proposalKind === "note" && targetScope === "norm" && !targetNormId) {
    return Response.json({ error: "A norma vinculada à nota é obrigatória." }, { status: 400 });
  }
  const now = new Date().toISOString();
  const db = getDb();
  const [proposal] = await db.insert(proposals).values({
    termId: typeof body.termId === "number" ? body.termId : null,
    termSlug: String(body.termSlug ?? termLabel.toLowerCase().replace(/\s+/g, "-")),
    termLabel,
    baseDefinitionId,
    proposalKind,
    targetScope: proposalKind === "note" ? targetScope : null,
    targetNoteId: typeof body.targetNoteId === "number" ? body.targetNoteId : null,
    targetNormId: proposalKind === "note" && targetScope === "norm" ? targetNormId : null,
    noteType: proposalKind === "note" ? noteType as "historica" | "comparativa" | "jurisprudencial" | "editorial" | "bibliografica" : null,
    noteTitle: proposalKind === "note" ? String(body.noteTitle ?? "") : null,
    noteSourceUrl: proposalKind === "note" ? String(body.noteSourceUrl ?? "") : null,
    noteReferenceDate: proposalKind === "note" ? String(body.noteReferenceDate ?? "") : null,
    dispositivo,
    currentText: String(body.currentText ?? ""),
    proposedText,
    justification,
    status: "draft",
    authorId: context.user.userId,
    authorEmail: context.user.email,
    createdAt: now,
    updatedAt: now,
  }).returning();
  await db.insert(auditEvents).values({
    proposalId: proposal.id,
    actorId: context.user.userId,
    actorEmail: context.user.email,
    action: "proposal_created",
    createdAt: now,
  });
  return Response.json({ proposal }, { status: 201 });
}
