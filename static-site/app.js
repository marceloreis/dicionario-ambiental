"use strict";

const DATA_URL = document.documentElement.dataset.dictionaryUrl || "./data/dicionario_ambiental_v0_9_4.json";
const PAGE_SIZE = 40;

const state = {
  data: null,
  query: "",
  norm: "",
  theme: "",
  selectedSlug: "",
  visible: PAGE_SIZE,
};

const elements = {
  search: document.querySelector("#search-input"),
  clearSearch: document.querySelector("#clear-search"),
  clearFilters: document.querySelector("#clear-filters"),
  norm: document.querySelector("#norm-filter"),
  theme: document.querySelector("#theme-filter"),
  list: document.querySelector("#result-list"),
  count: document.querySelector("#result-count"),
  detail: document.querySelector("#detail"),
  loadMore: document.querySelector("#load-more"),
};

function normalize(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .trim();
}

function text(value) {
  return document.createTextNode(String(value ?? ""));
}

function element(tag, className, content) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (content !== undefined) node.append(text(content));
  return node;
}

function aliasText(alias) {
  return typeof alias === "string" ? alias : alias?.alias;
}

function formatNorm(norm) {
  return `${norm.tipo} nº ${norm.numero}/${norm.ano}`;
}

function indexedText(term) {
  const parts = [term.termo, ...(term.aliases || []).map(aliasText)];
  for (const definition of term.definicoes || []) {
    parts.push(
      definition.definicao_literal,
      definition.dispositivo,
      definition.tema,
      definition.norma?.titulo,
      definition.norma && formatNorm(definition.norma),
    );
    for (const note of definition.notas || []) parts.push(note.titulo, note.nota, note.tipo);
    for (const note of definition.norma?.notas || []) parts.push(note.titulo, note.nota, note.tipo);
  }
  return normalize(parts.filter(Boolean).join(" "));
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function populateSelect(select, values) {
  const fragment = document.createDocumentFragment();
  for (const value of values) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    fragment.append(option);
  }
  select.append(fragment);
}

function setStats(data) {
  const allDefinitionNotes = data.termos.flatMap((term) => term.definicoes.flatMap((definition) => definition.notas || []));
  const allNormNotes = data.normas.flatMap((norm) => norm.notas || []);
  const noteCount = unique([...allDefinitionNotes, ...allNormNotes].map((note) => String(note.id))).length;
  document.querySelector("#stat-terms").textContent = data.stats?.termos?.toLocaleString("pt-BR") ?? data.termos.length.toLocaleString("pt-BR");
  document.querySelector("#stat-definitions").textContent = data.stats?.definicoes?.toLocaleString("pt-BR") ?? data.termos.reduce((sum, term) => sum + term.definicoes.length, 0).toLocaleString("pt-BR");
  document.querySelector("#stat-norms").textContent = data.stats?.normas?.toLocaleString("pt-BR") ?? data.normas.length.toLocaleString("pt-BR");
  document.querySelector("#stat-notes").textContent = (data.stats?.notas ?? noteCount).toLocaleString("pt-BR");
}

function filteredTerms() {
  const query = normalize(state.query);
  return state.data.termos.filter((term) => {
    if (query && !term._search.includes(query)) return false;
    if (state.norm && !term.definicoes.some((definition) => definition.norma?.codigo === state.norm)) return false;
    if (state.theme && !term.definicoes.some((definition) => definition.tema === state.theme || definition.norma?.tema === state.theme)) return false;
    return true;
  });
}

