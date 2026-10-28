-- ============================================================================
-- PEI Vivo — 0012 · Administração (D-50): Administrador Geral, perfis de
-- acesso com teto fixo, ferramentas que ligam e desligam módulos reais,
-- suspensão, validade e aprovação de acesso, e auditoria de cada mudança.
--
-- Três regras guiam tudo:
--   1. O Administrador Geral gerencia CONTAS e ACESSOS, nunca lê dado de
--      estudante: não tem vínculo nem é membro de escola, então nenhuma
--      política existente o deixa passar (testado em administracao.test.ts).
--   2. Permissão só RESTRINGE: `privado.pode` entra com AND ao lado das regras
--      antigas. O teto de cada papel é o catálogo abaixo e nenhum perfil o fura.
--   3. Ponto único de bloqueio: `privado.usuario_atual()` devolve NULL para
--      quem está suspenso, removido, expirado ou aguardando aprovação. Toda
--      política e RPC parte dele, então o bloqueio vale no banco inteiro.
-- Coordenação = perfil administrativo limitado (só a própria escola).
-- ============================================================================

-- ---------------------------------------------------------------- 1. Administrador Geral
create table public.administradores (
  usuario_id   uuid primary key references public.usuarios(id) on delete cascade,
  desde        timestamptz not null default now(),
  encerrado_em timestamptz
);
comment on table public.administradores is
  'D-50 (substitui parte da D-23): papel de plataforma. Criado só por scripts/implantar-escola.mjs --admin (service role).';

-- ---------------------------------------------------------------- 2. ferramentas e teto
create type public.ferramenta as enum ('OBSERVACAO', 'GERACAO_MATERIAL', 'VALIDACAO', 'NOTAS_CLINICAS', 'PAINEL_ESCOLA');
create type public.acao_ferramenta as enum ('VER', 'EDITAR', 'APROVAR');

-- Só entra no catálogo o que o banco IMPÕE (cada linha tem um ponto de checagem abaixo).
create table public.catalogo_permissoes (
  ferramenta public.ferramenta not null,
  acao       public.acao_ferramenta not null,
  papeis     text[] not null,
  descricao  text not null,
  primary key (ferramenta, acao)
);
insert into public.catalogo_permissoes (ferramenta, acao, papeis, descricao) values
  ('OBSERVACAO', 'EDITAR', '{DOCENTE,RESPONSAVEL,PROFISSIONAL_SAUDE}', 'Registrar observações do ciclo'),
  ('GERACAO_MATERIAL', 'EDITAR', '{DOCENTE}', 'Gerar material adaptado'),
  ('GERACAO_MATERIAL', 'APROVAR', '{DOCENTE}', 'Aprovar ou descartar material'),
  ('VALIDACAO', 'APROVAR', '{PROFISSIONAL_SAUDE}', 'Validar, pedir revisão ou ajustar os parâmetros do ciclo'),
  ('NOTAS_CLINICAS', 'VER', '{PROFISSIONAL_SAUDE}', 'Ler notas clínicas reservadas'),
  ('NOTAS_CLINICAS', 'EDITAR', '{PROFISSIONAL_SAUDE}', 'Registrar notas clínicas reservadas'),
  ('PAINEL_ESCOLA', 'VER', '{COORDENACAO}', 'Abrir o painel da escola (só contagens)');

create table public.ferramentas_status (
  ferramenta   public.ferramenta primary key,
  disponivel   boolean not null default true,
  alterado_em  timestamptz,
  alterado_por uuid references public.usuarios(id)
);
insert into public.ferramentas_status (ferramenta)
select unnest(enum_range(null::public.ferramenta));

-- ---------------------------------------------------------------- 3. perfis de acesso
create table public.perfis_acesso (
  id            uuid primary key default gen_random_uuid(),
  nome          text not null unique check (char_length(trim(nome)) between 3 and 60),
  descricao     text check (char_length(descricao) <= 300),
  papel_base    text not null check (papel_base in ('ADMIN_GERAL', 'COORDENACAO', 'DOCENTE', 'RESPONSAVEL', 'PROFISSIONAL_SAUDE')),
  permissoes    text[] not null default '{}',
  sistema       boolean not null default false,
  criado_por    uuid references public.usuarios(id),
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz,
  arquivado_em  timestamptz
);
comment on table public.perfis_acesso is
  'D-50: perfis base (sistema) têm o teto do papel; derivados só ficam abaixo dele (tg_perfil_teto). Permissão = ''FERRAMENTA:ACAO''.';

alter table public.usuarios
  add column perfil_acesso_id     uuid references public.perfis_acesso(id),
  add column permissoes_removidas text[] not null default '{}',
  add column organizacao          text check (char_length(organizacao) <= 120),
  add column acesso_expira_em     timestamptz,
  add column aguardando_aprovacao boolean not null default false,
  add column suspenso_em          timestamptz,
  add column motivo_suspensao     text check (char_length(motivo_suspensao) <= 300),
  add column removido_em          timestamptz;
create index idx_usuarios_perfil on public.usuarios (perfil_acesso_id);

alter table public.convites
  add column perfil_acesso_id     uuid references public.perfis_acesso(id),
  add column permissoes_removidas text[] not null default '{}',
  add column organizacao          text check (char_length(organizacao) <= 120),
  add column acesso_expira_em     timestamptz,
  add column exige_aprovacao      boolean not null default false;
create index idx_convites_perfil on public.convites (perfil_acesso_id);

create table public.configuracoes_sistema (
  id                        boolean primary key default true check (id),
  exigir_aprovacao_externos boolean not null default true,
  validade_padrao_dias      integer not null default 180 check (validade_padrao_dias between 1 and 730),
  alterado_em               timestamptz,
  alterado_por              uuid references public.usuarios(id)
);
insert into public.configuracoes_sistema default values;

create index idx_administradores_encerrado on public.administradores (usuario_id) where encerrado_em is null;
create index idx_ferramentas_alterado_por on public.ferramentas_status (alterado_por);
create index idx_perfis_criado_por on public.perfis_acesso (criado_por);
create index idx_config_alterado_por on public.configuracoes_sistema (alterado_por);

-- Tudo isto só é lido e escrito por RPC (security definer).
alter table public.administradores enable row level security;
alter table public.catalogo_permissoes enable row level security;
alter table public.ferramentas_status enable row level security;
alter table public.perfis_acesso enable row level security;
alter table public.configuracoes_sistema enable row level security;
revoke all on public.administradores, public.catalogo_permissoes, public.ferramentas_status,
  public.perfis_acesso, public.configuracoes_sistema from anon, authenticated;

-- ---------------------------------------------------------------- 4. helpers (privado)
-- Ponto único de bloqueio (regra 3).
create or replace function privado.usuario_atual() returns uuid
language sql stable security definer set search_path = '' as $$
  select u.id from public.usuarios u
   where u.auth_user_id = auth.uid()
     and u.suspenso_em is null and u.removido_em is null and not u.aguardando_aprovacao
     and (u.acesso_expira_em is null or u.acesso_expira_em > now())
$$;

-- Quem está logado, qualquer que seja a situação (perfil da sessão e aceite do convite).
create function privado.usuario_logado() returns uuid
language sql stable security definer set search_path = '' as $$
  select u.id from public.usuarios u where u.auth_user_id = auth.uid()
