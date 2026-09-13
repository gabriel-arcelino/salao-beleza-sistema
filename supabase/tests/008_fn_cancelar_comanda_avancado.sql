-- ============================================================================
-- Teste pgTAP: fn_cancelar_comanda — casos avançados
-- ============================================================================

begin;
select plan(4);

create function tmp_forcar_falha_estoque() returns trigger
language plpgsql as $$
begin
  if new.observacao = 'FORCAR_FALHA_TESTE' then
    raise exception 'Falha forçada para teste de atomicidade';
  end if;
  return new;
end;
$$;

create trigger tmp_trigger_falha_estoque
before insert on movimentacoes_estoque
for each row execute function tmp_forcar_falha_estoque();

insert into usuarios (id, salon_id, auth_user_id, nome, perfil)
values ('80000000-0000-0000-0000-00000000000c', '00000000-0000-0000-0000-000000000001', '80000000-0000-0000-0000-00000000000d', 'Admin de Teste 008', 'ADMIN');

select set_config('request.jwt.claims',
'{"sub": "80000000-0000-0000-0000-00000000000d", "role": "authenticated", "app_metadata": {"salon_id": "00000000-0000-0000-0000-000000000001"}}', true);

insert into comandas (id, salon_id, uuid_cliente, status)
values ('80000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-000000000001', gen_random_uuid(), 'ABERTA');

insert into comanda_itens (id, salon_id, comanda_id, tipo, servico_id, descricao_snapshot, quantidade, preco_unitario, total, profissional_id)
values ('80000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-000000000001', '80000000-0000-0000-0000-00000000000a', 'SERVICO', '00000000-0000-0000-0000-000000000201', 'Corte de Teste', 1, 100.00, 100.00, '00000000-0000-0000-0000-000000000101');

set local role authenticated;
select fn_fechar_comanda('80000000-0000-0000-0000-00000000000a'::uuid, '[{"metodo": "PIX", "valor_bruto": 100.00}]'::jsonb);

reset role;
insert into fechamentos_comissao (salon_id, profissional_id, competencia, status)
values ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000101', to_char(current_date - interval '2 months', 'YYYY-MM'), 'FECHADO');
update comandas set closed_at = current_date - interval '2 months' where id = '80000000-0000-0000-0000-00000000000a';
set local role authenticated;

select fn_cancelar_comanda('80000000-0000-0000-0000-00000000000a'::uuid, 'Erro de lançamento retroativo');

select results_eq(
$$ select valor from ajustes_comissao where comanda_item_id = '80000000-0000-0000-0000-00000000000b' $$,
$$ values (-40.00::numeric) $$,
'Competência fechada gera ajuste negativo = -comissao_valor_snapshot original (-40,00)'
);

select results_eq(
$$ select competencia_origem, competencia_lancamento from ajustes_comissao where comanda_item_id = '80000000-0000-0000-0000-00000000000b' $$,
$$ values (to_char(current_date - interval '2 months', 'YYYY-MM'), to_char(current_date, 'YYYY-MM')) $$,
'competencia_origem é o mês antigo; competencia_lancamento é o mês corrente'
);

reset role;
insert into comandas (id, salon_id, uuid_cliente, status)
values ('80000000-0000-0000-0000-00000000001a', '00000000-0000-0000-0000-000000000001', gen_random_uuid(), 'ABERTA');
insert into comanda_itens (id, salon_id, comanda_id, tipo, produto_id, descricao_snapshot, quantidade, preco_unitario, total, profissional_id)
values ('80000000-0000-0000-0000-00000000001b', '00000000-0000-0000-0000-000000000001', '80000000-0000-0000-0000-00000000001a', 'PRODUTO', '00000000-0000-0000-0000-000000000301', 'Produto de Teste', 1, 25.00, 25.00, '00000000-0000-0000-0000-000000000101');
set local role authenticated;
select fn_fechar_comanda('80000000-0000-0000-0000-00000000001a'::uuid, '[{"metodo": "PIX", "valor_bruto": 25.00}]'::jsonb);

select throws_like(
$$ select fn_cancelar_comanda('80000000-0000-0000-0000-00000000001a'::uuid, 'FORCAR_FALHA_TESTE') $$,
'%Falha forçada para teste de atomicidade%',
'Falha no meio da execução propaga a exceção'
);

select results_eq(
$$ select status::text, estornado from comandas c join pagamentos p on p.comanda_id = c.id where c.id = '80000000-0000-0000-0000-00000000001a' $$,
$$ values ('FINALIZADA', false) $$,
'Rollback completo: status e pagamento permanecem inalterados após a falha'
);

select * from finish();
rollback;
