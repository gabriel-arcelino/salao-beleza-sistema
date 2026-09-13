# Documento de Arquitetura e Especificação (v2.4)

## Sistema de Gestão para Salão de Beleza

**Versão:** 2.2
**Status:** Arquitetura proposta — atualizada após pesquisa de validação de produto e negócio, revisão de casos de borda e congelamento das decisões financeiras da Seção 40
**Plataformas:** Web responsiva / Celular / Computador
**Público-alvo:** Salões de beleza e clínicas de estética de pequeno e médio porte

---

## Nota de revisão (v1 → v2)

Esta versão incorpora as conclusões da pesquisa de validação de produto, negócio e arquitetura realizada após a v1, incluindo benchmark de sistemas profissionais brasileiros (principalmente Trinks), verificação da Lei 13.352/2016, LGPD, e definição de competência financeira. Mudanças estão marcadas com **[v2]** ao longo do texto. Resumo das mudanças estruturais:

1. Regras de comissão, taxa e desconto deixam de ser lógica fixa e passam a ser **configuração por salão** (`config_comissoes`, `motivos_desconto`).
2. Nova entidade `fechamentos_comissao` — trava de competência mensal, separando "comissão calculada" de "comissão paga/fechada".
3. Competência financeira definida explicitamente: segue a **data de fechamento da comanda**, não a data do atendimento.
4. CMV definido explicitamente como **Custo Médio Ponderado Móvel** desde a V1 (antes estava em aberto).
5. Idempotência de criação de comanda via UUID gerado no cliente.
6. Padrão concreto de RLS multi-tenant: `salon_id` em `app_metadata` do JWT + função `SECURITY DEFINER`.
7. Postura explícita sobre a Lei 13.352/2016 (salão-parceiro): **não implementar campos de cota-parte na V1**; arquitetura permanece extensível via migration aditiva quando/se o proprietário adotar o regime.
8. Nova seção de LGPD.
9. Matriz de acesso do perfil PROFISSIONAL explicitada.

## **[v2.1]** Nota de revisão adicional — casos de borda

Uma segunda rodada de revisão técnica (foco em implementação das RPCs) identificou quatro pontos de borda. Dois eram lacunas reais e foram incorporados (marcados **[v2.1]**); dois eram confirmações de regras que já estavam corretas e só foram tornadas explícitas:

1. **Arredondamento de centavos em rateios proporcionais** (desconto e taxa entre itens) — lacuna real, corrigida com o método do maior resto (seção 11.3.1).
2. **Adiantamento/vale maior que a comissão do mês** — lacuna real, corrigida com regra de saldo transportado (seção 11.7.1) e novo campo em `fechamentos_comissao`.
3. Múltiplos profissionais no mesmo serviço — já estava corretamente adiado para a Fase 5; nenhuma mudança necessária.
4. Ausência de reserva de estoque em comanda aberta — já era o comportamento correto; tornado explícito (seção 11.1).

## **[v2.2]** Nota de revisão — decisões financeiras congeladas

Após a revisão técnica da Fase 2, três decisões que estavam pendentes na Seção 40 foram congeladas e passam a ser regras definitivas da arquitetura:

1. **Saldo de adiantamento/vale:** quando os adiantamentos/vales excederem a comissão da competência, o excedente será automaticamente transportado para a competência seguinte e abatido no próximo fechamento. `total_pago` nunca será negativo. Liquidações manuais serão registradas como ajustes auditáveis, nunca por alteração retroativa do fechamento.
2. **Competência financeira:** continua sendo determinada exclusivamente por `comandas.closed_at`. A liquidação bancária não altera a competência; apenas pode influenciar o timing do repasse ao profissional quando `timing_repasse = APOS_LIQUIDACAO_BANCARIA`.
3. **Cancelamento após competência fechada:** nunca reabre nem altera uma competência fechada. O cancelamento gera um registro em `ajustes_comissao`, vinculado à competência de origem e lançado na competência aberta vigente.

A Fase 2 passa a considerar `ajustes_comissao` uma entidade financeira oficial e `fechamentos_comissao` um documento de fechamento imutável após `FECHADO`.

---

# 1. Visão Geral

O sistema é uma aplicação web de gestão operacional e financeira desenvolvida para salões de beleza e estabelecimentos de estética.

Seu objetivo principal é permitir que profissionais e/ou recepcionistas registrem atendimentos pelo celular ou computador e que o sistema transforme esses registros em informações operacionais e financeiras confiáveis.

O sistema integra:

* cadastro de profissionais;
* cadastro de clientes;
* cadastro de serviços;
* cadastro de produtos;
* registro de comandas;
* registro de pagamentos;
* cálculo de taxas;
* cálculo de comissões (com regras configuráveis por salão) **[v2]**;
* controle de estoque de produtos de revenda;
* registro de despesas;
* cálculo de CMV por Custo Médio Ponderado Móvel **[v2]**;
* DRE gerencial;
* extrato individual de profissionais;
* fechamento mensal de comissão com trava de competência **[v2]**;
* relatórios gerenciais;
* emissão de comprovantes;
* auditoria das operações.

O sistema não tem como objetivo controlar o consumo de insumos utilizados internamente nos procedimentos, como tinturas, cremes ou produtos de aplicação.

---

# 2. Contexto do Negócio

O sistema foi concebido a partir do seguinte cenário operacional:

| Característica                       |             Cenário inicial |
| ------------------------------------ | --------------------------: |
| Profissionais                        |                           8 |
| Atendimentos médios/dia              |                           8 |
| Atendimentos estimados/mês           |                      ~1.920 |
| Dispositivos                         |        Celular e computador |
| Forma de operação                    |                     Digital |
| Comissão                             | Individual por profissional, configurável **[v2]** |
| Repasse                              |                      Mensal |
| Venda de produtos                    |                         Sim |
| Controle de estoque de produtos      |                         Sim |
| Controle de insumos de procedimentos |                         Não |
| Despesas                             |                         Sim |
| DRE gerencial                        |                         Sim |

O volume inicial é relativamente baixo. Portanto, a prioridade arquitetural é **consistência, segurança, simplicidade operacional e experiência mobile**, e não escalabilidade distribuída excessiva.

---

# 3. Objetivos do Sistema

## 3.1 Objetivo principal

Permitir que o estabelecimento registre e acompanhe toda a operação financeira decorrente dos atendimentos realizados.

## 3.2 Objetivos específicos

O sistema deverá permitir:

1. Registrar atendimentos rapidamente pelo celular.
2. Associar atendimento, cliente e profissional.
3. Registrar serviços realizados.
4. Registrar vendas de produtos.
5. Registrar múltiplas formas de pagamento em uma mesma comanda.
6. Calcular automaticamente as taxas das formas de pagamento.
7. Calcular a comissão de cada profissional, segundo regras **configuráveis por salão** **[v2]**.
8. Fechar comandas de forma transacional e idempotente **[v2]**.
9. Dar baixa automática no estoque de produtos vendidos.
10. Registrar despesas fixas e variáveis.
11. Calcular CMV por Custo Médio Ponderado Móvel **[v2]**.
12. Apresentar DRE gerencial.
13. Gerar extrato mensal individual por profissional.
14. Permitir conferência de valores devidos a cada profissional.
15. Consolidar o fechamento mensal de comissão com trava de competência, impedindo reescrita silenciosa de meses já pagos **[v2]**.
16. Produzir relatórios de faturamento e desempenho.
17. Manter histórico das operações financeiras.
18. Identificar quem realizou ou alterou uma operação.

---

# 4. Escopo

## 4.1 Dentro do escopo

### Operação

* profissionais;
* clientes;
* serviços;
* produtos;
* comandas;
* pagamentos.

### Financeiro

* taxas de pagamento;
* comissões (base e rateio configuráveis) **[v2]**;
* motivos de desconto e seu efeito sobre a comissão **[v2]**;
* despesas;
* fechamento mensal com trava de competência **[v2]**;
* DRE gerencial;
* indicadores financeiros.

### Estoque

* produtos para revenda;
* entradas;
* vendas;
* ajustes;
* perdas;
* inventário;
* estoque mínimo;
* custo médio ponderado móvel **[v2]**.

### Relatórios

* faturamento diário;
* faturamento mensal;
* vendas por profissional;
* vendas por serviço;
* vendas de produtos;
* comissões (calculadas vs. pagas) **[v2]**;
* despesas;
* CMV;
* margem;
* resultado líquido.

