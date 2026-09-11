-- ============================================================================
-- PEI Vivo — Row Level Security
-- Traduz o Quadro 7 (Matriz de permissões) do pré-projeto em política real.
-- Cada policy comenta a linha da matriz que ela implementa.
-- ============================================================================

alter table usuarios                     enable row level security;
alter table estudantes                   enable row level security;
alter table vinculos_usuario_estudante   enable row level security;
alter table consentimentos               enable row level security;
alter table ciclos_observacao            enable row level security;
alter table observacoes                  enable row level security;
alter table versoes_perfil               enable row level security;
alter table materiais_adaptados          enable row level security;
alter table desfechos                    enable row level security;
alter table notas_clinicas               enable row level security;

-- ---------------------------------------------------------------- helpers
-- Papel do usuário autenticado para um estudante específico. Retorna null
-- se não houver vínculo ativo — base de todas as políticas abaixo.
create or replace function fn_meu_papel(p_estudante_id uuid)
returns papel_usuario
language sql stable security definer as $$
  select v.papel
  from vinculos_usuario_estudante v
  join usuarios u on u.id = v.usuario_id
  where u.auth_user_id = auth.uid()
    and v.estudante_id = p_estudante_id
    and v.status = 'ATIVO'
  limit 1;
$$;

create or replace function fn_tem_consentimento_ativo(p_estudante_id uuid)
returns boolean
language sql stable security definer as $$
  select exists (
    select 1 from consentimentos
    where estudante_id = p_estudante_id and status = 'ATIVO'
  );
$$;

-- ---------------------------------------------------------------- usuarios
create policy "usuario_le_proprio_registro" on usuarios for select
  using (auth_user_id = auth.uid());

-- ---------------------------------------------------------------- estudantes
-- Qualquer papel vinculado pode ler os dados básicos do estudante.
create policy "vinculado_le_estudante" on estudantes for select
  using (fn_meu_papel(id) is not null);

-- --------------------------------------------- vinculos_usuario_estudante
-- Só a coordenação cria vínculos; o próprio usuário vê os vínculos que o
-- envolvem (para saber a que estudantes tem acesso).
create policy "coordenacao_gerencia_vinculos" on vinculos_usuario_estudante
  for all using (fn_meu_papel(estudante_id) = 'COORDENACAO');

create policy "usuario_ve_proprios_vinculos" on vinculos_usuario_estudante
  for select using (
    usuario_id in (select id from usuarios where auth_user_id = auth.uid())
  );

-- ---------------------------------------------------------------- consentimentos
-- RN01/RN08: concessão e revogação são EXCLUSIVAS do responsável legal.
create policy "responsavel_gerencia_consentimento" on consentimentos
  for all using (
    responsavel_id in (select id from usuarios where auth_user_id = auth.uid())
  );

-- Demais papéis vinculados apenas leem (para saber se podem operar).
create policy "vinculado_le_consentimento" on consentimentos for select
  using (fn_meu_papel(estudante_id) is not null);

-- ---------------------------------------------------------------- ciclos_observacao
create policy "vinculado_le_ciclo" on ciclos_observacao for select
  using (fn_meu_papel(estudante_id) is not null);

create policy "docente_cria_ciclo" on ciclos_observacao for insert
  with check (
    fn_meu_papel(estudante_id) = 'DOCENTE'
    and fn_tem_consentimento_ativo(estudante_id)   -- RN01
  );

-- ---------------------------------------------------------------- observacoes
-- Quadro 7: "Gatilhos e estratégias" — leitura e escrita para responsável,
-- docente e profissional de saúde; leitura para coordenação.
create policy "vinculado_le_observacao" on observacoes for select
  using (
    fn_meu_papel((select estudante_id from ciclos_observacao where id = ciclo_id)) is not null
  );

create policy "papel_autorizado_registra_observacao" on observacoes for insert
  with check (
    fn_meu_papel((select estudante_id from ciclos_observacao where id = ciclo_id))
      in ('DOCENTE', 'RESPONSAVEL', 'PROFISSIONAL_SAUDE')
    and autor_id in (select id from usuarios where auth_user_id = auth.uid())
  );

-- ---------------------------------------------------------------- versoes_perfil
create policy "vinculado_le_versao_perfil" on versoes_perfil for select
  using (fn_meu_papel(estudante_id) is not null);

-- RF06/RN05/RN07: só profissional de saúde valida (aprova/solicita ajuste).
create policy "profissional_valida_versao" on versoes_perfil for update
  using (fn_meu_papel(estudante_id) = 'PROFISSIONAL_SAUDE')
  with check (fn_meu_papel(estudante_id) = 'PROFISSIONAL_SAUDE');

-- ---------------------------------------------------------------- materiais_adaptados
-- RF08/RF11: docente gera e aprova/descarta.
create policy "vinculado_le_material" on materiais_adaptados for select
  using (fn_meu_papel(estudante_id) is not null);

create policy "docente_gera_material" on materiais_adaptados for insert
  with check (
    fn_meu_papel(estudante_id) = 'DOCENTE'
    and fn_tem_consentimento_ativo(estudante_id)
  );

create policy "docente_aprova_ou_descarta_material" on materiais_adaptados for update
  using (fn_meu_papel(estudante_id) = 'DOCENTE')
  with check (fn_meu_papel(estudante_id) = 'DOCENTE');

-- ---------------------------------------------------------------- desfechos
create policy "vinculado_le_desfecho" on desfechos for select
  using (
    fn_meu_papel((select estudante_id from materiais_adaptados where id = material_id)) is not null
  );

create policy "docente_registra_desfecho" on desfechos for insert
  with check (
    fn_meu_papel((select estudante_id from materiais_adaptados where id = material_id)) = 'DOCENTE'
  );

-- ---------------------------------------------------------------- notas_clinicas  ⭐
-- RN02, a regra mais defensável do projeto: SOMENTE o profissional de saúde
-- vinculado lê e escreve. Nenhuma outra role — nem coordenação — tem acesso,
-- mesmo por chamada direta à API. É esta policy que o Exemplo 3 do slide de
-- rastreabilidade testa (docente tentando ler o laudo deve receber 403).
create policy "somente_profissional_acessa_nota_clinica" on notas_clinicas
  for all using (fn_meu_papel(estudante_id) = 'PROFISSIONAL_SAUDE')
  with check (
    fn_meu_papel(estudante_id) = 'PROFISSIONAL_SAUDE'
    and profissional_id in (select id from usuarios where auth_user_id = auth.uid())
  );