$$;

create function privado.admin_geral() returns boolean
language sql stable security definer set search_path = '' as $$
  select privado.aal2() and exists (
    select 1 from public.administradores a
     where a.usuario_id = privado.usuario_atual() and a.encerrado_em is null)
$$;

create function privado.eh_admin(p_usuario uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.administradores a where a.usuario_id = p_usuario and a.encerrado_em is null)
$$;

create function privado.teto(p_papel text) returns text[]
language sql stable security definer set search_path = '' as $$
  select coalesce(array_agg(c.ferramenta::text || ':' || c.acao::text order by c.ferramenta, c.acao), '{}')
    from public.catalogo_permissoes c where p_papel = any (c.papeis)
$$;

create function privado.usuario_pode(p_usuario uuid, p_ferramenta public.ferramenta, p_acao public.acao_ferramenta)
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((select fs.disponivel from public.ferramentas_status fs where fs.ferramenta = p_ferramenta), true)
     and exists (
       select 1 from public.usuarios u
         left join public.perfis_acesso p on p.id = u.perfil_acesso_id
        where u.id = p_usuario
          and u.suspenso_em is null and u.removido_em is null and not u.aguardando_aprovacao
          and (u.acesso_expira_em is null or u.acesso_expira_em > now())
          -- sem perfil = teto do papel (as regras antigas decidem)
          and (p.id is null or (p_ferramenta::text || ':' || p_acao::text) = any (p.permissoes))
          and not ((p_ferramenta::text || ':' || p_acao::text) = any (u.permissoes_removidas)))
$$;

create function privado.pode(p_ferramenta public.ferramenta, p_acao public.acao_ferramenta) returns boolean
language sql stable security definer set search_path = '' as $$
  select privado.usuario_pode(privado.usuario_atual(), p_ferramenta, p_acao)
$$;

-- Papéis que a pessoa exerce hoje (para exibir e para validar o perfil atribuído).
create function privado.papeis_do_usuario(p_usuario uuid) returns text[]
language sql stable security definer set search_path = '' as $$
  select array_remove(array[
    case when privado.eh_admin(p_usuario) then 'ADMIN_GERAL' end,
    case when exists (select 1 from public.membros_escola m where m.usuario_id = p_usuario
                       and m.papel = 'COORDENACAO' and m.status = 'ATIVO') then 'COORDENACAO' end,
    case when exists (select 1 from public.membros_escola m where m.usuario_id = p_usuario
                       and m.papel = 'DOCENTE' and m.status = 'ATIVO') then 'DOCENTE' end,
    case when exists (select 1 from public.vinculos_usuario_estudante v where v.usuario_id = p_usuario
                       and v.papel = 'PROFISSIONAL_SAUDE' and v.status in ('ATIVO', 'PENDENTE_RESPONSAVEL')) then 'PROFISSIONAL_SAUDE' end,
    case when exists (select 1 from public.vinculos_usuario_estudante v where v.usuario_id = p_usuario
                       and v.papel = 'RESPONSAVEL' and v.status = 'ATIVO') then 'RESPONSAVEL' end
  ], null)
$$;

create function privado.situacao_usuario(p_usuario uuid) returns text
language sql stable security definer set search_path = '' as $$
  select case
    when u.removido_em is not null then 'REMOVIDO'
    when u.suspenso_em is not null then 'SUSPENSO'
    when u.acesso_expira_em is not null and u.acesso_expira_em <= now() then 'EXPIRADO'
    when u.aguardando_aprovacao then 'AGUARDANDO_APROVACAO'
    when u.termos_aceitos_em is not null then 'ATIVO'
    when exists (select 1 from public.convites c where c.email = u.email
                  and c.aceito_em is null and c.revogado_em is null and c.expira_em > now()) then 'CONVITE_PENDENTE'
    when exists (select 1 from public.convites c where c.email = u.email) then 'CONVITE_EXPIRADO'
    else 'ATIVO' end
  from public.usuarios u where u.id = p_usuario
$$;

-- Escolas de uma pessoa (membro ou via vínculo com estudante).
create function privado.escolas_do_usuario(p_usuario uuid) returns uuid[]
language sql stable security definer set search_path = '' as $$
  select coalesce(array_agg(distinct x.escola_id), '{}') from (
    select m.escola_id from public.membros_escola m where m.usuario_id = p_usuario and m.status = 'ATIVO'
    union
    select e.escola_id from public.vinculos_usuario_estudante v join public.estudantes e on e.id = v.estudante_id
     where v.usuario_id = p_usuario and v.status in ('ATIVO', 'PENDENTE_RESPONSAVEL')
    union
    select c.escola_id from public.convites c join public.usuarios u on u.email = c.email
     where u.id = p_usuario and c.revogado_em is null) x
$$;

-- Quem o chamador pode administrar: admin geral → todos, menos outros administradores;
-- coordenação → quem atua na escola que ela coordena, menos coordenação e administradores.
create function privado.administra_usuario(p_usuario uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select p_usuario is distinct from privado.usuario_atual()
     and not privado.eh_admin(p_usuario)
     and (privado.admin_geral()
          or (not exists (select 1 from public.membros_escola m where m.usuario_id = p_usuario
                           and m.papel = 'COORDENACAO' and m.status = 'ATIVO')
              and exists (select 1 from unnest(privado.escolas_do_usuario(p_usuario)) s(escola_id)
                           where privado.coordena_escola(s.escola_id))))
$$;

-- Pode abrir o painel: admin geral ou alguma coordenação (aal2).
create function privado.abre_painel_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select privado.admin_geral() or exists (
    select 1 from public.membros_escola m
     where m.usuario_id = privado.usuario_atual() and m.papel = 'COORDENACAO' and m.status = 'ATIVO'
       and privado.coordena_escola(m.escola_id))
$$;

create function privado.exigir_painel_admin() returns void
language plpgsql stable security definer set search_path = '' as $$
begin
  if not privado.abre_painel_admin() then
    raise exception 'O painel administrativo é do Administrador Geral e da coordenação, com verificação em duas etapas.' using errcode = '42501';
  end if;
end $$;

create function privado.exigir_admin_geral() returns void
language plpgsql stable security definer set search_path = '' as $$
begin
  if not privado.admin_geral() then
    raise exception 'Só o Administrador Geral, com verificação em duas etapas, faz esta alteração.' using errcode = '42501';
  end if;
end $$;

create function privado.exigir_administra(p_usuario uuid) returns void
language plpgsql stable security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.usuarios u where u.id = p_usuario) then
    raise exception 'Pessoa não encontrada.' using errcode = '42501';
  end if;
  if p_usuario = privado.usuario_atual() then
    raise exception 'Ninguém altera o próprio acesso pelo painel.' using errcode = '42501';
  end if;
  if privado.eh_admin(p_usuario) then
    raise exception 'Administradores gerais são geridos só pelo script de implantação.' using errcode = '42501';
  end if;
  if not privado.administra_usuario(p_usuario) then
    raise exception 'Você não administra o acesso desta pessoa.' using errcode = '42501';
  end if;
end $$;

