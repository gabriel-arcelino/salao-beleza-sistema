-- ============================================================================
-- Seed: dados base para desenvolvimento local
-- Roda automaticamente em todo `supabase db reset` — silencia o aviso de
-- "seed.sql não existe" e, mais importante, substitui os dados clicados
-- manualmente no navegador por algo reproduzível e versionado no Git.
--
-- UUID do salão fixado propositalmente (00000000-...-000000000001) para
-- que o passo manual do README (vincular app_metadata.salon_id do usuário)
-- sempre aponte para o mesmo valor, sem precisar copiar um UUID gerado.
-- ============================================================================

insert into saloes (id, nome) values
('00000000-0000-0000-0000-000000000001', 'Salão de Teste')
on conflict (id) do nothing;

-- config_taxas: obrigatório existir ANTES de rodar fn_fechar_comanda —
-- a RPC rejeita qualquer método de pagamento sem taxa configurada.
insert into config_taxas (salon_id, metodo, taxa_percentual) values
('00000000-0000-0000-0000-000000000001', 'DINHEIRO', 0),
('00000000-0000-0000-0000-000000000001', 'PIX', 0),
('00000000-0000-0000-0000-000000000001', 'DEBITO', 1.5),
('00000000-0000-0000-0000-000000000001', 'CREDITO', 3.5)
on conflict (salon_id, metodo) do nothing;

insert into motivos_desconto (salon_id, descricao, afeta_comissao) values
('00000000-0000-0000-0000-000000000001', 'Desconto comercial', false),
('00000000-0000-0000-0000-000000000001', 'Desconto por erro/reclamação', true)
on conflict do nothing;

insert into profissionais (id, salon_id, nome, comissao_percentual_padrao) values
('00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000001', 'Profissional de Teste', 40)
on conflict (id) do nothing;

insert into servicos (id, salon_id, nome, preco) values
('00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000001', 'Corte de Teste', 50)
on conflict (id) do nothing;

insert into produtos (id, salon_id, nome, preco_custo, preco_venda, estoque_atual) values
('00000000-0000-0000-0000-000000000301', '00000000-0000-0000-0000-000000000001', 'Produto de Teste', 10, 25, 100)
on conflict (id) do nothing;

-- O usuário ADMIN em si NÃO entra aqui: criar usuário via Auth exige o
-- fluxo do GoTrue (Authentication → Users no dashboard), não um INSERT
-- direto. Continue seguindo o passo manual do README, mas agora apontando
-- para o salon_id fixo acima em vez de um UUID gerado na hora.
