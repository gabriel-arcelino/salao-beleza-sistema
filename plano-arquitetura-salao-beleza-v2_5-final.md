# Documento de Arquitetura e Especificação (v2.5)

## Sistema de Gestão para Salão de Beleza

**Versão:** 2.5  
**Status:** Arquitetura atual — documento vigente a partir de 17/09/2026  
**Data de referência:** 17/09/2026  
**Plataformas:** Web responsiva / Computador / Celular  
**Público-alvo:** Salões de beleza e clínicas de estética de pequeno e médio porte

> **Regra de leitura:** este documento separa explicitamente o que está **implementado**, o que está **planejado** e o que é **futuro**. Requisitos e possibilidades descritos como evolução não devem ser interpretados como funcionalidades entregues.

A versão 2.4 permanece preservada como histórico. Esta v2.5 consolida o conteúdo arquitetural e as regras de negócio que continuam válidos, ao mesmo tempo em que sincroniza o documento com o estado real do sistema após as Fases 1–4.

---

# 1. Visão Geral

O sistema é uma aplicação web de gestão operacional e financeira para salões de beleza e estabelecimentos de estética de pequeno e médio porte.

O núcleo do sistema transforma o atendimento em registros operacionais e financeiros confiáveis, mantendo o PostgreSQL como fonte oficial e centralizando regras financeiras críticas em funções transacionais do banco.

## 1.1 Funcionalidades implementadas no estado atual

- cadastro de profissionais, clientes, serviços e produtos;
- comandas com itens de serviço/produto;
- múltiplas formas de pagamento;
- cálculo de taxas;
- comissões configuráveis por salão, profissional e serviço;
- motivos de desconto com efeito configurável sobre a comissão;
- despesas, adiantamentos e ajustes de comissão;
- fechamento transacional de comanda;
- cancelamento de comanda;
- estorno de pagamento;
- fechamento mensal de competência de comissão;
- estoque de produtos para revenda;
- CMV por Custo Médio Ponderado Móvel;
- comportamento de venda sem bloqueio por estoque negativo;
- relatório de estoque;
- relatório de caixa;
- relatório de comissão;
- autenticação por Supabase Auth;
- isolamento multi-tenant via RLS;
- testes pgTAP e Vitest;
- verificação ONP com adapter combinado;
- validação E2E/homologação da Fase 4.

## 1.2 Funcionalidades ainda não implementadas ou não consolidadas

- DRE gerencial completa;
- design system consolidado;
- UI/UX final para todas as páginas;
- notificações automáticas por e-mail;
- offline robusto com sincronização;
- agenda avançada;
- CRM;
- integrações externas;
- integração fiscal;
- suporte ao regime de salão-parceiro;
- demais evoluções listadas no roadmap.

A prioridade arquitetural continua sendo consistência, segurança, simplicidade operacional e rastreabilidade, e não escalabilidade distribuída prematura.

---

# 2. Contexto do Negócio

O cenário inicial considerado para a arquitetura é:

| Característica | Referência / estado |
|---|---|
| Profissionais | configurável por salão |
| Atendimentos/dia | ~8 como referência inicial |
| Dispositivos | celular e computador |
| Operação | digital |
| Comissão | individual e configurável |
| Repasse | mensal |
| Venda de produtos | sim |
| Controle de estoque de produtos | sim |
| Controle de insumos de procedimentos | não |
| Despesas | sim |
| DRE gerencial | planejado; não consolidado no estado atual |
| Relatórios gerenciais | caixa e comissão implementados |

O volume inicial é relativamente baixo. Por isso, consistência, segurança, manutenção simples e experiência operacional são prioritárias em relação a arquitetura distribuída ou complexidade de infraestrutura.

---

# 3. Objetivos do Sistema

## 3.1 Objetivo principal

Permitir que o estabelecimento registre e acompanhe a operação financeira decorrente dos atendimentos realizados, com isolamento por salão e histórico suficiente para auditoria e conferência.

## 3.2 Objetivos implementados

1. Cadastrar profissionais, clientes, serviços, produtos e configurações de comissão.
2. Abrir e fechar comandas de forma transacional.
3. Calcular taxas, descontos e comissões conforme configuração.
4. Registrar pagamentos e estornos.
5. Controlar estoque de produtos de revenda.
6. Calcular CMV por custo médio ponderado móvel.
7. Registrar despesas, adiantamentos e ajustes financeiros.
8. Fechar competências mensais de comissão sem reescrever histórico fechado.
9. Produzir relatório de caixa.
10. Produzir relatório de comissão por profissional.
11. Isolar dados por salão via RLS.
12. Preservar evidência e testes para regras críticas.

## 3.3 Objetivos planejados

- consolidar UI/UX;
- implementar DRE gerencial completa;
- fortalecer observabilidade e governança de produção;
- operacionalizar requisitos de LGPD;
- preparar o sistema para go-live.

---

# 4. Escopo

## 4.1 Dentro do escopo atual

### Operação

- profissionais;
- usuários;
- clientes;
- serviços;
- produtos;
- comandas;
- itens de comanda;
- pagamentos.

### Financeiro

- taxas de pagamento;
- comissões configuráveis;
- motivos de desconto;
- despesas;
- adiantamentos/vales;
- fechamento mensal de comissão;
- ajustes de comissão;
- relatório de caixa;
- relatório de comissão.

### Estoque

- produtos para revenda;
- entradas;
- vendas;
- ajustes;
- perdas;
- inventário;
- estoque mínimo;
- saldo negativo;
- custo médio;
- CMV;
- relatório de estoque.

### Segurança

- autenticação;
- multi-tenancy;
- RLS;
- perfis de acesso;
- validações nas RPCs financeiras.

## 4.2 Planejado

- DRE gerencial completa;
- design system;
- responsividade refinada;
- componentes reutilizáveis;
- estados padronizados de interface;
- acessibilidade;
- observabilidade;
- backup/recuperação operacionalizados;
- LGPD operacional;
- preparação para go-live.

## 4.3 Fora do escopo inicial / futuro