-- Auditoria administrativa: mesma tabela append-only (D-30), sem estudante.
create function privado.auditar_admin(p_escola uuid, p_evento text, p_entidade text, p_entidade_id uuid, p_detalhes jsonb default '{}')
returns void language sql security definer set search_path = '' as $$
  insert into public.auditoria (escola_id, estudante_id, evento, entidade, entidade_id, autor_id, papel_autor, detalhes)
  values (p_escola, null, p_evento, p_entidade, p_entidade_id, privado.usuario_atual(),
          case when privado.admin_geral() then 'ADMIN_GERAL' else 'COORDENACAO' end, coalesce(p_detalhes, '{}'))
$$;

-- Escola em que a coordenação age sobre a pessoa (null quando é o admin geral).
create function privado.escola_da_acao(p_usuario uuid) returns uuid
language sql stable security definer set search_path = '' as $$
  select case when privado.admin_geral() then null else
    (select s.escola_id from unnest(privado.escolas_do_usuario(p_usuario)) s(escola_id)
      where privado.coordena_escola(s.escola_id) limit 1) end
$$;

-- ---------------------------------------------------------------- 5. teto dos perfis
create function privado.tg_perfil_teto() returns trigger
language plpgsql set search_path = '' as $$
declare
  v_fora text[];
begin
  new.permissoes := coalesce((select array_agg(distinct x order by x) from unnest(new.permissoes) x), '{}');
  select coalesce(array_agg(x), '{}') into v_fora from unnest(new.permissoes) x where not (x = any (privado.teto(new.papel_base)));
  if cardinality(v_fora) > 0 then
    raise exception 'Permissões acima do teto do papel: %.', array_to_string(v_fora, ', ') using errcode = '22023';
  end if;
  if tg_op = 'UPDATE' and old.sistema then
    raise exception 'Os perfis base do sistema não podem ser alterados.' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger tg_perfil_teto before insert or update on public.perfis_acesso
  for each row execute function privado.tg_perfil_teto();

insert into public.perfis_acesso (nome, descricao, papel_base, permissoes, sistema) values
  ('Administração geral', 'Controle completo de contas, perfis, ferramentas e configurações. Nunca abre dados de estudante.', 'ADMIN_GERAL', '{}', true),
  ('Coordenação pedagógica', 'Administra os acessos da própria escola e abre o painel da escola.', 'COORDENACAO', privado.teto('COORDENACAO'), true),
  ('Docente regente', 'Observa, gera e aprova material dos estudantes vinculados.', 'DOCENTE', privado.teto('DOCENTE'), true),
  ('Responsável legal', 'Concede o consentimento e registra observações de casa.', 'RESPONSAVEL', privado.teto('RESPONSAVEL'), true),
  ('Profissional de saúde', 'Valida os parâmetros do ciclo e mantém notas clínicas reservadas.', 'PROFISSIONAL_SAUDE', privado.teto('PROFISSIONAL_SAUDE'), true);

