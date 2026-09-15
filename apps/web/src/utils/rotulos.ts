/**
 * Rótulos em linguagem simples (WCAG 3.1.5 / heurística 2 de Nielsen).
 * A escala REDUZIDA / ESTÁVEL / AMPLIADA ganha um significado leigo por
 * dimensão (HU-R.03) — a mesma tela serve aos três papéis, mudando só o texto.
 */
import type { DimensaoObservada, EscalaObservacao, Papel, StatusValidacao, StatusAprovacao, ResultadoDesfecho, EscopoConsentimento, EventoAuditoria } from "../services/tipos";
import type { ParametrosAdaptacao } from "@pei-vivo/motor-adaptacao";

export const PAPEL: Record<Papel, string> = {
  RESPONSAVEL: "Responsável legal",
  DOCENTE: "Docente regente",
  PROFISSIONAL_SAUDE: "Profissional de saúde",
  COORDENACAO: "Coordenação pedagógica",
};

export const DIMENSAO: Record<DimensaoObservada, { titulo: string; pergunta: string; escala: Record<EscalaObservacao, string> }> = {
  ATENCAO_SUSTENTADA: {
    titulo: "Atenção sustentada",
    pergunta: "Por quanto tempo consegue ficar numa leitura ou tarefa?",
    escala: { REDUZIDA: "Perde o fio mais cedo que antes", ESTAVEL: "Igual ao ciclo anterior", AMPLIADA: "Aguenta mais tempo que antes" },
  },
  COMPREENSAO_ENUNCIADOS: {
    titulo: "Compreensão de enunciados",
    pergunta: "Entende instruções com mais de uma etapa?",
    escala: { REDUZIDA: "Trava em instruções longas", ESTAVEL: "Igual ao ciclo anterior", AMPLIADA: "Segue instruções mais longas" },
  },
  AUTONOMIA_LEXICAL: {
    titulo: "Autonomia com palavras",
    pergunta: "Lê palavras difíceis sem ajuda?",
    escala: { REDUZIDA: "Pede mais ajuda com palavras", ESTAVEL: "Igual ao ciclo anterior", AMPLIADA: "Lê mais palavras sozinho(a)" },
  },
  INTERESSE_MANIFESTO: {
    titulo: "Interesse manifesto",
    pergunta: "Há um tema que engaja espontaneamente? Escreva-o na evidência.",
    escala: { REDUZIDA: "Menos interesse que antes", ESTAVEL: "Igual ao ciclo anterior", AMPLIADA: "Engajamento forte com um tema" },
  },
  SENSIBILIDADE_VISUAL: {
    titulo: "Sensibilidade visual",
    pergunta: "Luz, contraste ou telas incomodam?",
    escala: { REDUZIDA: "Incomoda menos que antes", ESTAVEL: "Igual ao ciclo anterior", AMPLIADA: "Incomoda mais que antes" },
  },
  FADIGA_TAREFA: {
    titulo: "Cansaço na tarefa",
    pergunta: "Cansa rápido em tarefas longas?",
    escala: { REDUZIDA: "Cansa menos que antes", ESTAVEL: "Igual ao ciclo anterior", AMPLIADA: "Cansa mais rápido que antes" },
  },
};

export const ESCALA: Record<EscalaObservacao, string> = {
  REDUZIDA: "Reduzida",
  ESTAVEL: "Estável",
  AMPLIADA: "Ampliada",
};

export const PARAMETRO: Record<keyof ParametrosAdaptacao, { titulo: string; explica: string; valor: (v: unknown) => string }> = {
  maxLinhasPorBloco: { titulo: "Linhas por bloco", explica: "Tamanho máximo de cada trecho de leitura.", valor: (v) => `${String(v)} linhas` },
  formatoEnunciado: { titulo: "Formato do enunciado", explica: "Instruções em uma etapa por vez ou em várias.", valor: (v) => (v === "ETAPA_UNICA" ? "Etapa única" : "Múltiplas etapas") },
  nivelVocabulario: { titulo: "Nível de vocabulário", explica: "Quanto o texto pode ser simplificado pela camada de IA.", valor: (v) => ({ BASICO: "Básico", INTERMEDIARIO: "Intermediário", ORIGINAL: "Original" })[String(v)] ?? String(v) },
  blocosPorMaterial: { titulo: "Blocos por material", explica: "Quantos trechos entram num único material.", valor: (v) => `${String(v)} blocos` },
  contrasteMinimo: { titulo: "Contraste mínimo", explica: "Razão de contraste do material (4,5 padrão ou 7 reforçado).", valor: (v) => `${String(v).replace(".", ",")}:1` },
  interesseAncora: { titulo: "Âncora de interesse", explica: "Tema usado para recontextualizar exemplos.", valor: (v) => (v ? String(v) : "nenhuma") },
};

export const STATUS_VALIDACAO: Record<StatusValidacao, { texto: string; tom: "sucesso" | "aviso" | "erro" | "info" | "neutro" }> = {
  VIGENTE: { texto: "Vigente", tom: "sucesso" },
  PENDENTE: { texto: "Aguardando validação clínica", tom: "aviso" },
  EM_REVISAO: { texto: "Ajuste solicitado", tom: "erro" },
  EXPIRADA: { texto: "Expirada (7 dias sem validação)", tom: "neutro" },
};

export const STATUS_APROVACAO: Record<StatusAprovacao, { texto: string; tom: "sucesso" | "aviso" | "neutro" }> = {
  RASCUNHO: { texto: "Rascunho — só você vê", tom: "aviso" },
  APROVADO: { texto: "Aprovado", tom: "sucesso" },
  DESCARTADO: { texto: "Descartado", tom: "neutro" },
};

export const DESFECHO: Record<ResultadoDesfecho, { texto: string; descricao: string; tom: "sucesso" | "aviso" | "erro" }> = {
  ALCANCADO: { texto: "Alcançado", descricao: "Concluiu a atividade com o material.", tom: "sucesso" },
  PARCIAL: { texto: "Parcial", descricao: "Avançou, mas precisou de apoio.", tom: "aviso" },
  NAO_ALCANCADO: { texto: "Não alcançado", descricao: "O material não funcionou desta vez.", tom: "erro" },
};

export const ESCOPO: Record<EscopoConsentimento, { titulo: string; descricao: string }> = {
  observacao_pedagogica: { titulo: "Observações da escola", descricao: "A professora registra, a cada 15 dias, como o estudante lida com leitura e tarefas. Nunca diagnóstico." },
  observacao_domiciliar: { titulo: "Observações da família", descricao: "Você registra o que percebe em casa: o que ajuda, o que atrapalha, o que interessa." },
  geracao_material: { titulo: "Geração de material adaptado", descricao: "A professora recebe textos adaptados ao perfil do estudante. Ela revisa tudo antes de usar." },
};

export const EVENTO: Record<EventoAuditoria, string> = {
  CONCESSAO: "Consentimento concedido",
  REVOGACAO: "Consentimento revogado",
  VALIDACAO: "Parâmetros validados pelo profissional",
  REVISAO_SOLICITADA: "Ajuste de parâmetros solicitado",
  APROVACAO_MATERIAL: "Material aprovado pela docente",
  DESCARTE_MATERIAL: "Material descartado",
  VINCULO_CRIADO: "Vínculo criado",
  VINCULO_DESATIVADO: "Vínculo desativado",
  CICLO_FECHADO: "Ciclo de observação fechado",
  EXPORTACAO: "Dados exportados",
  EXCLUSAO: "Dados excluídos",
  CADASTRO: "Estudante cadastrado",
};