- controle de consumo de insumos de procedimentos;
- lote e validade;
- ficha técnica de serviços;
- composição de produtos;
- compras automatizadas;
- integração contábil/fiscal;
- emissão fiscal;
- folha trabalhista;
- agenda robusta;
- CRM avançado;
- marketplace;
- marketing automatizado;
- fidelidade;
- offline robusto;
- integração automática com WhatsApp;
- regime de salão-parceiro sem decisão específica do proprietário/contador.

---

# 5. Princípios Arquiteturais

## 5.1 Mobile-first

A operação deve funcionar bem em celular. A versão desktop utiliza o mesmo domínio e regras, mas pode apresentar layouts mais densos e informações gerenciais adicionais.

## 5.2 PostgreSQL como fonte oficial

O PostgreSQL é a autoridade para os dados financeiros e operacionais. O frontend não é fonte oficial de valores financeiros.

## 5.3 Regras financeiras centralizadas

Operações críticas devem ser validadas no servidor/banco, incluindo:

- fechamento de comanda;
- cálculo de taxa;
- cálculo de comissão;
- descontos relevantes para comissão;
- baixa de estoque;
- cancelamento;
- estorno;
- fechamento de competência.

## 5.4 Transações atômicas

Operações com múltiplos efeitos financeiros devem ocorrer em uma única transação, com rollback quando uma etapa falhar.

## 5.5 Histórico financeiro

Registros que participam de cálculos financeiros não devem ser apagados indiscriminadamente. Deve-se preferir cancelamento, estorno, inativação ou ajuste auditável.

## 5.6 Configuração em vez de regra fixa

Regras críticas de comissão, desconto, taxa e timing de repasse devem ser determinadas por configuração do salão e não por constantes fixas no frontend.

## 5.7 Extensibilidade aditiva

Mudanças de negócio futuras devem preferencialmente entrar por migrations aditivas, preservando registros históricos.

## 5.8 Idempotência

Operações críticas originadas em dispositivos móveis devem possuir uma forma objetiva de evitar duplicidade por reenvio. A arquitetura usa UUID gerado no cliente para as operações em que isso é aplicável.

---

# 6. Arquitetura Atual

## 6.1 Arquitetura física vigente

A aplicação ainda não possui camadas físicas completas de `domain/`, `repositories/`, `services/` e `hooks/` como apareciam na arquitetura proposta antiga. A estrutura atual é deliberadamente mais simples.

```text
┌────────────────────────────────────────────┐
│               FRONTEND                     │
│ React + TypeScript + Vite                  │
│ App.tsx + pages/ + estilos locais          │
└──────────────────────┬─────────────────────┘
                       │
┌──────────────────────▼─────────────────────┐
│          ACESSO A DADOS / API              │
│ src/lib/supabaseClient.ts                  │
│ src/lib/api/*.ts                           │
└──────────────────────┬─────────────────────┘
                       │
┌──────────────────────▼─────────────────────┐
│                SUPABASE                    │
│ Auth | RLS | RPC | PostgreSQL              │
└──────────────────────┬─────────────────────┘
                       │
┌──────────────────────▼─────────────────────┐
│              DOMÍNIO DE DADOS              │
│ vendas | comissões | estoque | financeiro │
└────────────────────────────────────────────┘
```

## 6.2 Responsabilidade de cada camada

### Frontend

Responsável por entrada do usuário, navegação, apresentação, filtros, estados da interface e consumo dos contratos de dados.

### API/Client

Centraliza acesso ao Supabase e consultas específicas de funcionalidades.

### Supabase/PostgreSQL

Responsável por persistência, autenticação, isolamento de tenant, RPCs e regras financeiras críticas.

### Testes e verificação

Validam comportamento de banco, frontend e integração, servindo como evidência objetiva da implementação.

## 6.3 Evolução futura

Camadas de domínio, hooks ou repositórios podem ser introduzidas quando a complexidade justificar. Não existe decisão de refatorar todo o frontend apenas para reproduzir a arquitetura conceitual anterior.

---

# 7. Stack Tecnológica

## 7.1 Adotada

- React 18.3;
- React DOM 18.3;
- Vite 5.4;
- TypeScript 5.6 em modo estrito;
- Supabase JS 2.45;
- Supabase Auth;
- PostgreSQL;
- Row Level Security;
- PostgreSQL Functions/RPC;
- ESLint 9.9;
- Vitest 3.2;
- Testing Library;
- jsdom.

## 7.2 Não adotada atualmente

- Tailwind CSS;
- Recharts;
- Lucide React.

Essas tecnologias apareciam na arquitetura proposta anterior, mas não estão presentes como dependências adotadas no estado atual.

Novas bibliotecas somente devem entrar quando resolverem um problema concreto.

---

# 8. Modelo de Domínio

```text
USUÁRIO
   │
   └── PROFISSIONAL

CLIENTE
   │
   └── COMANDA
          │
          ├── COMANDA_ITEM ─── SERVIÇO
          │        │
          │        └── MOTIVO_DESCONTO
          │
          ├── COMANDA_ITEM ─── PRODUTO
          │
          └── PAGAMENTO

PRODUTO
   │
   └── MOVIMENTAÇÃO_ESTOQUE

DESPESA

CONFIG_TAXAS

CONFIG_COMISSOES

FECHAMENTO_COMISSAO
```

Princípio essencial: valores e regras necessários para preservar histórico devem ser congelados no momento da operação financeira, e não recalculados retroativamente a partir da configuração atual.

---

# 9. Entidades e Contratos de Dados

## 9.1 Profissionais

Representam as pessoas que executam os serviços.

Campos arquiteturalmente relevantes:

```text
id
salon_id
nome
telefone
comissao_percentual_padrao
ativo
created_at
updated_at
```

`comissao_percentual_padrao` representa o default. Overrides por serviço ficam em `config_comissoes`.

## 9.2 Usuários

Representam contas de acesso.

```text
id
auth_user_id
salon_id
nome
perfil
profissional_id
ativo
created_at
```

Perfis previstos:

