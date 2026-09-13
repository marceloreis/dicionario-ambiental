"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BookOpenText, FilePenLine, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { DictionaryData, DictionaryTerm } from "@/lib/dictionary";

const normalize = (value: string) =>
  value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const aliasValue = (alias: string | { alias: string }) =>
  typeof alias === "string" ? alias : alias.alias;
const normaLabel = (n: DictionaryData["normas"][number]) =>
  `${n.tipo} ${n.numero}/${n.ano}`;
const normNotesFor = (term: DictionaryTerm) => Array.from(new Map(
  term.definicoes.flatMap((definition) =>
    (definition.norma.notas ?? []).map((note) => [note.id, { note, norma: definition.norma }] as const),
  ),
).values());

export default function DictionaryBrowser() {
  const [data, setData] = useState<DictionaryData | null>(null);
  const [query, setQuery] = useState("");
  const [norma, setNorma] = useState("");
  const [theme, setTheme] = useState("");
  const [selected, setSelected] = useState<DictionaryTerm | null>(null);
  const [shown, setShown] = useState(45);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/data/dicionario_ambiental_v0_9_4.json")
      .then(async (response) => {
        if (!response.ok) throw new Error("Não foi possível abrir a base.");
        return await response.json() as DictionaryData;
      })
      .then((payload: DictionaryData) => {
        setData(payload);
        setSelected(payload.termos[0] ?? null);
      })
      .catch((cause: Error) => setError(cause.message));
  }, []);

  const themes = useMemo(() => {
    if (!data) return [];
    return [...new Set(
      data.termos.flatMap((term) =>
        term.definicoes.map((definition) => definition.tema).filter(Boolean) as string[]
      ),
    )].sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [data]);

  const results = useMemo(() => {
    if (!data) return [];
    const q = normalize(query.trim());
    return data.termos.filter((term) => {
      const matchingDefinitions = term.definicoes.filter(
        (definition) =>
          (!norma || definition.norma.codigo === norma) &&
          (!theme || definition.tema === theme),
      );
      if ((norma || theme) && matchingDefinitions.length === 0) return false;
      if (!q) return true;
      const haystack = normalize([
        term.termo,
        ...term.aliases.map(aliasValue),
        ...term.definicoes.flatMap((definition) => [
          definition.definicao_literal,
          definition.dispositivo,
          definition.tema ?? "",
          definition.norma.codigo,
          definition.norma.titulo,
          definition.norma.politica_regime ?? "",
          ...(definition.notas ?? []).flatMap((note) => [note.titulo ?? "", note.nota, note.tipo]),
          ...(definition.norma.notas ?? []).flatMap((note) => [note.titulo ?? "", note.nota, note.tipo]),
        ]),
      ].join(" "));
      return q.split(/\s+/).every((token) => haystack.includes(token));
    });
  }, [data, query, norma, theme]);

  const visibleSelection =
    selected && results.some((item) => item.id === selected.id)
      ? selected
      : results[0] ?? null;

  return (
    <div className="site-shell">
      <header className="site-header">
        <Link href="/" className="brand">
          <span className="brand-mark" aria-hidden="true">§</span>
          <span>
            <span className="eyebrow">Base normativa pesquisável</span>
            <span className="brand-title">Dicionário de Legislação Ambiental Brasileira</span>
          </span>
        </Link>
        <div className="header-actions">
          <Button asChild variant="outline" size="sm">
            <Link href="/editor"><FilePenLine size={16} /><span className="label-wide">Área editorial</span></Link>
          </Button>
        </div>
      </header>

      <section className="search-band" aria-label="Pesquisa">
        <div>
          <label className="search-label" htmlFor="dictionary-search">
            Pesquisar termo, definição, sigla, norma ou tema
          </label>
          <div className="search-box">
            <Search size={21} aria-hidden="true" />
            <input
              id="dictionary-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Ex.: recuperação, OGM, resíduos perigosos…"
            />
            {query && (
              <button aria-label="Limpar pesquisa" onClick={() => setQuery("")}>
                <X size={19} />
              </button>
            )}
          </div>
          <p className="search-help">
            A busca ignora acentos e consulta também aliases e o texto das definições.
          </p>
        </div>
        <div className="stats" aria-label="Estatísticas da base">
          <div><strong>{data?.stats.termos?.toLocaleString("pt-BR") ?? "—"}</strong><span>termos</span></div>
          <div><strong>{data?.stats.definicoes?.toLocaleString("pt-BR") ?? "—"}</strong><span>registros</span></div>
          <div><strong>{data?.stats.normas?.toLocaleString("pt-BR") ?? "—"}</strong><span>normas</span></div>
          <div><strong>{data?.stats.notas?.toLocaleString("pt-BR") ?? "—"}</strong><span>notas</span></div>
        </div>
      </section>

      {error ? (
        <div className="page-wrap"><div className="error-box">{error}</div></div>
      ) : (
        <main className="dictionary-grid">
          <aside className="filter-rail" aria-label="Filtros">
            <div className="rail-title">
              <h2>Filtros</h2>
              <button onClick={() => { setNorma(""); setTheme(""); setShown(45); }}>Limpar</button>
            </div>
            <div className="filter-group">
              <label htmlFor="norma">Norma</label>
              <select id="norma" value={norma} onChange={(event) => { setNorma(event.target.value); setShown(45); }}>
                <option value="">Todas as normas</option>
                {data?.normas.map((item) => (
                  <option key={item.codigo} value={item.codigo}>{normaLabel(item)}</option>
                ))}
              </select>
            </div>
            <div className="filter-group">
              <label htmlFor="theme">Tema</label>
              <select id="theme" value={theme} onChange={(event) => { setTheme(event.target.value); setShown(45); }}>
                <option value="">Todos os temas</option>
                {themes.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </div>
            <div className="editorial-note">
              <strong>Critério editorial</strong>
              Cada definição permanece vinculada ao dispositivo e à fonte oficial.
              Definições concorrentes são preservadas separadamente.
            </div>
          </aside>

          <section className="results-column" aria-live="polite">
            <div className="column-head">
              <h2>{query ? "Resultados" : "Todos os termos"}</h2>
              <span className="count">{results.length.toLocaleString("pt-BR")} verbetes</span>
            </div>
            <div className="result-list">
              {results.slice(0, shown).map((term) => (
                <button
                  key={term.id}
                  className={`result-card ${visibleSelection?.id === term.id ? "selected" : ""}`}
                  onClick={() => setSelected(term)}
                >
                  <span className="result-term">{term.termo}</span>
                  <span className="result-meta">
                    <span>{term.definicoes.length} {term.definicoes.length === 1 ? "definição" : "definições"}</span>
                    {term.aliases.length > 0 && <span>{term.aliases.map(aliasValue).join(", ")}</span>}
                  </span>
                </button>
              ))}
            </div>
            {shown < results.length && (
              <Button className="load-more" variant="outline" onClick={() => setShown((count) => count + 45)}>
                Mostrar mais
              </Button>
            )}
          </section>

          <aside className="detail-column" aria-label="Detalhes do verbete">
            {visibleSelection ? (
              <>
                <span className="detail-kicker">Verbete normativo</span>
                <h2 className="detail-title">{visibleSelection.termo}</h2>
                {visibleSelection.aliases.length > 0 && (
                  <p className="aliases">Também pesquisável por: {visibleSelection.aliases.map(aliasValue).join(", ")}</p>
                )}
                {visibleSelection.definicoes.map((definition) => (
                  <section className="definition-card" key={definition.id}>
                    <div className="definition-source">
                      {normaLabel(definition.norma)} · {definition.dispositivo}
                    </div>
                    <p className="definition-text">{definition.definicao_literal}</p>
                    <div className="definition-meta">
                      {definition.tema && <Badge variant="secondary">{definition.tema}</Badge>}
                      <span>Verificado em {definition.verificado_em}</span>
                    </div>
                    {definition.notas?.map((note) => (
                      <div className="note-block compact" key={note.id}>
                        <div className="note-heading">
                          <div><Badge variant="secondary">{note.tipo}</Badge><strong>{note.titulo ?? "Nota editorial"}</strong></div>
                          <Link href={`/editor?termo=${encodeURIComponent(visibleSelection.slug)}&nota=${note.id}&escopo=definicao&definicao=${definition.id}`}>Editar</Link>
                        </div>
                        <p>{note.nota}</p>
                      </div>
                    ))}
                  </section>
                ))}
                {normNotesFor(visibleSelection).length > 0 && (
                  <section className="norm-notes compact">
                    <span className="detail-kicker">Notas sobre as normas</span>
                    {normNotesFor(visibleSelection).map(({ note, norma: noteNorma }) => (
                      <div className="note-block compact" key={note.id}>
                        <div className="note-heading">
                          <div><Badge variant="secondary">{note.tipo}</Badge><strong>{note.titulo ?? "Nota sobre a norma"}</strong></div>
                          <Link href={`/editor?termo=${encodeURIComponent(visibleSelection.slug)}&nota=${note.id}&escopo=norma&norma=${noteNorma.id}`}>Editar</Link>
                        </div>
                        <p>{note.nota}</p>
                        <div className="note-meta"><span>{normaLabel(noteNorma)}</span></div>
                      </div>
                    ))}
                  </section>
                )}
                <div className="detail-actions">
                  <Button asChild>
                    <Link href={`/verbete/${visibleSelection.slug}`}><BookOpenText size={16} />Abrir verbete</Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link href={`/editor?termo=${encodeURIComponent(visibleSelection.slug)}`}>
                      <FilePenLine size={16} />Propor alteração
                    </Link>
                  </Button>
                </div>
              </>
            ) : (
              <div className="empty-state">Nenhum verbete corresponde aos filtros.</div>
            )}
          </aside>
        </main>
      )}
    </div>
  );
}
