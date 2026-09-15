/**
 * Especificação das telas de login por perfil (D-16, revisão de 14/09/2026).
 * Cada papel entra por uma rota própria (/entrar/<slug>) com a sua descrição:
 * o que faz, o que vê, o que nunca vê e como será o acesso real (P4.4).
 * Os perfis de demonstração são os usuários fictícios de mocks/dados.ts.
 */
import type { Papel } from "../services/tipos";
import { ID } from "../mocks/dados";

export interface EspecificacaoLogin {
  slug: string;
  papel: Papel;
  titulo: string;
  /** Quem é convidado a entrar por aqui (linguagem do usuário). */
  publico: string;
  /** Frase de contexto de uso. */
  contexto: string;
  faz: string[];
  ve: string[];
  nuncaVe: string[];
  /** Como o acesso real vai funcionar quando o Supabase Auth entrar (P4.4). */
  acessoReal: string[];
  /** Ids dos perfis de demonstração deste papel + o que cada um demonstra. */
  demo: { usuarioId: string; mostra: string }[];
  /** Ícone textual decorativo. */
  glifo: string;
}

export const PERFIS_LOGIN: EspecificacaoLogin[] = [
  {
    slug: "familia",
    papel: "RESPONSAVEL",
    titulo: "Família",
    publico: "Pai, mãe ou responsável legal pelo estudante.",
    contexto: "Você entra pelo convite da escola, decide sobre o consentimento e acompanha, do celular, o que está dando certo.",
    glifo: "♥",
    faz: [
      "Lê o termo em linguagem simples e concede ou revoga o consentimento — sem ele nada acontece.",
      "Registra o que percebe em casa (o que ajuda, o que atrapalha, o que interessa).",
      "Acompanha os materiais aprovados e se funcionaram.",
      "Exporta ou exclui todos os dados do estudante (LGPD).",
    ],
    ve: ["Observações de todos", "Parâmetros vigentes do perfil", "Materiais aprovados e desfechos", "Trilha de auditoria"],
    nuncaVe: ["Nota clínica do profissional de saúde", "Rascunhos de material"],
    acessoReal: ["Convite por e-mail enviado pela coordenação", "Senha definida no primeiro acesso (pode colar do gerenciador de senhas)", "Sem CAPTCHA nem teste cognitivo (WCAG 3.3.8)"],
    demo: [{ usuarioId: ID.responsavel, mostra: "Responsável do Miguel (fictício) e do Estudante B — o B ainda aguarda o seu consentimento." }],
  },
  {
    slug: "docente",
    papel: "DOCENTE",
    titulo: "Professores",
    publico: "Docente regente da turma do estudante.",
    contexto: "Domingo à noite, no celular: cole o texto da aula e receba a versão adaptada para aquele aluno em poucos toques.",
    glifo: "✎",
    faz: [
      "Registra a observação quinzenal em seis dimensões, com rótulos em linguagem simples.",
      "Fecha o ciclo e vê o que mudaria nos parâmetros antes de confirmar.",
      "Gera, revisa lado a lado, edita e aprova o material — nada chega ao estudante sem o seu toque.",
      "Registra o desfecho em dois toques.",
    ],
    ve: ["Observações de todos (inclusive da família e do profissional)", "Parâmetros vigentes e status da validação", "Todos os materiais do estudante, inclusive rascunhos"],
    nuncaVe: ["Nota clínica reservada", "Laudo ou diagnóstico (o sistema não os armazena)"],
    acessoReal: ["Conta criada pela coordenação da escola", "E-mail institucional + senha", "Vínculo com cada estudante feito pela coordenação"],
    demo: [
      { usuarioId: ID.docente, mostra: "Docente do Miguel (fictício): tem perfil vigente, ciclo aberto e um rascunho para revisar." },
      { usuarioId: ID.docente2, mostra: "Docente SEM vínculo: demonstra o painel vazio e o acesso negado por URL." },
    ],
  },
  {
    slug: "saude",
    papel: "PROFISSIONAL_SAUDE",
    titulo: "Equipe de saúde",
    publico: "Terapeuta ocupacional, fonoaudiólogo(a), psicopedagogo(a) ou psicólogo(a) que acompanha o estudante.",
    contexto: "Uso ocasional e de alta responsabilidade: você valida o conjunto de parâmetros de cada ciclo e mantém sua nota reservada.",
    glifo: "✚",
    faz: [
      "Valida o conjunto de parâmetros do ciclo (aprova ou pede ajuste com justificativa) — nunca material individual.",
      "Registra estratégias clínicas validadas como observação, em linguagem operacional para a escola.",
      "Escreve notas clínicas reservadas, que só profissionais de saúde vinculados leem.",
      "Acompanha o resultado real em sala pelos desfechos.",
    ],
    ve: ["Observações de todos", "Histórico completo de versões do perfil", "Materiais aprovados e desfechos", "Data em que o laudo foi apresentado", "Notas clínicas de outros profissionais do mesmo estudante"],
    nuncaVe: ["Rascunhos de material"],
    acessoReal: ["Conta criada pela coordenação com registro no conselho profissional obrigatório (CREFITO, CRFa, CRP…)", "E-mail + senha", "Se não houver profissional vinculado, o sistema opera em modo pedagógico (RN06)"],
    demo: [
      { usuarioId: ID.profissional, mostra: "Terapeuta ocupacional do Miguel (fictício): há notas reservadas e o próximo ciclo virá para validação." },
      { usuarioId: ID.fono, mostra: "Fonoaudióloga SEM vínculo: use a coordenação para vinculá-la e veja o acesso aparecer." },
    ],
  },
  {
    slug: "coordenacao",
    papel: "COORDENACAO",
    titulo: "Coordenação",
    publico: "Coordenação pedagógica da escola, responsável legal pela existência do PEI.",
    contexto: "Cadastro, vínculos e histórico com evidência para a reunião de PEI — mais desktop do que celular.",
    glifo: "☰",
    faz: [
      "Cadastra o estudante (única porta de entrada) e registra só a data do laudo, nunca o laudo.",
      "Convida a família e vincula docente e profissional; desativa vínculos ao trocar de professor.",
      "Acompanha pendências de validação.",
      "Consolida e exporta o histórico do PEI.",
    ],
    ve: ["Tudo que os outros leem: observações, parâmetros, materiais aprovados, desfechos, consentimentos, auditoria"],
    nuncaVe: ["Nota clínica reservada", "Rascunhos de material"],
    acessoReal: ["Papel institucional atribuído pela administração do sistema", "E-mail institucional + senha"],
    demo: [{ usuarioId: ID.coordenacao, mostra: "Coordenação (fictícia): cadastre um estudante, vincule Beatriz como fonoaudióloga, abra o histórico do Miguel." }],
  },
];

export const perfilPorSlug = (slug: string | undefined) => PERFIS_LOGIN.find((p) => p.slug === slug) ?? null;