function renderList({ preserveSelection = false } = {}) {
  const terms = filteredTerms();
  const visible = terms.slice(0, state.visible);
  elements.count.textContent = `${terms.length.toLocaleString("pt-BR")} ${terms.length === 1 ? "resultado" : "resultados"}`;
  elements.list.replaceChildren();
  elements.list.setAttribute("aria-busy", "false");

  if (!terms.length) {
    const empty = element("div", "empty-state");
    const wrapper = document.createElement("div");
    wrapper.append(element("strong", "", "Nenhum verbete encontrado"), element("p", "", "Revise a pesquisa ou limpe os filtros."));
    empty.append(wrapper);
    elements.list.append(empty);
    elements.loadMore.hidden = true;
    renderDetail(null);
    return;
  }

  const stillVisible = terms.some((term) => term.slug === state.selectedSlug);
  if (!preserveSelection || !stillVisible) state.selectedSlug = terms[0].slug;

  const fragment = document.createDocumentFragment();
  for (const term of visible) {
    const button = element("button", `result-card${term.slug === state.selectedSlug ? " selected" : ""}`);
    button.type = "button";
    button.dataset.slug = term.slug;
    button.setAttribute("aria-pressed", term.slug === state.selectedSlug ? "true" : "false");
    button.append(element("span", "result-term", term.termo));
    const meta = element("span", "result-meta");
    meta.append(
      element("span", "", `${term.definicoes.length} ${term.definicoes.length === 1 ? "definição" : "definições"}`),
      element("span", "", unique(term.definicoes.map((definition) => definition.norma?.codigo)).join(" · ")),
    );
    button.append(meta);
    fragment.append(button);
  }
  elements.list.append(fragment);
  elements.loadMore.hidden = visible.length >= terms.length;
  renderDetail(terms.find((term) => term.slug === state.selectedSlug) || terms[0]);
}

function renderNote(note) {
  const block = element("section", "note-block");
  const heading = element("div", "note-heading");
  const titleWrap = document.createElement("div");
  titleWrap.append(element("strong", "", note.titulo || "Nota editorial"));
  if (note.tipo) titleWrap.append(element("span", "note-type", note.tipo));
  heading.append(titleWrap);
  if (note.fonte_url) {
    const link = element("a", "", "Consultar fonte");
    link.href = note.fonte_url;
    link.target = "_blank";
    link.rel = "noreferrer";
    heading.append(link);
  }
  block.append(heading, element("p", "", note.nota));
  const metadata = [
    note.data_referencia && `Referência: ${note.data_referencia}`,
    note.status_editorial && `Status: ${note.status_editorial}`,
  ].filter(Boolean);
  if (metadata.length) {
    const meta = element("div", "note-meta");
    metadata.forEach((item) => meta.append(element("span", "", item)));
    block.append(meta);
  }
  return block;
}

function renderDetail(term) {
  elements.detail.replaceChildren();
  if (!term) {
    const empty = element("div", "empty-state");
    const wrapper = document.createElement("div");
    wrapper.append(element("strong", "", "Selecione um verbete"), element("p", "", "Os detalhes e as notas aparecerão aqui."));
    empty.append(wrapper);
    elements.detail.append(empty);
    return;
  }

  elements.detail.append(element("span", "detail-kicker", "Verbete"), element("h1", "detail-title", term.termo));
  const aliases = (term.aliases || []).map(aliasText).filter(Boolean);
  if (aliases.length) elements.detail.append(element("p", "aliases", `Também referido como: ${aliases.join(", ")}.`));

  const normNotes = new Map();
  for (const definition of term.definicoes) {
    const card = element("section", "definition-card");
    const source = element("a", "definition-source", `${formatNorm(definition.norma)} · ${definition.dispositivo}`);
    source.href = definition.fonte_url || definition.norma.fonte_oficial_url;
    source.target = "_blank";
    source.rel = "noreferrer";
    card.append(source, element("p", "definition-text", definition.definicao_literal));
    const meta = element("div", "definition-meta");
    [definition.tema, definition.tipo_definicao?.replaceAll("_", " "), definition.verificado_em && `verificado em ${definition.verificado_em}`]
      .filter(Boolean)
      .forEach((item) => meta.append(element("span", "", item)));
    card.append(meta);
    for (const note of definition.notas || []) card.append(renderNote(note));
    for (const note of definition.norma.notas || []) normNotes.set(note.id, { note, norm: definition.norma });
    elements.detail.append(card);
  }

  if (normNotes.size) {
    const section = element("section", "norm-notes");
    section.append(element("span", "detail-kicker", "Contexto normativo"), element("h2", "", "Notas sobre as normas deste verbete"));
    for (const { note, norm } of normNotes.values()) {
      const block = renderNote(note);
      const meta = block.querySelector(".note-meta") || element("div", "note-meta");
      meta.prepend(element("span", "", formatNorm(norm)));
      if (!meta.parentNode) block.append(meta);
      section.append(block);
    }
    elements.detail.append(section);
  }
}

