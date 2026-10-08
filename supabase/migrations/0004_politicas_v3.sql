-- ============================================================================
-- PEI Vivo — 0004 · Políticas v3 (matriz D-34) e RPCs de escrita (D-20)
-- Substitui por inteiro as políticas de 0002. Motivo e evidência:
-- docs/reformulacao/AUDITORIA.md §3 (25 de 31 ataques passavam).
--
-- Princípios:
--  1. Nenhuma policy `for all`; toda escrita tem `with check` próprio.
--  2. Tabelas que definem o acesso de outra pessoa (estudantes, vínculos,
--     consentimentos, versões de perfil, materiais, notas clínicas) não recebem
--     escrita direta do cliente: só RPC `security definer` (aqui) ou Edge Function.
--  3. Helpers vivem no schema `privado`, que o PostgREST não expõe (fecha o
--     oráculo S-30), com `search_path = ''` (S-29).
--  4. PROFISSIONAL_SAUDE e COORDENACAO só operam com sessão aal2 (TOTP, D-32).
--  5. Negação → SQLSTATE 42501 (HTTP 403); conflito → PT409 (HTTP 409);
--     dado inválido → 22023 (HTTP 400).
-- ============================================================================

-- ---------------------------------------------------------------- limpa 0002
drop policy if exists "usuario_le_proprio_registro"               on usuarios;
drop policy if exists "vinculado_le_estudante"                    on estudantes;
drop policy if exists "coordenacao_gerencia_vinculos"             on vinculos_usuario_estudante;
drop policy if exists "usuario_ve_proprios_vinculos"              on vinculos_usuario_estudante;
drop policy if exists "responsavel_gerencia_consentimento"        on consentimentos;
drop policy if exists "vinculado_le_consentimento"                on consentimentos;
drop policy if exists "vinculado_le_ciclo"                        on ciclos_observacao;
drop policy if exists "docente_cria_ciclo"                        on ciclos_observacao;
drop policy if exists "vinculado_le_observacao"                   on observacoes;
drop policy if exists "papel_autorizado_registra_observacao"      on observacoes;
drop policy if exists "vinculado_le_versao_perfil"                on versoes_perfil;
drop policy if exists "profissional_valida_versao"                on versoes_perfil;
drop policy if exists "vinculado_le_material"                     on materiais_adaptados;
drop policy if exists "docente_gera_material"                     on materiais_adaptados;
drop policy if exists "docente_aprova_ou_descarta_material"       on materiais_adaptados;
drop policy if exists "vinculado_le_desfecho"                     on desfechos;
drop policy if exists "docente_registra_desfecho"                 on desfechos;
drop policy if exists "somente_profissional_acessa_nota_clinica"  on notas_clinicas;
drop function if exists fn_meu_papel(uuid);
drop function if exists fn_tem_consentimento_ativo(uuid);

-- ---------------------------------------------------------------- privilégios base
-- Defesa em profundidade: anon não toca em nada; authenticated só no que é concedido abaixo.
revoke all on all tables in schema public from anon, authenticated;
revoke execute on all functions in schema public from public, anon, authenticated;

create schema if not exists privado;
revoke all on schema privado from public;
grant usage on schema privado to authenticated;
alter default privileges in schema privado revoke execute on functions from public;

-- ---------------------------------------------------------------- helpers (privado)
create function privado.usuario_atual() returns uuid
language sql stable security definer set search_path = '' as $$
  select u.id from public.usuarios u where u.auth_user_id = auth.uid()
$$;

-- D-32: sessão com segundo fator (TOTP). Claim `aal` do JWT do Supabase Auth.
create function privado.aal2() returns boolean
language sql stable set search_path = '' as $$
  select coalesce(auth.jwt() ->> 'aal', '') = 'aal2'
$$;

-- D-21: no máximo um vínculo ATIVO por pessoa e estudante (uq_vinculo_vigente),
-- então não há escolha arbitrária (bug D1 / S-09).
create function privado.papel_em(p_estudante uuid) returns public.papel_usuario
language sql stable security definer set search_path = '' as $$
  select v.papel from public.vinculos_usuario_estudante v
   where v.usuario_id = privado.usuario_atual()
     and v.estudante_id = p_estudante
     and v.status = 'ATIVO'
$$;

