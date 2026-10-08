/**
 * Contrato da camada de serviços (D-17). Toda tela depende só desta interface.
 * Hoje a implementação é `mockApi` (memória + localStorage, latência simulada,
 * matriz de permissões v2 aplicada — o mock NEGA o que o RLS negaria).
 * A próxima implementação é `supabaseApi` (supabase-js + Edge Functions), sem
 * mudar nenhuma tela.
 */
import type {
  Auditoria,
  Ciclo,
  Consentimento,
  Desfecho,
  DimensaoObservada,
  EscalaObservacao,
  EscopoConsentimento,
  Estudante,
  ExportacaoEstudante,
  Material,
  Notificacao,
  NotaClinica,
  ObservacaoRegistro,
  Papel,
  Pendencia,
  ResumoEscola,
  ResultadoDesfecho,
  ResultadoFechamento,
  Usuario,
  CadastroSegundoFator,
  NivelSessao,
  ResultadoEntrada,
  VersaoPerfil,
  Vinculo,
} from "./tipos";

export interface NovaObservacao {
  dimensao: DimensaoObservada;
  valorEscala: EscalaObservacao;
  evidencia?: string | null;
}

export interface NovoEstudante {
  nome: string;
  dataNascimento: string;
  turma?: string | null;
  laudoApresentadoEm?: string | null;
}

export interface NovoVinculo {
  usuarioId: string;
  estudanteId: string;
  papel: Papel;
  registroConselho?: string | null;
  /** D-25: vínculo de responsável só com conferência presencial declarada pela coordenação. */
  conferidoPresencialmente?: boolean;
}

export interface NovoConvite {
  email: string;
  nome?: string;
  papel: Papel;
  /** Obrigatório para RESPONSAVEL e PROFISSIONAL_SAUDE. */
  estudanteId?: string | null;
  registroConselho?: string | null;
  conferidoPresencialmente?: boolean;
}

export interface RespostaConvite {
  emailEnviado: boolean;
  avisos: string[];
}

export interface PeiVivoApi {
  /** "demonstracao" = mock (D-16/D-17); "real" = Supabase Auth + PostgREST (D-32). */
  readonly modo: "demonstracao" | "real";

  // sessão — modo demonstração (D-16)
  listarPerfisDemo(): Promise<Usuario[]>;
  entrar(usuarioId: string): Promise<Usuario>;
  sair(): Promise<void>;
  usuarioAtual(): Usuario | null;

  // sessão — modo real (D-32): convite, senha, segundo fator, recuperação
  /** Restaura a sessão salva pelo Auth (ao abrir o app ou voltar de um link de e-mail). */
  carregarSessao(): Promise<Usuario | null>;
  entrarComSenha(email: string, senha: string): Promise<ResultadoEntrada>;
  nivelSessao(): Promise<{ atual: NivelSessao; temFatorCadastrado: boolean }>;
  iniciarCadastroSegundoFator(): Promise<CadastroSegundoFator>;
  /** Verifica o código de 6 dígitos: conclui o cadastro (fatorId) ou o desafio do fator existente. */
  verificarSegundoFator(codigo: string, fatorId?: string): Promise<void>;
  pedirRecuperacaoSenha(email: string): Promise<void>;
  /**
   * Define a nova senha da sessão atual (link de convite ou de recuperação). No
   * convite, `versaoTermosAceita` registra o aceite dos termos (D-27).
   */
  definirSenha(novaSenha: string, versaoTermosAceita?: string): Promise<void>;
  /** "Sair de todos os dispositivos" (F13). */
  sairDeTodos(): Promise<void>;

  // estudantes e vínculos
  listarEstudantes(): Promise<Estudante[]>;
  obterEstudante(id: string): Promise<Estudante>;
  meuPapel(estudanteId: string): Promise<Papel | null>;
  listarVinculos(estudanteId: string): Promise<Vinculo[]>;
  listarUsuarios(): Promise<Usuario[]>;
  cadastrarEstudante(dados: NovoEstudante): Promise<Estudante>;
  vincular(dados: NovoVinculo): Promise<Vinculo>;
  desativarVinculo(vinculoId: string): Promise<void>;
  /** D-24: o responsável confirma (ou recusa) o profissional proposto pela coordenação. */
  confirmarVinculo(vinculoId: string, aceitar: boolean): Promise<Vinculo>;
  /** R2.1: coordenação convida por e-mail (Edge Function `convidar` no sistema real). */
  convidar(dados: NovoConvite): Promise<RespostaConvite>;

  // notificações (D-28)
  listarNotificacoes(): Promise<Notificacao[]>;
  marcarNotificacoesLidas(ids?: string[]): Promise<void>;

  // consentimento (RN01, RN08)
  obterConsentimento(estudanteId: string): Promise<Consentimento | null>;
  concederConsentimento(estudanteId: string, escopo: EscopoConsentimento[]): Promise<Consentimento>;
  revogarConsentimento(estudanteId: string): Promise<Consentimento>;

  // ciclos e observações (RF03, RF04)
  listarCiclos(estudanteId: string): Promise<Ciclo[]>;
  obterCicloAberto(estudanteId: string): Promise<Ciclo | null>;
  abrirCiclo(estudanteId: string): Promise<Ciclo>;
  listarObservacoes(estudanteId: string): Promise<ObservacaoRegistro[]>;
  registrarObservacao(cicloId: string, dados: NovaObservacao): Promise<ObservacaoRegistro>;

  // versões de perfil (RF05–RF07)
  listarVersoes(estudanteId: string): Promise<VersaoPerfil[]>;
  obterVersaoVigente(estudanteId: string): Promise<VersaoPerfil | null>;
  preverFechamento(cicloId: string): Promise<ResultadoFechamento>;
  fecharCiclo(cicloId: string): Promise<ResultadoFechamento>;
  validarVersao(versaoId: string, decisao: "APROVAR" | "AJUSTE", justificativa?: string): Promise<VersaoPerfil>;
  listarPendencias(): Promise<Pendencia[]>;
  /** R4.5: só coordenação; só contagens e motivos, nunca conteúdo. */
  resumoEscola(): Promise<ResumoEscola>;

  // materiais (RF08–RF13)
  listarMateriais(estudanteId: string): Promise<Material[]>;
  obterMaterial(id: string): Promise<Material>;
  gerarMaterial(estudanteId: string, titulo: string, texto: string): Promise<Material>;
  aprovarMaterial(id: string, textoRevisado?: string): Promise<Material>;
  descartarMaterial(id: string): Promise<Material>;
  obterDesfecho(materialId: string): Promise<Desfecho | null>;
  registrarDesfecho(materialId: string, resultado: ResultadoDesfecho, observacaoLivre?: string): Promise<Desfecho>;

  // nota clínica (RN02)
  listarNotasClinicas(estudanteId: string): Promise<NotaClinica[]>;
  registrarNotaClinica(estudanteId: string, conteudo: string): Promise<NotaClinica>;

  // auditoria e LGPD (D-05, D-06)
  listarAuditoria(estudanteId: string): Promise<Auditoria[]>;
  exportarDados(estudanteId: string): Promise<ExportacaoEstudante>;
  excluirEstudante(estudanteId: string, confirmacaoNome: string): Promise<void>;

  // utilidades de demonstração
  reiniciarDados(): Promise<void>;
  simularFalha(ativa: boolean): void;
}
