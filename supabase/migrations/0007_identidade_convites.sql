-- ============================================================================
-- PEI Vivo — 0007 · Identidade real (R2, D-32): perfil da sessão, convites e
-- aceite de termos. Mesmo padrão da 0006:
--   fn_preparar_convite  → COMO a coordenação (aal2): valida tudo, não grava.
--   fn_registrar_convite → só SERVICE ROLE (Edge Function `convidar`, depois de
--                          criar a conta no Auth): revalida e grava.
-- ============================================================================

alter table usuarios
  add column termos_versao      text,
  add column termos_aceitos_em  timestamptz;

-- ---------------------------------------------------------------- perfil da sessão
-- O cliente não lê auth_user_id nem e-mail por SELECT (GRANT por coluna, D-33).
create function public.fn_meu_perfil()
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'id', u.id,
    'nome', u.nome,
    'email', u.email,
    'escolaCoordenada', (select m.escola_id from public.membros_escola m
                          where m.usuario_id = u.id and m.papel = 'COORDENACAO' and m.status = 'ATIVO'
                          order by m.created_at limit 1),
    -- D-32: quem precisa de segundo fator (TOTP)
    'exigeSegundoFator', exists (select 1 from public.membros_escola m
                                  where m.usuario_id = u.id and m.papel = 'COORDENACAO' and m.status = 'ATIVO')
                      or exists (select 1 from public.vinculos_usuario_estudante v
                                  where v.usuario_id = u.id and v.papel = 'PROFISSIONAL_SAUDE'
                                    and v.status in ('ATIVO', 'PENDENTE_RESPONSAVEL')),
    'termosVersao', u.termos_versao)
  from public.usuarios u where u.auth_user_id = auth.uid()
$$;