```text
ADMIN
GERENTE
RECEPCAO
PROFISSIONAL
```

Usuário e profissional são conceitos distintos. Um profissional pode existir sem conta de acesso.

## 9.3 Clientes

```text
id
salon_id
nome
telefone
email
observacoes
ativo
created_at
updated_at
```

Histórico de atendimento é obtido pelas relações com comandas.

## 9.4 Serviços

```text
id
salon_id
nome
categoria
preco
duracao_minutos
ativo
created_at
updated_at
```

O preço cadastrado é o preço atual. O preço efetivamente vendido deve ser preservado no item como snapshot histórico.

## 9.5 Produtos

```text
id
salon_id
sku
nome
categoria
preco_custo
preco_venda
percentual_comissao
estoque_minimo
ativo
created_at
updated_at
```

`preco_custo` acompanha o custo médio vigente. `percentual_comissao` é override opcional por produto.

## 9.6 Comandas

```text
id
salon_id
numero
uuid_cliente
cliente_id
profissional_id
status
subtotal
desconto
total
opened_at
closed_at
created_by
closed_by
created_at
updated_at
```

Estados:

```text
ABERTA
FINALIZADA
CANCELADA
```

`closed_at` é a referência para a competência financeira.

O `profissional_id` do cabeçalho é apenas profissional principal para exibição. Cálculos de comissão usam `comanda_itens.profissional_id`.

## 9.7 Itens de comanda

Campos arquiteturalmente relevantes:

```text
id
comanda_id
tipo
servico_id
produto_id
descricao_snapshot
quantidade
data_atendimento
preco_unitario
desconto
motivo_desconto_id
total
profissional_id
comissao_percentual_snapshot
comissao_valor_snapshot
comissao_processada
fechamento_comissao_id
created_at
```

Tipos:

```text
SERVICO
PRODUTO
```

Snapshots de descrição, preço e comissão preservam a operação histórica. Alterações posteriores nos cadastros não devem modificar operações já fechadas.

## 9.8 Pagamentos

```text
id
comanda_id
metodo
valor_bruto
taxa_percentual
taxa_valor
valor_liquido
parcelas
identificador_transacao
data_liquidacao_bancaria
paid_at
created_at
```

Métodos previstos:

```text
DINHEIRO
PIX
DEBITO
CREDITO
```

A estrutura suporta múltiplos pagamentos na mesma comanda.

## 9.9 Configuração de taxas

```text
id
salon_id
metodo
taxa_percentual
ativo
updated_at
```

A taxa efetivamente aplicada deve ficar registrada na operação histórica.

## 9.10 Configuração de comissões

Campos arquiteturalmente relevantes:

```text
id
salon_id
profissional_id
servico_id
comissao_percentual
base_calculo
rateio_taxa
rateio_taxa_por_forma_pagamento
comissao_sobre_produto
timing_repasse
created_at
updated_at
```

Resolução da configuração:

1. procurar override específico de `profissional_id + servico_id`;
2. se não existir, procurar configuração do profissional (`servico_id IS NULL`);
3. se não existir, usar default aplicável do salão.

A chave lógica é única para a combinação de salão, profissional e serviço.

A antiga opção de rateio manual `PERSONALIZADO` não deve ser reintroduzida. O comportamento vigente é determinístico e baseado em configuração.

## 9.11 Motivos de desconto

```text
id
salon_id
descricao
afeta_comissao
ativo
created_at
```

Quando `afeta_comissao = false`, o desconto reduz o valor pago pelo cliente, mas não reduz a base de comissão correspondente.

## 9.12 Movimentações de estoque

```text
id
salon_id
produto_id
tipo
quantidade
custo_unitario
origem_tipo
origem_id
observacao
created_at
created_by
```

Tipos:

```text
ENTRADA
VENDA
AJUSTE
PERDA
DEVOLUCAO
INVENTARIO
```

## 9.13 Despesas

```text
id
salon_id
descricao
categoria
tipo
valor
profissional_id
data_competencia
data_pagamento
status
observacao
created_by
created_at
updated_at
```

Adiantamentos/vales de profissionais utilizam `profissional_id` para permitir abatimento no fechamento de comissão.

## 9.14 Fechamentos de comissão

```text
id
salon_id
profissional_id
competencia
status
total_bruto_calculado
total_adiantamentos_abatidos
saldo_anterior_competencia
total_ajustes
total_pago
saldo_devedor_gerado
fechado_em
fechado_por
created_at
```

A combinação `salon_id + profissional_id + competencia` deve ser única.

Depois de `FECHADO`, os valores financeiros e vínculos do fechamento são imutáveis. Correções posteriores ocorrem por ajustes de comissão.

---

# 10. Regras de Negócio Financeiras

## 10.1 Fechamento de comanda

Uma comanda só deve ser finalizada quando:

1. possuir ao menos um item;
2. pagamentos forem compatíveis com o valor final;
3. itens forem válidos;
4. os efeitos financeiros puderem ser processados;
5. a operação puder ser executada integralmente dentro da transação.

**Estoque insuficiente não bloqueia o fechamento.** Essa condição foi deliberadamente removida como requisito de bloqueio na v2.4.

Adicionar produto a uma comanda aberta não reserva estoque. A movimentação de venda acontece no fechamento.

## 10.2 Taxas de pagamento

Para cada pagamento:

```text
taxa_valor = valor_bruto × taxa_percentual

valor_liquido = valor_bruto - taxa_valor
```

A taxa efetivamente usada deve ficar congelada na transação.

## 10.3 Rateio de desconto

Quando um desconto é aplicado sobre o total da comanda, ele é distribuído proporcionalmente aos itens:

```text
desconto_item =
  desconto_total ×
  (valor_bruto_item / soma_dos_valores_brutos)
```

O resultado é armazenado no item.

### 10.3.1 Arredondamento pelo maior resto

Rateios devem ser feitos com precisão suficiente para não perder centavos.

Método:

1. calcular proporcionalmente sem arredondamento prematuro;
2. arredondar os itens para centavos conforme a estratégia definida;
3. calcular a diferença entre o total original e a soma;
4. distribuir os centavos restantes pelos maiores restos decimais até fechar exatamente.

A mesma regra deve ser aplicada ao rateio de taxas.

## 10.4 Base de comissão

A base é determinada pela configuração:

```text
BRUTO
ou
LIQUIDO_APOS_DESCONTO
```

Para `LIQUIDO_APOS_DESCONTO`, somente descontos que afetam comissão reduzem a base.

A fórmula conceitual é:

```text
base_comissao =
  percentual aplicável × base_resolvida
```

O percentual e o valor da comissão são congelados no item no fechamento.

## 10.5 Rateio de taxa na comissão

Configurações possíveis:

```text
SALAO
PROFISSIONAL_PROPORCIONAL
POR_FORMA_PAGAMENTO
```

### SALAO

O salão absorve a taxa. Ela não reduz a base de comissão.

### PROFISSIONAL_PROPORCIONAL

A taxa é distribuída entre itens/profissionais proporcionalmente aos valores e reduz a base correspondente.

### POR_FORMA_PAGAMENTO

O percentual absorvido pelo profissional é lido de `rateio_taxa_por_forma_pagamento` para cada método de pagamento.

Método não mapeado não deve gerar default silencioso: a RPC deve rejeitar o fechamento.

## 10.6 Produtos e comissão

Produtos só geram comissão quando `comissao_sobre_produto` estiver habilitada para o profissional/configuração aplicável.

Quando houver comissão:

1. se `produtos.percentual_comissao` estiver preenchido, usa-se o override do produto;
2. caso contrário, usa-se o percentual resolvido em `config_comissoes`.

## 10.7 Vendas parcialmente pagas

A regra atual calcula comissão sobre o valor do item independentemente de pagamento total ou parcial, salvo futura mudança explícita de política.

## 10.8 Histórico

Valores financeiros devem ser preservados como snapshots. Alterações posteriores em preço, comissão, taxa ou desconto não devem recalcular retroativamente operações já fechadas.

---

# 11. Estoque e CMV

## 11.1 Estoque por movimentação

O saldo é consequência das movimentações, e não de um simples campo isolado.

Exemplo:

```text
ENTRADA      +20
VENDA         -2
PERDA         -1
AJUSTE        +3
----------------
SALDO         20
```

## 11.2 Custo Médio Ponderado Móvel

Em uma entrada, quando o saldo atual não é negativo:

```text
novo_custo_medio =
  (estoque_atual × custo_medio_atual
   + quantidade_entrada × custo_entrada)
  /
  (estoque_atual + quantidade_entrada)
```

O custo utilizado na venda é o custo médio vigente naquele momento.

## 11.3 Saldo negativo

A decisão congelada é:

> venda **nunca é bloqueada** por falta de estoque.

A venda segue normalmente, gera movimentação `VENDA` e pode levar o saldo a negativo.

O saldo negativo é uma pendência operacional para correção posterior por `ENTRADA` ou `AJUSTE`.

## 11.4 Entrada com saldo negativo

Quando uma entrada ocorre com saldo negativo, a média ponderada tradicional produziria resultado matematicamente inadequado. Nesse caso:

```text
se estoque_atual < 0:
    novo_custo_medio = custo_entrada
```

O saldo físico segue a quantidade real da entrada.

## 11.5 CMV

O método adotado é Custo Médio Ponderado Móvel:

```text
quantidade vendida
×
custo médio vigente na venda
=
CMV
```

FIFO não faz parte da arquitetura atual.

---

# 12. Competência, Comissão e Fechamento Mensal

## 12.1 Competência financeira

O sistema diferencia competência de caixa.

| Evento | Papel |
|---|---|
| `comanda_itens.data_atendimento` | informação operacional/auditoria |
| `comandas.closed_at` | competência de faturamento, comissão e estoque |
| `pagamentos.paid_at` | fluxo de caixa |
| `pagamentos.data_liquidacao_bancaria` | conciliação bancária |
| `fechamentos_comissao.fechado_em` | encerramento do ciclo mensal |
| pagamento da comissão ao profissional | saída de caixa |

**Regra central:** a competência do atendimento é determinada pela data de fechamento da comanda (`closed_at`), não pela data do atendimento.

## 12.2 Timing do repasse

A competência e o timing do repasse são conceitos distintos.

O timing pode ser configurado como:

```text
IMEDIATO
APOS_LIQUIDACAO_BANCARIA
```

Não se deve presumir que a data de competência seja a data de liquidação bancária.

## 12.3 Fechamento mensal

O fechamento mensal:

1. consolida itens do profissional ainda não processados;
2. desconta adiantamentos/vales;
3. aplica saldo anterior;
4. soma ajustes aplicáveis;
5. registra o fechamento;
6. marca os itens como processados;
7. congela a competência.

## 12.4 Saldo negativo de adiantamentos

O total pago nunca deve ser negativo.

Conceitualmente:

```text
total_pago = MAX(
  0,
  total_bruto_calculado
  - total_adiantamentos_abatidos
  - saldo_anterior_competencia
  + total_ajustes
)
```

Quando o valor devido não cobre os adiantamentos, o excedente é transportado para a competência seguinte.

Liquidação manual de saldo devedor deve ser registrada como ajuste auditável, nunca por alteração retroativa do fechamento.

## 12.5 Cancelamento após competência fechada

Uma venda cancelada cuja competência já esteja fechada não reabre o fechamento histórico.

O sistema deve:

```text
venda original
  ↓
cancelamento
  ↓
ajuste de comissão
  ↓
competência aberta vigente
```

---

# 13. DRE Gerencial

A DRE é um relatório gerencial e não substitui a contabilidade oficial.

Estrutura conceitual:

```text
FATURAMENTO BRUTO
       ↓
DESCONTOS / DEDUÇÕES
       ↓
RECEITA LÍQUIDA
       ↓
CMV
       ↓
MARGEM BRUTA
       ↓
COMISSÕES + DESPESAS
       ↓
RESULTADO OPERACIONAL
       ↓
RESULTADO LÍQUIDO GERENCIAL
```