### Documentos

* extrato de comissão;
* comprovante;
* impressão;
* compartilhamento via WhatsApp.

---

# 5. Fora do Escopo Inicial

Os seguintes recursos não fazem parte do núcleo da primeira versão:

* controle de estoque de insumos consumidos em procedimentos;
* controle de lote de produtos;
* controle de validade;
* ficha técnica de serviços;
* composição de produtos;
* compras automatizadas;
* integração contábil;
* contabilidade fiscal;
* emissão fiscal;
* folha de pagamento trabalhista;
* **[v2]** implementação do regime de salão-parceiro (Lei 13.352/2016) — campos de cota-parte, retenção tributária e contrato formal de parceria. A arquitetura permanece compatível com uma adoção futura via migration aditiva (ver seção 39), mas nada disso é construído agora;
* agenda avançada;
* marketing automatizado;
* programa de fidelidade;
* CRM avançado;
* marketplace;
* offline robusto com sincronização multi-dispositivo (mitiga-se apenas o caso de reenvio por falha de rede, via idempotência — ver seção 27) **[v2]**.

Esses recursos poderão ser incorporados em versões futuras.

---

# 6. Princípios Arquiteturais

O sistema seguirá os seguintes princípios:

## 6.1 Mobile First

A operação principal será projetada primeiro para telas de celular.

A interface desktop deverá aproveitar o mesmo domínio e regras de negócio, mas poderá utilizar layouts mais densos e dashboards mais completos.

## 6.2 Banco como fonte oficial

O PostgreSQL será a fonte oficial dos dados.

O frontend não deverá ser considerado autoridade sobre dados financeiros.

## 6.3 Regras financeiras centralizadas

Operações críticas deverão ser validadas no servidor/banco.

Isso inclui:

* fechamento de comanda;
* cálculo de taxa;
* cálculo de comissão;
* baixa de estoque;
* cancelamento;
* fechamento financeiro.

## 6.4 Transações atômicas

Operações que produzem múltiplos efeitos financeiros deverão ser realizadas em uma única transação.

Exemplo:

```text
Fechamento da comanda
        ↓
Pagamento
        ↓
Taxa
        ↓
Rateio de desconto entre itens [v2]
        ↓
Comissão (base + rateio de taxa conforme config_comissoes) [v2]
        ↓
Baixa de estoque
        ↓
Registro financeiro
```

Se uma etapa falhar, a operação deverá ser revertida integralmente.

## 6.5 Histórico financeiro

Registros que participam de cálculos financeiros não deverão ser apagados fisicamente de forma indiscriminada.

Sempre que possível deverá ser utilizado:

* status ativo/inativo;
* cancelamento;
* estorno;
* exclusão lógica.

## 6.6 **[v2]** Regras financeiras são configuração, não código

Nenhuma regra financeira crítica (base de cálculo da comissão, quem absorve a taxa de pagamento, se um desconto afeta a comissão, timing do repasse) deve ser uma constante fixa no domínio da aplicação. Todas devem residir em tabelas de configuração por salão (`config_comissoes`, `motivos_desconto`), com valores default sensatos, mas alteráveis pelo administrador sem alteração de código. Essa é a principal lição da pesquisa de mercado: nenhum sistema profissional trata essas regras como fixas.

## 6.7 **[v2]** Extensibilidade sem redesenho destrutivo

Decisões jurídicas ou de negócio ainda não tomadas pelo proprietário (como a adoção do regime de salão-parceiro da Lei 13.352/2016) não devem ser implementadas preventivamente. O schema versionado por migrations já garante que, quando a decisão for tomada, a extensão se dá por **migration aditiva** (coluna/tabela nova, sem alterar registros históricos) — não há necessidade de "reservar espaço" no schema atual para regras de negócio hipotéticas.

## 6.8 **[v2]** Idempotência nas operações críticas de rede móvel

Toda operação que cria um registro financeiro a partir do celular (criação de comanda) deve ser idempotente do ponto de vista do cliente: um UUID gerado localmente antes do envio evita duplicação em caso de reenvio por falha de rede, sem exigir uma arquitetura offline completa.

---

# 7. Arquitetura Geral

A arquitetura será composta por quatro camadas principais:

```text
┌──────────────────────────────────────────┐
│              INTERFACE WEB               │
│       React + TypeScript + Tailwind      │
└─────────────────────┬────────────────────┘
                      │
┌─────────────────────▼────────────────────┐
│          CAMADA DE APLICAÇÃO             │
│       Hooks / Use Cases / Services       │
└─────────────────────┬────────────────────┘
                      │
┌─────────────────────▼────────────────────┐
│             DOMÍNIO                      │
│ Vendas | Comissões | Estoque | Financeiro│
└─────────────────────┬────────────────────┘
                      │
┌─────────────────────▼────────────────────┐
│              SUPABASE                    │
│ PostgreSQL | RLS | RPC | Auth | Storage │
└──────────────────────────────────────────┘
```

---

# 8. Stack Tecnológica

## Frontend

* React 18+
* Vite
* TypeScript
* TypeScript Strict Mode
* Tailwind CSS
* Recharts
* Lucide React

## Backend / Persistência

* Supabase
* PostgreSQL
* Supabase Auth
* Row Level Security
* PostgreSQL Functions/RPC
* Triggers quando apropriado

## Persistência local

A primeira versão poderá utilizar armazenamento local para cache e experiência de operação, porém a persistência offline completa deverá utilizar uma tecnologia apropriada, como IndexedDB, caso seja necessária sincronização offline robusta.

`localStorage` não deverá ser tratado como banco principal ou mecanismo definitivo de sincronização.

**[v2]** A stack permanece deliberadamente enxuta — bibliotecas adicionais de gerenciamento de estado ou componentes (ex.: gerenciadores de estado global, bibliotecas de componentes prontos) só devem ser introduzidas se um problema concreto justificar, não preventivamente.

---

# 9. Modelo de Domínio

As principais entidades do sistema são:

```text
USUÁRIO
   │
   └── PROFISSIONAL

CLIENTE
   │
   └── COMANDA (uuid_cliente [v2])
          │
          ├── COMANDA_ITEM ─── SERVIÇO
          │        │
          │        ├── MOTIVO_DESCONTO [v2]
          │        └── FECHAMENTO_COMISSAO [v2] (quando processado)
          │
          ├── COMANDA_ITEM ─── PRODUTO
          │
          └── PAGAMENTO

PRODUTO
   │
   └── MOVIMENTAÇÃO_ESTOQUE (custo médio ponderado móvel) [v2]

DESPESA

CONFIGURAÇÃO_TAXAS

CONFIG_COMISSOES [v2] (por profissional, opcionalmente por serviço)

FECHAMENTO_COMISSAO [v2] (por profissional × competência)
```

---

# 10. Entidades

## 10.1 Profissionais

Representa as pessoas que executam os serviços.

Campos principais:

```text
id
nome
telefone
comissao_percentual_padrao   -- [v2] renomeado: é o default, pode ser sobrescrito por serviço em config_comissoes
ativo
created_at
updated_at
```

A comissão padrão será configurada individualmente por profissional. **[v2]** Overrides por serviço específico ficam em `config_comissoes` (ver 10.9.1), não neste cadastro.

---

# 10.2 Usuários

Representa as contas que podem acessar o sistema.

Campos:

```text
id
auth_user_id
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

Um profissional poderá estar associado a um usuário, mas usuário e profissional são conceitos distintos. Profissionais sem conta de sistema (lançados exclusivamente pela recepção) continuam recebendo extrato via impressão ou WhatsApp normalmente. **[v2]**

---

# 10.3 Clientes

Representa os clientes atendidos.

Campos sugeridos:

```text
id
nome
telefone
email
observacoes
ativo
created_at
updated_at
```

O histórico de atendimento deverá ser obtido pelas relações com as comandas.

---

# 10.4 Serviços

Representa os serviços oferecidos pelo estabelecimento.

Campos:

```text
id
nome
categoria
preco
duracao_minutos
ativo
created_at
updated_at
```

Exemplos:

```text
Corte
Escova
Coloração
Manicure
Pedicure
Progressiva
```

O preço cadastrado representa o preço atual. O preço efetivamente vendido deverá ser armazenado no item da comanda como um snapshot histórico.

---

# 10.5 Produtos

Representa produtos destinados à venda.

Campos:

```text
id
sku
nome
categoria
preco_custo          -- atualizado a cada entrada; reflete o custo médio ponderado móvel vigente [v2]
preco_venda
percentual_comissao   -- [v2.3] nullable; NULL herda o default de config_comissoes.comissao_sobre_produto (on/off); valor preenchido sobrescreve com percentual próprio para este produto, independente do percentual de serviço
estoque_minimo
ativo
created_at
updated_at
```

O sistema controlará estoque de produtos comercializados.

Não haverá, no escopo inicial, controle de consumo interno de insumos utilizados nos procedimentos.

---

# 10.6 Comandas

Representa o atendimento comercial.

Campos principais:

```text
id
numero
uuid_cliente              -- [v2] gerado no dispositivo antes do envio; UNIQUE; garante idempotência de criação
cliente_id
profissional_id           -- profissional "principal" para exibição; ver nota abaixo
status
subtotal
desconto
total
opened_at
closed_at                 -- [v2] equivale à data_fechamento_comanda; base da competência financeira
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

