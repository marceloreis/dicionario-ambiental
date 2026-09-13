"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, FilePlus2, RotateCcw, Send, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Role = "editor" | "reviewer" | "admin";
type Status = "draft" | "in_review" | "approved" | "published" | "returned";
type ProposalKind = "definition" | "note";
type TargetScope = "definition" | "norm";
type Proposal = {
  id: number; termId: number | null; termSlug: string; termLabel: string;
  baseDefinitionId: number | null; dispositivo: string; currentText: string;
  proposedText: string; justification: string; status: Status;
  authorEmail: string; createdAt: string; updatedAt: string;
  proposalKind: ProposalKind; targetScope: TargetScope | null; targetNoteId: number | null;
  targetNormId: number | null; noteType: string | null; noteTitle: string | null;
};
type ContextResponse = { role: Role | null; bootstrapEligible: boolean; error?: string };
type ProposalsResponse = { proposals: Proposal[]; error?: string };
type ErrorResponse = { error?: string };
type DictionaryResponse = {
  termos: Array<{
    id: number; slug: string; termo: string;
    definicoes?: Array<{
      id: number; dispositivo: string; definicao_literal: string;
      notas?: Array<DictionaryNote>;
      norma: { id: number; tipo: string; numero: string; ano: number; notas?: Array<DictionaryNote> };
    }>;
  }>;
};
type DictionaryNote = {
  id: number; tipo: string; titulo?: string; nota: string;
  fonte_url?: string; data_referencia?: string;
};

const statusLabels: Record<Status, string> = {
  draft: "Rascunho", in_review: "Em revisão", approved: "Aprovado",
  published: "Publicado", returned: "Devolvido",
};
const emptyForm = {
  proposalKind: "definition" as ProposalKind, targetScope: "definition" as TargetScope,
  targetNoteId: "", targetNormId: "", noteType: "editorial", noteTitle: "",
  noteSourceUrl: "", noteReferenceDate: "",
  termId: "", termSlug: "", termLabel: "", baseDefinitionId: "",
  dispositivo: "", currentText: "", proposedText: "", justification: "",
};

