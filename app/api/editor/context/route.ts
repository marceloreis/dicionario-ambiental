import { getEditorContext } from "@/lib/editor-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const context = await getEditorContext();
    if (!context.user) {
      return Response.json({ error: "Autenticação necessária." }, { status: 401 });
    }
    return Response.json({
      role: context.role,
      bootstrapEligible: context.bootstrapEligible,
    });
  } catch {
    return Response.json(
      { error: "O banco editorial ainda não está disponível." },
      { status: 503 },
    );
  }
}
