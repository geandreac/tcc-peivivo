-- ============================================================================
-- PEI Vivo — 0003 · Escola, ciclo de vida dos vínculos e tipos (reformulação R1)
-- Decisões: D-21 (um papel por estudante), D-23 (escola mínima), D-24 (profissional
-- confirmado pelo responsável), D-25 (vínculo do responsável conferido),
-- D-27 (consentimento granular e versionado), D-13 (enums), D-01 (só a data do laudo).
-- Só estrutura. As políticas novas estão em 0004; auditoria e notificações, em 0005.
-- Os valores novos de enum ficam aqui e só são USADOS a partir de 0004 (exigência
-- do Postgres: um valor adicionado não pode ser usado na mesma transação).
-- ============================================================================

-- ---------------------------------------------------------------- enums novos
create type papel_escola as enum ('COORDENACAO', 'DOCENTE');
create type status_membro as enum ('ATIVO', 'ENCERRADO');
create type status_vinculo as enum ('PENDENTE_RESPONSAVEL', 'ATIVO', 'RECUSADO', 'ENCERRADO');
create type verificacao_registro as enum ('NAO_VERIFICADO', 'VERIFICADO');
create type escopo_consentimento as enum
  ('observacao_pedagogica', 'observacao_domiciliar', 'validacao_clinica', 'geracao_material');
create type status_ciclo as enum ('ABERTO', 'FECHADO');
create type status_aprovacao as enum ('RASCUNHO', 'APROVADO', 'DESCARTADO');
create type origem_versao as enum ('FECHAMENTO_CICLO', 'AJUSTE_PROFISSIONAL');

-- D-35: EXPIRADA (RN05) e SUBSTITUIDA (uma única VIGENTE por estudante)
alter type status_validacao add value if not exists 'EXPIRADA';
alter type status_validacao add value if not exists 'SUBSTITUIDA';

-- ---------------------------------------------------------------- Escola (D-23)
create table escolas (
  id          uuid primary key default gen_random_uuid(),
  nome        text not null unique,
  created_at  timestamptz not null default now()
);
comment on table escolas is
  'D-23: fronteira da coordenação. Criada só por scripts/implantar-escola (service role); sem painel de super-admin.';

create table membros_escola (
  id           uuid primary key default gen_random_uuid(),
  usuario_id   uuid not null references usuarios(id) on delete cascade,
  escola_id    uuid not null references escolas(id) on delete cascade,
  papel        papel_escola not null,
  status       status_membro not null default 'ATIVO',
  created_at   timestamptz not null default now(),
  encerrado_em timestamptz
);
create unique index uq_membro_ativo on membros_escola (usuario_id, escola_id, papel) where status = 'ATIVO';
create index idx_membro_escola on membros_escola (escola_id);
comment on table membros_escola is
  'D-23: COORDENACAO é papel na escola (não mais vínculo por estudante). DOCENTE precisa ser membro para ser vinculado.';

-- ---------------------------------------------------------------- Estudante
alter table estudantes add column escola_id uuid references escolas(id) on delete restrict;
alter table estudantes add column laudo_apresentado_em date; -- D-01: só a data; sem CID, sem arquivo

-- Linhas pré-existentes (só ocorreria num banco já em uso) vão para uma escola de migração.
do $$
begin
  if exists (select 1 from estudantes where escola_id is null) then
    insert into escolas (nome) values ('Escola (migração 0003)') on conflict (nome) do nothing;
    update estudantes set escola_id = (select id from escolas where nome = 'Escola (migração 0003)')
     where escola_id is null;
  end if;
end $$;
alter table estudantes alter column escola_id set not null;
create index idx_estudante_escola on estudantes (escola_id);

-- ---------------------------------------------------------------- Vínculos
-- COORDENACAO deixa de ser vínculo por estudante (D-23): vínculos antigos viram
-- membros da escola do estudante e são removidos daqui.
insert into membros_escola (usuario_id, escola_id, papel)
select distinct v.usuario_id, e.escola_id, 'COORDENACAO'::papel_escola
  from vinculos_usuario_estudante v join estudantes e on e.id = v.estudante_id
 where v.papel = 'COORDENACAO';
delete from vinculos_usuario_estudante where papel = 'COORDENACAO';

alter table vinculos_usuario_estudante drop constraint vinculos_usuario_estudante_usuario_id_estudante_id_papel_key;
alter table vinculos_usuario_estudante alter column status drop default;
alter table vinculos_usuario_estudante
  alter column status type status_vinculo
  using (case status when 'INATIVO' then 'ENCERRADO' else status end)::status_vinculo;
alter table vinculos_usuario_estudante alter column status set default 'ATIVO';

alter table vinculos_usuario_estudante
  add column proposto_por          uuid references usuarios(id),
  add column confirmado_por        uuid references usuarios(id),
  add column confirmado_em         timestamptz,
  add column conferido_por         uuid references usuarios(id),  -- D-25: responsável conferido presencialmente
  add column conferido_em          timestamptz,
  add column verificacao_registro  verificacao_registro,          -- D-24: só PROFISSIONAL_SAUDE
  add column verificado_por        uuid references usuarios(id),
  add column verificado_em         timestamptz,
  add column encerrado_por         uuid references usuarios(id),
  add column encerrado_em          timestamptz;

