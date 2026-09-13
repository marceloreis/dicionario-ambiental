import dictionaryJson from "@/public/data/dicionario_ambiental_v0_9_4.json";

export type Alias = { alias: string; tipo?: string } | string;
export type EditorialNote = {
  id: number;
  tipo: "historica" | "comparativa" | "jurisprudencial" | "editorial" | "bibliografica";
  titulo?: string;
  nota: string;
  fonte_url?: string;
  data_referencia?: string;
  status_editorial?: string;
};
export type Norma = {
  id: number;
  codigo: string;
  tipo: string;
  numero: string;
  ano: number;
  titulo: string;
  politica_regime?: string;
  tema?: string;
  fonte_oficial_url: string;
  cobertura: string;
  verificado_em: string;
  notas?: EditorialNote[];
};
export type Definition = {
  id: number;
  norma: Norma;
  dispositivo: string;
  definicao_literal: string;
  tema?: string;
  tipo_definicao: string;
  status_editorial: string;
  fonte_url: string;
  verificado_em: string;
  notas?: EditorialNote[];
  bibliografia?: Array<{ id: number; citacao: string; url?: string }>;
};
export type DictionaryTerm = {
  id: number;
  termo: string;
  slug: string;
  aliases: Alias[];
  definicoes: Definition[];
  relacoes?: Array<{ id?: number; tipo_relacao: string; nota?: string | null; termo: string; slug?: string }>;
};
export type DictionaryData = {
  metadata: { projeto: string; versao: string; gerado_em: string };
  stats: Record<string, number>;
  normas: Norma[];
  termos: DictionaryTerm[];
};

export const dictionary = dictionaryJson as unknown as DictionaryData;
export const formatNorma = (norma: Norma) =>
  `${norma.tipo} nº ${norma.numero}/${norma.ano}`;
export const aliasText = (alias: Alias) =>
  typeof alias === "string" ? alias : alias.alias;
