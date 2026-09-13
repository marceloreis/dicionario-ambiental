# Dicionário de Legislação Ambiental Brasileira

Aplicação de consulta à base normativa v0.9.4 em duas edições complementares:

- **GitHub Pages:** versão pública, estática e somente para leitura;
- **ChatGPT Sites:** aplicação completa, com autenticação e ambiente editorial.

A edição estática está em `static-site/` e é publicada automaticamente em
<https://marceloreis.github.io/dicionario_ambiental/> pelo workflow
`.github/workflows/pages.yml`. O artefato reutiliza, sem duplicação, a base
`public/data/dicionario_ambiental_v0_9_4.json`.

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
cp public/data/dicionario_ambiental_v0_9_4.json _site/data/
python3 -m http.server --directory _site 8000
```