Uma comanda poderá conter vários itens.

**[v2] Nota sobre `profissional_id` no cabeçalho:** quando os itens da comanda têm profissionais diferentes, este campo é apenas o profissional "principal" para exibição em listagens e recibos (ex.: quem abriu o atendimento). Nenhum cálculo financeiro (comissão, rateio) deve usar este campo — todo cálculo financeiro usa exclusivamente `comanda_itens.profissional_id`.

---

# 10.7 Itens da Comanda

Cada serviço ou produto vendido será registrado como item.

Campos sugeridos:

```text
id
comanda_id
tipo
servico_id
produto_id
descricao_snapshot
quantidade
data_atendimento              -- [v2] momento em que o serviço foi realizado; apenas exibição/auditoria
preco_unitario
desconto
motivo_desconto_id            -- [v2] FK para motivos_desconto; obrigatório se houver desconto
total
profissional_id
comissao_percentual_snapshot
comissao_valor_snapshot
comissao_processada           -- [v2] boolean; marca se já entrou em um fechamento mensal
fechamento_comissao_id        -- [v2] FK opcional para fechamentos_comissao
created_at
```

Tipos:

```text
SERVICO
PRODUTO
```

O `descricao_snapshot`, o `preco_unitario`, e os campos de comissão são armazenados para preservar o histórico mesmo que o cadastro original seja alterado futuramente. **Nunca são recalculados retroativamente** por alteração de cadastro, taxa ou configuração de comissão posterior. **[v2]**

**[v2] Item do tipo PRODUTO e comissão:** só recebe `profissional_id`/comissão se o salão configurar que produtos vendidos no balcão geram comissão (ver 11.3). Caso contrário, o campo permanece nulo.

---

# 10.8 Pagamentos

Uma comanda poderá receber um ou mais pagamentos.

Campos:

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
data_liquidacao_bancaria      -- [v2] estimada; usada em conciliação, não em competência
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

A estrutura permite pagamentos divididos.

Exemplo:

```text
Comanda: R$ 300

PIX       R$ 100
Crédito   R$ 200
```

**[v2] Rateio de taxa entre itens/profissionais:** quando há mais de um pagamento e/ou mais de um profissional na mesma comanda, a taxa de cada pagamento é rateada entre os itens proporcionalmente ao valor de cada item (regra default; ver 11.3.2). O valor rateado por item fica registrado no snapshot do item, não recalculável.

---

# 10.9 Configuração de Taxas

Representa as taxas aplicáveis às formas de pagamento.

Campos:

```text
id
metodo
taxa_percentual
ativo
updated_at
```

As taxas utilizadas em uma operação deverão ser gravadas na própria transação, de maneira que alterações futuras na configuração não modifiquem operações históricas.

---

# 10.9.1 **[v2]** Configuração de Comissões (`config_comissoes`)

Nova entidade — resolve a lacuna mais importante identificada na pesquisa: a base de cálculo da comissão não pode ser uma regra fixa.

Campos:

```text
id
salon_id
profissional_id
servico_id                -- opcional; NULL = aplica ao profissional em qualquer serviço
comissao_percentual       -- sobrescreve profissionais.comissao_percentual_padrao quando presente
base_calculo               -- BRUTO | LIQUIDO_APOS_DESCONTO
rateio_taxa                 -- SALAO | PROFISSIONAL_PROPORCIONAL | POR_FORMA_PAGAMENTO
rateio_taxa_por_forma_pagamento  -- [v2.3] jsonb; obrigatório quando rateio_taxa = POR_FORMA_PAGAMENTO; chave = método de pagamento, valor = % absorvido pelo profissional. Ex.: {"CREDITO": 100, "PIX": 0, "DEBITO": 0}
comissao_sobre_produto      -- boolean; se produtos vendidos no balcão geram comissão (default do profissional; ver 10.5 para override por produto)
timing_repasse               -- IMEDIATO | APOS_LIQUIDACAO_BANCARIA
created_at
updated_at
```

Constraint: `UNIQUE (salon_id, profissional_id, servico_id)`.

Resolução em tempo de fechamento: buscar override específico (`profissional_id` + `servico_id`); se não existir, usar override do profissional (`servico_id IS NULL`); se não existir, usar default do salão.

**[v2.3] Decisão fechada (Seção 40):** removida a opção `PERSONALIZADO` (preenchimento manual no fechamento, que criava um passo humano dentro de uma RPC que deve ser transacional e determinística). No lugar, `POR_FORMA_PAGAMENTO` resolve o rateio de taxa de forma automática e auditável a partir de `rateio_taxa_por_forma_pagamento`, sem intervenção manual no momento do fechamento.

---

# 10.9.2 **[v2]** Motivos de Desconto (`motivos_desconto`)

```text
id
salon_id
descricao
afeta_comissao       -- boolean, default true
ativo
created_at
```

Todo desconto aplicado a um item ou à comanda deve referenciar um motivo. Se `afeta_comissao = false` (ex.: "cortesia por atraso do salão", desconto que o salão decide arcar sozinho), a base de cálculo da comissão não é reduzida por aquele desconto específico.

---

# 10.10 Movimentações de Estoque

O saldo do estoque deverá ser baseado em movimentações registradas.

Campos:

```text
id
produto_id
tipo
quantidade
custo_unitario           -- [v2] custo médio ponderado móvel vigente no momento da movimentação
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

Exemplo:

```text
Produto: Shampoo X

ENTRADA      +20
VENDA         -2
PERDA         -1
AJUSTE        +3
----------------
Saldo         20
```

**[v2] Custo médio ponderado móvel:** a cada `ENTRADA`, recalcular `produtos.preco_custo` como:

```text
novo_custo_medio =
  (estoque_atual × custo_medio_atual + quantidade_entrada × custo_entrada)
  / (estoque_atual + quantidade_entrada)
