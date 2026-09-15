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
  NotaClinica,
  ObservacaoRegistro,
  Papel,
  Pendencia,
  ResultadoDesfecho,
  ResultadoFechamento,
  Usuario,
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
}

export interface PeiVivoApi {
  // sessão (D-16: modo demonstração)
  listarPerfisDemo(): Promise<Usuario[]>;
  entrar(usuarioId: string): Promise<Usuario>;
  sair(): Promise<void>;
  usuarioAtual(): Usuario | null;

  // estudantes e vínculos
  listarEstudantes(): Promise<Estudante[]>;
  obterEstudante(id: string): Promise<Estudante>;
  meuPapel(estudanteId: string): Promise<Papel | null>;
  listarVinculos(estudanteId: string): Promise<Vinculo[]>;
  listarUsuarios(): Promise<Usuario[]>;
  cadastrarEstudante(dados: NovoEstudante): Promise<Estudante>;
  vincular(dados: NovoVinculo): Promise<Vinculo>;
  desativarVinculo(vinculoId: string): Promise<void>;

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