As definições de cada linha devem ser formalizadas antes da implementação.

No estado atual, a DRE completa ainda é planejada.

---

# 14. Extrato de Comissão

O sistema deve ser capaz de representar um extrato individual por profissional e competência.

Exemplo conceitual:

```text
EXTRATO DE COMISSÃO

Profissional: Maria
Competência: Agosto/2026
Status: FECHADO

Atendimentos
----------------------------------
Corte                  R$ 120,00
Coloração              R$ 250,00
Escova                  R$  80,00

Faturamento bruto      R$ 450,00
Base de comissão       R$ 450,00
Percentual                50%
Comissão calculada     R$ 225,00
Adiantamentos          R$  20,00
----------------------------------
TOTAL A PAGAR          R$ 205,00
```

O extrato pode futuramente ser visualizado, impresso, exportado ou compartilhado.

---

# 15. Relatórios

## 15.1 Implementados

### Relatório de Caixa

Implementado na Fase 4:

- filtro por período;
- relatório financeiro de caixa;
- saldo inicial/final conforme contrato vigente;
- RPC `fn_relatorio_caixa(p_data_inicio, p_data_fim)`;
- API correspondente;
- `RelatorioCaixaPage.tsx`;
- teste frontend correspondente.

### Relatório de Comissão

Implementado na Fase 4:

- filtro por competência;
- filtro por profissional;
- detalhamento por comanda/item;
- totais brutos e de comissão;
- RPC `fn_relatorio_comissao(p_competencia, p_profissional_id)`;
- API correspondente;
- `RelatorioComissaoPage.tsx`;
- teste frontend correspondente.

## 15.2 Relatórios planejados

- faturamento por serviço;
- vendas por produto;
- despesas;
- CMV e margem;
- DRE;
- indicadores comparativos;
- exportações CSV/PDF;
- paginação própria quando o volume justificar.

---

# 16. Dashboard e Alertas

O dashboard executivo deverá evoluir para apresentar:

```text
Faturamento
Receita líquida
Comissões
CMV
Despesas
Resultado líquido
Margem
```

Também poderão existir indicadores de período, desempenho por profissional, serviços/produtos mais vendidos e distribuição de pagamentos.

## 16.1 Estoque negativo

A decisão de negócio é que saldo negativo não bloqueia venda.

O estado atual possui visualização in-app do problema de estoque negativo.

O fluxo é:

```text
Venda
 ↓
Saldo pode ficar negativo
 ↓
Dashboard/relatório sinaliza
 ↓
GERENTE corrige via ENTRADA/AJUSTE
```

## 16.2 Canais de alerta

| Canal | Estado |
|---|---|
| In-app | implementado para visualização do saldo negativo |
| E-mail via Resend | planejado; sem integração atual |
| WhatsApp automático | fora do escopo atual |

Não deve ser documentada integração Resend como já concluída enquanto não houver código, configuração e testes correspondentes.

---

# 17. Segurança e Autorização

## 17.1 Autenticação

O acesso requer usuário autenticado pelo Supabase Auth.

## 17.2 Perfis

### ADMIN

Acesso administrativo amplo, incluindo configurações de comissão e fechamento mensal.

### GERENTE

Acesso operacional e financeiro amplo conforme políticas implementadas. Pode executar correções operacionais de estoque por entrada/ajuste.

A venda com estoque insuficiente não é uma exceção de perfil: é comportamento padrão do sistema.

### RECEPÇÃO

Operação de clientes, comandas e pagamentos conforme políticas.

### PROFISSIONAL

Matriz de acesso preservada:

| Recurso | Acesso |
|---|---|
| Clientes | consulta operacional conforme necessidade |
| Comandas de terceiros | sem acesso indevido a valores/comissões de terceiros |
| Própria comissão/extrato | acesso |
| Comissão de terceiros | sem acesso |
| Faturamento global / DRE | sem acesso |
| Configuração de comissão/taxa | sem acesso |

O profissional não possui uma brecha de concessão manual para visualizar faturamento global na arquitetura atual.

---

# 18. Multi-tenancy e RLS

Todas as entidades relevantes devem estar associadas a um `salon_id` ou equivalente de tenant.

Exemplo:

```text
profissionais
-------------
id
salon_id
nome

comandas
--------
id
salon_id
cliente_id
...
```

A segurança deve existir no banco e não apenas no frontend.

## 18.1 Função real de tenant

A função utilizada atualmente é:

```text
auth_helpers.current_salon_id()
```

A v2.4 utilizava `auth.current_salon_id()` como nomenclatura proposta. A v2.5 corrige esse ponto: o namespace real atual é `auth_helpers`.

A implementação utiliza `SECURITY DEFINER` e resolve o tenant a partir das claims disponíveis, com o mecanismo de teste atual preservado.

## 18.2 Responsabilidades

### RLS

- isolamento entre salões;
- seleção segura de linhas;
- restrições de inserção/alteração/remoção;
- proteção contra acesso direto indevido.

### RPC/domínio

- validações financeiras;
- fechamento transacional;
- competência;
- cálculo de comissão;
- estoque;
- cancelamento;
- estorno.

RLS não substitui regras de negócio.

---

# 19. Auditoria

Operações relevantes devem possuir histórico suficiente para responder quem, quando, o quê e qual valor foi alterado.

Eventos arquiteturalmente relevantes incluem:

```text
LOGIN
CRIACAO
ALTERACAO
CANCELAMENTO
ESTORNO
FECHAMENTO_COMANDA
ALTERACAO_TAXA
ALTERACAO_COMISSAO
AJUSTE_ESTOQUE
FECHAMENTO_COMISSAO_MENSAL
AJUSTE_COMISSAO_RETROATIVO
```

A referência a `ESTOQUE_NEGATIVO_AUTORIZADO` da documentação antiga não representa mais a política atual, porque não existe bypass autorizado: venda sem estoque é comportamento normal. O estado negativo deve ser corrigido posteriormente.