```

O custo usado em cada `VENDA` (para fins de CMV) é o `preco_custo` (custo médio) vigente no momento da venda, não recalculado retroativamente.

**[v2.4] Estoque negativo — decisão revista (Seção 40):** a venda **nunca é bloqueada** por falta de estoque. O fechamento da comanda prossegue normalmente mesmo que o produto fique com saldo negativo — prioriza não deixar o cliente esperando no balcão, como é padrão de mercado. A movimentação é registrada normalmente (`tipo = VENDA`), sem necessidade de motivo ou autorização de perfil superior; o saldo negativo fica visível no relatório de estoque (ver Seção 15) até o GERENTE fazer a correção (via `ENTRADA` ou `AJUSTE`) quando puder.

**[v2.4] Correção de custo médio após saldo negativo:** a fórmula padrão de custo médio ponderado móvel (abaixo) assume `estoque_atual >= 0`. Quando uma `ENTRADA` ocorre com o produto em saldo negativo, a ponderação pelo estoque negativo produziria um custo médio matematicamente incorreto. Regra de exceção: se `estoque_atual < 0` no momento da `ENTRADA`, o novo `custo_medio` é definido como o **próprio `custo_entrada`** (reset — ignora o peso do saldo negativo), e não como uma média ponderada com ele. O saldo passa a `estoque_atual + quantidade_entrada` normalmente (pode continuar negativo, zerar, ou virar positivo, dependendo da quantidade que entrou).

Esse histórico permitirá auditoria do estoque.

---

# 10.11 Despesas

Representa os gastos do estabelecimento.

Todas as despesas pertencem a um `salon_id`. Quando a despesa representar adiantamento/vale de profissional, `profissional_id` será preenchido e a referência não poderá ser removida enquanto houver dependência financeira.

Campos:

```text
id
salon_id
descricao
categoria
tipo
valor
profissional_id          -- preenchido para adiantamentos/vales vinculados a profissional
data_competencia
data_pagamento
status
observacao
created_by
created_at
updated_at
```

Tipos:

```text
FIXA
VARIAVEL
```

Exemplos:

```text
Aluguel
Internet
Sistema
Energia
Manutenção
Taxas
Material de limpeza
Fornecedor
```

**[v2] Vale/adiantamento a profissional:** registrado como despesa vinculada a um `profissional_id`, categoria específica (ex.: `ADIANTAMENTO`). Abatido automaticamente no fechamento mensal de comissão correspondente (ver 10.12 e 11.7).

---

# 10.12 **[v2]** Fechamentos de Comissão (`fechamentos_comissao`)

Nova entidade — separa "comissão calculada" (automática, item a item) de "comissão paga/fechada" (ação deliberada mensal).

Campos:

```text
id
salon_id
profissional_id
competencia              -- ex.: 2026-08 (mês/ano)
status                    -- ABERTO | FECHADO
total_bruto_calculado
total_adiantamentos_abatidos
saldo_anterior_competencia    -- [v2.2] débito recebido da competência anterior
total_ajustes                  -- [v2.2] ajustes lançados na competência atual
total_pago                     -- [v2.2] nunca negativo
saldo_devedor_gerado          -- [v2.2] excedente transportado para a competência seguinte
fechado_em
fechado_por
created_at
```

Constraint: `UNIQUE (salon_id, profissional_id, competencia)`.

Depois de `status = FECHADO`, os valores financeiros e vínculos do fechamento são imutáveis. Qualquer correção posterior ocorre por meio de `ajustes_comissao`, sem reabrir nem reescrever o fechamento histórico.

Regra: enquanto `status = ABERTO`, os itens do período (`comanda_itens.comissao_processada = false`) continuam sendo agregados normalmente ao extrato provisório. Ao mudar para `FECHADO`, o sistema marca todos os itens do período como `comissao_processada = true` e vincula `fechamento_comissao_id`. **Nenhuma edição retroativa é permitida em uma competência fechada.** Correções entram como lançamento de ajuste (`ajuste_comissao`) na competência aberta vigente, referenciando a competência original.

---

# 11. Regras de Negócio

## 11.1 Fechamento de comanda

Uma comanda somente poderá ser finalizada quando:

1. possuir pelo menos um item;
2. o valor dos pagamentos for compatível com o valor final;
3. todos os itens estiverem válidos;
4. produtos vendidos possuírem estoque disponível — **[v2.4]** removido como condição de bloqueio; venda prossegue mesmo com saldo insuficiente (ver 10.10);
5. os valores financeiros puderem ser processados integralmente.

O fechamento deverá ocorrer dentro de uma operação transacional e ser **idempotente** via `uuid_cliente` (ver 6.8). **[v2]**

**[v2.1] Estoque em comanda aberta:** adicionar um produto a uma comanda `ABERTA` **não reserva nem consulta bloqueio de estoque**. A checagem de disponibilidade (item 4 acima) ocorre apenas no momento do fechamento. Isso é intencional: evita que uma comanda esquecida aberta prenda estoque indevidamente para outros atendimentos.

---

# 11.2 Cálculo de taxa

Para cada pagamento:

```text
taxa_valor =
valor_bruto × taxa_percentual
```

e:

```text
valor_liquido =
valor_bruto - taxa_valor
```

Exemplo:

```text
Pagamento: R$ 200,00
Taxa: 3%

Taxa = R$ 6,00
Líquido = R$ 194,00
```

---

# 11.3 **[v2]** Cálculo de comissão (regra configurável)

**A base de cálculo da comissão não é fixa** — é resolvida a partir de `config_comissoes` (ver 10.9.1) no momento do fechamento da comanda.

## 11.3.1 Rateio de desconto entre itens

Quando o desconto é aplicado no total da comanda (não item a item), ele é distribuído proporcionalmente ao valor bruto de cada item:

```text
desconto_item_i =
desconto_total × (valor_bruto_item_i / soma_valor_bruto_de_todos_os_itens)
```

O valor resultante é gravado como `comanda_itens.desconto` (snapshot, não recalculável).

**[v2.1] Arredondamento de centavos:** a divisão proporcional acima pode gerar dízimas que não fecham exatamente com o total ao arredondar cada item para centavos. A RPC de fechamento deve usar o **método do maior resto** (largest remainder):

```text
1. Calcular o valor proporcional de cada item com precisão total (sem arredondar).
2. Arredondar cada item para baixo, em centavos (floor).
3. Calcular a diferença entre o total original e a soma dos valores arredondados
   (essa diferença é sempre um pequeno número de centavos).
4. Distribuir um centavo por vez aos itens com maior resto decimal descartado
   no passo 2, até a diferença zerar.
```

Isso garante que a soma dos itens sempre feche exatamente com o valor total cobrado, sem favorecer sistematicamente o mesmo item em caso de empate. A mesma regra de arredondamento se aplica ao rateio de taxa entre itens (seção 11.3.2).

Se o `motivo_desconto` associado tiver `afeta_comissao = false`, este desconto **não** reduz a base de cálculo da comissão daquele item, mesmo reduzindo o valor cobrado do cliente.

## 11.3.2 Base de cálculo e rateio de taxa

Para cada item, resolvida a configuração aplicável (`config_comissoes`):

```text
base_comissao =
  se base_calculo = BRUTO:      preco_unitario_item
  se base_calculo = LIQUIDO:    preco_unitario_item - desconto_afetante_comissao
```

Se `rateio_taxa = PROFISSIONAL_PROPORCIONAL`, a taxa de cada pagamento da comanda é distribuída entre os itens proporcionalmente ao valor de cada item, e subtraída da base de comissão daquele item. Se `rateio_taxa = SALAO`, a taxa não afeta a base de comissão (o salão absorve integralmente). Se `rateio_taxa = POR_FORMA_PAGAMENTO` **[v2.3]**, o percentual absorvido pelo profissional é lido de `rateio_taxa_por_forma_pagamento[metodo_do_pagamento]` — sem intervenção manual; se o método do pagamento não estiver mapeado no jsonb, a RPC deve rejeitar o fechamento (falha explícita, não default silencioso).

```text
comissao_item =
base_comissao × comissao_percentual_resolvido
```

Ambos os valores (percentual e valor final) são gravados em `comanda_itens.comissao_percentual_snapshot` e `comissao_valor_snapshot` — **congelados definitivamente no fechamento**, nunca recalculados por alteração posterior de cadastro, taxa ou configuração.

**Exemplo (config default recomendada — base bruta, taxa por conta do salão):**

```text
Serviço: R$ 200,00
Desconto: R$ 0,00
Taxa de cartão: R$ 6,00 (absorvida pelo salão)
Comissão: 50%

Base de comissão = R$ 200,00
Comissão = R$ 100,00
```

## 11.3.3 Venda de produto e comissão

Produtos só geram comissão se `config_comissoes.comissao_sobre_produto = true` para o profissional/vendedor associado ao item. Quando geram, o percentual aplicado é resolvido assim **[v2.3]**:

```text
1. Se produtos.percentual_comissao IS NOT NULL → usa esse percentual (override por produto).
2. Senão → usa o comissao_percentual resolvido em config_comissoes (mesmo percentual do serviço).
```

Isso permite, por exemplo, que uma categoria de produto de maior margem tenha comissão própria sem afetar o percentual de serviço do profissional.

## 11.3.4 Vendas não totalmente pagas

A comissão é calculada sobre o valor total do item, independentemente de o pagamento estar total, parcial ou pendente — salvo configuração explícita em contrário.

---

# 11.4 Venda de produto

Quando uma comanda contendo produto for finalizada:

```text
Comanda finalizada
        ↓
Venda confirmada
        ↓
Movimentação de estoque (custo médio ponderado móvel vigente) [v2]
        ↓
Quantidade reduzida
```

A movimentação deverá possuir referência à origem, permitindo descobrir qual venda provocou a baixa.

---

# 11.5 Cancelamento e estorno

Uma comanda finalizada não deverá simplesmente ser apagada.

O sistema deverá registrar o cancelamento ou estorno.

Quando necessário:

```text
Venda
 ↓