-- ---------------------------------------------------------------- 6. pontos de checagem das ferramentas
-- OBSERVACAO:EDITAR — política de insert em observacoes usa pode_observar.
create or replace function privado.pode_observar(p_ciclo uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select privado.pode('OBSERVACAO', 'EDITAR') and exists (
    select 1 from public.ciclos_observacao c
     where c.id = p_ciclo and c.status = 'ABERTO'
       and (   (privado.tem_papel(c.estudante_id, 'DOCENTE')
                and privado.tem_escopo(c.estudante_id, 'observacao_pedagogica'))
            or (privado.tem_papel(c.estudante_id, 'RESPONSAVEL')
                and privado.tem_escopo(c.estudante_id, 'observacao_domiciliar'))
            or (privado.tem_papel(c.estudante_id, 'PROFISSIONAL_SAUDE')
                and privado.tem_escopo(c.estudante_id, 'validacao_clinica'))))
$$;

-- GERACAO_MATERIAL:EDITAR (novo rascunho) e :APROVAR (decisão do docente).
create function privado.tg_ferramenta_material() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' and not privado.usuario_pode(new.docente_id, 'GERACAO_MATERIAL', 'EDITAR') then
    raise exception 'A geração de material não está liberada para este acesso.' using errcode = '42501';
  end if;
  if tg_op = 'UPDATE' and new.status_aprovacao is distinct from old.status_aprovacao
     and not privado.usuario_pode(new.docente_id, 'GERACAO_MATERIAL', 'APROVAR') then
    raise exception 'A aprovação de material não está liberada para este acesso.' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger tg_ferramenta_material before insert or update on public.materiais_adaptados
  for each row execute function privado.tg_ferramenta_material();

-- VALIDACAO:APROVAR — validar, pedir revisão ou ajustar grava o validador.
create function privado.tg_ferramenta_validacao() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.validador_id is not null
     and (tg_op = 'INSERT' or new.validador_id is distinct from old.validador_id
          or new.status_validacao is distinct from old.status_validacao and new.status_validacao in ('VIGENTE', 'EM_REVISAO'))
     and not privado.usuario_pode(new.validador_id, 'VALIDACAO', 'APROVAR') then
    raise exception 'A validação de parâmetros não está liberada para este acesso.' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger tg_ferramenta_validacao before insert or update on public.versoes_perfil
  for each row execute function privado.tg_ferramenta_validacao();

-- NOTAS_CLINICAS:EDITAR
create function privado.tg_ferramenta_nota() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if not privado.usuario_pode(new.profissional_id, 'NOTAS_CLINICAS', 'EDITAR') then
    raise exception 'O registro de notas clínicas não está liberado para este acesso.' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger tg_ferramenta_nota before insert or update on public.notas_clinicas
  for each row execute function privado.tg_ferramenta_nota();

-- NOTAS_CLINICAS:VER
create or replace function public.fn_ler_notas_clinicas(p_estudante uuid)
returns table (id uuid, conteudo text, data_registro timestamptz, profissional_nome text, minha boolean)
language plpgsql security definer set search_path = '' as $$
begin
  if not privado.tem_papel(p_estudante, 'PROFISSIONAL_SAUDE') or not privado.consentimento_ativo(p_estudante) then
    raise exception 'Nota clínica reservada: acesso exclusivo do profissional de saúde vinculado.' using errcode = '42501';
  end if;
  if not privado.pode('NOTAS_CLINICAS', 'VER') then
    raise exception 'A leitura de notas clínicas não está liberada para este acesso.' using errcode = '42501';
  end if;
  perform privado.auditar(p_estudante, 'LEITURA_NOTA_CLINICA', 'notas_clinicas', null);
  return query
    select n.id, n.conteudo, n.data_registro, u.nome, n.profissional_id = privado.usuario_atual()
      from public.notas_clinicas n join public.usuarios u on u.id = n.profissional_id
     where n.estudante_id = p_estudante
     order by n.data_registro desc;
end $$;

-- PAINEL_ESCOLA:VER — a função da 0011 vai para `privado` atrás de um invólucro.
alter function public.fn_resumo_escola(uuid) set schema privado;
revoke execute on function privado.fn_resumo_escola(uuid) from public, anon, authenticated;
create function public.fn_resumo_escola(p_escola uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if privado.coordena_escola(p_escola) and not privado.pode('PAINEL_ESCOLA', 'VER') then
    raise exception 'O painel da escola não está liberado para este acesso.' using errcode = '42501';
  end if;
  return privado.fn_resumo_escola(p_escola);
end $$;
revoke execute on function public.fn_resumo_escola(uuid) from public, anon;
grant execute on function public.fn_resumo_escola(uuid) to authenticated;

-- ---------------------------------------------------------------- 7. sessão e convite
create or replace function public.fn_meu_perfil()
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'id', u.id,
    'nome', u.nome,
    'email', u.email,
    'escolaCoordenada', (select m.escola_id from public.membros_escola m
                          where m.usuario_id = u.id and m.papel = 'COORDENACAO' and m.status = 'ATIVO'
                          order by m.created_at limit 1),
    'papelPlataforma', case when privado.eh_admin(u.id) then 'ADMIN_GERAL' end,
    -- D-32 + D-50: quem precisa de segundo fator (TOTP)
    'exigeSegundoFator', privado.eh_admin(u.id)
                      or exists (select 1 from public.membros_escola m
                                  where m.usuario_id = u.id and m.papel = 'COORDENACAO' and m.status = 'ATIVO')
                      or exists (select 1 from public.vinculos_usuario_estudante v
                                  where v.usuario_id = u.id and v.papel = 'PROFISSIONAL_SAUDE'
                                    and v.status in ('ATIVO', 'PENDENTE_RESPONSAVEL')),
    'situacao', privado.situacao_usuario(u.id),
    'termosVersao', u.termos_versao)
  from public.usuarios u where u.auth_user_id = auth.uid()
$$;

-- Quem aguarda aprovação aceita o convite (define a senha) antes de ser liberado.
create or replace function public.fn_aceitar_termos(p_versao text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid := privado.usuario_logado();
  v_email text;
begin
  if v_id is null or exists (select 1 from public.usuarios u where u.id = v_id
                              and (u.suspenso_em is not null or u.removido_em is not null)) then
    raise exception 'Entre para continuar.' using errcode = '42501';
  end if;
  if char_length(trim(coalesce(p_versao, ''))) = 0 then
    raise exception 'Versão dos termos é obrigatória.' using errcode = '22023';
  end if;
  update public.usuarios set termos_versao = trim(p_versao), termos_aceitos_em = now()
   where id = v_id
  returning email into v_email;
  update public.convites set aceito_em = now()
   where email = v_email and aceito_em is null and revogado_em is null and expira_em > now();
end $$;

drop function public.fn_preparar_convite(uuid, text, public.papel_usuario, uuid, text, boolean);
create function public.fn_preparar_convite(
  p_escola uuid, p_email text, p_papel public.papel_usuario,
  p_estudante uuid default null, p_registro_conselho text default null, p_conferido_presencialmente boolean default false,
  p_perfil uuid default null, p_acesso_expira_em timestamptz default null, p_exige_aprovacao boolean default null,
  p_organizacao text default null, p_permissoes_removidas text[] default '{}')
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_email text := lower(trim(coalesce(p_email, '')));
  v_admin boolean := privado.admin_geral();
  v_exige boolean;
begin
  if not (v_admin or privado.coordena_escola(p_escola)) then
    raise exception 'Só a coordenação da escola ou o Administrador Geral, com verificação em duas etapas, convida pessoas.' using errcode = '42501';
  end if;
  if not exists (select 1 from public.escolas e where e.id = p_escola) then
    raise exception 'Escolha uma escola.' using errcode = '22023';
  end if;
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'Informe um e-mail válido.' using errcode = '22023';
  end if;
  -- para a coordenação, COORDENACAO continua papel inválido (22023, como na 0007)
  if p_papel not in ('DOCENTE', 'RESPONSAVEL', 'PROFISSIONAL_SAUDE') and not (v_admin and p_papel = 'COORDENACAO') then
    raise exception 'Papel inválido para convite.' using errcode = '22023';
  end if;
  if p_papel in ('RESPONSAVEL', 'PROFISSIONAL_SAUDE') then
    if p_estudante is null or not exists (select 1 from public.estudantes e where e.id = p_estudante and e.escola_id = p_escola) then
      raise exception 'Escolha um estudante desta escola.' using errcode = '22023';
    end if;
  end if;
  if p_papel = 'RESPONSAVEL' and not p_conferido_presencialmente then
    raise exception 'Confirme que o vínculo legal foi conferido presencialmente, com documento.' using errcode = '22023';
  end if;
  if p_papel = 'PROFISSIONAL_SAUDE' and char_length(trim(coalesce(p_registro_conselho, ''))) = 0 then
    raise exception 'Informe o registro no conselho profissional.' using errcode = '22023';
  end if;
  if p_perfil is not null and not exists (select 1 from public.perfis_acesso p where p.id = p_perfil
                                           and p.papel_base = p_papel::text and p.arquivado_em is null) then
    raise exception 'O perfil escolhido não é deste papel.' using errcode = '22023';
  end if;
  if exists (select 1 from unnest(coalesce(p_permissoes_removidas, '{}')) x where not (x = any (privado.teto(p_papel::text)))) then
    raise exception 'Permissão desconhecida para este papel.' using errcode = '22023';
  end if;
  if p_acesso_expira_em is not null and p_acesso_expira_em <= now() then
    raise exception 'A validade do acesso precisa ser uma data futura.' using errcode = '22023';
  end if;
  if char_length(coalesce(p_organizacao, '')) > 120 then
    raise exception 'Organização com no máximo 120 caracteres.' using errcode = '22023';
  end if;
  if v_email = (select u.email from public.usuarios u where u.id = privado.usuario_atual()) then
    raise exception 'Ninguém pode convidar a si mesmo.' using errcode = '42501';
  end if;
  v_exige := coalesce(p_exige_aprovacao,
    p_papel in ('RESPONSAVEL', 'PROFISSIONAL_SAUDE') and (select c.exigir_aprovacao_externos from public.configuracoes_sistema c));
  return jsonb_build_object('autorId', privado.usuario_atual(), 'email', v_email, 'exigeAprovacao', v_exige,
    'jaTemConta', exists (select 1 from public.usuarios u where u.email = v_email and u.termos_aceitos_em is not null));
end $$;

drop function public.fn_registrar_convite(uuid, uuid, text, text, uuid, public.papel_usuario, uuid, text, boolean);
create function public.fn_registrar_convite(
  p_autor uuid, p_auth_user uuid, p_nome text, p_email text, p_escola uuid, p_papel public.papel_usuario,
  p_estudante uuid default null, p_registro_conselho text default null, p_conferido_presencialmente boolean default false,
  p_perfil uuid default null, p_acesso_expira_em timestamptz default null, p_exige_aprovacao boolean default false,
  p_organizacao text default null, p_permissoes_removidas text[] default '{}')
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_email text := lower(trim(p_email));
  v_admin boolean := privado.eh_admin(p_autor);
  v_usuario uuid;
  v_novo boolean := false;
  v_vinculo uuid;
begin
  -- revalida a autoria sem depender do JWT do service role
  if not (v_admin or exists (select 1 from public.membros_escola m where m.usuario_id = p_autor and m.escola_id = p_escola
                              and m.papel = 'COORDENACAO' and m.status = 'ATIVO')) then
    raise exception 'Convite negado: autor não coordena esta escola nem é Administrador Geral.' using errcode = '42501';
  end if;
  if p_papel = 'COORDENACAO' and not v_admin then
    raise exception 'Só o Administrador Geral convida a coordenação.' using errcode = '42501';
  end if;
  if p_perfil is not null and not exists (select 1 from public.perfis_acesso p where p.id = p_perfil
                                           and p.papel_base = p_papel::text and p.arquivado_em is null) then
    raise exception 'O perfil escolhido não é deste papel.' using errcode = '22023';
  end if;
  if exists (select 1 from unnest(coalesce(p_permissoes_removidas, '{}')) x where not (x = any (privado.teto(p_papel::text)))) then
    raise exception 'Permissão desconhecida para este papel.' using errcode = '22023';
  end if;

  select u.id into v_usuario from public.usuarios u where u.email = v_email;
  if v_usuario is null then
    insert into public.usuarios (auth_user_id, nome, email, perfil_acesso_id, permissoes_removidas, organizacao,
                                 acesso_expira_em, aguardando_aprovacao)
    values (p_auth_user, coalesce(nullif(trim(p_nome), ''), split_part(v_email, '@', 1)), v_email, p_perfil,
            coalesce(p_permissoes_removidas, '{}'), nullif(trim(coalesce(p_organizacao, '')), ''),
            p_acesso_expira_em, coalesce(p_exige_aprovacao, false))
    returning id into v_usuario;
    v_novo := true;
  elsif p_auth_user is not null then
    update public.usuarios set auth_user_id = coalesce(auth_user_id, p_auth_user) where id = v_usuario;
  end if;
  -- quem já tem conta não perde acesso a outros papéis por causa deste convite (D-50)

  update public.convites set revogado_em = now()
   where email = v_email and escola_id = p_escola and papel = p_papel
     and coalesce(estudante_id, '00000000-0000-0000-0000-000000000000') = coalesce(p_estudante, '00000000-0000-0000-0000-000000000000')
     and aceito_em is null and revogado_em is null;
  insert into public.convites (escola_id, email, papel, estudante_id, criado_por, perfil_acesso_id, permissoes_removidas,
                               organizacao, acesso_expira_em, exige_aprovacao)
  values (p_escola, v_email, p_papel, case when p_papel = 'RESPONSAVEL' then p_estudante end, p_autor, p_perfil,
          coalesce(p_permissoes_removidas, '{}'), nullif(trim(coalesce(p_organizacao, '')), ''), p_acesso_expira_em,
          coalesce(p_exige_aprovacao, false));

  if p_papel in ('DOCENTE', 'COORDENACAO') then
    insert into public.membros_escola (usuario_id, escola_id, papel)
    select v_usuario, p_escola, p_papel::text::public.papel_escola
     where not exists (select 1 from public.membros_escola m where m.usuario_id = v_usuario and m.escola_id = p_escola
                        and m.papel = p_papel::text::public.papel_escola and m.status = 'ATIVO');
  elsif p_papel = 'RESPONSAVEL' then
    -- D-25: revalida aqui também
    if not p_conferido_presencialmente then
      raise exception 'Confirme que o vínculo legal foi conferido presencialmente, com documento.' using errcode = '22023';
    end if;
    insert into public.vinculos_usuario_estudante (usuario_id, estudante_id, papel, status, proposto_por, conferido_por, conferido_em)
    values (v_usuario, p_estudante, 'RESPONSAVEL', 'ATIVO', p_autor, p_autor, now())
    on conflict do nothing returning id into v_vinculo;
  elsif p_papel = 'PROFISSIONAL_SAUDE' then
    -- D-24: proposta aguarda a família
    insert into public.vinculos_usuario_estudante (usuario_id, estudante_id, papel, status, registro_conselho, verificacao_registro, proposto_por)
    values (v_usuario, p_estudante, 'PROFISSIONAL_SAUDE', 'PENDENTE_RESPONSAVEL', trim(p_registro_conselho), 'NAO_VERIFICADO', p_autor)
    on conflict do nothing returning id into v_vinculo;
  end if;

  insert into public.auditoria (escola_id, estudante_id, evento, entidade, entidade_id, autor_id, papel_autor, detalhes)
  values (p_escola, p_estudante, 'CONVITE_EMITIDO', 'usuarios', v_usuario, p_autor,
          case when v_admin then 'ADMIN_GERAL' else 'COORDENACAO' end,
          jsonb_build_object('papel', p_papel, 'novaConta', v_novo, 'exigeAprovacao', coalesce(p_exige_aprovacao, false),
                             'perfil', p_perfil, 'validade', p_acesso_expira_em));

  return jsonb_build_object('usuarioId', v_usuario, 'vinculoId', v_vinculo);
end $$;

-- ---------------------------------------------------------------- 8. RPCs do painel
create function public.fn_admin_resumo()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v jsonb;
begin
  perform privado.exigir_painel_admin();
  with alvo as (
    select u.id, privado.situacao_usuario(u.id) as situacao, u.acesso_expira_em
      from public.usuarios u where privado.admin_geral() or privado.administra_usuario(u.id))
  select jsonb_build_object(
    'escopo', case when privado.admin_geral() then 'GERAL' else 'ESCOLA' end,
    'usuariosAtivos', count(*) filter (where situacao = 'ATIVO'),
    'convitesPendentes', count(*) filter (where situacao = 'CONVITE_PENDENTE'),
    'aguardandoAprovacao', count(*) filter (where situacao = 'AGUARDANDO_APROVACAO'),
    'suspensos', count(*) filter (where situacao = 'SUSPENSO'),
    'expirados', count(*) filter (where situacao in ('EXPIRADO', 'CONVITE_EXPIRADO')),
    'expiramEm7Dias', count(*) filter (where situacao = 'ATIVO' and acesso_expira_em <= now() + interval '7 days'),
    'ferramentasDisponiveis', (select count(*) from public.ferramentas_status f where f.disponivel),
    'ferramentasTotal', (select count(*) from public.ferramentas_status),
    'atividadesRecentes', (select count(*) from public.auditoria a
                            where a.estudante_id is null and a.criado_em > now() - interval '7 days'
                              and a.papel_autor in ('ADMIN_GERAL', 'COORDENACAO')
                              and (privado.admin_geral() or privado.coordena_escola(a.escola_id))))
  into v from alvo;
  return v;
end $$;

create function public.fn_admin_listar_usuarios(
  p_busca text default null, p_situacao text default null, p_limite integer default 50, p_deslocamento integer default 0)
returns table (id uuid, nome text, email text, organizacao text, perfil_id uuid, perfil_nome text, papeis text[],
               situacao text, ultimo_login timestamptz, acesso_expira_em timestamptz, total bigint)
language plpgsql stable security definer set search_path = '' as $$
declare
  v_busca text := nullif(lower(trim(coalesce(p_busca, ''))), '');
begin
  perform privado.exigir_painel_admin();
  if p_limite is null or p_limite not between 1 and 200 or coalesce(p_deslocamento, 0) < 0 then
    raise exception 'Paginação inválida.' using errcode = '22023';
  end if;
  return query
    with alvo as (
      select u.*, privado.situacao_usuario(u.id) as sit
        from public.usuarios u
       where (privado.admin_geral() or privado.administra_usuario(u.id) or u.id = privado.usuario_atual())
         and (v_busca is null or lower(u.nome) like '%' || v_busca || '%' or lower(u.email) like '%' || v_busca || '%'
              or lower(coalesce(u.organizacao, '')) like '%' || v_busca || '%'))
    select a.id, a.nome, a.email,
           coalesce(a.organizacao, (select string_agg(e.nome, ', ' order by e.nome) from public.escolas e
                                     where e.id = any (privado.escolas_do_usuario(a.id)))),
           p.id, p.nome, privado.papeis_do_usuario(a.id), a.sit,
           (select au.last_sign_in_at from auth.users au where au.id = a.auth_user_id),
           a.acesso_expira_em, count(*) over ()
      from alvo a left join public.perfis_acesso p on p.id = a.perfil_acesso_id
     where p_situacao is null or a.sit = p_situacao
     order by a.nome
     limit p_limite offset coalesce(p_deslocamento, 0);
end $$;

create function public.fn_admin_obter_usuario(p_usuario uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v jsonb;
begin
  perform privado.exigir_painel_admin();
  if not (privado.admin_geral() or privado.administra_usuario(p_usuario) or p_usuario = privado.usuario_atual()) then
    raise exception 'Você não administra o acesso desta pessoa.' using errcode = '42501';
  end if;
  select jsonb_build_object(
    'id', u.id, 'nome', u.nome, 'email', u.email, 'organizacao', u.organizacao,
    'escolas', (select coalesce(jsonb_agg(jsonb_build_object('id', e.id, 'nome', e.nome) order by e.nome), '[]')
                  from public.escolas e where e.id = any (privado.escolas_do_usuario(u.id))),
    'papeis', privado.papeis_do_usuario(u.id),
    'situacao', privado.situacao_usuario(u.id),
    'perfilId', u.perfil_acesso_id,
    'permissoesRemovidas', u.permissoes_removidas,
    'acessoExpiraEm', u.acesso_expira_em,
    'suspensoEm', u.suspenso_em, 'motivoSuspensao', u.motivo_suspensao, 'removidoEm', u.removido_em,
    'ultimoLogin', (select au.last_sign_in_at from auth.users au where au.id = u.auth_user_id),
    'editavel', privado.administra_usuario(u.id),
    'historico', (select coalesce(jsonb_agg(h order by h.criado_em desc), '[]') from (
                    select a.evento, a.criado_em, a.papel_autor, a.detalhes, au2.nome as autor_nome
                      from public.auditoria a left join public.usuarios au2 on au2.id = a.autor_id
                     where a.entidade = 'usuarios' and a.entidade_id = u.id and a.estudante_id is null
                     order by a.criado_em desc limit 20) h))
  into v from public.usuarios u where u.id = p_usuario;
  return v;
end $$;

create function public.fn_admin_suspender(p_usuario uuid, p_motivo text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform privado.exigir_administra(p_usuario);
  if char_length(trim(coalesce(p_motivo, ''))) not between 5 and 300 then
    raise exception 'Informe o motivo da suspensão (5 a 300 caracteres).' using errcode = '22023';
  end if;
  if exists (select 1 from public.usuarios u where u.id = p_usuario and (u.suspenso_em is not null or u.removido_em is not null)) then
    raise exception 'Este acesso já está suspenso ou removido.' using errcode = 'PT409';
  end if;
  update public.usuarios set suspenso_em = now(), motivo_suspensao = trim(p_motivo) where id = p_usuario;
  perform privado.auditar_admin(privado.escola_da_acao(p_usuario), 'ACESSO_SUSPENSO', 'usuarios', p_usuario,
                                jsonb_build_object('motivo', trim(p_motivo)));
end $$;

create function public.fn_admin_reativar(p_usuario uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform privado.exigir_administra(p_usuario);
  if not exists (select 1 from public.usuarios u where u.id = p_usuario and u.suspenso_em is not null and u.removido_em is null) then
    raise exception 'Só um acesso suspenso pode ser reativado.' using errcode = 'PT409';
  end if;
  update public.usuarios set suspenso_em = null, motivo_suspensao = null where id = p_usuario;
  perform privado.auditar_admin(privado.escola_da_acao(p_usuario), 'ACESSO_REATIVADO', 'usuarios', p_usuario);
end $$;

-- Remover: o admin geral encerra o acesso em todo o sistema; a coordenação, só na escola dela.
-- Nunca apaga a pessoa nem a auditoria (LGPD art. 16, I).
create function public.fn_admin_remover_acesso(p_usuario uuid, p_motivo text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_escolas uuid[];
begin
  perform privado.exigir_administra(p_usuario);
  if char_length(trim(coalesce(p_motivo, ''))) not between 5 and 300 then
    raise exception 'Informe o motivo da remoção (5 a 300 caracteres).' using errcode = '22023';
  end if;
  if exists (select 1 from public.usuarios u where u.id = p_usuario and u.removido_em is not null) then
    raise exception 'Este acesso já foi removido.' using errcode = 'PT409';
  end if;
  if privado.admin_geral() then
    v_escolas := privado.escolas_do_usuario(p_usuario);
    update public.usuarios set removido_em = now(), aguardando_aprovacao = false where id = p_usuario;
  else
    select coalesce(array_agg(s.escola_id), '{}') into v_escolas
      from unnest(privado.escolas_do_usuario(p_usuario)) s(escola_id) where privado.coordena_escola(s.escola_id);
  end if;
  update public.membros_escola set status = 'ENCERRADO', encerrado_em = now()
   where usuario_id = p_usuario and escola_id = any (v_escolas) and status = 'ATIVO';
  update public.vinculos_usuario_estudante v set status = 'ENCERRADO'
   where v.usuario_id = p_usuario and v.status in ('ATIVO', 'PENDENTE_RESPONSAVEL')
     and exists (select 1 from public.estudantes e where e.id = v.estudante_id and e.escola_id = any (v_escolas));
  update public.convites c set revogado_em = now()
   where c.email = (select u.email from public.usuarios u where u.id = p_usuario)
     and c.escola_id = any (v_escolas) and c.aceito_em is null and c.revogado_em is null;
  perform privado.auditar_admin(privado.escola_da_acao(p_usuario), 'ACESSO_REMOVIDO', 'usuarios', p_usuario,
                                jsonb_build_object('motivo', trim(p_motivo), 'escopo', case when privado.admin_geral() then 'SISTEMA' else 'ESCOLA' end));
end $$;

create function public.fn_admin_definir_validade(p_usuario uuid, p_expira_em timestamptz)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform privado.exigir_administra(p_usuario);
  if p_expira_em is not null and p_expira_em <= now() then
    raise exception 'A validade do acesso precisa ser uma data futura.' using errcode = '22023';
  end if;
  update public.usuarios set acesso_expira_em = p_expira_em where id = p_usuario;
  perform privado.auditar_admin(privado.escola_da_acao(p_usuario), 'ACESSO_VALIDADE_DEFINIDA', 'usuarios', p_usuario,
                                jsonb_build_object('validade', p_expira_em));
end $$;

create function public.fn_admin_aprovar_acesso(p_usuario uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform privado.exigir_administra(p_usuario);
  if not exists (select 1 from public.usuarios u where u.id = p_usuario and u.aguardando_aprovacao and u.removido_em is null) then
    raise exception 'Este acesso não está aguardando aprovação.' using errcode = 'PT409';
  end if;
  update public.usuarios set aguardando_aprovacao = false where id = p_usuario;
  perform privado.auditar_admin(privado.escola_da_acao(p_usuario), 'ACESSO_APROVADO', 'usuarios', p_usuario);
end $$;

create function public.fn_admin_recusar_acesso(p_usuario uuid, p_motivo text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform privado.exigir_administra(p_usuario);
  if not exists (select 1 from public.usuarios u where u.id = p_usuario and u.aguardando_aprovacao and u.removido_em is null) then
    raise exception 'Este acesso não está aguardando aprovação.' using errcode = 'PT409';
  end if;
  if char_length(trim(coalesce(p_motivo, ''))) not between 5 and 300 then
    raise exception 'Informe o motivo da recusa (5 a 300 caracteres).' using errcode = '22023';
  end if;
  update public.usuarios set aguardando_aprovacao = false, removido_em = now() where id = p_usuario;
  update public.convites c set revogado_em = now()
   where c.email = (select u.email from public.usuarios u where u.id = p_usuario) and c.aceito_em is null and c.revogado_em is null;
  perform privado.auditar_admin(privado.escola_da_acao(p_usuario), 'ACESSO_RECUSADO', 'usuarios', p_usuario,
                                jsonb_build_object('motivo', trim(p_motivo)));
end $$;

create function public.fn_admin_definir_perfil(p_usuario uuid, p_perfil uuid, p_permissoes_removidas text[] default '{}')
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_papeis text[] := privado.papeis_do_usuario(p_usuario);
  v_base text;
begin
  perform privado.exigir_administra(p_usuario);
  if p_perfil is not null then
    select p.papel_base into v_base from public.perfis_acesso p where p.id = p_perfil and p.arquivado_em is null;
    if v_base is null or not (v_base = any (v_papeis)) then
      raise exception 'O perfil escolhido não corresponde a um papel que esta pessoa exerce.' using errcode = '22023';
    end if;
  end if;
  if exists (select 1 from unnest(coalesce(p_permissoes_removidas, '{}')) x
              where not exists (select 1 from public.catalogo_permissoes c where c.ferramenta::text || ':' || c.acao::text = x)) then
    raise exception 'Permissão desconhecida.' using errcode = '22023';
  end if;
  update public.usuarios set perfil_acesso_id = p_perfil, permissoes_removidas = coalesce(p_permissoes_removidas, '{}')
   where id = p_usuario;
  perform privado.auditar_admin(privado.escola_da_acao(p_usuario), 'ACESSO_PERFIL_DEFINIDO', 'usuarios', p_usuario,
                                jsonb_build_object('perfil', p_perfil, 'removidas', coalesce(p_permissoes_removidas, '{}')));
end $$;

create function public.fn_admin_listar_perfis()
returns table (id uuid, nome text, descricao text, papel_base text, permissoes text[], teto text[], sistema boolean,
               arquivado_em timestamptz, usuarios bigint)
language plpgsql stable security definer set search_path = '' as $$
begin
  perform privado.exigir_painel_admin();
  return query
    select p.id, p.nome, p.descricao, p.papel_base, p.permissoes, privado.teto(p.papel_base), p.sistema, p.arquivado_em,
           (select count(*) from public.usuarios u where u.perfil_acesso_id = p.id)
      from public.perfis_acesso p
     order by p.sistema desc, p.nome;
end $$;

create function public.fn_admin_salvar_perfil(
  p_id uuid, p_nome text, p_descricao text, p_papel_base text, p_permissoes text[])
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
  v_evento text := case when p_id is null then 'PERFIL_CRIADO' else 'PERFIL_ALTERADO' end;
begin
  perform privado.exigir_admin_geral();
  if p_papel_base = 'ADMIN_GERAL' then
    raise exception 'O perfil de Administração geral é único e definido pelo sistema.' using errcode = '22023';
  end if;
  if p_id is not null and exists (select 1 from public.perfis_acesso p where p.id = p_id and p.sistema) then
    raise exception 'Os perfis base do sistema não podem ser alterados.' using errcode = '42501';
  end if;
  if exists (select 1 from public.perfis_acesso p where lower(p.nome) = lower(trim(p_nome)) and p.id is distinct from p_id) then
    raise exception 'Já existe um perfil com esse nome.' using errcode = 'PT409';
  end if;
  if p_id is null then
    insert into public.perfis_acesso (nome, descricao, papel_base, permissoes, criado_por)
    values (trim(p_nome), nullif(trim(coalesce(p_descricao, '')), ''), p_papel_base, coalesce(p_permissoes, '{}'), privado.usuario_atual())
    returning id into v_id;
  else
    update public.perfis_acesso
       set nome = trim(p_nome), descricao = nullif(trim(coalesce(p_descricao, '')), ''), papel_base = p_papel_base,
           permissoes = coalesce(p_permissoes, '{}'), atualizado_em = now()
     where id = p_id and arquivado_em is null
    returning id into v_id;
    if v_id is null then
      raise exception 'Perfil não encontrado ou arquivado.' using errcode = 'PT409';
    end if;
  end if;
  perform privado.auditar_admin(null, v_evento, 'perfis_acesso', v_id,
                                jsonb_build_object('nome', trim(p_nome), 'papelBase', p_papel_base, 'permissoes', coalesce(p_permissoes, '{}')));
  return v_id;
end $$;

create function public.fn_admin_arquivar_perfil(p_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform privado.exigir_admin_geral();
  if exists (select 1 from public.perfis_acesso p where p.id = p_id and p.sistema) then
    raise exception 'Os perfis base do sistema não podem ser arquivados.' using errcode = '42501';
  end if;
  if exists (select 1 from public.usuarios u where u.perfil_acesso_id = p_id and u.removido_em is null) then
    raise exception 'Há pessoas com este perfil. Troque o perfil delas antes de arquivar.' using errcode = 'PT409';
  end if;
  update public.perfis_acesso set arquivado_em = now() where id = p_id and arquivado_em is null;
  if not found then
    raise exception 'Perfil não encontrado ou já arquivado.' using errcode = 'PT409';
  end if;
  perform privado.auditar_admin(null, 'PERFIL_ARQUIVADO', 'perfis_acesso', p_id);
end $$;

create function public.fn_admin_catalogo()
returns table (ferramenta text, acao text, papeis text[], descricao text, disponivel boolean, alterado_em timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  perform privado.exigir_painel_admin();
  return query
    select c.ferramenta::text, c.acao::text, c.papeis, c.descricao, f.disponivel, f.alterado_em
      from public.catalogo_permissoes c join public.ferramentas_status f on f.ferramenta = c.ferramenta
     order by c.ferramenta, c.acao;
end $$;

create function public.fn_admin_definir_ferramenta(p_ferramenta public.ferramenta, p_disponivel boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform privado.exigir_admin_geral();
  if p_disponivel is null then
    raise exception 'Informe se a ferramenta fica disponível.' using errcode = '22023';
  end if;
  update public.ferramentas_status set disponivel = p_disponivel, alterado_em = now(), alterado_por = privado.usuario_atual()
   where ferramenta = p_ferramenta and disponivel is distinct from p_disponivel;
  if not found then
    raise exception 'A ferramenta já está nesse estado.' using errcode = 'PT409';
  end if;
  perform privado.auditar_admin(null, case when p_disponivel then 'FERRAMENTA_LIGADA' else 'FERRAMENTA_DESLIGADA' end,
                                'ferramentas_status', null, jsonb_build_object('ferramenta', p_ferramenta));
end $$;

create function public.fn_admin_configuracoes()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  perform privado.exigir_painel_admin();
  return (select jsonb_build_object('exigirAprovacaoExternos', c.exigir_aprovacao_externos,
                                    'validadePadraoDias', c.validade_padrao_dias, 'alteradoEm', c.alterado_em)
            from public.configuracoes_sistema c);
end $$;

create function public.fn_admin_salvar_configuracoes(p_exigir_aprovacao_externos boolean, p_validade_padrao_dias integer)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform privado.exigir_admin_geral();
  if p_exigir_aprovacao_externos is null or p_validade_padrao_dias is null or p_validade_padrao_dias not between 1 and 730 then
    raise exception 'A validade padrão vai de 1 a 730 dias.' using errcode = '22023';
  end if;
  update public.configuracoes_sistema
     set exigir_aprovacao_externos = p_exigir_aprovacao_externos, validade_padrao_dias = p_validade_padrao_dias,
         alterado_em = now(), alterado_por = privado.usuario_atual();
  perform privado.auditar_admin(null, 'CONFIGURACOES_ALTERADAS', 'configuracoes_sistema', null,
                                jsonb_build_object('exigirAprovacaoExternos', p_exigir_aprovacao_externos,
                                                   'validadePadraoDias', p_validade_padrao_dias));
end $$;

-- Atividades administrativas: nunca eventos de estudante (clínicos ou pedagógicos).
create function public.fn_admin_listar_auditoria(p_busca text default null, p_limite integer default 50, p_deslocamento integer default 0)
returns table (criado_em timestamptz, evento text, papel_autor text, autor_nome text, entidade text, alvo_nome text,
               detalhes jsonb, total bigint)
language plpgsql stable security definer set search_path = '' as $$
declare
  v_busca text := nullif(lower(trim(coalesce(p_busca, ''))), '');
begin
  perform privado.exigir_painel_admin();
  if p_limite is null or p_limite not between 1 and 200 or coalesce(p_deslocamento, 0) < 0 then
    raise exception 'Paginação inválida.' using errcode = '22023';
  end if;
  return query
    select a.criado_em, a.evento, a.papel_autor, au.nome, a.entidade,
           case when a.entidade = 'usuarios' then alvo.nome when a.entidade = 'perfis_acesso' then pf.nome end,
           a.detalhes - 'motivo', count(*) over ()
      from public.auditoria a
      left join public.usuarios au on au.id = a.autor_id
      left join public.usuarios alvo on a.entidade = 'usuarios' and alvo.id = a.entidade_id
      left join public.perfis_acesso pf on a.entidade = 'perfis_acesso' and pf.id = a.entidade_id
     where (a.estudante_id is null or a.evento = 'CONVITE_EMITIDO')
       and (a.evento like 'ACESSO\_%' or a.evento like 'PERFIL\_%' or a.evento like 'FERRAMENTA\_%'
            or a.evento in ('CONFIGURACOES_ALTERADAS', 'CONVITE_EMITIDO'))
       and (privado.admin_geral() or privado.coordena_escola(a.escola_id))
       and (v_busca is null or lower(coalesce(au.nome, '')) like '%' || v_busca || '%'
            or lower(coalesce(alvo.nome, '')) like '%' || v_busca || '%' or lower(a.evento) like '%' || v_busca || '%')
     order by a.criado_em desc
     limit p_limite offset coalesce(p_deslocamento, 0);
end $$;

-- ---------------------------------------------------------------- 9. permissões de execução
revoke execute on all functions in schema privado from public, anon;
grant execute on function privado.usuario_atual(), privado.usuario_logado(), privado.admin_geral(), privado.eh_admin(uuid),
  privado.teto(text), privado.usuario_pode(uuid, public.ferramenta, public.acao_ferramenta),
  privado.pode(public.ferramenta, public.acao_ferramenta), privado.pode_observar(uuid) to authenticated;

revoke execute on function
  public.fn_meu_perfil(), public.fn_aceitar_termos(text),
  public.fn_preparar_convite(uuid, text, public.papel_usuario, uuid, text, boolean, uuid, timestamptz, boolean, text, text[]),
  public.fn_registrar_convite(uuid, uuid, text, text, uuid, public.papel_usuario, uuid, text, boolean, uuid, timestamptz, boolean, text, text[]),
  public.fn_ler_notas_clinicas(uuid),
  public.fn_admin_resumo(), public.fn_admin_listar_usuarios(text, text, integer, integer), public.fn_admin_obter_usuario(uuid),
  public.fn_admin_suspender(uuid, text), public.fn_admin_reativar(uuid), public.fn_admin_remover_acesso(uuid, text),
  public.fn_admin_definir_validade(uuid, timestamptz), public.fn_admin_aprovar_acesso(uuid), public.fn_admin_recusar_acesso(uuid, text),
  public.fn_admin_definir_perfil(uuid, uuid, text[]), public.fn_admin_listar_perfis(),
  public.fn_admin_salvar_perfil(uuid, text, text, text, text[]), public.fn_admin_arquivar_perfil(uuid),
  public.fn_admin_catalogo(), public.fn_admin_definir_ferramenta(public.ferramenta, boolean),
  public.fn_admin_configuracoes(), public.fn_admin_salvar_configuracoes(boolean, integer),
  public.fn_admin_listar_auditoria(text, integer, integer)
from public, anon;
grant execute on function
  public.fn_meu_perfil(), public.fn_aceitar_termos(text),
  public.fn_preparar_convite(uuid, text, public.papel_usuario, uuid, text, boolean, uuid, timestamptz, boolean, text, text[]),
  public.fn_ler_notas_clinicas(uuid),
  public.fn_admin_resumo(), public.fn_admin_listar_usuarios(text, text, integer, integer), public.fn_admin_obter_usuario(uuid),
  public.fn_admin_suspender(uuid, text), public.fn_admin_reativar(uuid), public.fn_admin_remover_acesso(uuid, text),
  public.fn_admin_definir_validade(uuid, timestamptz), public.fn_admin_aprovar_acesso(uuid), public.fn_admin_recusar_acesso(uuid, text),
  public.fn_admin_definir_perfil(uuid, uuid, text[]), public.fn_admin_listar_perfis(),
  public.fn_admin_salvar_perfil(uuid, text, text, text, text[]), public.fn_admin_arquivar_perfil(uuid),
  public.fn_admin_catalogo(), public.fn_admin_definir_ferramenta(public.ferramenta, boolean),
  public.fn_admin_configuracoes(), public.fn_admin_salvar_configuracoes(boolean, integer),
  public.fn_admin_listar_auditoria(text, integer, integer)
to authenticated;
revoke execute on function
  public.fn_registrar_convite(uuid, uuid, text, text, uuid, public.papel_usuario, uuid, text, boolean, uuid, timestamptz, boolean, text, text[])
from authenticated;
grant execute on function
  public.fn_registrar_convite(uuid, uuid, text, text, uuid, public.papel_usuario, uuid, text, boolean, uuid, timestamptz, boolean, text, text[])
to service_role;
