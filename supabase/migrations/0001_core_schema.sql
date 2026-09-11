-- ============================================================================
-- PEI Vivo — Schema núcleo
-- Traduz o Diagrama de Classes (class_diagram.svg) para tabelas reais.
-- Cada tabela referencia, em comentário, a classe UML de origem.
-- ============================================================================

-- gen_random_uuid() é nativo do PostgreSQL ≥ 13; nenhuma extensão necessária.

-- ---------------------------------------------------------------- enums
-- Correspondem às enumerações citadas na legenda do diagrama de classes,
-- omitidas como classes lá para preservar a legibilidade.

create type papel_usuario as enum
  ('RESPONSAVEL', 'DOCENTE', 'PROFISSIONAL_SAUDE', 'COORDENACAO');

create type status_consentimento as enum
  ('ATIVO', 'REVOGADO', 'EXPIRADO');

create type dimensao_observada as enum
  ('ATENCAO_SUSTENTADA', 'COMPREENSAO_ENUNCIADOS', 'AUTONOMIA_LEXICAL',
   'INTERESSE_MANIFESTO', 'SENSIBILIDADE_VISUAL', 'FADIGA_TAREFA');

create type escala_observacao as enum
  ('REDUZIDA', 'ESTAVEL', 'AMPLIADA');

create type status_validacao as enum
  ('PENDENTE', 'VIGENTE', 'EM_REVISAO');

create type resultado_desfecho as enum
  ('ALCANCADO', 'PARCIAL', 'NAO_ALCANCADO');

create type nivel_vocabulario as enum
  ('BASICO', 'INTERMEDIARIO', 'ORIGINAL');

create type formato_enunciado as enum
  ('ETAPA_UNICA', 'MULTIPLAS_ETAPAS');

-- ---------------------------------------------------------------- Usuario
create table usuarios (
  id            uuid primary key default gen_random_uuid(),
  auth_user_id  uuid unique references auth.users(id) on delete cascade,
  nome          text not null,
  email         text not null unique,
  created_at    timestamptz not null default now()
);
comment on table usuarios is 'Classe UML: Usuario. Autenticação delegada ao Supabase Auth (auth_user_id).';

-- ---------------------------------------------------------------- Estudante
create table estudantes (
  id               uuid primary key default gen_random_uuid(),
  nome             text not null,
  data_nascimento  date not null,
  turma            text,
  created_at       timestamptz not null default now()
);
comment on table estudantes is 'Classe UML: Estudante.';

-- ------------------------------------------------- VinculoUsuarioEstudante
create table vinculos_usuario_estudante (
  id                 uuid primary key default gen_random_uuid(),
  usuario_id         uuid not null references usuarios(id) on delete cascade,
  estudante_id       uuid not null references estudantes(id) on delete cascade,
  papel              papel_usuario not null,
  data_vinculo       timestamptz not null default now(),
  status             text not null default 'ATIVO',
  registro_conselho  text, -- obrigatório apenas quando papel = PROFISSIONAL_SAUDE
  unique (usuario_id, estudante_id, papel)
);
comment on table vinculos_usuario_estudante is
  'Classe de associação UML: VinculoUsuarioEstudante. RN02/RN06 dependem desta tabela.';

-- ---------------------------------------------------------------- Consentimento
create table consentimentos (
  id                uuid primary key default gen_random_uuid(),
  estudante_id      uuid not null references estudantes(id) on delete cascade,
  responsavel_id    uuid not null references usuarios(id),
  data_concessao    timestamptz not null default now(),
  escopo            text not null,
  status            status_consentimento not null default 'ATIVO',
  data_revogacao    timestamptz
);
comment on table consentimentos is 'Classe UML: Consentimento. RN01/RN08: pré-condição de todo o sistema.';