Cancelamento
 ↓
Estorno financeiro
 ↓
Estorno de estoque
 ↓
Ajuste da comissão
```

**[v2]** Se a comanda cancelada pertence a uma competência de comissão já **fechada** (`fechamentos_comissao.status = FECHADO`), o sistema **não** reabre nem reescreve o fechamento antigo. Em vez disso, gera um lançamento de ajuste em `ajustes_comissao` (valor negativo) na competência aberta vigente, referenciando o item/competência original.

Essas operações deverão deixar histórico.

---

# 11.6 **[v2]** Competência financeira

O sistema distingue **regime de competência** (quando o fato financeiro é reconhecido — DRE, faturamento, comissão) de **regime de caixa** (quando o dinheiro entra ou sai — fluxo de caixa, conciliação bancária).

| Data | Definição | Alimenta | Regime |
|---|---|---|---|
| `comanda_itens.data_atendimento` | Momento em que o serviço foi realizado | Exibição/auditoria apenas | — |
| `comandas.closed_at` (data de fechamento) | Momento em que a comanda foi encerrada e cobrada | Faturamento, DRE, comissão, baixa de estoque | **Competência** |
| `pagamentos.paid_at` | Recebimento do cliente | Fluxo de caixa (entrada) | Caixa |
| `pagamentos.data_liquidacao_bancaria` | Valor cai na conta do salão | Conciliação bancária | Caixa |
| `fechamentos_comissao.fechado_em` | Encerramento do ciclo mensal | Trava de competência | Competência |
| (repasse ao profissional) | Pagamento efetivo da comissão | Fluxo de caixa (saída) | Caixa |

**Regra central:** a competência de um atendimento é definida pela **data de fechamento da comanda**, nunca pela data do atendimento. Isso é consequência direta da arquitetura transacional (seção 6.4): a comissão só existe a partir do fechamento, que é o evento que a calcula e a congela. Se um atendimento ocorre às 23h de um dia e a comanda só é fechada no dia seguinte, toda a transação (faturamento, comissão, baixa de estoque) pertence à competência do dia do fechamento.

O timing do **repasse** ao profissional (imediato no fechamento mensal vs. atrelado à liquidação bancária de cada parcela de cartão) é configurável por profissional/salão (`config_comissoes.timing_repasse`) — não deve ser presumido como sempre imediato.

---

# 11.7 **[v2]** Fechamento mensal de comissão

1. O fechamento mensal consolida todos os itens com `comissao_processada = false` de um profissional dentro da competência.
2. Adiantamentos/vales (despesas vinculadas ao profissional) são abatidos do total a repassar.
3. Ao confirmar o fechamento, o sistema:
   - cria/atualiza o registro em `fechamentos_comissao` com `status = FECHADO`;
   - marca todos os itens do período como `comissao_processada = true` e associa `fechamento_comissao_id`;
   - bloqueia qualquer edição direta dos itens daquela competência.
4. Ajustes retroativos (por cancelamento de venda antiga, correção de erro) nunca reabrem a competência fechada — geram lançamento de ajuste na competência aberta vigente (ver 11.5).

## 11.7.1 **[v2.2]** Saldo negativo de adiantamentos

Se os adiantamentos/vales do mês excederem a comissão calculada, `total_pago` **nunca fica negativo** — o sistema segue esta regra:

```text
total_pago = MAX(0, total_bruto_calculado - total_adiantamentos_abatidos - saldo_anterior_competencia)
```

O excedente não coberto é gravado em `saldo_anterior_competencia` da competência **seguinte**, ainda aberta, e passa a ser abatido automaticamente no próximo fechamento — como um débito rolado, nunca como reescrita da competência atual. Uma liquidação manual do saldo devedor (ex.: acerto direto em dinheiro fora do sistema) pode ser registrada como um lançamento de ajuste que zera o `saldo_anterior_competencia`, com auditoria. **Esta regra é definitiva e congelada pela revisão da Seção 40. Liquidação manual do saldo devedor somente poderá ocorrer por meio de lançamento de ajuste auditável.**

---

# 12. DRE Gerencial

A DRE será gerencial e não deverá ser apresentada como substituta da contabilidade oficial.

Estrutura conceitual:

```text
FATURAMENTO BRUTO
        │
        ├── descontos
        └── outras deduções
        ↓
RECEITA LÍQUIDA
        │
        └── CMV
        ↓
MARGEM BRUTA
        │
        ├── comissões
        ├── despesas operacionais
        └── demais custos
        ↓
RESULTADO OPERACIONAL
        │
        ↓
LUCRO / RESULTADO LÍQUIDO GERENCIAL
```

Cada linha da DRE deverá possuir uma definição formal de quais transações são incluídas. **[v2]** Todas as linhas seguem o **regime de competência** definido na seção 11.6 (data de fechamento da comanda), não o regime de caixa.

---

# 13. CMV

**[v2]** O método adotado é o **Custo Médio Ponderado Móvel** (definido desde a V1, não postergado — ver fórmula em 10.10). É o método mais simples e mais usado por pequenas e médias empresas brasileiras nesse porte, e suficiente para o volume do salão (poucos produtos, ~1.920 atendimentos/mês). FIFO não é adotado por não trazer benefício proporcional à complexidade adicional.

Para uma venda de produto:

```text
quantidade vendida
×
custo médio ponderado móvel vigente no momento da venda
=
CMV
```

---

# 14. Extrato de Comissão

O sistema deverá gerar um extrato mensal individual.

Exemplo:

```text
EXTRATO DE COMISSÃO

Profissional: Maria
Competência: Agosto/2026
Status: FECHADO [v2]

Atendimentos
----------------------------------
Corte                  R$ 120,00
Coloração              R$ 250,00
Escova                  R$ 80,00