function updateHash(slug) {
  const url = new URL(window.location.href);
  url.hash = slug ? `termo=${encodeURIComponent(slug)}` : "";
  history.replaceState(null, "", url);
}

function hashSlug() {
  const match = window.location.hash.match(/^#termo=(.+)$/);
  return match ? decodeURIComponent(match[1]) : "";
}

function selectTerm(slug, focusDetail = false) {
  state.selectedSlug = slug;
  updateHash(slug);
  renderList({ preserveSelection: true });
  if (focusDetail && window.matchMedia("(max-width: 900px)").matches) elements.detail.scrollIntoView({ behavior: "smooth" });
}

async function init() {
  try {
    const response = await fetch(DATA_URL);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    data.termos = data.termos.map((term) => ({ ...term, _search: indexedText(term) }));
    state.data = data;
    state.selectedSlug = hashSlug();
    setStats(data);

    const norms = [...data.normas].sort((a, b) => formatNorm(a).localeCompare(formatNorm(b), "pt-BR", { numeric: true }));
    for (const norm of norms) {
      const option = document.createElement("option");
      option.value = norm.codigo;
      option.textContent = `${formatNorm(norm)} — ${norm.titulo}`;
      elements.norm.append(option);
    }
    const themes = unique(data.termos.flatMap((term) => term.definicoes.flatMap((definition) => [definition.tema, definition.norma?.tema]))).sort((a, b) => a.localeCompare(b, "pt-BR"));
    populateSelect(elements.theme, themes);
    renderList({ preserveSelection: true });
  } catch (error) {
    console.error(error);
    elements.count.textContent = "Falha ao carregar";
    elements.list.setAttribute("aria-busy", "false");
    elements.detail.replaceChildren();
    const empty = element("div", "empty-state error-state");
    const wrapper = document.createElement("div");
    wrapper.append(element("strong", "", "Não foi possível carregar a base"), element("p", "", "Atualize a página ou tente novamente mais tarde."));
    empty.append(wrapper);
    elements.detail.append(empty);
  }
}

let searchTimer;
elements.search.addEventListener("input", () => {
  clearTimeout(searchTimer);
  elements.clearSearch.hidden = !elements.search.value;
  searchTimer = setTimeout(() => {
    state.query = elements.search.value;
    state.visible = PAGE_SIZE;
    renderList();
  }, 120);
});
elements.clearSearch.addEventListener("click", () => {
  elements.search.value = "";
  elements.clearSearch.hidden = true;
  state.query = "";
  state.visible = PAGE_SIZE;
  renderList();
  elements.search.focus();
});
elements.norm.addEventListener("change", () => { state.norm = elements.norm.value; state.visible = PAGE_SIZE; renderList(); });
elements.theme.addEventListener("change", () => { state.theme = elements.theme.value; state.visible = PAGE_SIZE; renderList(); });
elements.clearFilters.addEventListener("click", () => {
  state.norm = "";
  state.theme = "";
  elements.norm.value = "";
  elements.theme.value = "";
  state.visible = PAGE_SIZE;
  renderList();
});
elements.list.addEventListener("click", (event) => {
  const button = event.target.closest("[data-slug]");
  if (button) selectTerm(button.dataset.slug, true);
});
elements.loadMore.addEventListener("click", () => { state.visible += PAGE_SIZE; renderList({ preserveSelection: true }); });
window.addEventListener("hashchange", () => {
  const slug = hashSlug();
  if (slug && state.data?.termos.some((term) => term.slug === slug)) selectTerm(slug);
});

init();