update vinculos_usuario_estudante set verificacao_registro = 'NAO_VERIFICADO'
 where papel = 'PROFISSIONAL_SAUDE';

alter table vinculos_usuario_estudante
  add constraint ck_vinculo_papel check (papel in ('RESPONSAVEL', 'DOCENTE', 'PROFISSIONAL_SAUDE')),
  add constraint ck_vinculo_registro check (
    (papel = 'PROFISSIONAL_SAUDE') = (registro_conselho is not null and length(trim(registro_conselho)) > 0)
  ),
  add constraint ck_vinculo_verificacao check (
    (papel = 'PROFISSIONAL_SAUDE') = (verificacao_registro is not null)
  ),
  add constraint ck_vinculo_pendente check (
    status <> 'PENDENTE_RESPONSAVEL' or papel = 'PROFISSIONAL_SAUDE'
  );

-- D-21: uma pessoa, um papel por estudante enquanto o vínculo não estiver encerrado/recusado.
create unique index uq_vinculo_vigente on vinculos_usuario_estudante (usuario_id, estudante_id)
  where status in ('PENDENTE_RESPONSAVEL', 'ATIVO');

-- ---------------------------------------------------------------- Consentimento (D-27)
alter table consentimentos
  add column escopos       escopo_consentimento[] not null default '{}',
  add column versao_termo  text not null default 'v1-2026-09',
  add column revogado_por  uuid references usuarios(id),
  add column user_agent    text;
update consentimentos
   set escopos = array(
     select trim(x)::escopo_consentimento
       from unnest(string_to_array(escopo, ',')) as x
      where trim(x) in ('observacao_pedagogica', 'observacao_domiciliar', 'validacao_clinica', 'geracao_material'));
alter table consentimentos drop column escopo;
alter table consentimentos alter column escopos drop default;
alter table consentimentos alter column versao_termo drop default;
alter table consentimentos add constraint ck_consentimento_escopos check (cardinality(escopos) > 0);
alter table consentimentos add constraint ck_consentimento_revogacao check (
  (status = 'REVOGADO') = (data_revogacao is not null)
);
create unique index uq_consentimento_ativo on consentimentos (estudante_id) where status = 'ATIVO';

-- ---------------------------------------------------------------- Ciclos
alter table ciclos_observacao alter column status drop default;
alter table ciclos_observacao alter column status type status_ciclo using status::status_ciclo;
alter table ciclos_observacao alter column status set default 'ABERTO';
create unique index uq_ciclo_aberto on ciclos_observacao (estudante_id) where status = 'ABERTO';

-- ---------------------------------------------------------------- Observações (D-04)
alter table observacoes add column papel_autor papel_usuario;
update observacoes o set papel_autor = v.papel
  from ciclos_observacao c, vinculos_usuario_estudante v
 where c.id = o.ciclo_id and v.estudante_id = c.estudante_id and v.usuario_id = o.autor_id;
update observacoes set papel_autor = 'DOCENTE' where papel_autor is null; -- legado sem vínculo
alter table observacoes alter column papel_autor set not null;

-- ---------------------------------------------------------------- Versões de perfil (D-35)
alter table versoes_perfil
  add column origem              origem_versao not null default 'FECHAMENTO_CICLO',
  add column versao_anterior_id  uuid references versoes_perfil(id),
  add column justificativa       text;

-- ---------------------------------------------------------------- Materiais (D-13)
alter table materiais_adaptados alter column status_aprovacao drop default;
alter table materiais_adaptados
  alter column status_aprovacao type status_aprovacao using status_aprovacao::status_aprovacao;
alter table materiais_adaptados alter column status_aprovacao set default 'RASCUNHO';
alter table materiais_adaptados
  add column titulo          text not null default 'Material sem título',
  add column texto_revisado  text,
  add column ia_aplicada     boolean not null default false,
  add column hash_texto      text,
  add column decidido_em     timestamptz;
alter table materiais_adaptados add constraint ck_material_tamanho
  check (char_length(texto_original) between 1 and 20000);

-- ---------------------------------------------------------------- Convites (D-32)
create table convites (
  id            uuid primary key default gen_random_uuid(),
  escola_id     uuid not null references escolas(id) on delete cascade,
  email         text not null check (email = lower(trim(email))),
  papel         papel_usuario not null,
  estudante_id  uuid references estudantes(id) on delete cascade, -- só para RESPONSAVEL
  criado_por    uuid references usuarios(id),                      -- null = script de implantação
  criado_em     timestamptz not null default now(),
  expira_em     timestamptz not null default now() + interval '7 days',
  aceito_em     timestamptz,
  revogado_em   timestamptz,
  constraint ck_convite_estudante check ((papel = 'RESPONSAVEL') = (estudante_id is not null))
);
create unique index uq_convite_pendente on convites (email, escola_id, papel, coalesce(estudante_id, '00000000-0000-0000-0000-000000000000'))
  where aceito_em is null and revogado_em is null;
comment on table convites is
  'D-32: emitidos só pela Edge Function convidar (service role); validade 7 dias, uso único; reenviar revoga o anterior.';

alter table convites enable row level security;
alter table escolas enable row level security;
alter table membros_escola enable row level security;
