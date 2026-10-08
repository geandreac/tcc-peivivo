-- ============================================================================
-- PEI Vivo — 0005 · Auditoria (D-30), notificações (D-28), nota clínica
-- auditada (RN02) e expiração de validação (RN05, D-38).
-- ============================================================================

-- ---------------------------------------------------------------- auditoria
-- Append-only. Sem FK para estudantes: o evento sobrevive à exclusão (F11,
-- prova de cumprimento — LGPD art. 16, I). `detalhes` nunca leva conteúdo de
-- observação, nota ou material.
create table auditoria (
  id           uuid primary key default gen_random_uuid(),
  escola_id    uuid,
  estudante_id uuid,
  evento       text not null,
  entidade     text not null,
  entidade_id  uuid,
  autor_id     uuid,          -- null = sistema (Edge Function / tarefa agendada)
  papel_autor  text,
  criado_em    timestamptz not null default now(),
  detalhes     jsonb not null default '{}'
);
create index idx_auditoria_estudante on auditoria (estudante_id, criado_em desc);
create index idx_auditoria_escola on auditoria (escola_id, criado_em desc);
alter table auditoria enable row level security;
revoke all on auditoria from anon, authenticated;
comment on table auditoria is 'D-30: append-only; escrita só por triggers/funções; leitura só por fn_listar_auditoria*.';

create function privado.tg_auditoria_somente_insercao() returns trigger
language plpgsql set search_path = '' as $$
begin
  raise exception 'A trilha de auditoria é somente-inserção.' using errcode = '42501';
end $$;
create trigger tg_auditoria_imutavel before update or delete on auditoria
  for each row execute function privado.tg_auditoria_somente_insercao();

create function privado.auditar(
  p_estudante uuid, p_evento text, p_entidade text, p_entidade_id uuid, p_detalhes jsonb default '{}')
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_autor uuid := privado.usuario_atual();
  v_escola uuid := (select e.escola_id from public.estudantes e where e.id = p_estudante);
  v_papel text;
begin
  v_papel := case
    when v_autor is null then 'SISTEMA'
    when privado.papel_em(p_estudante) is not null then privado.papel_em(p_estudante)::text
    when exists (select 1 from public.membros_escola m where m.usuario_id = v_autor
                  and m.escola_id = v_escola and m.papel = 'COORDENACAO' and m.status = 'ATIVO') then 'COORDENACAO'
    else 'OUTRO' end;
  insert into public.auditoria (escola_id, estudante_id, evento, entidade, entidade_id, autor_id, papel_autor, detalhes)
  values (v_escola, p_estudante, p_evento, p_entidade, p_entidade_id, v_autor, v_papel, coalesce(p_detalhes, '{}'));
end $$;

-- ---------------------------------------------------------------- notificações
create type tipo_notificacao as enum (
  'CONSENTIMENTO_CONCEDIDO', 'CONSENTIMENTO_REVOGADO', 'PROFISSIONAL_AGUARDANDO_CONFIRMACAO',
  'VINCULO_ATIVADO', 'VALIDACAO_PENDENTE', 'REVISAO_SOLICITADA', 'VALIDACAO_EXPIRADA');

-- Conteúdo tipado: a frase é montada pelo app a partir do tipo; nada de texto livre com dado pessoal.
create table notificacoes (
  id            uuid primary key default gen_random_uuid(),
  usuario_id    uuid not null references usuarios(id) on delete cascade,
  tipo          tipo_notificacao not null,
  estudante_id  uuid references estudantes(id) on delete cascade,
  criada_em     timestamptz not null default now(),
  lida_em       timestamptz
);
create index idx_notificacao_usuario on notificacoes (usuario_id, criada_em desc);
alter table notificacoes enable row level security;
revoke all on notificacoes from anon, authenticated;
grant select on notificacoes to authenticated;
grant update (lida_em) on notificacoes to authenticated;
create policy notificacoes_select on notificacoes for select to authenticated
  using (usuario_id = privado.usuario_atual());
create policy notificacoes_marcar_lida on notificacoes for update to authenticated
  using (usuario_id = privado.usuario_atual())
  with check (usuario_id = privado.usuario_atual());

