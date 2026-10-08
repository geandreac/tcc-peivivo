-- ============================================================================
-- PEI Vivo — Dados de desenvolvimento (100% fictícios) — supabase/seed.sql
-- Roda em `supabase db reset` (CI) e em `npm run db:validar` (PGlite); NUNCA em
-- `db push`. Reproduz o cenário demonstrativo A do pré-projeto (estudante
-- fictício com interesse em dinossauros), sem nenhum dado diagnóstico (D-01).
-- Modelo v3 (migrations 0003–0005): escola mínima (D-23), coordenação como
-- membro da escola, consentimento com escopos e versão do termo (D-27).
-- ============================================================================

insert into escolas (id, nome) values
  ('00000000-0000-0000-0000-000000000100', 'Escola Municipal Fictícia (dev)');

insert into usuarios (id, auth_user_id, nome, email) values
  ('00000000-0000-0000-0000-000000000001', null, 'Márcia (fictícia) — Docente', 'docente.dev@example.test'),
  ('00000000-0000-0000-0000-000000000002', null, 'Rosa (fictícia) — Responsável', 'responsavel.dev@example.test'),
  ('00000000-0000-0000-0000-000000000003', null, 'Camila (fictícia) — Prof. de Saúde', 'profissional.dev@example.test'),
  ('00000000-0000-0000-0000-000000000004', null, 'Coordenação (fictícia)', 'coordenacao.dev@example.test');

insert into membros_escola (usuario_id, escola_id, papel) values
  ('00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000100', 'COORDENACAO'),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000100', 'DOCENTE');

insert into estudantes (id, escola_id, nome, data_nascimento, turma) values
  ('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000100',
   'Estudante fictício (cenário A)', '2017-03-14', '4º ano');

insert into vinculos_usuario_estudante
  (usuario_id, estudante_id, papel, registro_conselho, verificacao_registro, conferido_por, conferido_em) values
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', 'DOCENTE', null, null, null, null),
  ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000010', 'RESPONSAVEL', null, null,
   '00000000-0000-0000-0000-000000000004', now()),
  ('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000010', 'PROFISSIONAL_SAUDE',
   'CONSELHO-FICTICIO-000', 'NAO_VERIFICADO', null, null);

insert into consentimentos (estudante_id, responsavel_id, escopos, versao_termo, status) values
  ('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000002',
   '{observacao_pedagogica,observacao_domiciliar,validacao_clinica,geracao_material}', 'v1-2026-09', 'ATIVO');

insert into ciclos_observacao (id, estudante_id, numero, data_inicio, status) values
  ('00000000-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000010', 3, current_date - 14, 'FECHADO');

insert into observacoes (ciclo_id, autor_id, papel_autor, dimensao, valor_escala, evidencia) values
  ('00000000-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000001', 'DOCENTE',
   'ATENCAO_SUSTENTADA', 'REDUZIDA', 'Perde o fio em blocos de texto acima de 5 linhas.'),
  ('00000000-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000001', 'DOCENTE',
   'COMPREENSAO_ENUNCIADOS', 'REDUZIDA', 'Trava em instruções com mais de uma etapa.'),
  ('00000000-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000002', 'RESPONSAVEL',
   'INTERESSE_MANIFESTO', 'AMPLIADA', 'Engajamento espontâneo com dinossauros.');

insert into versoes_perfil (id, estudante_id, ciclo_origem_id, numero_ciclo, parametros, status_validacao, validador_id, data_vigencia) values
  ('00000000-0000-0000-0000-000000000030', '00000000-0000-0000-0000-000000000010',
   '00000000-0000-0000-0000-000000000020', 3,
   '{"maxLinhasPorBloco": 4, "nivelVocabulario": "BASICO", "interesseAncora": "dinossauros", "formatoEnunciado": "ETAPA_UNICA", "contrasteMinimo": 7, "blocosPorMaterial": 8}'::jsonb,
   'VIGENTE', '00000000-0000-0000-0000-000000000003', now());
