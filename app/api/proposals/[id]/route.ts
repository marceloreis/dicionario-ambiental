import { eq } from "drizzle-orm";
import { canPublish, canReview, getEditorContext } from "@/lib/editor-auth";
import { getDb } from "@/db";
import { auditEvents, proposals } from "@/db/schema";

const transitions = {
  submit: { from: ["draft", "returned"], to: "in_review" },
  approve: { from: ["in_review"], to: "approved" },
  return: { from: ["in_review"], to: "returned" },
  publish: { from: ["approved"], to: "published" },
} as const;

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const context = await getEditorContext();
  if (!context.user) {
    return Response.json({ error: "Autenticação necessária." }, { status: 401 });
  }
  if (!context.role) {
    return Response.json({ error: "Acesso editorial não concedido." }, { status: 403 });
  }
  const { id: rawId } = await params;
  const id = Number(rawId);
  if (!Number.isInteger(id)) {
    return Response.json({ error: "Proposta inválida." }, { status: 400 });
  }
  const body = await request.json() as { action?: keyof typeof transitions };
  const action = body.action;
  if (!action) {
    return Response.json({ error: "Ação editorial inválida." }, { status: 400 });
  }
  const transition = transitions[action];
  if ((action === "approve" || action === "return") && !canReview(context.role)) {
    return Response.json({ error: "Somente revisores podem executar esta ação." }, { status: 403 });
  }
  if (action === "publish" && !canPublish(context.role)) {
    return Response.json({ error: "Somente administradores podem publicar." }, { status: 403 });
  }
  const db = getDb();
  const [current] = await db.select().from(proposals).where(eq(proposals.id, id)).limit(1);
  if (!current) {
    return Response.json({ error: "Proposta não encontrada." }, { status: 404 });
  }
  if (!(transition.from as readonly string[]).includes(current.status)) {
    return Response.json(
      { error: "Esta transição não é permitida no estado atual." },
      { status: 409 },
    );
  }
  if (
    action === "submit" &&
    current.authorId !== context.user.userId &&
    context.role !== "admin"
  ) {
    return Response.json(
      { error: "Somente o autor ou um administrador pode enviar este rascunho." },
      { status: 403 },
    );
  }
  const now = new Date().toISOString();
  const [updated] = await db.update(proposals).set({
    status: transition.to,
    reviewerId:
      action === "approve" || action === "return"
        ? context.user.userId
        : current.reviewerId,
    releaseVersion:
      action === "publish" ? "próximo release" : current.releaseVersion,
    updatedAt: now,
  }).where(eq(proposals.id, id)).returning();
  await db.insert(auditEvents).values({
    proposalId: id,
    actorId: context.user.userId,
    actorEmail: context.user.email,
    action,
    details: JSON.stringify({ from: current.status, to: transition.to }),
    createdAt: now,
  });
  return Response.json({ proposal: updated });
}