-- ---------------------------------------------------------------- CicloObservacao
create table ciclos_observacao (
  id             uuid primary key default gen_random_uuid(),
  estudante_id   uuid not null references estudantes(id) on delete cascade,
  numero         int not null,
  data_inicio    date not null,
  data_fim       date,
  status         text not null default 'ABERTO',
  unique (estudante_id, numero)
);
comment on table ciclos_observacao is 'Classe UML: CicloObservacao. Cadência quinzenal (seção 6.1 do pré-projeto).';

-- ---------------------------------------------------------------- Observacao
create table observacoes (
  id              uuid primary key default gen_random_uuid(),
  ciclo_id        uuid not null references ciclos_observacao(id) on delete cascade,
  autor_id        uuid not null references usuarios(id),
  dimensao        dimensao_observada not null,
  valor_escala    escala_observacao not null,
  evidencia       text, -- campo livre, nunca parametrizado (seção 6.3)
  data_registro   timestamptz not null default now()
);
comment on table observacoes is 'Classe UML: Observacao. RF03/RF04.';

-- ---------------------------------------------------------------- VersaoPerfil
create table versoes_perfil (
  id                 uuid primary key default gen_random_uuid(),
  estudante_id       uuid not null references estudantes(id) on delete cascade,
  ciclo_origem_id    uuid references ciclos_observacao(id),
  numero_ciclo       int not null,
  parametros         jsonb not null, -- ParametrosAdaptacao («value object», Quadro 5)
  status_validacao   status_validacao not null default 'PENDENTE',
  validador_id       uuid references usuarios(id),
  data_vigencia      timestamptz,
  created_at         timestamptz not null default now()
);
comment on table versoes_perfil is
  'Classe UML: VersaoPerfil (+ ParametrosAdaptacao embutido como jsonb). RF05-RF07, RN03, RN05, RN06.';

-- ---------------------------------------------------------------- MaterialAdaptado
create table materiais_adaptados (
  id                  uuid primary key default gen_random_uuid(),
  estudante_id        uuid not null references estudantes(id) on delete cascade,
  versao_perfil_id    uuid not null references versoes_perfil(id),
  docente_id          uuid not null references usuarios(id),
  texto_original      text not null,
  texto_adaptado      text,
  data_geracao        timestamptz not null default now(),
  status_aprovacao    text not null default 'RASCUNHO' -- RASCUNHO | APROVADO | DESCARTADO
);
comment on table materiais_adaptados is
  'Classe UML: MaterialAdaptado. versao_perfil_id É o snapshot dos parâmetros (crítico p/ retroalimentação). RF08-RF12, RN04.';

-- ---------------------------------------------------------------- Desfecho
create table desfechos (
  id                 uuid primary key default gen_random_uuid(),
  material_id        uuid not null unique references materiais_adaptados(id) on delete cascade,
  resultado          resultado_desfecho not null,
  observacao_livre   text,
  data_registro      timestamptz not null default now()
);
comment on table desfechos is 'Classe UML: Desfecho. RF13.';

-- ------------------------------------------------- NotaClinicaReservada
-- Não aparece como classe no diagrama de classes (omitida por simplicidade),
-- mas é uma linha explícita da matriz de permissões (Quadro 7): só o
-- profissional de saúde lê e escreve. Nunca visível ao docente (RN02).
create table notas_clinicas (
  id                uuid primary key default gen_random_uuid(),
  estudante_id      uuid not null references estudantes(id) on delete cascade,
  profissional_id   uuid not null references usuarios(id),
  conteudo          text not null,
  data_registro     timestamptz not null default now()
);
comment on table notas_clinicas is 'RN02: acesso exclusivo do profissional de saúde vinculado. Ver 0002_rls_policies.sql.';

-- ---------------------------------------------------------------- índices
create index idx_vinculo_estudante on vinculos_usuario_estudante(estudante_id);
create index idx_vinculo_usuario on vinculos_usuario_estudante(usuario_id);
create index idx_observacao_ciclo on observacoes(ciclo_id);
create index idx_versao_estudante on versoes_perfil(estudante_id, status_validacao);
create index idx_material_estudante on materiais_adaptados(estudante_id);
