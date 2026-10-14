-- 0009 · aviso "profissional aguardando confirmação" resolvido
--
-- Quando o responsável permite ou recusa o profissional proposto, o aviso
-- PROFISSIONAL_AGUARDANDO_CONFIRMACAO (criado por tg_evento_vinculo, 0005)
-- deixa de ser "novo" para os responsáveis daquele estudante — desde que não
-- reste outra proposta pendente para ele. Só marca lida_em; não apaga nada.
-- Gatilho separado: 0005 continua como está.

create function privado.tg_resolver_aviso_vinculo() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if old.status = 'PENDENTE_RESPONSAVEL' and new.status <> 'PENDENTE_RESPONSAVEL'
     and not exists (select 1 from public.vinculos_usuario_estudante v
                      where v.estudante_id = new.estudante_id and v.status = 'PENDENTE_RESPONSAVEL') then
    update public.notificacoes
       set lida_em = now()
     where estudante_id = new.estudante_id
       and tipo = 'PROFISSIONAL_AGUARDANDO_CONFIRMACAO'
       and lida_em is null;
  end if;
  return new;
end $$;

create trigger tg_resolver_aviso_vinculo after update of status on vinculos_usuario_estudante
  for each row execute function privado.tg_resolver_aviso_vinculo();
