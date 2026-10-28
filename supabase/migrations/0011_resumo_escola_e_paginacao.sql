-- ============================================================================
-- PEI Vivo — 0011 · Painel da escola agregado no banco e auditoria paginada (D-48)
--  1. `fn_resumo_escola`: o painel baixava consentimentos, vínculos, versões e
--     ciclos inteiros e contava no navegador. Acima de 1000 linhas o PostgREST
--     corta sem erro (`max_rows`), e as contagens saíam erradas. Agora o banco
--     devolve só as contagens e as pendências, com as mesmas regras do mock:
--     validação atrasada = PENDENTE há ≥ 5 dias ou EXPIRADA; ciclo parado =
--     aberto há > 15 dias sem observação. Só a coordenação ativa da escola, aal2.
--  2. `fn_listar_auditoria` ganha `p_limite`/`p_deslocamento` (padrão: tudo,
--     como antes). Assinatura nova → drop + create + GRANT explícito (0008).
-- ============================================================================

-- ---------------------------------------------------------------- 1. painel
create function public.fn_resumo_escola(p_escola uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v jsonb;
begin
  if not privado.coordena_escola(p_escola) then
    raise exception 'O painel da escola é da coordenação pedagógica.' using errcode = '42501';
  end if;
  with base as (
    select e.id, e.nome, e.created_at,
           exists (select 1 from public.consentimentos c where c.estudante_id = e.id and c.status = 'ATIVO') as consentimento,
           exists (select 1 from public.vinculos_usuario_estudante vi
                    where vi.estudante_id = e.id and vi.papel = 'PROFISSIONAL_SAUDE' and vi.status = 'ATIVO') as profissional,
           (select min(vp.created_at) from public.versoes_perfil vp
             where vp.estudante_id = e.id
               and (vp.status_validacao = 'EXPIRADA'
                    or (vp.status_validacao = 'PENDENTE' and vp.created_at <= now() - interval '5 days'))) as atrasada_desde,
           (select ci.data_inicio from public.ciclos_observacao ci
             where ci.estudante_id = e.id and ci.status = 'ABERTO'
               and ci.data_inicio < current_date - 15
               and not exists (select 1 from public.observacoes o where o.ciclo_id = ci.id)) as parado_desde
      from public.estudantes e
     where e.escola_id = p_escola
  ),
  pendencias as (
    select id, nome, 1 as ordem, 'SEM_CONSENTIMENTO' as motivo, created_at::text as desde from base where not consentimento
    union all
    select id, nome, 2, 'SEM_PROFISSIONAL', null from base where consentimento and not profissional
    union all
    select id, nome, 3, 'VALIDACAO_ATRASADA', atrasada_desde::text from base where consentimento and atrasada_desde is not null
    union all
    select id, nome, 4, 'CICLO_PARADO', parado_desde::text from base where consentimento and parado_desde is not null
  )
  select jsonb_build_object(
    'totalEstudantes', (select count(*) from base),
    'comConsentimento', (select count(*) from base where consentimento),
    'semConsentimento', (select count(*) from base where not consentimento),
    'semProfissional', (select count(*) from base where consentimento and not profissional),
    'validacoesAtrasadas', (select count(*) from base where consentimento and atrasada_desde is not null),
    'ciclosParados', (select count(*) from base where consentimento and parado_desde is not null),
    'pendencias', coalesce((select jsonb_agg(jsonb_build_object('estudanteId', id, 'nome', nome, 'motivo', motivo, 'desde', desde)
                                             order by nome, id, ordem) from pendencias), '[]'::jsonb)
  ) into v;
  return v;
end $$;

revoke execute on function public.fn_resumo_escola(uuid) from public, anon;
grant execute on function public.fn_resumo_escola(uuid) to authenticated;

-- ---------------------------------------------------------------- 2. auditoria paginada
drop function public.fn_listar_auditoria(uuid);
create function public.fn_listar_auditoria(p_estudante uuid, p_limite integer default null, p_deslocamento integer default 0)
returns table (evento text, criado_em timestamptz, autor_nome text, papel_autor text, detalhes jsonb)
language plpgsql security definer set search_path = '' as $$
declare
  v_resp boolean := privado.tem_papel(p_estudante, 'RESPONSAVEL');
begin
  if not (v_resp or privado.coordena_estudante(p_estudante)) then
    raise exception 'A trilha de auditoria é visível só ao responsável e à coordenação.' using errcode = '42501';
  end if;
  if p_limite is not null and p_limite < 1 or coalesce(p_deslocamento, 0) < 0 then
    raise exception 'Paginação inválida.' using errcode = '22023';
  end if;
  return query
    select a.evento, a.criado_em, coalesce(u.nome, 'Sistema'), a.papel_autor, a.detalhes
      from public.auditoria a left join public.usuarios u on u.id = a.autor_id
     where a.estudante_id = p_estudante
       and (v_resp or a.evento not in ('LEITURA_NOTA_CLINICA', 'NOTA_CLINICA_REGISTRADA'))
     order by a.criado_em desc, a.id desc
     limit p_limite offset coalesce(p_deslocamento, 0);
end $$;

revoke execute on function public.fn_listar_auditoria(uuid, integer, integer) from public, anon;
grant execute on function public.fn_listar_auditoria(uuid, integer, integer) to authenticated;