-- Notifica os vínculos ATIVOS do estudante com os papéis dados (e, se pedido,
-- a coordenação da escola), exceto quem causou o evento.
create function privado.notificar(
  p_estudante uuid, p_tipo public.tipo_notificacao, p_papeis public.papel_usuario[], p_coordenacao boolean default false)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_autor uuid := privado.usuario_atual();
begin
  insert into public.notificacoes (usuario_id, tipo, estudante_id)
  select distinct x.usuario_id, p_tipo, p_estudante from (
    select v.usuario_id from public.vinculos_usuario_estudante v
     where v.estudante_id = p_estudante and v.status = 'ATIVO' and v.papel = any (p_papeis)
    union
    select m.usuario_id from public.membros_escola m join public.estudantes e on e.escola_id = m.escola_id
     where p_coordenacao and e.id = p_estudante and m.papel = 'COORDENACAO' and m.status = 'ATIVO'
  ) x
  where x.usuario_id is distinct from v_autor;
end $$;

-- ---------------------------------------------------------------- triggers de evento
create function privado.tg_evento_estudante() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform privado.auditar(new.id, 'ESTUDANTE_CADASTRADO', 'estudantes', new.id);
  return new;
end $$;
create trigger tg_evento_estudante after insert on estudantes
  for each row execute function privado.tg_evento_estudante();

create function privado.tg_evento_vinculo() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    perform privado.auditar(new.estudante_id,
      case when new.status = 'PENDENTE_RESPONSAVEL' then 'VINCULO_PROPOSTO' else 'VINCULO_CRIADO' end,
      'vinculos_usuario_estudante', new.id,
      jsonb_build_object('papel', new.papel, 'conferido_presencialmente', new.conferido_em is not null));
    if new.status = 'PENDENTE_RESPONSAVEL' then
      perform privado.notificar(new.estudante_id, 'PROFISSIONAL_AGUARDANDO_CONFIRMACAO', array['RESPONSAVEL']::public.papel_usuario[]);
    elsif new.status = 'ATIVO' then
      insert into public.notificacoes (usuario_id, tipo, estudante_id) values (new.usuario_id, 'VINCULO_ATIVADO', new.estudante_id);
    end if;
  else
    if new.status is distinct from old.status then
      perform privado.auditar(new.estudante_id,
        case new.status when 'ATIVO' then 'VINCULO_CONFIRMADO' when 'RECUSADO' then 'VINCULO_RECUSADO'
                        when 'ENCERRADO' then 'VINCULO_ENCERRADO' else 'VINCULO_ALTERADO' end,
        'vinculos_usuario_estudante', new.id, jsonb_build_object('papel', new.papel));
      if new.status = 'ATIVO' then
        insert into public.notificacoes (usuario_id, tipo, estudante_id) values (new.usuario_id, 'VINCULO_ATIVADO', new.estudante_id);
      end if;
    end if;
    if new.verificacao_registro is distinct from old.verificacao_registro then
      perform privado.auditar(new.estudante_id, 'REGISTRO_VERIFICADO', 'vinculos_usuario_estudante', new.id);
    end if;
  end if;
  return new;
end $$;
create trigger tg_evento_vinculo after insert or update on vinculos_usuario_estudante
  for each row execute function privado.tg_evento_vinculo();

create function privado.tg_evento_consentimento() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    perform privado.auditar(new.estudante_id, 'CONSENTIMENTO_CONCEDIDO', 'consentimentos', new.id,
      jsonb_build_object('escopos', new.escopos, 'versao_termo', new.versao_termo));
    -- D-25: reconcessão notifica os demais responsáveis; docentes e coordenação sabem que podem operar.
    perform privado.notificar(new.estudante_id, 'CONSENTIMENTO_CONCEDIDO',
      array['RESPONSAVEL', 'DOCENTE', 'PROFISSIONAL_SAUDE']::public.papel_usuario[], true);
  elsif new.status = 'REVOGADO' and old.status <> 'REVOGADO' then
    perform privado.auditar(new.estudante_id, 'CONSENTIMENTO_REVOGADO', 'consentimentos', new.id);
    -- F10: todos os vinculados são avisados, sem motivo.
    perform privado.notificar(new.estudante_id, 'CONSENTIMENTO_REVOGADO',
      array['RESPONSAVEL', 'DOCENTE', 'PROFISSIONAL_SAUDE']::public.papel_usuario[], true);
  end if;
  return new;