Estrutura conceitual:

```text
audit_log
---------
id
salon_id
user_id
entity
entity_id
action
old_data
new_data
created_at
```

---

# 20. Tratamento Monetário

Valores monetários não devem usar `float` como representação financeira no banco.

O PostgreSQL deve utilizar tipos `numeric/decimal`, por exemplo:

```sql
numeric(14,2)
```

Isso se aplica a:

- preços;
- pagamentos;
- taxas;
- descontos;
- comissões;
- despesas;
- CMV;
- resultados.

Rateios devem respeitar a regra de fechamento exato de centavos descrita nas regras de comissão.

---

# 21. Banco de Dados e Migrations

## 21.1 Estrutura conceitual

```text
salons
users
profissionais
clientes
servicos
produtos
comandas
comanda_itens
pagamentos
config_taxas
config_comissoes
motivos_desconto
movimentacoes_estoque
despesas
fechamentos_comissao
ajustes_comissao
audit_log
```

Relacionamentos principais:

```text
salon
 ├── users
 ├── profissionais
 ├── clientes
 ├── servicos
 ├── produtos
 ├── comandas
 ├── despesas
 ├── config_comissoes
 ├── motivos_desconto
 └── fechamentos_comissao

comanda
 ├── comanda_itens
 └── pagamentos

produto
 └── movimentacoes_estoque

profissional
 └── fechamentos_comissao
```

## 21.2 Migrations atuais

Estado confirmado no branch de referência:

```text
0001_initial_schema.sql
0002_rls_policies.sql
0003_fechamento_comanda_schema_fix.sql
0004_fn_fechar_comanda.sql
0005_cancelamento_schema_fix.sql
0006_fn_cancelar_comanda.sql
0007_security_definer_search_path.sql
0008_pagamento_estornos.sql
0009_fn_estornar_pagamento.sql
0010_fn_fechar_competencia_comissao.sql
0011_fn_calcular_cmv.sql
0012_relatorio_caixa.sql
0013_relatorio_comissao.sql
```

Não existe migration `0014` ou superior no estado documentado desta versão.

Novas alterações estruturais devem entrar por migration posterior. Migrations já aplicadas não devem ser reescritas para corrigir histórico.

Uma eventual implementação do regime de salão-parceiro deverá utilizar migration aditiva posterior às atuais.

---

# 22. Operação Principal e Fluxo Transacional

## 22.1 Fluxo principal

```text
Usuário acessa
      ↓
Autenticação
      ↓
Nova comanda
      ↓
Cliente
      ↓
Serviços/produtos
      ↓
Profissional por item
      ↓
Desconto e motivo, quando aplicável
      ↓
Pagamentos
      ↓
Taxas
      ↓
Fechamento
      ↓
Comissão
      ↓
Estoque
      ↓
Relatórios
```

## 22.2 Fechamento transacional

Conceitualmente:

```text
BEGIN

1. validar idempotência;
2. validar comanda;
3. validar itens;
4. validar pagamentos;
5. calcular taxas;
6. ratear desconto;
7. resolver configuração de comissão;
8. calcular valores líquidos;
9. calcular comissão;
10. registrar closed_at;
11. registrar pagamentos;
12. registrar movimentações de estoque;
13. registrar efeitos financeiros;
14. registrar auditoria;

COMMIT
```

Em erro:

```text
ROLLBACK
```

Nenhum efeito parcial deve permanecer.

---

# 23. Offline e Conectividade

A aplicação atual não possui offline robusto.

A mitigação arquitetural existente para reenvio é a idempotência por UUID quando aplicável.

Uma futura arquitetura offline poderá seguir:

```text
React
  ↓
IndexedDB
  ↓
Outbox
  ↓
Sincronização
  ↓
Supabase
```

O armazenamento local não substitui PostgreSQL como fonte oficial.

Conflitos de sincronização deverão possuir política explícita quando essa evolução for implementada.

---

# 24. Integração com WhatsApp

A integração não deve conter regras financeiras.

Arquitetura futura:

```text
Dados financeiros
      ↓
Gerador de extrato
      ↓
Texto/documento
      ↓
WhatsApp
```

O uso atual é limitado ao compartilhamento manual previsto para a operação. WhatsApp automático está fora do escopo atual.

---

# 25. Backup, Recuperação e Migração de Dados

## 25.1 Backup e recuperação

A base oficial permanece no Supabase/PostgreSQL.

Antes do go-live, devem ser definidos e verificados:

- backup;
- recuperação;
- exportação;
- retenção;
- histórico operacional.

Exportações para planilhas são auxiliares e não fonte primária.

## 25.2 Migração do Google Sheets

Caso dados legados sejam migrados:

```text
Google Sheets
     ↓
limpeza / validação
     ↓
importação
     ↓
PostgreSQL
     ↓
validação
     ↓
produção
```

Após validação:

```text
PostgreSQL = fonte oficial
```

---

# 26. Variáveis de Ambiente e Segurança de Credenciais

Exemplo:

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-publica
```

Nenhuma chave privada ou credencial administrativa deve ser distribuída no frontend.

---

# 27. Arquitetura do Frontend e UI/UX

## 27.1 Estrutura atual

A estrutura efetiva é baseada em páginas e APIs simples:

```text
src/
├── App.tsx
├── main.tsx
├── types.ts
├── vite-env.d.ts
├── pages/
│   ├── DashboardPage.tsx
│   ├── LoginPage.tsx
│   ├── ProfissionaisPage.tsx
│   ├── ClientesPage.tsx
│   ├── ServicosPage.tsx
│   ├── ProdutosPage.tsx
│   ├── ConfigComissoesPage.tsx
│   ├── ComandasPage.tsx
│   ├── RelatorioEstoquePage.tsx
│   ├── RelatorioCaixaPage.tsx
│   └── RelatorioComissaoPage.tsx
└── lib/
    ├── supabaseClient.ts
    ├── salon.ts
    └── api/
