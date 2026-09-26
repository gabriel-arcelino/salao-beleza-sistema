# LIÇÕES — mantido pelo motor (`onp-spec licoes`)

> Não edite à mão: qualquer escrita do motor sobrescreve este arquivo.
> Estado canônico em `.spec/licoes.json`; mutação só via `onp-spec licoes`.

## Confirmadas — carregue no Especificar/Projetar

Corroboradas em múltiplas features. Aplique como guia.

### L-001 — Alterar src/ ou tests/ desatualiza a prova de todas as features que esses arquivos abrangem, nao apenas da tarefa em curso: renove com onp-spec verify <feature> para cada uma, senao o audit acusa prova desatualizada.
- sinal: `VERIFY_OBSOLETO` · recorrência: 2 feature(s) · escopo: `verificacao` · penalidades: 0
- features: relatorios-gerenciais, fundacao-ui
- última evidência: — (fundacao-ui, 2026-09-26T01:18:47.981Z)

## Candidatas — em observação, NÃO aplicar ainda

Vistas em uma feature só. Registradas, não confiadas.

_nenhuma_

## Quarentena — aplicadas e falharam, ignorar

A falha recorreu mesmo com a lição aplicada. Revisão é do usuário.

_nenhuma_