-- Aceite dos termos ao definir a senha do convite (versão registrada, D-27/§4.1).
create function public.fn_aceitar_termos(p_versao text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_email text;
begin
  if privado.usuario_atual() is null then
    raise exception 'Entre para continuar.' using errcode = '42501';
  end if;
  if char_length(trim(coalesce(p_versao, ''))) = 0 then
    raise exception 'Versão dos termos é obrigatória.' using errcode = '22023';
  end if;
  update public.usuarios set termos_versao = trim(p_versao), termos_aceitos_em = now()
   where id = privado.usuario_atual()
  returning email into v_email;
  update public.convites set aceito_em = now()
   where email = v_email and aceito_em is null and revogado_em is null and expira_em > now();
end $$;

-- ---------------------------------------------------------------- convites
create function public.fn_preparar_convite(
  p_escola uuid, p_email text, p_papel public.papel_usuario,
  p_estudante uuid default null, p_registro_conselho text default null, p_conferido_presencialmente boolean default false)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_email text := lower(trim(coalesce(p_email, '')));
begin
  if not privado.coordena_escola(p_escola) then
    raise exception 'Só a coordenação da escola, com verificação em duas etapas, convida pessoas.' using errcode = '42501';
  end if;
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'Informe um e-mail válido.' using errcode = '22023';
  end if;
  if p_papel not in ('DOCENTE', 'RESPONSAVEL', 'PROFISSIONAL_SAUDE') then
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
  if v_email = (select u.email from public.usuarios u where u.id = privado.usuario_atual()) then
    raise exception 'Ninguém pode convidar a si mesmo.' using errcode = '42501';
  end if;
  return jsonb_build_object('autorId', privado.usuario_atual(), 'email', v_email,
    -- "já tem conta" = já aceitou um convite (definiu senha e aceitou os termos)
    'jaTemConta', exists (select 1 from public.usuarios u where u.email = v_email and u.termos_aceitos_em is not null));
end $$;

create function public.fn_registrar_convite(
  p_autor uuid, p_auth_user uuid, p_nome text, p_email text, p_escola uuid, p_papel public.papel_usuario,
  p_estudante uuid default null, p_registro_conselho text default null, p_conferido_presencialmente boolean default false)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_email text := lower(trim(p_email));
  v_usuario uuid;
  v_vinculo uuid;
begin
  -- revalida a autoria: o autor coordena a escola (sem depender do JWT do service role)
  if not exists (select 1 from public.membros_escola m where m.usuario_id = p_autor and m.escola_id = p_escola
                  and m.papel = 'COORDENACAO' and m.status = 'ATIVO') then
    raise exception 'Convite negado: autor não coordena esta escola.' using errcode = '42501';
  end if;

  select u.id into v_usuario from public.usuarios u where u.email = v_email;
  if v_usuario is null then
    insert into public.usuarios (auth_user_id, nome, email)
    values (p_auth_user, coalesce(nullif(trim(p_nome), ''), split_part(v_email, '@', 1)), v_email)
    returning id into v_usuario;
  elsif p_auth_user is not null then
    update public.usuarios set auth_user_id = coalesce(auth_user_id, p_auth_user) where id = v_usuario;
  end if;

  -- reenviar invalida o anterior (F1)
  update public.convites set revogado_em = now()
   where email = v_email and escola_id = p_escola and papel = p_papel
     and coalesce(estudante_id, '00000000-0000-0000-0000-000000000000') = coalesce(p_estudante, '00000000-0000-0000-0000-000000000000')
     and aceito_em is null and revogado_em is null;
  insert into public.convites (escola_id, email, papel, estudante_id, criado_por)
  values (p_escola, v_email, p_papel, case when p_papel = 'RESPONSAVEL' then p_estudante end, p_autor);

  if p_papel = 'DOCENTE' then
    insert into public.membros_escola (usuario_id, escola_id, papel)
    select v_usuario, p_escola, 'DOCENTE'
     where not exists (select 1 from public.membros_escola m where m.usuario_id = v_usuario and m.escola_id = p_escola
                        and m.papel = 'DOCENTE' and m.status = 'ATIVO');
  elsif p_papel = 'RESPONSAVEL' then
    insert into public.vinculos_usuario_estudante (usuario_id, estudante_id, papel, status, proposto_por, conferido_por, conferido_em)
    values (v_usuario, p_estudante, 'RESPONSAVEL', 'ATIVO', p_autor, p_autor, now())
    on conflict do nothing returning id into v_vinculo;
  elsif p_papel = 'PROFISSIONAL_SAUDE' then
    -- D-24: proposta da coordenação aguarda a família
    insert into public.vinculos_usuario_estudante (usuario_id, estudante_id, papel, status, registro_conselho, verificacao_registro, proposto_por)
    values (v_usuario, p_estudante, 'PROFISSIONAL_SAUDE', 'PENDENTE_RESPONSAVEL', trim(p_registro_conselho), 'NAO_VERIFICADO', p_autor)
    on conflict do nothing returning id into v_vinculo;
  end if;

  insert into public.auditoria (escola_id, estudante_id, evento, entidade, entidade_id, autor_id, papel_autor, detalhes)
  values (p_escola, p_estudante, 'CONVITE_EMITIDO', 'convites', null, p_autor, 'COORDENACAO', jsonb_build_object('papel', p_papel));

  return jsonb_build_object('usuarioId', v_usuario, 'vinculoId', v_vinculo);
end $$;

revoke execute on function
  public.fn_meu_perfil(), public.fn_aceitar_termos(text),
  public.fn_preparar_convite(uuid, text, public.papel_usuario, uuid, text, boolean),
  public.fn_registrar_convite(uuid, uuid, text, text, uuid, public.papel_usuario, uuid, text, boolean)
from public, anon, authenticated;
grant execute on function
  public.fn_meu_perfil(), public.fn_aceitar_termos(text),
  public.fn_preparar_convite(uuid, text, public.papel_usuario, uuid, text, boolean)
to authenticated;
grant execute on function public.fn_registrar_convite(uuid, uuid, text, text, uuid, public.papel_usuario, uuid, text, boolean) to service_role;