```

A navegação é centralizada em `App.tsx` e utiliza abas no estado atual.

## 27.2 Estado da UI

A interface atual é funcional/prototípica. Há uso de estilos locais/inline e ainda não existe design system consolidado.

Isso não é considerado uma falha de domínio: é a próxima frente de evolução.

## 27.3 Fase 5 — UI/UX

Prioridades:

- design system mínimo;
- paleta, tipografia e espaçamento consistentes;
- responsividade real;
- componentes reutilizáveis;
- tabelas e formulários padronizados;
- loading;
- erro;
- sucesso;
- estado vazio;
- navegação por áreas;
- acessibilidade;
- revisão visual das páginas existentes.

A evolução deve ocorrer por feature/área e não por refatoração global indiscriminada.

---

# 28. Estratégia de Testes e Verificação

## 28.1 Princípio

Cada regra crítica deve possuir uma forma objetiva de verificar seu comportamento na camada adequada.

## 28.2 Banco / pgTAP

Os testes em `supabase/tests/` cobrem principalmente:

- RLS e isolamento por salão;
- fechamento de comanda;
- descontos e comissão;
- taxas;
- estoque;
- divergência de pagamento;
- cancelamento;
- restrições por perfil;
- estorno;
- fechamento de competência;
- CMV;
- relatório de caixa;
- relatório de comissão.

O repositório possui 14 arquivos SQL de teste no estado da Fase 4. Existe uma duplicidade de prefixo `012` em nomes de arquivo, mas isso não impede a execução e não deve ser tratado como falha funcional.

## 28.3 Frontend

Os testes de interface utilizam:

- Vitest;
- Testing Library;
- jsdom;
- reporter TAP.

A Fase 4 possui testes para os relatórios de caixa e comissão.

## 28.4 ONP

O ONP foi integrado por adapters:

```text
scripts/onp-pgtap-verify.cjs
        ↓
TAP de pgTAP

scripts/onp-combined-verify.cjs
        ↓
pgTAP + Vitest TAP
        ↓
onpspec.config.json
```

O adapter deve preservar:

- stdout TAP;
- exit code do runner.

Falha de teste não pode ser mascarada pelo adapter.

## 28.5 E2E e homologação

A Fase 4 foi validada no navegador com:

- login;
- navegação;
- relatório de caixa;
- relatório de comissão;
- cenário sem dados;
- autenticação/autorização.

Fixtures de homologação foram temporárias e removidas depois do teste.

## 28.6 Evidência histórica da Fase 4

A validação final registrou:

- 66 testes pgTAP;
- 8 testes Vitest;
- 74 testes no total;
- AC-001 a AC-011 aprovados;
- exit code 0;
- auditoria sem erros bloqueadores.

Essa contagem é evidência histórica da Fase 4 e não uma contagem permanente.

---

# 29. Critérios de Aceitação do Núcleo

O núcleo deve preservar o seguinte encadeamento:

```text
Cadastros
   ↓
Comanda
   ↓
Itens
   ↓
Pagamento
   ↓
Fechamento transacional
   ↓
Comissão
   ↓
Estoque / CMV
   ↓