create function privado.tem_papel(p_estudante uuid, variadic p_papeis public.papel_usuario[])
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(privado.papel_em(p_estudante) = any (p_papeis), false)
    and (privado.papel_em(p_estudante) <> 'PROFISSIONAL_SAUDE' or privado.aal2())
$$;

create function privado.coordena_escola(p_escola uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select privado.aal2() and exists (
    select 1 from public.membros_escola m
     where m.usuario_id = privado.usuario_atual() and m.escola_id = p_escola
       and m.papel = 'COORDENACAO' and m.status = 'ATIVO')
$$;

create function privado.coordena_estudante(p_estudante uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select privado.coordena_escola((select e.escola_id from public.estudantes e where e.id = p_estudante))
$$;

create function privado.consentimento_ativo(p_estudante uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.consentimentos c where c.estudante_id = p_estudante and c.status = 'ATIVO')
$$;

create function privado.tem_escopo(p_estudante uuid, p_escopo public.escopo_consentimento)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.consentimentos c
                  where c.estudante_id = p_estudante and c.status = 'ATIVO' and p_escopo = any (c.escopos))
$$;

-- Vê o cadastro básico do estudante e a situação do consentimento.
create function privado.pode_ver_estudante(p_estudante uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select privado.tem_papel(p_estudante, 'RESPONSAVEL', 'DOCENTE', 'PROFISSIONAL_SAUDE')
      or privado.coordena_estudante(p_estudante)
$$;

-- D-11: dados de aprendizagem. Responsável e coordenação sempre; docente e
-- profissional só com consentimento ATIVO (RN01/RN08).
create function privado.pode_ler_dados(p_estudante uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select privado.tem_papel(p_estudante, 'RESPONSAVEL')
      or privado.coordena_estudante(p_estudante)
      or (privado.tem_papel(p_estudante, 'DOCENTE', 'PROFISSIONAL_SAUDE')
          and privado.consentimento_ativo(p_estudante))
$$;

-- Quem pode ver o nome de outro usuário: ele mesmo; a coordenação da escola em
-- que ele atua; o responsável de um estudante a que ele está vinculado
-- ("quem tem acesso ao meu filho").
create function privado.pode_ver_usuario(p_usuario uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select p_usuario = privado.usuario_atual()
      or exists (select 1 from public.membros_escola m
                  where m.usuario_id = p_usuario and privado.coordena_escola(m.escola_id))
      or exists (select 1 from public.vinculos_usuario_estudante v
                  where v.usuario_id = p_usuario
                    and (privado.coordena_estudante(v.estudante_id)
                         or privado.tem_papel(v.estudante_id, 'RESPONSAVEL')))
$$;

create function privado.parametros_validos(p jsonb) returns boolean
language sql immutable set search_path = '' as $$
  select jsonb_typeof(p) = 'object'
     and p ?& array['maxLinhasPorBloco','nivelVocabulario','interesseAncora','formatoEnunciado','contrasteMinimo','blocosPorMaterial']
     and jsonb_typeof(p->'maxLinhasPorBloco') = 'number' and (p->>'maxLinhasPorBloco')::numeric between 1 and 20
     and p->>'nivelVocabulario' in ('BASICO','INTERMEDIARIO','ORIGINAL')
     and p->>'formatoEnunciado' in ('ETAPA_UNICA','MULTIPLAS_ETAPAS')
     and jsonb_typeof(p->'contrasteMinimo') = 'number' and (p->>'contrasteMinimo')::numeric in (4.5, 7)
     and jsonb_typeof(p->'blocosPorMaterial') = 'number' and (p->>'blocosPorMaterial')::numeric between 1 and 30
     and (jsonb_typeof(p->'interesseAncora') = 'null'
          or (jsonb_typeof(p->'interesseAncora') = 'string' and char_length(p->>'interesseAncora') <= 60))
$$;

grant execute on all functions in schema privado to authenticated;

-- ---------------------------------------------------------------- usuarios
grant select (id, nome, created_at) on usuarios to authenticated; -- e-mail nunca exposto a terceiros
create policy usuarios_select on usuarios for select to authenticated
  using (privado.pode_ver_usuario(id));

-- ---------------------------------------------------------------- escolas / membros
grant select on escolas to authenticated;
create policy escolas_select on escolas for select to authenticated
  using (
    exists (select 1 from membros_escola m
             where m.escola_id = escolas.id and m.usuario_id = privado.usuario_atual() and m.status = 'ATIVO')
    or exists (select 1 from estudantes e where e.escola_id = escolas.id and privado.pode_ver_estudante(e.id))
  );

grant select on membros_escola to authenticated;
create policy membros_select on membros_escola for select to authenticated
  using (usuario_id = privado.usuario_atual() or privado.coordena_escola(escola_id));

-- convites: nenhum acesso direto (Edge Function `convidar`, service role).

-- ---------------------------------------------------------------- estudantes (D-33)
-- GRANT por coluna: `laudo_apresentado_em` não é legível por SELECT (RLS não
-- protege coluna, D7); quem pode lê-la usa fn_laudo_apresentado_em().
grant select (id, nome, data_nascimento, turma, escola_id, created_at) on estudantes to authenticated;
grant update (nome, data_nascimento, turma, laudo_apresentado_em) on estudantes to authenticated;
create policy estudantes_select on estudantes for select to authenticated
  using (privado.pode_ver_estudante(id));
create policy estudantes_update_coordenacao on estudantes for update to authenticated
  using (privado.coordena_estudante(id))
  with check (privado.coordena_estudante(id));

-- ---------------------------------------------------------------- vínculos
grant select on vinculos_usuario_estudante to authenticated;
create policy vinculos_select on vinculos_usuario_estudante for select to authenticated
  using (
    usuario_id = privado.usuario_atual()
    or privado.tem_papel(estudante_id, 'RESPONSAVEL')
    or privado.coordena_estudante(estudante_id)
  );

-- ---------------------------------------------------------------- consentimentos
-- user_agent fica fora do SELECT (minimização); escrita só por RPC (S-04…S-08).
grant select (id, estudante_id, responsavel_id, data_concessao, escopos, versao_termo, status,
              data_revogacao, revogado_por) on consentimentos to authenticated;
create policy consentimentos_select on consentimentos for select to authenticated
  using (privado.pode_ver_estudante(estudante_id));

-- ---------------------------------------------------------------- ciclos
-- Número, status e data do ciclo são do servidor, não do cliente.
create function privado.tg_ciclo_novo() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is not null then
    new.numero := coalesce((select max(c.numero) from public.ciclos_observacao c
                             where c.estudante_id = new.estudante_id), 0) + 1;
    new.status := 'ABERTO';
    new.data_inicio := current_date;
    new.data_fim := null;
  end if;
  return new;
end $$;
create trigger tg_ciclo_novo before insert on ciclos_observacao
  for each row execute function privado.tg_ciclo_novo();

grant select on ciclos_observacao to authenticated;
grant insert (estudante_id) on ciclos_observacao to authenticated;
create policy ciclos_select on ciclos_observacao for select to authenticated
  using (privado.pode_ler_dados(estudante_id));
create policy ciclos_insert_docente on ciclos_observacao for insert to authenticated
  with check (
    status = 'ABERTO'
    and privado.tem_papel(estudante_id, 'DOCENTE')
    and privado.tem_escopo(estudante_id, 'observacao_pedagogica')
  );

-- ---------------------------------------------------------------- observações
create function privado.pode_observar(p_ciclo uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.ciclos_observacao c
     where c.id = p_ciclo and c.status = 'ABERTO'
       and (   (privado.tem_papel(c.estudante_id, 'DOCENTE')
                and privado.tem_escopo(c.estudante_id, 'observacao_pedagogica'))
            or (privado.tem_papel(c.estudante_id, 'RESPONSAVEL')
                and privado.tem_escopo(c.estudante_id, 'observacao_domiciliar'))
            or (privado.tem_papel(c.estudante_id, 'PROFISSIONAL_SAUDE')
                and privado.tem_escopo(c.estudante_id, 'validacao_clinica'))))
$$;
grant execute on function privado.pode_observar(uuid) to authenticated;

-- Autoria e papel nunca vêm do cliente (D-04).
create function privado.tg_observacao_autoria() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is not null then
    new.autor_id := privado.usuario_atual();
    new.papel_autor := privado.papel_em((select c.estudante_id from public.ciclos_observacao c where c.id = new.ciclo_id));
  end if;
  new.data_registro := now();
  return new;
end $$;
create trigger tg_observacao_autoria before insert on observacoes
  for each row execute function privado.tg_observacao_autoria();

grant select on observacoes to authenticated;
grant insert (ciclo_id, dimensao, valor_escala, evidencia) on observacoes to authenticated;
create policy observacoes_select on observacoes for select to authenticated
  using (privado.pode_ler_dados((select c.estudante_id from ciclos_observacao c where c.id = ciclo_id)));
create policy observacoes_insert on observacoes for insert to authenticated
  with check (autor_id = privado.usuario_atual() and privado.pode_observar(ciclo_id));

-- ---------------------------------------------------------------- versões de perfil (D-35)
-- Uma única VIGENTE por estudante (S-25, M-01); parâmetros imutáveis (S-24).
create unique index uq_versao_vigente on versoes_perfil (estudante_id) where status_validacao = 'VIGENTE';
alter table versoes_perfil add constraint ck_versao_parametros check (privado.parametros_validos(parametros)) not valid;

create function privado.tg_versao_imutavel() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.parametros is distinct from old.parametros
     or new.estudante_id is distinct from old.estudante_id
     or new.numero_ciclo is distinct from old.numero_ciclo
     or new.origem is distinct from old.origem then
    raise exception 'Parâmetros de uma versão de perfil são imutáveis; um ajuste cria nova versão (D-35).'
      using errcode = 'PT409';
  end if;
  return new;
end $$;
create trigger tg_versao_imutavel before update on versoes_perfil
  for each row execute function privado.tg_versao_imutavel();

grant select on versoes_perfil to authenticated;
create policy versoes_select on versoes_perfil for select to authenticated
  using (privado.pode_ler_dados(estudante_id));

-- ---------------------------------------------------------------- materiais (D-34, D-37)
-- Rascunho é visível só ao docente autor (S-18/S-19). Inserção só pela Edge
-- Function gerar-material; decisão só por fn_decidir_material.
create function privado.tg_material_integridade() returns trigger
language plpgsql set search_path = '' as $$
declare
  v public.versoes_perfil;
begin
  select * into v from public.versoes_perfil where id = new.versao_perfil_id;
  if v.estudante_id is distinct from new.estudante_id then
    raise exception 'A versão de perfil pertence a outro estudante.' using errcode = '22023';     -- S-22
  end if;
  if tg_op = 'INSERT' then
    if v.status_validacao <> 'VIGENTE' then
      raise exception 'Material só é gerado com a versão de perfil VIGENTE (RN05).' using errcode = 'PT409'; -- S-21
    end if;
    if new.status_aprovacao <> 'RASCUNHO' then
      raise exception 'Material nasce como rascunho (RN04).' using errcode = '22023';
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
create trigger tg_material_integridade before insert or update on materiais_adaptados
  for each row execute function privado.tg_material_integridade();

grant select on materiais_adaptados to authenticated;
create policy materiais_select on materiais_adaptados for select to authenticated
  using (
    privado.pode_ler_dados(estudante_id)
    and (status_aprovacao = 'APROVADO'
         or (docente_id = privado.usuario_atual() and privado.tem_papel(estudante_id, 'DOCENTE')))
  );

-- ---------------------------------------------------------------- desfechos
create function privado.pode_registrar_desfecho(p_material uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.materiais_adaptados m
     where m.id = p_material and m.status_aprovacao = 'APROVADO'          -- S-23
       and m.docente_id = privado.usuario_atual()
       and privado.tem_papel(m.estudante_id, 'DOCENTE')
       and privado.consentimento_ativo(m.estudante_id))
$$;
grant execute on function privado.pode_registrar_desfecho(uuid) to authenticated;

grant select on desfechos to authenticated;
grant insert (material_id, resultado, observacao_livre) on desfechos to authenticated;
create policy desfechos_select on desfechos for select to authenticated
  using (exists (select 1 from materiais_adaptados m
                  where m.id = material_id and m.status_aprovacao = 'APROVADO'
                    and privado.pode_ler_dados(m.estudante_id)));
create policy desfechos_insert on desfechos for insert to authenticated
  with check (privado.pode_registrar_desfecho(material_id));

-- ---------------------------------------------------------------- notas clínicas
-- Nenhum acesso direto: leitura e escrita só pelas RPCs auditadas de 0005 (D-30).
revoke all on notas_clinicas from authenticated;

-- ============================================================================
-- RPCs (schema public, expostas pelo PostgREST). Todas `security definer`,
-- `search_path = ''`, e validam a regra de negócio antes de escrever.
-- ============================================================================

create function public.fn_meu_papel(p_estudante uuid) returns public.papel_usuario
language sql stable security definer set search_path = '' as $$
  select privado.papel_em(p_estudante)
$$;

create function public.fn_tem_profissional(p_estudante uuid) returns boolean
language plpgsql stable security definer set search_path = '' as $$
begin
  if not privado.pode_ver_estudante(p_estudante) then
    raise exception 'Você não está vinculado a este estudante.' using errcode = '42501';
  end if;
  return exists (select 1 from public.vinculos_usuario_estudante v
                  where v.estudante_id = p_estudante and v.papel = 'PROFISSIONAL_SAUDE' and v.status = 'ATIVO');
end $$;

create function public.fn_laudo_apresentado_em(p_estudante uuid) returns date
language plpgsql stable security definer set search_path = '' as $$
begin
  if not (privado.tem_papel(p_estudante, 'RESPONSAVEL', 'PROFISSIONAL_SAUDE')
          or privado.coordena_estudante(p_estudante)) then
    raise exception 'Informação não disponível para o seu papel (D-01).' using errcode = '42501';
  end if;
  return (select e.laudo_apresentado_em from public.estudantes e where e.id = p_estudante);
end $$;

-- RF01 / D-23: única porta de entrada de um estudante (S-15).
create function public.fn_cadastrar_estudante(
  p_escola uuid, p_nome text, p_data_nascimento date, p_turma text default null, p_laudo_apresentado_em date default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
begin
  if not privado.coordena_escola(p_escola) then
    raise exception 'Só a coordenação da escola, com verificação em duas etapas, cadastra estudantes.' using errcode = '42501';
  end if;
  if char_length(trim(coalesce(p_nome, ''))) < 3 then
    raise exception 'Informe o nome do estudante (mínimo 3 letras).' using errcode = '22023';
  end if;
  if p_data_nascimento is null or p_data_nascimento > current_date then
    raise exception 'Informe uma data de nascimento válida, no passado.' using errcode = '22023';
  end if;
  insert into public.estudantes (escola_id, nome, data_nascimento, turma, laudo_apresentado_em)
  values (p_escola, trim(p_nome), p_data_nascimento, nullif(trim(p_turma), ''), p_laudo_apresentado_em)
  returning id into v_id;
  return v_id;
end $$;

-- D-24/D-25: proposta de vínculo. Ninguém vincula a si mesmo (S-11).
-- DOCENTE: coordenação; precisa ser membro DOCENTE da escola → ATIVO.
-- RESPONSAVEL: coordenação, com conferência presencial declarada → ATIVO.
-- PROFISSIONAL_SAUDE: coordenação → PENDENTE_RESPONSAVEL; responsável → ATIVO (já é a confirmação).
create function public.fn_propor_vinculo(
  p_estudante uuid, p_usuario uuid, p_papel public.papel_usuario,
  p_registro_conselho text default null, p_conferido_presencialmente boolean default false)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_eu uuid := privado.usuario_atual();
  v_coord boolean := privado.coordena_estudante(p_estudante);
  v_resp boolean := privado.tem_papel(p_estudante, 'RESPONSAVEL');
  v_status public.status_vinculo;
  v_id uuid;
begin
  if v_eu is null or p_usuario = v_eu then
    raise exception 'Ninguém pode criar vínculo para si mesmo.' using errcode = '42501';
  end if;
  if not exists (select 1 from public.usuarios u where u.id = p_usuario) then
    raise exception 'Pessoa não encontrada.' using errcode = '22023';
  end if;
  if p_papel = 'DOCENTE' then
    if not v_coord then raise exception 'Só a coordenação vincula docentes.' using errcode = '42501'; end if;
    if not exists (select 1 from public.membros_escola m join public.estudantes e on e.escola_id = m.escola_id
                    where e.id = p_estudante and m.usuario_id = p_usuario and m.papel = 'DOCENTE' and m.status = 'ATIVO') then
      raise exception 'O docente precisa ser membro da escola (aceitar o convite) antes do vínculo.' using errcode = 'PT409';
    end if;
    v_status := 'ATIVO';
  elsif p_papel = 'RESPONSAVEL' then
    if not v_coord then raise exception 'Só a coordenação vincula responsáveis.' using errcode = '42501'; end if;
    if not p_conferido_presencialmente then
      raise exception 'Confirme que o vínculo legal foi conferido presencialmente com documento (D-25).' using errcode = '22023';
    end if;
    v_status := 'ATIVO';
  elsif p_papel = 'PROFISSIONAL_SAUDE' then
    if not (v_coord or v_resp) then
      raise exception 'Só a coordenação ou o responsável propõem profissional de saúde.' using errcode = '42501';
    end if;
    if char_length(trim(coalesce(p_registro_conselho, ''))) = 0 then
      raise exception 'Informe o registro no conselho profissional.' using errcode = '22023';
    end if;
    v_status := (case when v_resp then 'ATIVO' else 'PENDENTE_RESPONSAVEL' end)::public.status_vinculo;
  else
    raise exception 'Papel inválido para vínculo com estudante.' using errcode = '22023';
  end if;

  begin
    insert into public.vinculos_usuario_estudante
      (usuario_id, estudante_id, papel, status, registro_conselho, verificacao_registro,
       proposto_por, confirmado_por, confirmado_em, conferido_por, conferido_em)
    values
      (p_usuario, p_estudante, p_papel, v_status,
       case when p_papel = 'PROFISSIONAL_SAUDE' then trim(p_registro_conselho) end,
       case when p_papel = 'PROFISSIONAL_SAUDE' then 'NAO_VERIFICADO'::public.verificacao_registro end,
       v_eu,
       case when v_status = 'ATIVO' and p_papel = 'PROFISSIONAL_SAUDE' then v_eu end,
       case when v_status = 'ATIVO' and p_papel = 'PROFISSIONAL_SAUDE' then now() end,
       case when p_papel = 'RESPONSAVEL' then v_eu end,
       case when p_papel = 'RESPONSAVEL' then now() end)
    returning id into v_id;
  exception when unique_violation then
    raise exception 'Esta pessoa já tem um vínculo com o estudante (D-21).' using errcode = 'PT409';
  end;
  return v_id;
end $$;

-- D-24: o responsável confirma ou recusa o profissional proposto.
create function public.fn_confirmar_vinculo(p_vinculo uuid, p_aceitar boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v public.vinculos_usuario_estudante;
begin
  select * into v from public.vinculos_usuario_estudante where id = p_vinculo;
  if v.id is null or not privado.tem_papel(v.estudante_id, 'RESPONSAVEL') then
    raise exception 'Só o responsável do estudante confirma o profissional.' using errcode = '42501';
  end if;
  if v.status <> 'PENDENTE_RESPONSAVEL' then
    raise exception 'Este vínculo não está aguardando confirmação.' using errcode = 'PT409';
  end if;
  update public.vinculos_usuario_estudante
     set status = case when p_aceitar then 'ATIVO'::public.status_vinculo else 'RECUSADO'::public.status_vinculo end,
         confirmado_por = privado.usuario_atual(), confirmado_em = now()
   where id = p_vinculo;
end $$;

-- Encerramento: coordenação encerra docente/profissional (nunca o responsável, S-14);
-- responsável encerra profissional; qualquer pessoa encerra o próprio vínculo não-responsável.
create function public.fn_encerrar_vinculo(p_vinculo uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v public.vinculos_usuario_estudante;
  v_eu uuid := privado.usuario_atual();
begin
  select * into v from public.vinculos_usuario_estudante where id = p_vinculo;
  if v.id is null then
    raise exception 'Vínculo não encontrado.' using errcode = '42501';
  end if;
  if not (
       (v.papel in ('DOCENTE', 'PROFISSIONAL_SAUDE') and privado.coordena_estudante(v.estudante_id))
    or (v.papel = 'PROFISSIONAL_SAUDE' and privado.tem_papel(v.estudante_id, 'RESPONSAVEL'))
    or (v.papel <> 'RESPONSAVEL' and v.usuario_id = v_eu)) then
    raise exception 'Seu papel não permite encerrar este vínculo.' using errcode = '42501';
  end if;
  if v.status in ('ENCERRADO', 'RECUSADO') then
    raise exception 'Este vínculo já está encerrado.' using errcode = 'PT409';
  end if;
  update public.vinculos_usuario_estudante
     set status = 'ENCERRADO', encerrado_por = v_eu, encerrado_em = now()
   where id = p_vinculo;
end $$;

-- D-24: conferência manual do registro no conselho, pela coordenação.
create function public.fn_verificar_registro(p_vinculo uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v public.vinculos_usuario_estudante;
begin
  select * into v from public.vinculos_usuario_estudante where id = p_vinculo;
  if v.id is null or v.papel <> 'PROFISSIONAL_SAUDE' or not privado.coordena_estudante(v.estudante_id) then
    raise exception 'Só a coordenação verifica o registro de um profissional da escola.' using errcode = '42501';
  end if;
  update public.vinculos_usuario_estudante
     set verificacao_registro = 'VERIFICADO', verificado_por = privado.usuario_atual(), verificado_em = now()
   where id = p_vinculo;
end $$;

-- D-27 / RN01: concessão só pelo responsável ATIVO do estudante.
create function public.fn_conceder_consentimento(
  p_estudante uuid, p_escopos public.escopo_consentimento[], p_versao_termo text, p_user_agent text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
begin
  if not privado.tem_papel(p_estudante, 'RESPONSAVEL') then
    raise exception 'Só o responsável legal do estudante concede o consentimento (RN01).' using errcode = '42501';
  end if;
  if coalesce(cardinality(p_escopos), 0) = 0 then
    raise exception 'Escolha ao menos um escopo.' using errcode = '22023';
  end if;
  if char_length(trim(coalesce(p_versao_termo, ''))) = 0 then
    raise exception 'Versão do termo é obrigatória.' using errcode = '22023';
  end if;
  begin
    insert into public.consentimentos (estudante_id, responsavel_id, escopos, versao_termo, status, user_agent)
    values (p_estudante, privado.usuario_atual(), array(select distinct unnest(p_escopos)), trim(p_versao_termo),
            'ATIVO', left(p_user_agent, 300))
    returning id into v_id;
  exception when unique_violation then
    raise exception 'Já existe um consentimento ativo.' using errcode = 'PT409';
  end;
  return v_id;
end $$;

-- D-25 / RN08: qualquer responsável ativo revoga, com efeito imediato. Não apaga.
create function public.fn_revogar_consentimento(p_estudante uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
begin
  if not privado.tem_papel(p_estudante, 'RESPONSAVEL') then
    raise exception 'Só o responsável legal revoga o consentimento (RN08).' using errcode = '42501';
  end if;
  update public.consentimentos
     set status = 'REVOGADO', data_revogacao = now(), revogado_por = privado.usuario_atual()
   where estudante_id = p_estudante and status = 'ATIVO'
  returning id into v_id;
  if v_id is null then
    raise exception 'Não há consentimento ativo para revogar.' using errcode = 'PT409';
  end if;
  return v_id;
end $$;

-- RF07 / RN05 / RN07 / D-35: decisão do profissional sobre o CONJUNTO de parâmetros.
-- APROVAR → VIGENTE (anterior SUBSTITUIDA); REVISAO → EM_REVISAO + justificativa;
-- AJUSTAR → nova versão AJUSTE_PROFISSIONAL VIGENTE + justificativa (proposta SUBSTITUIDA).
create function public.fn_validar_versao(
  p_versao uuid, p_decisao text, p_justificativa text default null, p_parametros jsonb default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v public.versoes_perfil;
  v_vigente public.versoes_perfil;
  v_eu uuid := privado.usuario_atual();
  v_nova uuid;
begin
  select * into v from public.versoes_perfil where id = p_versao for update;
  if v.id is null or not privado.tem_papel(v.estudante_id, 'PROFISSIONAL_SAUDE') then
    raise exception 'Só o profissional de saúde vinculado, com verificação em duas etapas, valida parâmetros.' using errcode = '42501';
  end if;
  if not privado.tem_escopo(v.estudante_id, 'validacao_clinica') then
    raise exception 'Sem consentimento ativo para validação clínica (RN01/RN08).' using errcode = '42501';
  end if;
  if v.status_validacao <> 'PENDENTE' then
    raise exception 'Só versões pendentes podem ser decididas (expiradas não voltam, RN05).' using errcode = 'PT409';
  end if;
  select * into v_vigente from public.versoes_perfil
   where estudante_id = v.estudante_id and status_validacao = 'VIGENTE' for update;
  if v_vigente.id is not null and v_vigente.numero_ciclo >= v.numero_ciclo then
    raise exception 'Já há uma versão vigente de ciclo igual ou mais recente.' using errcode = 'PT409';
  end if;

  if p_decisao = 'APROVAR' then
    update public.versoes_perfil set status_validacao = 'SUBSTITUIDA' where id = v_vigente.id;
    update public.versoes_perfil
       set status_validacao = 'VIGENTE', validador_id = v_eu, data_vigencia = now(), justificativa = null
     where id = v.id;
    return v.id;
  elsif p_decisao = 'REVISAO' then
    if char_length(trim(coalesce(p_justificativa, ''))) = 0 then
      raise exception 'Explique ao docente o que precisa ser revisto.' using errcode = '22023';
    end if;
    update public.versoes_perfil set status_validacao = 'EM_REVISAO', validador_id = v_eu, justificativa = trim(p_justificativa)
     where id = v.id;
    return v.id;
  elsif p_decisao = 'AJUSTAR' then
    if char_length(trim(coalesce(p_justificativa, ''))) = 0 then
      raise exception 'Justifique o ajuste.' using errcode = '22023';
    end if;
    if not privado.parametros_validos(p_parametros) then
      raise exception 'Parâmetros ajustados inválidos.' using errcode = '22023';
    end if;
    update public.versoes_perfil set status_validacao = 'SUBSTITUIDA' where id in (v_vigente.id, v.id);
    insert into public.versoes_perfil
      (estudante_id, ciclo_origem_id, numero_ciclo, parametros, status_validacao, validador_id,
       data_vigencia, origem, versao_anterior_id, justificativa)
    values
      (v.estudante_id, v.ciclo_origem_id, v.numero_ciclo, p_parametros, 'VIGENTE', v_eu,
       now(), 'AJUSTE_PROFISSIONAL', v.id, trim(p_justificativa))
    returning id into v_nova;
    return v_nova;
  else
    raise exception 'Decisão inválida: use APROVAR, REVISAO ou AJUSTAR.' using errcode = '22023';
  end if;
end $$;

-- RN04 / RN08: só o docente autor decide o próprio rascunho; aprovar exige consentimento.
create function public.fn_decidir_material(p_material uuid, p_decisao text, p_texto_revisado text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare
  m public.materiais_adaptados;
begin
  select * into m from public.materiais_adaptados where id = p_material for update;
  if m.id is null or m.docente_id is distinct from privado.usuario_atual()
     or not privado.tem_papel(m.estudante_id, 'DOCENTE') then
    raise exception 'Só o docente que gerou o material decide sobre ele.' using errcode = '42501';   -- S-19
  end if;
  if m.status_aprovacao <> 'RASCUNHO' then
    raise exception 'Só rascunhos podem ser aprovados ou descartados.' using errcode = 'PT409';
  end if;
  if p_decisao = 'APROVAR' then
    if not privado.tem_escopo(m.estudante_id, 'geracao_material') then
      raise exception 'A família retirou a autorização; este rascunho não pode ser usado (RN08).' using errcode = '42501'; -- S-28
    end if;
    update public.materiais_adaptados
       set status_aprovacao = 'APROVADO', texto_revisado = nullif(trim(p_texto_revisado), ''), decidido_em = now()
     where id = p_material;
  elsif p_decisao = 'DESCARTAR' then
    update public.materiais_adaptados set status_aprovacao = 'DESCARTADO', decidido_em = now() where id = p_material;
  else
    raise exception 'Decisão inválida: use APROVAR ou DESCARTAR.' using errcode = '22023';
  end if;
end $$;

grant execute on function
  public.fn_meu_papel(uuid),
  public.fn_tem_profissional(uuid),
  public.fn_laudo_apresentado_em(uuid),
  public.fn_cadastrar_estudante(uuid, text, date, text, date),
  public.fn_propor_vinculo(uuid, uuid, public.papel_usuario, text, boolean),
  public.fn_confirmar_vinculo(uuid, boolean),
  public.fn_encerrar_vinculo(uuid),
  public.fn_verificar_registro(uuid),
  public.fn_conceder_consentimento(uuid, public.escopo_consentimento[], text, text),
  public.fn_revogar_consentimento(uuid),
  public.fn_validar_versao(uuid, text, text, jsonb),
  public.fn_decidir_material(uuid, text, text)
to authenticated;