export default function EditorApp() {
  const [role, setRole] = useState<Role | null>(null);
  const [bootstrapEligible, setBootstrapEligible] = useState(false);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [activeStatus, setActiveStatus] = useState<Status | "all">("all");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const contextResponse = await fetch("/api/editor/context", { cache: "no-store" });
      const context = await contextResponse.json() as ContextResponse;
      if (!contextResponse.ok) throw new Error(context.error || "Não foi possível abrir o ambiente editorial.");
      setRole(context.role);
      setBootstrapEligible(context.bootstrapEligible);
      if (context.role) {
        const proposalsResponse = await fetch("/api/proposals", { cache: "no-store" });
        const payload = await proposalsResponse.json() as ProposalsResponse;
        if (!proposalsResponse.ok) throw new Error(payload.error || "Não foi possível carregar as propostas.");
        setProposals(payload.proposals);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Erro inesperado.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const slug = query.get("termo");
    if (!slug) return;
    fetch("/data/dicionario_ambiental_v0_9_4.json")
      .then(async (response) => await response.json() as DictionaryResponse)
      .then((data) => {
        const term = data.termos.find((item: { slug: string }) => item.slug === slug);
        const definitionId = Number(query.get("definicao"));
        const normId = Number(query.get("norma"));
        const noteId = Number(query.get("nota"));
        const scope: TargetScope = query.get("escopo") === "norma" ? "norm" : "definition";
        const definition = term?.definicoes?.find((item) => item.id === definitionId) ?? term?.definicoes?.[0];
        if (!term) return;
        const norm = term.definicoes?.find((item) => item.norma.id === normId)?.norma ?? definition?.norma;
        const note = scope === "norm"
          ? norm?.notas?.find((item) => item.id === noteId)
          : definition?.notas?.find((item) => item.id === noteId);
        setForm({
          proposalKind: noteId ? "note" : "definition",
          targetScope: scope,
          targetNoteId: note ? String(note.id) : "",
          targetNormId: scope === "norm" && norm ? String(norm.id) : "",
          noteType: note?.tipo ?? "editorial",
          noteTitle: note?.titulo ?? "",
          noteSourceUrl: note?.fonte_url ?? "",
          noteReferenceDate: note?.data_referencia ?? "",
          termId: String(term.id), termSlug: term.slug, termLabel: term.termo,
          baseDefinitionId: definition ? String(definition.id) : "",
          dispositivo: definition?.dispositivo ?? "",
          currentText: note?.nota ?? definition?.definicao_literal ?? "",
          proposedText: note?.nota ?? definition?.definicao_literal ?? "",
          justification: "",
        });
        setShowForm(true);
      });
  }, []);

  const filtered = useMemo(
    () => activeStatus === "all" ? proposals : proposals.filter((proposal) => proposal.status === activeStatus),
    [activeStatus, proposals],
  );
  const counts = useMemo(() => ({
    draft: proposals.filter((proposal) => proposal.status === "draft" || proposal.status === "returned").length,
    review: proposals.filter((proposal) => proposal.status === "in_review").length,
    approved: proposals.filter((proposal) => proposal.status === "approved").length,
    published: proposals.filter((proposal) => proposal.status === "published").length,
  }), [proposals]);

  async function bootstrap() {
    setError("");
    const response = await fetch("/api/editor/bootstrap", { method: "POST" });
    const payload = await response.json() as ErrorResponse;
    if (!response.ok) return setError(payload.error || "Não foi possível ativar o administrador.");
    setMessage("Administrador inicial ativado.");
    await load();
  }

  async function createProposal(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    const response = await fetch("/api/proposals", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ...form,
        termId: form.termId ? Number(form.termId) : null,
        baseDefinitionId: form.baseDefinitionId ? Number(form.baseDefinitionId) : null,
        targetNoteId: form.targetNoteId ? Number(form.targetNoteId) : null,
        targetNormId: form.targetNormId ? Number(form.targetNormId) : null,
      }),
    });
    const payload = await response.json() as ErrorResponse;
    if (!response.ok) return setError(payload.error || "Não foi possível salvar a proposta.");
    setMessage("Rascunho salvo. O conteúdo público não foi alterado.");
    setForm(emptyForm);
    setShowForm(false);
    await load();
  }

  async function transition(id: number, action: "submit" | "approve" | "publish" | "return") {
    setError("");
    const response = await fetch(`/api/proposals/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const payload = await response.json() as ErrorResponse;
    if (!response.ok) return setError(payload.error || "A transição não pôde ser concluída.");
    setMessage("Estado editorial atualizado.");
    await load();
  }

  if (loading) return <main className="editor-main"><p>Carregando ambiente editorial…</p></main>;

  if (!role) {
    return (
      <main className="editor-main">
        <div className="bootstrap-card">
          <ShieldCheck size={32} />
          <h2>{bootstrapEligible ? "Ativar administrador inicial" : "Acesso editorial não concedido"}</h2>
          <p>{bootstrapEligible
            ? "Esta base ainda não possui responsáveis cadastrados. A ativação associa este ambiente à sua conta e habilita o fluxo editorial."
            : "Sua conta está autenticada, mas ainda não recebeu um papel editorial. Um administrador precisa incluí-la na equipe."}</p>
          {error && <div className="error-box">{error}</div>}
          {bootstrapEligible && <Button onClick={bootstrap}><ShieldCheck size={16} />Ativar como administrador</Button>}
          <Button asChild variant="outline" className="ml-2">
            <Link href="/"><ArrowLeft size={16} />Voltar ao dicionário</Link>
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="editor-main">
      <div className="editor-toolbar">
        <div>
          <h2>Propostas editoriais</h2>
          <p>Base pública congelada na versão 0.9.4 · acesso como {role === "admin" ? "administrador" : role === "reviewer" ? "revisor" : "editor"}.</p>
        </div>
        <Button onClick={() => setShowForm((value) => !value)}><FilePlus2 size={16} />Nova proposta</Button>
      </div>
      {error && <div className="error-box">{error}</div>}
      {message && <div className="success-box">{message}</div>}
      <div className="metric-grid">
        <div className="metric-card"><strong>{counts.draft}</strong><span>Rascunhos e devolvidos</span></div>
        <div className="metric-card"><strong>{counts.review}</strong><span>Em revisão</span></div>
        <div className="metric-card"><strong>{counts.approved}</strong><span>Aprovados</span></div>
        <div className="metric-card"><strong>{counts.published}</strong><span>Publicados</span></div>
      </div>

      {showForm && (
        <form className="editor-panel form-grid" onSubmit={createProposal}>
          <div className="form-pair">
            <div className="form-field">
              <label htmlFor="proposalKind">Conteúdo da proposta</label>
              <select id="proposalKind" value={form.proposalKind} onChange={(event) => setForm({ ...form, proposalKind: event.target.value as ProposalKind })}>
                <option value="definition">Definição</option>
                <option value="note">Nota</option>
              </select>
            </div>
            {form.proposalKind === "note" && (
              <div className="form-field">
                <label htmlFor="targetScope">Nota vinculada a</label>
                <select id="targetScope" value={form.targetScope} onChange={(event) => setForm({ ...form, targetScope: event.target.value as TargetScope })}>
                  <option value="definition">Definição</option>
                  <option value="norm">Norma</option>
                </select>
              </div>
            )}
          </div>
          <div className="form-pair">
            <div className="form-field">
              <label htmlFor="termLabel">Termo</label>
              <Input id="termLabel" required value={form.termLabel} onChange={(event) => setForm({ ...form, termLabel: event.target.value })} />
            </div>
            <div className="form-field">
              <label htmlFor="dispositivo">Dispositivo</label>
              <Input id="dispositivo" required value={form.dispositivo} onChange={(event) => setForm({ ...form, dispositivo: event.target.value })} placeholder="art. 3º, I" />
            </div>
          </div>
          {form.proposalKind === "note" && (
            <>
              <div className="form-pair">
                <div className="form-field">
                  <label htmlFor="noteType">Tipo da nota</label>
                  <select id="noteType" value={form.noteType} onChange={(event) => setForm({ ...form, noteType: event.target.value })}>
                    <option value="historica">Histórica</option>
                    <option value="comparativa">Comparativa</option>
                    <option value="jurisprudencial">Jurisprudencial</option>
                    <option value="editorial">Editorial</option>
                    <option value="bibliografica">Bibliográfica</option>
                  </select>
                </div>
                <div className="form-field">
                  <label htmlFor="noteTitle">Título da nota</label>
                  <Input id="noteTitle" value={form.noteTitle} onChange={(event) => setForm({ ...form, noteTitle: event.target.value })} />
                </div>
              </div>
              <div className="form-pair">
                <div className="form-field">
                  <label htmlFor="targetId">{form.targetScope === "norm" ? "ID da norma" : "ID da definição"}</label>
                  <Input id="targetId" inputMode="numeric" required value={form.targetScope === "norm" ? form.targetNormId : form.baseDefinitionId} onChange={(event) => form.targetScope === "norm" ? setForm({ ...form, targetNormId: event.target.value }) : setForm({ ...form, baseDefinitionId: event.target.value })} />
                </div>
                <div className="form-field">
                  <label htmlFor="noteReferenceDate">Data ou ano de referência</label>
                  <Input id="noteReferenceDate" value={form.noteReferenceDate} onChange={(event) => setForm({ ...form, noteReferenceDate: event.target.value })} placeholder="2020 ou 2020-09-15" />
                </div>
              </div>
              <div className="form-field">
                <label htmlFor="noteSourceUrl">Fonte da nota</label>
                <Input id="noteSourceUrl" type="url" value={form.noteSourceUrl} onChange={(event) => setForm({ ...form, noteSourceUrl: event.target.value })} placeholder="https://…" />
              </div>
            </>
          )}
          <div className="form-field">
            <label htmlFor="currentText">{form.proposalKind === "note" ? "Nota atualmente publicada" : "Texto atualmente publicado"}</label>
            <Textarea id="currentText" rows={4} value={form.currentText} onChange={(event) => setForm({ ...form, currentText: event.target.value })} />
          </div>
          <div className="form-field">
            <label htmlFor="proposedText">{form.proposalKind === "note" ? "Texto proposto para a nota" : "Texto proposto"}</label>
            <Textarea id="proposedText" required rows={5} value={form.proposedText} onChange={(event) => setForm({ ...form, proposedText: event.target.value })} />
          </div>
          <div className="form-field">
            <label htmlFor="justification">Justificativa e fonte de verificação</label>
            <Textarea id="justification" required rows={3} value={form.justification} onChange={(event) => setForm({ ...form, justification: event.target.value })} placeholder="Indique a alteração, a norma e a fonte oficial consultada." />
          </div>
          <div>
            <Button type="submit">Salvar rascunho</Button>
            <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>Cancelar</Button>
          </div>
        </form>
      )}

      <Tabs value={activeStatus} onValueChange={(value) => setActiveStatus(value as Status | "all")} className="mt-5">
        <TabsList>
          <TabsTrigger value="all">Todas</TabsTrigger>
          <TabsTrigger value="draft">Rascunhos</TabsTrigger>
          <TabsTrigger value="in_review">Em revisão</TabsTrigger>
          <TabsTrigger value="approved">Aprovadas</TabsTrigger>
          <TabsTrigger value="published">Publicadas</TabsTrigger>
        </TabsList>
      </Tabs>

      <section className="editor-panel mt-3">
        <div className="proposal-list">
          {filtered.length === 0 ? (
            <div className="empty-state">Nenhuma proposta neste estado.</div>
          ) : filtered.map((proposal) => (
            <article className="proposal-row" key={proposal.id}>
              <div>
                <h3>{proposal.termLabel}</h3>
                <p>{proposal.proposalKind === "note" ? `Nota ${proposal.noteType ?? "editorial"} · ${proposal.targetScope === "norm" ? "norma" : "definição"}` : proposal.dispositivo} · atualização em {new Date(proposal.updatedAt).toLocaleString("pt-BR")}</p>
              </div>
              <Badge variant={proposal.status === "published" ? "default" : "secondary"}>{statusLabels[proposal.status]}</Badge>
              <div className="proposal-author"><p>{proposal.authorEmail}</p></div>
              <div className="proposal-actions">
                {(proposal.status === "draft" || proposal.status === "returned") && (
                  <Button size="sm" variant="outline" onClick={() => transition(proposal.id, "submit")}><Send size={14} />Revisar</Button>
                )}
                {proposal.status === "in_review" && (role === "reviewer" || role === "admin") && (
                  <>
                    <Button size="sm" variant="outline" onClick={() => transition(proposal.id, "return")}><RotateCcw size={14} />Devolver</Button>
                    <Button size="sm" onClick={() => transition(proposal.id, "approve")}><Check size={14} />Aprovar</Button>
                  </>
                )}
                {proposal.status === "approved" && role === "admin" && (
                  <Button size="sm" onClick={() => transition(proposal.id, "publish")}><Check size={14} />Publicar</Button>
                )}
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
