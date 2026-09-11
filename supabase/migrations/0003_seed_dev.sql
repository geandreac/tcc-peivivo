-- ============================================================================
-- PEI Vivo — Dados de desenvolvimento (100% fictícios)
-- Nunca rode este arquivo em produção. Reproduz o cenário demonstrativo A
-- do pré-projeto (estudante fictício, TEA nível 1, interesse em dinossauros)
-- exclusivamente para desenvolvimento local e testes automatizados.
-- ============================================================================

insert into usuarios (id, auth_user_id, nome, email) values
  ('00000000-0000-0000-0000-000000000001', null, 'Márcia (fictícia) — Docente', 'docente.dev@example.test'),
  ('00000000-0000-0000-0000-000000000002', null, 'Rosa (fictícia) — Responsável', 'responsavel.dev@example.test'),
  ('00000000-0000-0000-0000-000000000003', null, 'Camila (fictícia) — Prof. de Saúde', 'profissional.dev@example.test'),
  ('00000000-0000-0000-0000-000000000004', null, 'Coordenação (fictícia)', 'coordenacao.dev@example.test');

insert into estudantes (id, nome, data_nascimento, turma) values
  ('00000000-0000-0000-0000-000000000010', 'Estudante fictício (cenário A)', '2017-03-14', '4º ano');

insert into vinculos_usuario_estudante (usuario_id, estudante_id, papel, registro_conselho) values
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', 'DOCENTE', null),
  ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000010', 'RESPONSAVEL', null),
  ('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000010', 'PROFISSIONAL_SAUDE', 'CREFITO-DEV-000'),
  ('00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000010', 'COORDENACAO', null);

insert into consentimentos (estudante_id, responsavel_id, escopo, status) values
  ('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000002',
   'observacao_pedagogica, observacao_domiciliar, geracao_material', 'ATIVO');

insert into ciclos_observacao (id, estudante_id, numero, data_inicio, status) values
  ('00000000-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000010', 3, current_date - 14, 'FECHADO');

insert into observacoes (ciclo_id, autor_id, dimensao, valor_escala, evidencia) values
  ('00000000-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000001',
   'ATENCAO_SUSTENTADA', 'REDUZIDA', 'Perde o fio em blocos de texto acima de 5 linhas.'),
  ('00000000-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000001',
   'COMPREENSAO_ENUNCIADOS', 'REDUZIDA', 'Trava em instruções com mais de uma etapa.'),
  ('00000000-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000002',
   'INTERESSE_MANIFESTO', 'AMPLIADA', 'Engajamento espontâneo com dinossauros.');

insert into versoes_perfil (id, estudante_id, ciclo_origem_id, numero_ciclo, parametros, status_validacao, validador_id, data_vigencia) values
  ('00000000-0000-0000-0000-000000000030', '00000000-0000-0000-0000-000000000010',
   '00000000-0000-0000-0000-000000000020', 3,
   '{"maxLinhasPorBloco": 4, "nivelVocabulario": "BASICO", "interesseAncora": "dinossauros", "formatoEnunciado": "ETAPA_UNICA", "contrasteMinimo": 7}'::jsonb,
   'VIGENTE', '00000000-0000-0000-0000-000000000003', now());