end $$;
create trigger tg_evento_consentimento after insert or update on consentimentos
  for each row execute function privado.tg_evento_consentimento();

-- A trilha de consentimento nunca é apagada (S-07), nem pelo service role por engano.
create function privado.tg_consentimento_sem_delete() returns trigger
language plpgsql set search_path = '' as $$
begin
  if exists (select 1 from public.estudantes e where e.id = old.estudante_id) then
    raise exception 'Consentimento não é apagado; revogue-o.' using errcode = '42501';
  end if;
  return old; -- exclusão em cascata do estudante (F11) é permitida
end $$;
create trigger tg_consentimento_sem_delete before delete on consentimentos
  for each row execute function privado.tg_consentimento_sem_delete();

create function privado.tg_evento_versao() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    perform privado.auditar(new.estudante_id,
      case when new.status_validacao = 'PENDENTE' then 'VERSAO_PROPOSTA'
           when new.origem = 'AJUSTE_PROFISSIONAL' then 'VERSAO_AJUSTADA'
           else 'VERSAO_VIGENTE_SEM_VALIDACAO' end,
      'versoes_perfil', new.id, jsonb_build_object('numero_ciclo', new.numero_ciclo));
    if new.status_validacao = 'PENDENTE' then
      perform privado.notificar(new.estudante_id, 'VALIDACAO_PENDENTE', array['PROFISSIONAL_SAUDE']::public.papel_usuario[]);
    end if;
  elsif new.status_validacao is distinct from old.status_validacao and new.status_validacao <> 'SUBSTITUIDA' then
    perform privado.auditar(new.estudante_id,
      case new.status_validacao when 'VIGENTE' then 'VERSAO_VALIDADA' when 'EM_REVISAO' then 'VERSAO_REVISAO_SOLICITADA'
                                when 'EXPIRADA' then 'VERSAO_EXPIRADA' else 'VERSAO_ALTERADA' end,
      'versoes_perfil', new.id, jsonb_build_object('numero_ciclo', new.numero_ciclo));
    if new.status_validacao = 'EM_REVISAO' then
      perform privado.notificar(new.estudante_id, 'REVISAO_SOLICITADA', array['DOCENTE']::public.papel_usuario[]);
    elsif new.status_validacao = 'EXPIRADA' then
      perform privado.notificar(new.estudante_id, 'VALIDACAO_EXPIRADA', array['PROFISSIONAL_SAUDE']::public.papel_usuario[], true);
    end if;
  end if;
  return new;
end $$;
create trigger tg_evento_versao after insert or update on versoes_perfil
  for each row execute function privado.tg_evento_versao();

create function privado.tg_evento_material() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.status_aprovacao is distinct from old.status_aprovacao then
    perform privado.auditar(new.estudante_id,
      case new.status_aprovacao when 'APROVADO' then 'MATERIAL_APROVADO' else 'MATERIAL_DESCARTADO' end,
      'materiais_adaptados', new.id);
  end if;
  return new;
end $$;
create trigger tg_evento_material after update on materiais_adaptados
  for each row execute function privado.tg_evento_material();

