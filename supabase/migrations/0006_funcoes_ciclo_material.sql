-- ============================================================================
-- PEI Vivo — 0006 · Portas de banco das Edge Functions fechar-ciclo e
-- gerar-material (R3, D-37). As regras ficam no banco (testáveis em PGlite);
-- a Edge Function só roda o motor (TS) entre "preparar" e "registrar".
--
--   fn_preparar_*  → executada COMO O USUÁRIO (authenticated): valida papel,
--                    consentimento e estado; devolve o que o motor precisa.
--   fn_registrar_* → executada só pelo SERVICE ROLE (Edge Function): revalida
--                    tudo com o id do docente e grava. O cliente não a alcança,
--                    então não consegue gravar um "texto adaptado" que o motor
--                    não produziu nem uma versão de perfil inventada.
-- ============================================================================

-- O texto adaptado é a estrutura do motor (TextoAdaptado: blocos, enunciados).
alter table materiais_adaptados
  alter column texto_adaptado type jsonb
  using (case when texto_adaptado is null then null else to_jsonb(texto_adaptado) end);

-- RN06: IA e validação clínica só com profissional ativo E escopo de validação clínica.
create function privado.validacao_clinica_ativa(p_estudante uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select privado.tem_escopo(p_estudante, 'validacao_clinica')
     and exists (select 1 from public.vinculos_usuario_estudante v
                  where v.estudante_id = p_estudante and v.papel = 'PROFISSIONAL_SAUDE' and v.status = 'ATIVO')
$$;

create function privado.docente_ativo(p_docente uuid, p_estudante uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.vinculos_usuario_estudante v
                  where v.usuario_id = p_docente and v.estudante_id = p_estudante
                    and v.papel = 'DOCENTE' and v.status = 'ATIVO')
$$;

-- ---------------------------------------------------------------- fechar-ciclo
create function public.fn_dados_fechamento(p_ciclo uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  c public.ciclos_observacao;
  v_vigente public.versoes_perfil;
begin
  select * into c from public.ciclos_observacao where id = p_ciclo;
  if c.id is null or not privado.tem_papel(c.estudante_id, 'DOCENTE') then
    raise exception 'Só o docente vinculado fecha o ciclo.' using errcode = '42501';
  end if;
  if not privado.tem_escopo(c.estudante_id, 'observacao_pedagogica') then
    raise exception 'Sem consentimento ativo para observação pedagógica (RN01/RN08).' using errcode = '42501';
  end if;
  if c.status <> 'ABERTO' then
    raise exception 'Este ciclo já foi fechado.' using errcode = 'PT409';
  end if;
  if not exists (select 1 from public.observacoes o where o.ciclo_id = c.id) then
    raise exception 'Registre ao menos uma observação antes de fechar o ciclo.' using errcode = 'PT409';
  end if;
  select * into v_vigente from public.versoes_perfil
   where estudante_id = c.estudante_id and status_validacao = 'VIGENTE';
  return jsonb_build_object(
    'docenteId', privado.usuario_atual(),
    'estudanteId', c.estudante_id,
    'cicloId', c.id,
    'numeroCiclo', c.numero,
    'vigente', case when v_vigente.id is null then null
                    else jsonb_build_object('id', v_vigente.id, 'numeroCiclo', v_vigente.numero_ciclo,
                                            'parametros', v_vigente.parametros) end,
    'validacaoClinica', privado.validacao_clinica_ativa(c.estudante_id),
    'historico', coalesce((
      select jsonb_agg(jsonb_build_object('numeroCiclo', ci.numero, 'dimensao', o.dimensao,
                                          'valorEscala', o.valor_escala, 'evidencia', o.evidencia)
                       order by ci.numero, o.data_registro)
        from public.observacoes o join public.ciclos_observacao ci on ci.id = o.ciclo_id
       where ci.estudante_id = c.estudante_id and ci.numero <= c.numero), '[]'::jsonb)
  );
end $$;

create function public.fn_registrar_fechamento(p_docente uuid, p_ciclo uuid, p_parametros jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  c public.ciclos_observacao;
  v_validacao boolean;
  v_status public.status_validacao;
  v_versao uuid;
  v_escola uuid;
begin
  select * into c from public.ciclos_observacao where id = p_ciclo for update;
  if c.id is null or not privado.docente_ativo(p_docente, c.estudante_id)
     or not privado.tem_escopo(c.estudante_id, 'observacao_pedagogica') then
    raise exception 'Fechamento negado: docente sem vínculo ativo ou sem consentimento.' using errcode = '42501';
  end if;
  if c.status <> 'ABERTO' then
    raise exception 'Este ciclo já foi fechado.' using errcode = 'PT409';
  end if;
  if not exists (select 1 from public.observacoes o where o.ciclo_id = c.id) then
    raise exception 'Registre ao menos uma observação antes de fechar o ciclo.' using errcode = 'PT409';
  end if;
  if not privado.parametros_validos(p_parametros) then
    raise exception 'Parâmetros calculados inválidos.' using errcode = '22023';
  end if;

  v_validacao := privado.validacao_clinica_ativa(c.estudante_id);
  v_status := case when v_validacao then 'PENDENTE'::public.status_validacao else 'VIGENTE'::public.status_validacao end;

  -- Uma proposta nova substitui propostas antigas ainda não decididas.
  update public.versoes_perfil set status_validacao = 'SUBSTITUIDA'
   where estudante_id = c.estudante_id and status_validacao in ('PENDENTE', 'EM_REVISAO');
  if not v_validacao then -- RN06: modo pedagógico, entra em vigor direto
    update public.versoes_perfil set status_validacao = 'SUBSTITUIDA'
     where estudante_id = c.estudante_id and status_validacao = 'VIGENTE';
  end if;

  insert into public.versoes_perfil (estudante_id, ciclo_origem_id, numero_ciclo, parametros, status_validacao, data_vigencia)
  values (c.estudante_id, c.id, c.numero, p_parametros, v_status, case when v_validacao then null else now() end)
  returning id into v_versao;

  update public.ciclos_observacao set status = 'FECHADO', data_fim = current_date where id = c.id;
  insert into public.ciclos_observacao (estudante_id, numero, data_inicio, status)
  values (c.estudante_id, c.numero + 1, current_date, 'ABERTO');

  select e.escola_id into v_escola from public.estudantes e where e.id = c.estudante_id;
  insert into public.auditoria (escola_id, estudante_id, evento, entidade, entidade_id, autor_id, papel_autor, detalhes)
  values (v_escola, c.estudante_id, 'CICLO_FECHADO', 'ciclos_observacao', c.id, p_docente, 'DOCENTE',
          jsonb_build_object('numero', c.numero, 'status_versao', v_status));

  return jsonb_build_object('versaoId', v_versao, 'statusValidacao', v_status, 'modoPedagogico', not v_validacao);
end $$;

-- ---------------------------------------------------------------- gerar-material
create function public.fn_preparar_geracao(p_estudante uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v public.versoes_perfil;
begin
  if not privado.tem_papel(p_estudante, 'DOCENTE') then
    raise exception 'Só o docente vinculado gera material (D-02).' using errcode = '42501';
  end if;
  if not privado.tem_escopo(p_estudante, 'geracao_material') then
    raise exception 'A família não autorizou a geração de material (RN01/RN08).' using errcode = '42501';
  end if;
  select * into v from public.versoes_perfil where estudante_id = p_estudante and status_validacao = 'VIGENTE';
  if v.id is null then
    raise exception 'Este estudante ainda não tem um perfil vigente. Feche um ciclo de observação primeiro.' using errcode = 'PT409';
  end if;
  return jsonb_build_object(
    'docenteId', privado.usuario_atual(),
    'estudanteId', p_estudante,
    'versaoId', v.id,
    'parametros', v.parametros,
    'iaPermitida', privado.validacao_clinica_ativa(p_estudante),
    'revisaoEmAndamento', exists (select 1 from public.versoes_perfil x
                                   where x.estudante_id = p_estudante and x.status_validacao in ('PENDENTE', 'EM_REVISAO'))
  );
end $$;

create function public.fn_registrar_material(
  p_docente uuid, p_estudante uuid, p_versao uuid, p_titulo text, p_texto_original text,
  p_texto_adaptado jsonb, p_hash text, p_ia_aplicada boolean)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
begin
  if not privado.docente_ativo(p_docente, p_estudante) or not privado.tem_escopo(p_estudante, 'geracao_material') then
    raise exception 'Geração negada: docente sem vínculo ativo ou sem consentimento (RN01/RN08).' using errcode = '42501';
  end if;
  if not exists (select 1 from public.versoes_perfil v
                  where v.id = p_versao and v.estudante_id = p_estudante and v.status_validacao = 'VIGENTE') then
    raise exception 'A versão de perfil não é mais a vigente; gere de novo (RN05).' using errcode = 'PT409';
  end if;
  if p_ia_aplicada and not privado.validacao_clinica_ativa(p_estudante) then
    raise exception 'IA só com profissional de saúde vinculado e autorizado (RN06).' using errcode = '42501';
  end if;
  -- Cache (P3.5): mesmo docente + estudante + versão + texto → mesmo rascunho.
  select m.id into v_id from public.materiais_adaptados m
   where m.docente_id = p_docente and m.estudante_id = p_estudante and m.versao_perfil_id = p_versao
     and m.hash_texto = p_hash and m.status_aprovacao <> 'DESCARTADO'
   limit 1;
  if v_id is not null then
    return jsonb_build_object('materialId', v_id, 'emCache', true);
  end if;
  insert into public.materiais_adaptados
    (estudante_id, versao_perfil_id, docente_id, titulo, texto_original, texto_adaptado, hash_texto, ia_aplicada)
  values
    (p_estudante, p_versao, p_docente, coalesce(nullif(trim(p_titulo), ''), 'Material sem título'),
     p_texto_original, p_texto_adaptado, p_hash, p_ia_aplicada)
  returning id into v_id;
  return jsonb_build_object('materialId', v_id, 'emCache', false);
end $$;

revoke execute on function
  public.fn_dados_fechamento(uuid),
  public.fn_registrar_fechamento(uuid, uuid, jsonb),
  public.fn_preparar_geracao(uuid),
  public.fn_registrar_material(uuid, uuid, uuid, text, text, jsonb, text, boolean)
from public, anon, authenticated;
grant execute on function public.fn_dados_fechamento(uuid), public.fn_preparar_geracao(uuid) to authenticated;
grant execute on function
  public.fn_registrar_fechamento(uuid, uuid, jsonb),
  public.fn_registrar_material(uuid, uuid, uuid, text, text, jsonb, text, boolean)
to service_role;
grant execute on function privado.validacao_clinica_ativa(uuid), privado.docente_ativo(uuid, uuid) to authenticated;
