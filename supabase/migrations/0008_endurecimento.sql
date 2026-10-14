-- ============================================================================
-- PEI Vivo — 0008 · Endurecimento (D-46)
--  1. `anon` não executa nenhuma RPC. A 0004 revogou o EXECUTE só das funções
--     que existiam naquela linha; as criadas depois (0004/0005) herdaram o
--     EXECUTE padrão de PUBLIC e o default privilege do Supabase para `anon`.
--     Todas negavam por dentro, mas o princípio declarado era "anon não toca
--     em nada". Os default privileges também mudam, para a regra valer nas
--     próximas migrations: função nova só é executável por quem recebe GRANT.
--  2. Índice em toda chave estrangeira (Supabase Advisor: unindexed_foreign_keys).
--  3. Docente que deixa a escola perde os vínculos com os estudantes dela
--     (antes, `membros_escola` ENCERRADO não afetava `vinculos_usuario_estudante`).
-- ============================================================================

-- ---------------------------------------------------------------- 1. anon
revoke execute on all functions in schema public from public, anon;
-- O EXECUTE de PUBLIC é default GLOBAL; um default por schema só acrescenta a
-- ele, nunca retira — por isso o primeiro comando não tem `in schema`.
alter default privileges revoke execute on functions from public;
alter default privileges in schema public revoke execute on functions from anon, authenticated;
alter default privileges in schema public revoke all on tables from anon;

-- ---------------------------------------------------------------- 2. índices de FK
create index idx_consentimento_responsavel   on consentimentos (responsavel_id);
create index idx_consentimento_revogado_por  on consentimentos (revogado_por);
create index idx_convite_criado_por          on convites (criado_por);
create index idx_convite_escola              on convites (escola_id);
create index idx_convite_estudante           on convites (estudante_id);
create index idx_material_docente            on materiais_adaptados (docente_id);
create index idx_material_versao             on materiais_adaptados (versao_perfil_id);
create index idx_nota_estudante              on notas_clinicas (estudante_id, data_registro desc);
create index idx_nota_profissional           on notas_clinicas (profissional_id);
create index idx_notificacao_estudante       on notificacoes (estudante_id);
create index idx_observacao_autor            on observacoes (autor_id);
create index idx_versao_ciclo_origem         on versoes_perfil (ciclo_origem_id);
create index idx_versao_validador            on versoes_perfil (validador_id);
create index idx_versao_anterior             on versoes_perfil (versao_anterior_id);
create index idx_vinculo_conferido_por       on vinculos_usuario_estudante (conferido_por);
create index idx_vinculo_confirmado_por      on vinculos_usuario_estudante (confirmado_por);
create index idx_vinculo_encerrado_por       on vinculos_usuario_estudante (encerrado_por);
create index idx_vinculo_proposto_por        on vinculos_usuario_estudante (proposto_por);
create index idx_vinculo_verificado_por      on vinculos_usuario_estudante (verificado_por);

-- ---------------------------------------------------------------- 3. saída da escola
-- Vale para qualquer caminho que encerre o membro (RPC abaixo ou service role):
-- os vínculos DOCENTE ATIVOS com estudantes daquela escola viram ENCERRADO, e
-- tg_evento_vinculo (0005) audita cada um.
create function privado.tg_membro_encerrado() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'ENCERRADO' and old.status is distinct from 'ENCERRADO' then
    if new.papel = 'DOCENTE' then
      update public.vinculos_usuario_estudante v
         set status = 'ENCERRADO', encerrado_por = privado.usuario_atual(), encerrado_em = now()
       where v.usuario_id = new.usuario_id and v.papel = 'DOCENTE' and v.status = 'ATIVO'
         and v.estudante_id in (select e.id from public.estudantes e where e.escola_id = new.escola_id);
    end if;
    insert into public.auditoria (escola_id, estudante_id, evento, entidade, entidade_id, autor_id, papel_autor, detalhes)
    values (new.escola_id, null, 'MEMBRO_ENCERRADO', 'membros_escola', new.id, privado.usuario_atual(),
            case when privado.usuario_atual() is null then 'SISTEMA' else 'COORDENACAO' end,
            jsonb_build_object('papel', new.papel));
  end if;
  return new;
end $$;
create trigger tg_membro_encerrado after update on membros_escola
  for each row execute function privado.tg_membro_encerrado();

-- A coordenação (aal2) encerra docentes da própria escola. Coordenação só sai
-- pelo script de implantação (service role), para a escola nunca ficar sem ninguém.
create function public.fn_encerrar_membro(p_membro uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  m public.membros_escola;
begin
  select * into m from public.membros_escola where id = p_membro for update;
  if m.id is null or not privado.coordena_escola(m.escola_id) then
    raise exception 'Só a coordenação da escola, com verificação em duas etapas, encerra um membro.' using errcode = '42501';
  end if;
  if m.papel <> 'DOCENTE' then
    raise exception 'A coordenação só é encerrada pelo script de implantação.' using errcode = '42501';
  end if;
  if m.status = 'ENCERRADO' then
    raise exception 'Este membro já foi encerrado.' using errcode = 'PT409';
  end if;
  update public.membros_escola set status = 'ENCERRADO', encerrado_em = now() where id = p_membro;
end $$;

revoke execute on function public.fn_encerrar_membro(uuid) from public, anon;
grant execute on function public.fn_encerrar_membro(uuid) to authenticated;
