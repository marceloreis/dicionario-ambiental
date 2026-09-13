import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, FilePenLine } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { aliasText, dictionary, formatNorma } from "@/lib/dictionary";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const term = dictionary.termos.find((item) => item.slug === slug);
  return term
    ? { title: term.termo, description: term.definicoes[0]?.definicao_literal.slice(0, 155) }
    : {};
}

export default async function TermPage({ params }: Props) {
  const { slug } = await params;
  const term = dictionary.termos.find((item) => item.slug === slug);
  if (!term) notFound();
  const normNotes = Array.from(new Map(
    term.definicoes.flatMap((definition) =>
      (definition.norma.notas ?? []).map((note) => [note.id, { note, norma: definition.norma }] as const),
    ),
  ).values());

  return (
    <div className="site-shell">
      <header className="site-header">
        <Link href="/" className="brand">
          <span className="brand-mark">§</span>
          <span>
            <span className="eyebrow">Base normativa pesquisável</span>
            <span className="brand-title">Dicionário Ambiental</span>
          </span>
        </Link>
        <Button asChild variant="outline" size="sm">
          <Link href={`/editor?termo=${encodeURIComponent(term.slug)}`}>
            <FilePenLine size={16} />Propor alteração
          </Link>
        </Button>
      </header>
      <main className="page-wrap">
        <Link href="/" className="back-link"><ArrowLeft size={17} />Voltar à pesquisa</Link>
        <article className="term-page">
          <span className="detail-kicker">Verbete normativo</span>
          <h1 className="detail-title">{term.termo}</h1>
          {term.aliases.length > 0 && (
            <p className="aliases">Aliases: {term.aliases.map(aliasText).join(", ")}</p>
          )}
          {term.definicoes.map((definition) => (
            <section className="definition-card" key={definition.id}>
              <div className="definition-source">
                {formatNorma(definition.norma)} · {definition.dispositivo}
              </div>
              <p className="definition-text">{definition.definicao_literal}</p>
              <div className="definition-meta">
                {definition.tema && <Badge variant="secondary">{definition.tema}</Badge>}
                <span>{definition.tipo_definicao.replaceAll("_", " ")}</span>
                <span>Verificado em {definition.verificado_em}</span>
              </div>
              <div className="detail-actions">
                <Button asChild variant="outline" size="sm">
                  <a href={definition.fonte_url} target="_blank" rel="noreferrer">
                    <ExternalLink size={15} />Fonte oficial
                  </a>
                </Button>
              </div>
              {definition.notas?.map((note) => (
                <div className="note-block" key={note.id}>
                  <div className="note-heading">
                    <div><Badge variant="secondary">{note.tipo}</Badge><strong>{note.titulo ?? "Nota editorial"}</strong></div>
                    <Link href={`/editor?termo=${encodeURIComponent(term.slug)}&nota=${note.id}&escopo=definicao&definicao=${definition.id}`}>Editar nota</Link>
                  </div>
                  <p>{note.nota}</p>
                  <div className="note-meta">
                    {note.data_referencia && <span>Referência: {note.data_referencia}</span>}
                    {note.status_editorial && <span>Status: {note.status_editorial}</span>}
                    {note.fonte_url && <a href={note.fonte_url} target="_blank" rel="noreferrer">Fonte da nota</a>}
                  </div>
                </div>
              ))}
            </section>
          ))}
          {normNotes.length > 0 && (
            <section className="norm-notes">
              <span className="detail-kicker">Notas sobre as normas</span>
              <h2>Contexto normativo</h2>
              {normNotes.map(({ note, norma }) => (
                <div className="note-block" key={note.id}>
                  <div className="note-heading">
                    <div><Badge variant="secondary">{note.tipo}</Badge><strong>{note.titulo ?? "Nota sobre a norma"}</strong></div>
                    <Link href={`/editor?termo=${encodeURIComponent(term.slug)}&nota=${note.id}&escopo=norma&norma=${norma.id}`}>Editar nota</Link>
                  </div>
                  <p>{note.nota}</p>
                  <div className="note-meta">
                    <span>{formatNorma(norma)}</span>
                    {note.data_referencia && <span>Referência: {note.data_referencia}</span>}
                    {note.status_editorial && <span>Status: {note.status_editorial}</span>}
                    {note.fonte_url && <a href={note.fonte_url} target="_blank" rel="noreferrer">Fonte da nota</a>}
                  </div>
                </div>
              ))}
            </section>
          )}
        </article>
      </main>
    </div>
  );
}