-- ---------------------------------------------------------------- nota clínica (RN02, D-30)
create function public.fn_registrar_nota_clinica(p_estudante uuid, p_conteudo text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
begin
  if not privado.tem_papel(p_estudante, 'PROFISSIONAL_SAUDE') or not privado.consentimento_ativo(p_estudante) then
    raise exception 'Nota clínica reservada: acesso exclusivo do profissional de saúde vinculado (RN02).' using errcode = '42501';
  end if;
  if char_length(trim(coalesce(p_conteudo, ''))) = 0 then
    raise exception 'Escreva o conteúdo da nota.' using errcode = '22023';
  end if;
  insert into public.notas_clinicas (estudante_id, profissional_id, conteudo)
  values (p_estudante, privado.usuario_atual(), trim(p_conteudo))
  returning id into v_id;
  perform privado.auditar(p_estudante, 'NOTA_CLINICA_REGISTRADA', 'notas_clinicas', v_id);
  return v_id;
end $$;

-- Toda leitura grava LEITURA_NOTA_CLINICA; o responsável vê quem leu e quando.
create function public.fn_ler_notas_clinicas(p_estudante uuid)
returns table (id uuid, conteudo text, data_registro timestamptz, profissional_nome text, minha boolean)
language plpgsql security definer set search_path = '' as $$
begin
  if not privado.tem_papel(p_estudante, 'PROFISSIONAL_SAUDE') or not privado.consentimento_ativo(p_estudante) then
    raise exception 'Nota clínica reservada: acesso exclusivo do profissional de saúde vinculado (RN02).' using errcode = '42501';
  end if;
  perform privado.auditar(p_estudante, 'LEITURA_NOTA_CLINICA', 'notas_clinicas', null);
  return query
    select n.id, n.conteudo, n.data_registro, u.nome, n.profissional_id = privado.usuario_atual()
      from public.notas_clinicas n join public.usuarios u on u.id = n.profissional_id
     where n.estudante_id = p_estudante
     order by n.data_registro desc;
end $$;

-- ---------------------------------------------------------------- leitura da auditoria
-- Responsável: tudo do próprio filho, inclusive quem leu nota clínica (sem conteúdo).
-- Coordenação: eventos administrativos, nunca os clínicos.
create function public.fn_listar_auditoria(p_estudante uuid)
returns table (evento text, criado_em timestamptz, autor_nome text, papel_autor text, detalhes jsonb)
language plpgsql security definer set search_path = '' as $$
declare
  v_resp boolean := privado.tem_papel(p_estudante, 'RESPONSAVEL');
begin
  if not (v_resp or privado.coordena_estudante(p_estudante)) then
    raise exception 'A trilha de auditoria é visível só ao responsável e à coordenação.' using errcode = '42501';
  end if;
  return query
    select a.evento, a.criado_em, coalesce(u.nome, 'Sistema'), a.papel_autor, a.detalhes
      from public.auditoria a left join public.usuarios u on u.id = a.autor_id
     where a.estudante_id = p_estudante
       and (v_resp or a.evento not in ('LEITURA_NOTA_CLINICA', 'NOTA_CLINICA_REGISTRADA'))
     order by a.criado_em desc;
end $$;

-- ---------------------------------------------------------------- RN05: expiração (D-38)
-- `p_agora` permite testar sem esperar 7 dias. Não é exposta a usuários.
create function public.fn_expirar_validacoes(p_agora timestamptz default now())
returns integer language plpgsql security definer set search_path = '' as $$
declare
  v_qtd integer;
begin
  update public.versoes_perfil
     set status_validacao = 'EXPIRADA'
   where status_validacao = 'PENDENTE' and created_at < p_agora - interval '7 days';
  get diagnostics v_qtd = row_count;
  return v_qtd;
end $$;
revoke execute on function public.fn_expirar_validacoes(timestamptz) from public, anon, authenticated;

-- Agendamento diário às 03:00 UTC, só onde pg_cron existe (Supabase). PGlite não tem.
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    begin
      create extension if not exists pg_cron;
      perform cron.schedule('pei-vivo-expirar-validacoes', '0 3 * * *', 'select public.fn_expirar_validacoes()');
    exception when others then
      -- Não derruba a migration; o job db do CI mostra o aviso e o agendamento é feito pelo painel.
      raise warning 'pg_cron disponível mas não habilitado (%): agende fn_expirar_validacoes manualmente.', sqlerrm;
    end;
  else
    raise notice 'pg_cron indisponível: agendamento de fn_expirar_validacoes não criado (ambiente local).';
  end if;
end $$;

grant execute on function
  public.fn_registrar_nota_clinica(uuid, text),
  public.fn_ler_notas_clinicas(uuid),
  public.fn_listar_auditoria(uuid)
to authenticated;