Faturamento bruto      R$ 450,00
Base de comissão       R$ 450,00   (config: base bruta, taxa por conta do salão) [v2]
Percentual                50%
Comissão calculada     R$ 225,00
Adiantamentos          R$  20,00   [v2]
----------------------------------
TOTAL A PAGAR          R$ 205,00
```

O extrato poderá ser:

* visualizado;
* impresso;
* convertido em documento;
* compartilhado via WhatsApp.

---

# 15. Relatórios

## Operacionais

* atendimentos do dia;
* comandas abertas;
* comandas finalizadas;
* vendas por profissional;
* serviços realizados;
* produtos vendidos.

## Financeiros

* faturamento diário;
* faturamento mensal;
* receita líquida;
* taxas;
* comissões calculadas vs. pagas **[v2]**;
* despesas;
* CMV;
* margem bruta;
* resultado líquido gerencial.

## Estoque

* saldo atual;
* **produtos com saldo negativo — pendentes de correção [v2.4]**, substitui o antigo controle de bypass como principal mecanismo de visibilidade sobre venda-sem-estoque;
* produtos abaixo do mínimo;
* entradas;
* vendas;
* perdas;
* ajustes;
* histórico de movimentações;
* custo médio atual por produto **[v2]**.

## Profissionais

* faturamento por profissional;
* quantidade de atendimentos;
* comissão acumulada;
* comissão por competência;
* extrato mensal;
* status do fechamento (aberto/fechado) **[v2]**.

---

# 16. Dashboard

O dashboard executivo deverá apresentar, pelo menos:

```text
Faturamento
Receita líquida
Comissões
CMV
Despesas
Resultado líquido
Margem
```

Também poderá exibir:

* faturamento por período;
* desempenho por profissional;
* serviços mais vendidos;
* produtos mais vendidos;
* evolução de receita;
* distribuição de pagamentos.

O dashboard deverá priorizar informação de gestão, não apenas gráficos decorativos.

## 16.1 **[v2.4]** Alertas operacionais

Ao logar, usuários com perfil ADMIN/GERENTE veem um card de destaque no topo do dashboard sempre que houver **produtos com saldo negativo** (ver 10.10, 15) — não é um relatório que precisa ser procurado, aparece de cara. Clicar no card leva direto à lista de produtos pendentes de correção.

**Canais de notificação para esse alerta:**

| Canal | Papel | Complexidade |
|---|---|---|
| In-app (card no dashboard) | Principal — cobre quem usa o sistema no dia a dia | Trivial — é uma query + componente de UI, sem integração externa |
| E-mail diário (Resend) | Rede de segurança para quem não logou naquele dia | Baixa — função agendada, já está na stack |
| WhatsApp | **Permanece manual** (Seção 28) — sem alerta automático | — |

Essa mesma estrutura (card no dashboard + e-mail diário) é o padrão a reaproveitar para qualquer alerta operacional futuro (ex.: estoque abaixo do mínimo, competência de comissão não fechada) — não é exclusivo de saldo negativo.

---

# 17. Segurança

O sistema utilizará autenticação e autorização.

## 17.1 Autenticação

O acesso deverá ser realizado por usuário autenticado.

## 17.2 Autorização

As permissões dependerão do perfil do usuário.

### Administrador

Acesso completo, incluindo configuração de `config_comissoes`, `motivos_desconto` e fechamento mensal.

### Gerente

Acesso operacional e financeiro, conforme configuração; pode confirmar fechamento mensal. **[v2.4]** Não autoriza mais bypass de estoque — essa exceção deixou de existir; venda com saldo insuficiente é comportamento padrão do sistema, correção de saldo negativo é feita via `ENTRADA`/`AJUSTE` quando conveniente.

### Recepção

Operação de clientes, comandas e pagamentos. Sem acesso a configuração de comissão ou fechamento mensal.

### Profissional

**[v2] Matriz explícita de acesso:**

| Recurso | Acesso |
|---|---|
| Clientes | Visualiza todos (necessário para atender) |
| Comandas de outros profissionais | Não visualiza valores/comissão de terceiros |
| Própria comissão/extrato | Visualiza integralmente, inclusive histórico |
| Comissão/extrato de outros profissionais | Sem acesso |
| Faturamento global do salão / DRE | **Sem acesso, sem exceção** — decisão fechada na Seção 40 (v2.3); removida a exceção anterior de concessão manual pelo ADMIN. Se essa flexibilidade for necessária no futuro, deve ser uma decisão de produto nova, não uma porta deixada aberta na V1 |
| Configuração de comissão/taxa | Sem acesso |

---

# 18. Multi-tenancy

A arquitetura deverá ser preparada para múltiplos salões.

Todas as entidades relevantes deverão possuir:

```text
salon_id
```

ou equivalente, incluindo `config_comissoes`, `motivos_desconto` e `fechamentos_comissao` **[v2]**.

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

As políticas de RLS deverão garantir que um usuário somente consiga consultar ou alterar dados pertencentes ao salão ao qual está vinculado.

Isso permitirá evoluir de:

```text
Sistema de um salão
```

para:

```text
SaaS para múltiplos salões
```

sem reconstruir o modelo de dados posteriormente.

---

# 19. Row Level Security

A segurança deverá ser implementada no PostgreSQL por meio de RLS.

O frontend não deverá ser considerado mecanismo de segurança.

Mesmo que um usuário manipule diretamente uma requisição, o banco deverá impedir acesso a dados de outro estabelecimento.

**[v2] Padrão concreto recomendado:**

```text
1. salon_id do usuário fica em app_metadata do JWT
   (não editável pelo cliente, ao contrário de user_metadata)

2. Função auxiliar SECURITY DEFINER resolve o tenant:

   CREATE FUNCTION auth.current_salon_id() RETURNS uuid
   ... (lê app_metadata->>'salon_id' do JWT) ...

3. Toda política de RLS usa essa função, ex.:

   USING (salon_id = auth.current_salon_id())

4. Centraliza a lógica de resolução de tenant em um único
   lugar auditável, em vez de repetir a subquery em cada política.
```

As políticas deverão controlar separadamente:

```text
SELECT
INSERT
UPDATE
DELETE
```

conforme o perfil do usuário.

Operações financeiras críticas também deverão possuir validações de domínio no backend/banco — **RLS decide quais linhas o usuário vê/altera, mas não substitui validação de regra de negócio** (ex.: estoque suficiente, comanda com ao menos um item). Essas validações vivem nas funções RPC de fechamento. **[v2]**

---

# 20. Auditoria

O sistema deverá possuir mecanismo de auditoria para operações relevantes.

Eventos recomendados:

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
ESTOQUE_NEGATIVO_AUTORIZADO      -- [v2]
FECHAMENTO_COMISSAO_MENSAL       -- [v2]
AJUSTE_COMISSAO_RETROATIVO       -- [v2]
```

Registro sugerido:

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

Isso permitirá responder:

* quem realizou a operação;
* quando ocorreu;
* o que foi alterado;
* qual era o valor anterior;
* qual passou a ser o novo valor.

---

# 21. Tratamento Monetário

Valores monetários não deverão utilizar `float` como representação financeira no banco.

No PostgreSQL deverá ser utilizado tipo decimal/numeric.

Exemplo:

```sql
numeric(14,2)
```

Isso será aplicado a:

* preços;
* pagamentos;
* taxas;
* descontos;
* comissões;
* despesas;
* CMV;
* resultados.

O frontend deverá manter uma política consistente de arredondamento.

---

# 22. Arquitetura do Frontend

Estrutura recomendada:

```text
src/

├── app/
│
├── components/
│   ├── Header/
│   ├── Dashboard/
│   ├── Comandas/
│   ├── Clientes/
│   ├── Profissionais/
│   ├── Servicos/
│   ├── Produtos/
│   ├── Estoque/
│   ├── Despesas/
│   ├── Comissoes/
│   ├── FechamentoMensal/     -- [v2]
│   └── Relatorios/
│
├── hooks/
│   ├── useAuth.ts
│   ├── useComandas.ts
│   ├── useClientes.ts
│   ├── useEstoque.ts
│   ├── useComissoes.ts
│   ├── useFechamentoMensal.ts   -- [v2]
│   └── useDRE.ts
│
├── domain/
│   ├── sales/
│   ├── commissions/
│   ├── inventory/
│   └── financial/
│
├── repositories/
│   ├── salesRepository.ts
│   ├── inventoryRepository.ts
│   ├── professionalRepository.ts
│   └── expenseRepository.ts
│
├── services/
│   ├── supabase/
│   ├── receipts/
│   └── whatsapp/
│
├── types/
│
└── utils/
```

A lógica de negócio não deverá ficar concentrada em um único `SalonContext.tsx`.

---

# 23. Banco de Dados

Estrutura inicial recomendada:

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
config_comissoes        -- [v2]
motivos_desconto        -- [v2]
movimentacoes_estoque
despesas
fechamentos_comissao    -- [v2]
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
  ├── config_comissoes [v2]
  ├── motivos_desconto [v2]
  ├── fechamentos_comissao [v2]
  └── configurações
```

```text
comanda
  ├── comanda_itens
  └── pagamentos
```

```text
produto
  └── movimentacoes_estoque
```

```text
profissional
  └── fechamentos_comissao (1:N, um por competência) [v2]
```

---

# 24. Migrations

O schema do banco deverá ser versionado no repositório.

Estrutura:

```text
supabase/

└── migrations/
    ├── 001_initial_schema.sql
    ├── 002_auth_and_rls.sql
    ├── 003_services_and_products.sql
    ├── 004_sales_and_payments.sql
    ├── 005_inventory.sql
    ├── 006_commissions.sql
    ├── 007_expenses_and_dre.sql
    ├── 008_audit_log.sql
    ├── 009_config_comissoes_e_motivos_desconto.sql   -- [v2]
    └── 010_fechamentos_comissao.sql                   -- [v2]
    └── 011_fase2_financeiro.sql                       -- [v2.2] despesas, fechamentos, ajustes, RPCs e RLS
```

**[v2]** Futura adoção da Lei 13.352/2016, se decidida pelo proprietário, entra como uma migration aditiva nova (ex.: `011_salao_parceiro.sql`), sem alterar as anteriores.

O banco de produção não deverá depender da cópia manual de um SQL armazenado em uma tela do frontend.

---

# 25. Operação Principal

O fluxo principal deverá ser:

```text
Usuário acessa
      ↓
Autenticação
      ↓
Seleciona profissional / usuário
      ↓
Nova comanda (uuid_cliente gerado localmente) [v2]
      ↓
Seleciona cliente
      ↓
Adiciona serviços (profissional por item)
      ↓
Adiciona produtos
      ↓
Aplica desconto (motivo obrigatório) [v2]
      ↓
Confere total
      ↓
Seleciona pagamento
      ↓
Sistema calcula taxa
      ↓
Confirma fechamento
      ↓
Transação no banco (idempotente) [v2]
      ↓
Rateio de desconto entre itens [v2]
      ↓