Relatórios
```

Uma feature só deve ser considerada concluída quando houver critérios de aceitação verificáveis e evidência suficiente.

Para a Fase 4, os critérios foram formalizados em:

```text
.spec/features/relatorios-gerenciais/spec.md
.spec/features/relatorios-gerenciais/tasks.md
```

---

# 30. LGPD

O sistema trata dados pessoais de clientes, profissionais e usuários.

Princípios arquiteturais mínimos:

1. RLS para isolamento e redução de acesso indevido;
2. acesso baseado em necessidade operacional;
3. histórico e auditoria de operações relevantes;
4. política de retenção adequada ao histórico financeiro;
5. canal para solicitações dos titulares;
6. nenhuma credencial administrativa privada no frontend.

A adequação formal de LGPD deve ser operacionalizada antes do go-live e validada conforme o contexto real do estabelecimento.

Esta seção não constitui aconselhamento jurídico.

---

# 31. Regime de Contratação dos Profissionais e Lei 13.352/2016

O software não presume que o salão adote o regime de salão-parceiro.

A decisão sobre o regime — por exemplo, CLT, autônomo/MEI ou parceria formal — pertence ao proprietário e aos profissionais responsáveis pela orientação contábil/jurídica.

A arquitetura atual não implementa cota-parte, retenção específica ou contrato de parceria.

Caso o regime de salão-parceiro seja adotado futuramente, a extensão deve ser feita por migration aditiva, preservando registros históricos.

Essa decisão não precisa bloquear a evolução técnica do núcleo, mas deve estar definida antes do go-live com dados reais de profissionais.

---

# 32. Estado de Implementação e Fonte da Verdade

Este documento descreve arquitetura, regras e decisões. Para perguntas específicas, as fontes de verdade são:

| Pergunta | Fonte |
|---|---|
| O que está implementado? | código atual + `PROGRESS.md` |
| Como o banco evolui? | `supabase/migrations/` |
| Quais comportamentos são testados? | `supabase/tests/` + `tests/` |
| O que uma feature exige? | `.spec/features/<feature>/spec.md` |
| Como tarefas foram divididas? | `.spec/features/<feature>/tasks.md` |
| Como os critérios foram provados? | `.spec/verification/` + `verify` |
| Quais regras permanentes orientam agentes? | `AGENTS.md` + regras/skills |
| Qual é a arquitetura vigente? | este documento |
| Qual é o histórico da arquitetura? | `plano-arquitetura-salao-beleza-v2_4.md` |

## 32.1 Regra de precedência

Quando houver divergência de detalhe de implementação:

1. código e migrations;
2. testes;
3. especificação/verificação;
4. `PROGRESS.md`;
5. documento arquitetural.

A divergência deve ser corrigida na documentação quando descoberta.

---

# 33. Roadmap Atual

## Fase 1 — Núcleo operacional — CONCLUÍDA

- autenticação;
- cadastros;
- comandas;
- pagamentos;
- configuração de comissão.

## Fase 2 — Financeiro — CONCLUÍDA

- fechamento de comanda;
- comissões;
- descontos;
- estornos;
- fechamento de competência;
- ajustes;
- adiantamentos.

## Fase 3 — Estoque e CMV — CONCLUÍDA

- movimentações;
- custo médio;
- CMV;
- saldo negativo;
- relatório/alertas de estoque.

## Fase 4 — Relatórios gerenciais — CONCLUÍDA

- relatório de caixa;
- relatório de comissão;
- APIs;
- páginas;
- testes;
- verify/audit;
- E2E/homologação.

## Fase 5 — UI/UX e consolidação — PRÓXIMA FRENTE

- design system;
- responsividade;
- componentes reutilizáveis;
- estados da interface;
- navegação;
- acessibilidade;
- padronização de formulários/tabelas;
- revisão das páginas existentes.

## Fase 6 — Produção e governança

- backup e recuperação;
- observabilidade;
- endurecimento de segurança;
- LGPD operacional;
- definição do regime contratual;
- preparação para go-live.

## Evoluções futuras

- offline robusto;
- agenda;
- CRM;
- fidelização;
- automações;
- integrações externas;
- integração fiscal;
- WhatsApp automático;
- regime de salão-parceiro, se formalmente adotado.

---

# 34. Decisões Arquiteturais Congeladas

1. PostgreSQL é a fonte oficial.
2. O sistema é mobile-first.
3. Operações financeiras críticas são transacionais.
4. Comandas possuem itens e pagamentos separados.
5. Estoque é baseado em movimentações.
6. Valores financeiros históricos são preservados.
7. Entidades financeiras não são apagadas indiscriminadamente.
8. Segurança é aplicada no banco por RLS.
9. O domínio financeiro não fica concentrado em um único contexto do frontend.
10. O banco é versionado por migrations.
11. Comissão, desconto e rateio de taxa são configuráveis.
12. Competência financeira usa `comandas.closed_at`.
13. Adiantamentos excedentes são transportados.
14. Competência fechada é imutável; correções usam ajustes.
15. Venda nunca é bloqueada por estoque negativo.
16. Comissão de produto é configurável.
17. Comissão pode variar por serviço.
18. `PROFISSIONAL` não possui acesso ao faturamento global/DRE.
19. RLS resolve tenant por `auth_helpers.current_salon_id()`.
20. Novas alterações estruturais entram por migration aditiva.
21. O regime de salão-parceiro não é presumido nem implementado na V1.

---

# 35. RPCs Implementadas

As principais funções financeiras implementadas no banco atual são:

| Função | Migration | Responsabilidade |
|---|---:|---|
| `fn_fechar_comanda` | 0004 | fechamento transacional, pagamentos, taxas, comissão e estoque |
| `fn_cancelar_comanda` | 0006 | cancelamento/estorno de comanda |
| `fn_estornar_pagamento` | 0009 | estorno parcial ou total de pagamento |
| `fn_fechar_competencia_comissao` | 0010 | fechamento de competência e processamento de comissão |
| `fn_calcular_cmv` | 0011 | cálculo de CMV |
| `fn_relatorio_caixa` | 0012 | relatório de caixa |
| `fn_relatorio_comissao` | 0013 | relatório detalhado de comissão |

As RPCs críticas devem manter comportamento transacional, validações de autorização e isolamento por tenant.

---

# 36. Manutenção da Arquitetura

Para evitar nova defasagem documental:

1. não marcar como implementado algo que esteja apenas no roadmap;
2. atualizar este documento após mudança arquitetural relevante;
3. atualizar migrations e testes quando o schema mudar;
4. criar spec/tarefas/AC/evidência para features relevantes;
5. não introduzir novas camadas apenas para satisfazer uma arquitetura idealizada;
6. não instalar bibliotecas apenas para alinhar o código ao documento;
7. preferir evolução incremental por feature;
8. preservar decisões financeiras congeladas, salvo revisão explícita;
9. manter `PROGRESS.md` sincronizado com o estado real;
10. revisar a arquitetura quando uma mudança de produto alterar invariantes do sistema.

---

# 37. Histórico da Consolidação v2.5

A v2.5 consolida a evolução da documentação anterior com as seguintes correções principais:

- versão/status/documento vigente atualizados;
- separação explícita entre implementado, planejado e futuro;
- arquitetura frontend descrita a partir da estrutura física real;
- stack sincronizada com as dependências adotadas;
- `auth_helpers.current_salon_id()` corrigido como nome efetivo da função de tenant;
- relatórios de caixa e comissão registrados como implementados;
- migrations atualizadas até `0013_relatorio_comissao.sql`;
- testes pgTAP, Vitest/Testing Library, ONP e E2E documentados;
- Fases 1–4 marcadas como concluídas;
- Fase 5 definida como UI/UX e consolidação;
- alertas de estoque distinguidos entre visualização atual, Resend planejado e WhatsApp fora do escopo;
- decisões financeiras da v2.4 preservadas;
- conteúdo detalhado de domínio, financeiro, estoque, segurança, auditoria, LGPD e regime contratual reintegrado;
- a arquitetura futura antiga não é tratada como estrutura física já existente.

---

# 38. Pendências Reais

- [ ] Consolidar UI/UX e responsividade antes do go-live.
- [ ] Definir design system mínimo e padrões de componentes.
- [ ] Completar DRE gerencial.
- [ ] Definir backup/recuperação operacional de produção.
- [ ] Definir observabilidade e logs de produção.
- [ ] Operacionalizar requisitos de LGPD.
- [ ] Confirmar regime de contratação dos profissionais.
- [ ] Implementar e-mail automático quando houver necessidade operacional.

Essas pendências não devem ser tratadas como funcionalidades já entregues.

---

## Encerramento

A arquitetura da v2.5 deve servir como documento de referência para evolução do sistema, mas não como substituto de código, migrations, testes ou especificações de features.

O princípio central é:

```text
arquitetura
   ↓
regras de negócio
   ↓
especificação
   ↓
implementação
   ↓
testes
   ↓
evidência
```

A documentação deve continuar verdadeira à medida que o sistema evolui.
