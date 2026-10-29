-- 0013 — Material padrão inclusivo (D-53).
-- Antes, estudante sem versão de perfil VIGENTE bloqueava a geração ("feche um ciclo
-- primeiro"). Agora a docente gera com os PARÂMETROS PADRÃO, que não são personalizados
-- (não dependem de nada observado), sem IA e sem âncora de interesse. O material nasce
-- rascunho e segue a revisão de sempre (RN04). Nada se presume sobre o estudante.
--
-- `versao_perfil_id` nulo = gerado com os parâmetros padrão. Regras:
--   * só vale enquanto o estudante NÃO tem versão VIGENTE (havendo, usa-se a vigente: PT409);
--   * nunca com IA (`ia_aplicada = false`), porque não há perfil validado (RN06/RN07): 22023;
--   * consentimento, vínculo e ferramenta continuam valendo como antes (42501).

alter table public.materiais_adaptados alter column versao_perfil_id drop not null;
comment on column public.materiais_adaptados.versao_perfil_id is
  'Snapshot dos parâmetros. Nulo = parâmetros padrão (estudante ainda sem versão VIGENTE, D-53).';

-- Espelho de PARAMETROS_PADRAO (packages/motor-adaptacao/src/tipos.ts); teste em packages/politicas.
create function privado.parametros_padrao() returns jsonb
language sql immutable set search_path = '' as $$
  select '{"maxLinhasPorBloco":6,"nivelVocabulario":"INTERMEDIARIO","interesseAncora":null,"formatoEnunciado":"MULTIPLAS_ETAPAS","contrasteMinimo":4.5,"blocosPorMaterial":8}'::jsonb
$$;

create or replace function privado.tg_material_integridade() returns trigger
language plpgsql set search_path = '' as $$
declare
  v public.versoes_perfil;
begin
  if new.versao_perfil_id is null then
    if tg_op = 'INSERT' then
      if exists (select 1 from public.versoes_perfil x
                  where x.estudante_id = new.estudante_id and x.status_validacao = 'VIGENTE') then
        raise exception 'O estudante já tem perfil vigente; gere com ele.' using errcode = 'PT409';
      end if;
      if new.ia_aplicada then
        raise exception 'Material com parâmetros padrão não usa IA.' using errcode = '22023';
      end if;
    end if;
  else
    select * into v from public.versoes_perfil where id = new.versao_perfil_id;
    if v.estudante_id is distinct from new.estudante_id then
      raise exception 'A versão de perfil pertence a outro estudante.' using errcode = '22023';     -- S-22
    end if;
    if tg_op = 'INSERT' and v.status_validacao <> 'VIGENTE' then
      raise exception 'Material só é gerado com a versão de perfil VIGENTE.' using errcode = 'PT409'; -- S-21
    end if;
  end if;
  if tg_op = 'INSERT' then
    if new.status_aprovacao <> 'RASCUNHO' then
      raise exception 'Material nasce como rascunho.' using errcode = '22023';
    end if;
  else
    if new.texto_original is distinct from old.texto_original
       or new.docente_id is distinct from old.docente_id
       or new.versao_perfil_id is distinct from old.versao_perfil_id
       or new.estudante_id is distinct from old.estudante_id then
      raise exception 'Origem, autoria e versão do material são imutáveis.' using errcode = 'PT409';
    end if;
    if new.status_aprovacao is distinct from old.status_aprovacao and old.status_aprovacao <> 'RASCUNHO' then
      raise exception 'Só rascunhos podem ser aprovados ou descartados.' using errcode = 'PT409';
    end if;
  end if;
  return new;
end $$;

create or replace function public.fn_preparar_geracao(p_estudante uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v public.versoes_perfil;
begin
  if not privado.tem_papel(p_estudante, 'DOCENTE') then
    raise exception 'Só o docente vinculado gera material.' using errcode = '42501';
  end if;
  if not privado.tem_escopo(p_estudante, 'geracao_material') then
    raise exception 'A família não autorizou a geração de material.' using errcode = '42501';
  end if;
  select * into v from public.versoes_perfil where estudante_id = p_estudante and status_validacao = 'VIGENTE';
  return jsonb_build_object(
    'docenteId', privado.usuario_atual(),
    'estudanteId', p_estudante,
    'versaoId', v.id,                                            -- nulo: parâmetros padrão (D-53)
    'parametros', coalesce(v.parametros, privado.parametros_padrao()),
    'perfilPadrao', v.id is null,
    -- sem perfil validado não há IA, nem com profissional vinculado (RN06/RN07)
    'iaPermitida', v.id is not null and privado.validacao_clinica_ativa(p_estudante),
    'revisaoEmAndamento', exists (select 1 from public.versoes_perfil x
                                   where x.estudante_id = p_estudante and x.status_validacao in ('PENDENTE', 'EM_REVISAO'))
  );
end $$;

create or replace function public.fn_registrar_material(
  p_docente uuid, p_estudante uuid, p_versao uuid, p_titulo text, p_texto_original text,
  p_texto_adaptado jsonb, p_hash text, p_ia_aplicada boolean)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
begin
  if not privado.docente_ativo(p_docente, p_estudante) or not privado.tem_escopo(p_estudante, 'geracao_material') then
    raise exception 'Geração negada: docente sem vínculo ativo ou sem consentimento.' using errcode = '42501';
  end if;
  if p_versao is null then
    if exists (select 1 from public.versoes_perfil v where v.estudante_id = p_estudante and v.status_validacao = 'VIGENTE') then
      raise exception 'A versão de perfil não é mais a vigente; gere de novo.' using errcode = 'PT409';
    end if;
    if p_ia_aplicada then
      raise exception 'Material com parâmetros padrão não usa IA.' using errcode = '22023';
    end if;
  elsif not exists (select 1 from public.versoes_perfil v
                     where v.id = p_versao and v.estudante_id = p_estudante and v.status_validacao = 'VIGENTE') then
    raise exception 'A versão de perfil não é mais a vigente; gere de novo.' using errcode = 'PT409';
  end if;
  if p_ia_aplicada and not privado.validacao_clinica_ativa(p_estudante) then
    raise exception 'IA só com profissional de saúde vinculado e autorizado.' using errcode = '42501';
  end if;
  -- Serializa a mesma chave de cache: a segunda chamada espera a primeira e encontra o rascunho dela.
  perform pg_advisory_xact_lock(hashtextextended(p_docente::text || ':' || coalesce(p_versao::text, 'padrao') || ':' || p_hash, 0));
  -- Cache (P3.5): mesmo docente + estudante + versão (ou padrão) + texto → mesmo rascunho.
  select m.id into v_id from public.materiais_adaptados m
   where m.docente_id = p_docente and m.estudante_id = p_estudante and m.versao_perfil_id is not distinct from p_versao
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
