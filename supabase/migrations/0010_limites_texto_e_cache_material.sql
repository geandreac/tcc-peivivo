-- ============================================================================
-- PEI Vivo — 0010 · Limites de texto livre e cache de material sem corrida (D-47)
--  1. `observacoes.evidencia`, `desfechos.observacao_livre` e
--     `notas_clinicas.conteudo` não tinham limite: um usuário autenticado
--     gravava 1 MB pelo PostgREST (sonda da auditoria de 26/10/2026). Os
--     números são os de `packages/contratos` (LIMITE_EVIDENCIA,
--     LIMITE_OBSERVACAO_DESFECHO, LIMITE_NOTA_CLINICA). `not valid` +
--     `validate` em seguida: se algum dado antigo passar do limite, a migração
--     inteira falha (transação) em vez de deixar a regra pela metade.
--  2. `fn_registrar_material` consultava o cache e depois inseria, sem trava:
--     duas chamadas iguais simultâneas (clique duplo) gravavam dois rascunhos.
--     Agora a chave do cache é serializada por `pg_advisory_xact_lock`
--     (liberado no fim da transação). Mesma assinatura → os GRANTs da 0006
--     continuam valendo (só service_role).
-- ============================================================================

-- ---------------------------------------------------------------- 1. limites
alter table public.observacoes
  add constraint ck_observacao_evidencia_tamanho check (char_length(evidencia) <= 1000) not valid;
alter table public.observacoes validate constraint ck_observacao_evidencia_tamanho;

alter table public.desfechos
  add constraint ck_desfecho_observacao_tamanho check (char_length(observacao_livre) <= 1000) not valid;
alter table public.desfechos validate constraint ck_desfecho_observacao_tamanho;

alter table public.notas_clinicas
  add constraint ck_nota_clinica_tamanho check (char_length(conteudo) <= 5000) not valid;
alter table public.notas_clinicas validate constraint ck_nota_clinica_tamanho;

-- ---------------------------------------------------------------- 2. cache sem corrida
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
  if not exists (select 1 from public.versoes_perfil v
                  where v.id = p_versao and v.estudante_id = p_estudante and v.status_validacao = 'VIGENTE') then
    raise exception 'A versão de perfil não é mais a vigente; gere de novo.' using errcode = 'PT409';
  end if;
  if p_ia_aplicada and not privado.validacao_clinica_ativa(p_estudante) then
    raise exception 'IA só com profissional de saúde vinculado e autorizado.' using errcode = '42501';
  end if;
  -- Serializa a mesma chave de cache: a segunda chamada espera a primeira e encontra o rascunho dela.
  perform pg_advisory_xact_lock(hashtextextended(p_docente::text || ':' || p_versao::text || ':' || p_hash, 0));
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