Comissão calculada conforme config_comissoes [v2]
      ↓
Estoque atualizado (custo médio ponderado móvel) [v2]
      ↓
Relatórios atualizados
```

---

# 26. Fluxo de Fechamento Transacional

O fechamento deverá conceitualmente executar:

```text
BEGIN

1. Validar idempotência (uuid_cliente já processado?) [v2]
2. Validar comanda
3. Validar itens
4. Validar pagamentos
5. Calcular taxas
6. Ratear desconto entre itens [v2]
7. Resolver config_comissoes por item (profissional + serviço) [v2]
8. Calcular valores líquidos
9. Calcular comissão (base + rateio de taxa conforme config) [v2]
10. Registrar fechamento (comandas.closed_at = data de competência) [v2]
11. Registrar pagamentos
12. Registrar movimentações de estoque (custo médio ponderado móvel) [v2]
13. Registrar dados financeiros
14. Registrar auditoria

COMMIT
```

Em caso de erro:

```text
ROLLBACK
```

Nenhuma etapa parcialmente concluída deverá permanecer registrada.

---

# 27. Offline e Conectividade

A aplicação deverá tolerar oscilações temporárias de rede na medida do possível.

**[v2] Mitigação mínima da V1 (sem offline completo):** toda comanda é criada no dispositivo com um `uuid_cliente` gerado localmente antes do envio. Em caso de falha de rede, o app reenvia a mesma requisição com o mesmo UUID; a RPC de criação trata isso como idempotente (upsert), não como nova comanda. Isso resolve o risco prático mais comum (duplicação por reenvio em Wi-Fi instável) sem exigir fila offline completa.

A arquitetura futura (V2+) poderá utilizar:

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

O armazenamento local deverá ser entendido como mecanismo de cache/fila de sincronização, e não como fonte oficial.

Conflitos de sincronização deverão possuir política explícita quando essa fase for implementada.

---

# 28. Integração com WhatsApp

O sistema não deverá depender de lógica financeira dentro da integração com WhatsApp.

A arquitetura será:

```text
Dados financeiros
        ↓
Gerador de extrato
        ↓
Documento/Texto
        ↓
WhatsApp
```

Isso permite utilizar o mesmo extrato para:

* impressão;
* visualização;
* PDF;
* WhatsApp;
* futuramente e-mail.

---

# 29. Backup e Recuperação

A base oficial deverá permanecer no Supabase/PostgreSQL.

O sistema deverá manter mecanismos de:

* backup;
* recuperação;
* exportação;
* histórico de dados.

Exportações para planilhas deverão ser tratadas como:

```text
relatório / backup auxiliar
```

e não como fonte primária do sistema.

---

# 30. Migração do Google Sheets

Durante a transição:

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

Após a validação:

```text
PostgreSQL = fonte oficial
```

O código legado do Google Sheets poderá permanecer temporariamente para exportações ou recuperação histórica.

A integração antiga deverá ser removida quando deixar de possuir função operacional.

---

# 31. Variáveis de Ambiente

Exemplo:

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-publica
```

Nenhuma chave privada ou credencial administrativa deverá ser disponibilizada no frontend.

---

# 32. Estrutura do Projeto

Estrutura conceitual:

```text
/
├── src/
├── public/
├── supabase/
│   └── migrations/
├── tests/
├── .env
├── .env.example
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

---

# 33. Estratégia de Testes

O sistema deverá possuir testes pelo menos para as regras críticas.

## Testes unitários

* cálculo de taxa;
* cálculo de comissão (para cada combinação de `base_calculo` × `rateio_taxa`) **[v2]**;
* rateio de desconto entre itens **[v2]**;
* cálculo de CMV (custo médio ponderado móvel);
* cálculo de margem;
* cálculo da DRE;
* cálculo de descontos.

## Testes de integração

* fechamento de comanda (incluindo idempotência via UUID repetido) **[v2]**;
* pagamento;
* baixa de estoque;
* cancelamento;
* estorno;
* fechamento mensal de comissão e trava de competência **[v2]**;
* ajuste retroativo após competência fechada **[v2]**.

## Testes de segurança

* isolamento por salão;
* permissões por perfil (incluindo matriz de acesso do PROFISSIONAL) **[v2]**;
* acesso indevido a registros;
* alteração de operações financeiras;
* alteração de comanda_itens após `comissao_processada = true` (deve ser bloqueada) **[v2]**.

---

# 34. Critérios de Aceitação do Núcleo

Uma versão será considerada funcional quando for capaz de executar corretamente:

```text
Cadastrar profissional
        ↓
Cadastrar cliente
        ↓
Cadastrar serviço
        ↓
Cadastrar produto
        ↓
Configurar comissão (base, rateio de taxa) [v2]
        ↓
Abrir comanda
        ↓
Adicionar serviço/produto
        ↓
Aplicar desconto com motivo [v2]
        ↓
Registrar pagamento
        ↓
Calcular taxa
        ↓
Calcular comissão
        ↓
Finalizar comanda
        ↓
Atualizar estoque (custo médio) [v2]
        ↓
Atualizar indicadores
        ↓
Gerar extrato
        ↓
Fechar competência mensal [v2]
        ↓
Cancelar comanda antiga e gerar ajuste retroativo [v2]
```

E o sistema deverá preservar os mesmos valores quando os dados históricos forem consultados posteriormente.

---

# 35. Roadmap

## Fase 1 — Núcleo operacional

* autenticação;
* profissionais;
* clientes;
* serviços;
* produtos;
* comandas (com idempotência via UUID) **[v2]**;
* pagamentos;
* taxas;
* `config_comissoes` e `motivos_desconto` **[v2]**.

## Fase 2 — Financeiro

* comissões (cálculo configurável) **[v2]**;
* despesas / adiantamentos;
* fechamento mensal com trava de competência **[v2.2]**;
* saldo transportado de adiantamentos/vales **[v2.2]**;
* ajustes retroativos de comissão **[v2.2]**;
* extratos;
* DRE;
* relatórios.

## Fase 3 — Estoque

* movimentações;
* custo médio ponderado móvel **[v2]**;
* inventário;
* alertas;
* CMV;
* histórico.

## Fase 4 — Segurança e governança

* RLS (padrão JWT `app_metadata` + `SECURITY DEFINER`) **[v2]**;
* perfis (matriz de acesso explícita) **[v2]**;
* auditoria;
* logs;
* backup;
* migrations;
* LGPD (ver seção 38) **[v2]**.

## Fase 5 — Evolução

* offline robusto;
* serviço com assistente/segundo profissional por item;
* split de pagamento;
* suporte formal ao regime de salão-parceiro, Lei 13.352/2016, se adotado (ver seção 39) **[v2]**;
* CRM;
* agenda;
* fidelização;
* automações;
* integrações externas;
* integração fiscal.

---

# 36. Decisões Arquiteturais Importantes

As decisões fundamentais do projeto são:

### Decisão 1
**PostgreSQL substitui Google Sheets como fonte oficial.**

### Decisão 2
**O sistema é mobile-first.**

### Decisão 3
**Operações financeiras críticas são transacionais.**

### Decisão 4
**Comandas possuem itens e pagamentos separados.**

### Decisão 5
**Estoque é baseado em movimentações, não somente em saldo.**

### Decisão 6
**Valores financeiros são preservados historicamente.**

### Decisão 7
**Entidades financeiras não devem ser excluídas indiscriminadamente.**

### Decisão 8
**Segurança é aplicada no banco por RLS e não somente no frontend.**

### Decisão 9
**O domínio financeiro não fica concentrado em um único Context.**

### Decisão 10
**O banco deverá estar versionado por migrations.**

### Decisão 11 **[v2]**
**Regras de comissão, desconto e rateio de taxa são configuração por salão, nunca lógica fixa no código.**

### Decisão 12 **[v2]**
**Competência financeira segue a data de fechamento da comanda, não a data do atendimento.**

### Decisão 13 **[v2]**
**A Lei 13.352/2016 não é implementada na V1; a extensão futura ocorre por migration aditiva, sem redesenho.**

---

# 37. Visão Final do Produto

O sistema deve ser entendido como um sistema de gestão verticalizado para salões:

```text
                    SALÃO
                      │
       ┌──────────────┼──────────────┐
       │              │              │
    OPERAÇÃO       FINANCEIRO      ESTOQUE
       │              │              │
    Clientes       Receitas       Produtos
    Serviços       Taxas          Movimentos
    Comandas       Comissões      CMV
    Profissionais  Despesas
                   DRE
                   Fechamento mensal [v2]
                      │
                      ↓
                GESTÃO REAL
                      │
                      ↓
             RESULTADO LÍQUIDO
