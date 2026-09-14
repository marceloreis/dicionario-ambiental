# Dicionário de Legislação Ambiental Brasileira

Aplicação de consulta à base normativa v0.9.4 em duas edições complementares:

- **GitHub Pages:** versão pública, estática e somente para leitura;
- **ChatGPT Sites:** aplicação completa, com autenticação e ambiente editorial.

A edição estática está em `static-site/` e é publicada automaticamente em
<https://marceloreis.github.io/dicionario-ambiental/> pelo workflow
`.github/workflows/pages.yml`. O artefato reutiliza, sem duplicação, a base
`public/data/dicionario-ambiental_v0_9_4.json`.

O `index.html` da raiz oferece a mesma interface quando o Pages estiver
configurado para publicar diretamente a branch `main`; assim, os dois modos de
publicação suportados pelo GitHub conduzem à edição estática.

## Edição dinâmica

A aplicação dinâmica permanece na raiz do repositório, com interface Next/Vinext,
autenticação, APIs editoriais, Drizzle ORM e persistência D1. Para executar o
ambiente de desenvolvimento:

```bash
git clone https://github.com/marceloreis/dicionario-ambiental.git
cd dicionario-ambiental
corepack enable
pnpm install --frozen-lockfile
pnpm dev
```

## Escopo do protótipo

- consulta a 1.309 termos e 1.457 registros normativos de 97 normas;
- pesquisa sem distinção de acentos;
- filtros por norma e tema;
- páginas permanentes de verbetes;
- criação de propostas editoriais;
- fluxo de rascunho, revisão, aprovação e publicação;
- autenticação com a conta ChatGPT;
- persistência de perfis, propostas, comentários e auditoria em D1.

As versões anteriores permanecem imutáveis. A versão 0.9.4 preserva as 107 notas
editoriais e permite propor edições de definições e notas no ambiente autenticado.

## Edição estática

A edição para GitHub Pages não contém APIs, banco SQLite/D1, autenticação ou
controles de edição. Ela oferece pesquisa sem distinção de acentos, filtros,
links diretos para verbetes e exibição somente para leitura das definições e das
notas editoriais. Os caminhos relativos permitem hospedar o mesmo artefato sob o
subdiretório do projeto no GitHub Pages.

Para testar localmente, monte o artefato e inicie um servidor HTTP:

```bash
mkdir -p _site/data
cp -R static-site/. _site/
cp public/data/dicionario-ambiental_v0_9_4.json _site/data/
python3 -m http.server --directory _site 8000
```