```

O objetivo final não é apenas registrar vendas.

É transformar cada atendimento em informação gerencial confiável:

```text
ATENDIMENTO
    ↓
VENDA
    ↓
PAGAMENTO
    ↓
TAXA
    ↓
COMISSÃO (regra configurável) [v2]
    ↓
ESTOQUE / CMV
    ↓
DESPESAS
    ↓
DRE
    ↓
RESULTADO
```

Essa cadeia representa o núcleo do sistema e deve orientar tanto a arquitetura do banco quanto o desenvolvimento do frontend.

---

# 38. **[v2]** LGPD

O sistema armazena dados pessoais (nome, telefone, e-mail de clientes; dados de profissionais e usuários) e deve seguir práticas mínimas de proteção, independentemente do porte do estabelecimento:

1. **RLS habilitada em toda tabela com dado pessoal** — já coberto pela arquitetura de RLS (seção 19).
2. **Canal de contato para solicitações do titular dos dados** — mesmo que seja um WhatsApp/e-mail do próprio salão, deve existir e ser divulgado.
3. **Política de retenção**: dados de cliente inativo não precisam ser apagados fisicamente (perderia-se histórico financeiro), mas o acesso a eles deve ser auditado como qualquer outro dado sensível.
4. **Regime simplificado**: o salão provavelmente se enquadra no regime simplificado da ANPD para pequenas empresas (Resolução CD/ANPD nº 2/2022), o que reduz algumas obrigações formais (ex.: DPO), mas não dispensa as práticas técnicas acima.
5. Nenhuma chave/credencial administrativa exposta no frontend (já coberto na seção 31).

Esta seção não constitui aconselhamento jurídico; a adequação formal deve ser validada com um profissional de LGPD/advogado quando o volume de dados ou o modelo de negócio (SaaS multi-tenant) crescer.

---

# 39. **[v2]** Regime de Contratação dos Profissionais e Lei 13.352/2016

A Lei 13.352/2016 disciplina o regime de **salão-parceiro / profissional-parceiro**, permitindo a centralização de pagamentos pelo salão com segregação de cota-parte. **Esse regime não deve ser presumido como adotado pelo salão deste projeto.**

**O que é decisão do proprietário/contador (fora do escopo do software):**
- Se os profissionais são contratados como CLT comissionado, autônomos/MEI em regime comum, ou como parceiros formais sob a Lei 13.352/2016.
- Formalização de contrato de parceria, se aplicável.
- Retenção de tributos e documentação fiscal correspondente.

**O que é responsabilidade da arquitetura:**
- O modelo de dados atual (comissão individual por profissional, comanda centralizando o pagamento) já é compatível com qualquer um dos três regimes acima, sem alteração.
- Caso o proprietário decida adotar formalmente o regime de salão-parceiro no futuro, a extensão necessária (campos de cota-parte, retenção tributária) é implementada como **migration aditiva** — coluna/tabela nova, opcionalmente nula, sem impacto nos registros históricos já existentes.
- **Não se constrói, na V1, nenhum campo ou lógica específica desse regime** — isso seria complexidade prematura para uma decisão jurídica ainda não tomada.

---

# 40. **[v2.4]** Decisões Congeladas e Pendências Restantes

### Decisões congeladas

- [x] Competência financeira: determinada por `comandas.closed_at`, independentemente da liquidação bancária.
- [x] Timing do repasse: configurável em `config_comissoes.timing_repasse`; competência e repasse são conceitos distintos.
- [x] Saldo de adiantamento/vale superior à comissão: excedente é rolado automaticamente para a competência seguinte; `total_pago` nunca fica negativo.
- [x] Cancelamento/estorno após competência fechada: não reabre o histórico; gera `ajustes_comissao` na competência aberta vigente.
- [x] **Base de cálculo da comissão x efeito do desconto [v2.3]:** não são duas regras — colapsam em uma só. `motivos_desconto.afeta_comissao` (já existente desde v2) decide, por motivo de desconto, se aquele desconto específico reduz a base de comissão. `config_comissoes.base_calculo` (BRUTO/LIQUIDO) permanece como default do profissional/serviço quando não há desconto algum a considerar. Nenhum campo novo foi necessário.
- [x] **Taxa da maquininha [v2.3]:** rateio configurável por forma de pagamento via `config_comissoes.rateio_taxa = POR_FORMA_PAGAMENTO` + `rateio_taxa_por_forma_pagamento` (jsonb). Substitui a antiga opção `PERSONALIZADO` (preenchimento manual no fechamento), incompatível com uma RPC transacional determinística.
- [x] **Produto gera comissão [v2.3]:** on/off por profissional via `config_comissoes.comissao_sobre_produto` (já existente); percentual específico por produto via novo campo `produtos.percentual_comissao` (override opcional).
- [x] **Comissão varia por serviço [v2.3]:** já resolvido desde v2 — `config_comissoes` tem `servico_id` opcional, permitindo override por combinação profissional+serviço. Nenhuma tabela nova foi necessária (o plano original já contemplava isso).
- [x] **Bypass de estoque negativo [v2.4 — revisado]:** decisão revertida em relação à v2.3. Venda **nunca bloqueia** por falta de estoque (evita cliente esperando no balcão, padrão de mercado); saldo negativo é corrigido depois pelo GERENTE via `ENTRADA`/`AJUSTE`, sinalizado no relatório de estoque. Campo `motivo_bypass` removido — não existe mais "exceção" a justificar. **Efeito colateral corrigido:** fórmula de custo médio ponderado ajustada para não distorcer o CMV quando a correção ocorre com saldo negativo acumulado (ver 10.10).
- [x] **Visibilidade do saldo negativo [v2.4]:** card de alerta no dashboard (in-app, principal) + e-mail diário via Resend (rede de segurança). WhatsApp permanece só compartilhamento manual de extrato (Seção 28) — descartado alerta automático via WhatsApp Business API por complexidade desproporcional ao estágio do projeto (exige conta business verificada e template pré-aprovado pela Meta). Ver 16.1.
- [x] **Acesso do PROFISSIONAL a faturamento/DRE [v2.3]:** sem acesso, sem exceção. Removida a brecha anterior de concessão manual pelo ADMIN (ver Seção 17.2).

### Pendência restante — fora do escopo deste documento

- [ ] **Regime de contratação dos profissionais** (CLT, autônomo, ou salão-parceiro/Lei 13.352/2016) — ver Seção 39. Decisão do proprietário/contador; a arquitetura já é compatível com qualquer um dos três regimes sem alteração, então **não bloqueia o desenvolvimento**, mas bloqueia o go-live com dado real de profissional até ser confirmada.

---

# 41. **[v2.1]** RPCs Críticas a Implementar

Funções transacionais no PostgreSQL (PL/pgSQL) que concentram as regras financeiras críticas, mapeadas às seções deste documento:

| Função | Responsabilidade | Seções relacionadas |
|---|---|---|
| `fn_fechar_comanda(payload_json)` | Fechamento transacional completo: rateio de desconto/taxa (com arredondamento pelo maior resto), cálculo de comissão, baixa de estoque, idempotência via `uuid_cliente` | 6.4, 6.8, 11.1–11.4, 26 |
| `fn_fechar_competencia_comissao(profissional_id, competencia)` | Consolida `fechamentos_comissao`, aplica abatimento de adiantamentos e regra de saldo negativo, marca itens como `comissao_processada = true` | 10.12, 11.7, 11.7.1 |
| `fn_cancelar_comanda(comanda_id, motivo)` | Cancelamento/estorno de comanda finalizada, incluindo geração de registro em `ajustes_comissao` quando a competência já está fechada | 11.5 |
| `fn_estornar_pagamento(pagamento_id, valor, motivo)` | **[v2.1]** Estorno parcial ou total de um pagamento específico sem necessariamente cancelar a comanda inteira — cenário distinto de `fn_cancelar_comanda` (ex.: cliente pagou a mais, ou uma das formas de pagamento foi estornada pela operadora) | 10.8, 11.5 |

Todas devem seguir o padrão `BEGIN ... COMMIT/ROLLBACK` (seção 26) e registrar em `audit_log` (seção 20).
