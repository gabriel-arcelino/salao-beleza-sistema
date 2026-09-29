# Software Factory

## Princípio

> **A IA não deve ser o processo; a IA deve operar dentro do processo.**

A IA pode analisar contexto, propor uma SPEC, decompor tarefas, implementar,
escrever testes, executar verificações, investigar problemas, revisar código e
usar subagentes quando necessário. Ela executa dentro do processo; não define
sozinha o que constitui evidência suficiente nem substitui a decisão sobre a
entrega.

Ferramentas como OpenCode, Kilo, Copilot e subagentes são meios de execução ou
revisão. Nenhuma é parte obrigatória da metodologia.

> **A garantia deve permanecer; o mecanismo para obtê-la deve ser escolhido
> conforme o risco e a natureza da mudança.**

## Processo mínimo

**Contexto/Escopo -> SPEC -> Impacto se necessário -> Tasks se necessário ->
Implementação -> Verificação -> Regressão -> Revisão do diff -> Entrega**

### Contexto/Escopo

Definir o problema, o resultado esperado, os limites e o fora de escopo. Registrar
riscos evidentes quando forem relevantes.

### SPEC

Descrever o comportamento esperado de forma observável. Uma alteração simples
pode ter uma SPEC curta; mudanças maiores precisam de mais detalhe. A SPEC não
precisa ser pesada por padrão.

### Impacto

Fazer uma análise adicional somente quando a mudança envolver, por exemplo,
banco ou schema, autenticação, autorização ou RLS, dinheiro, estoque ou dados
críticos, contratos, integrações, componentes compartilhados, arquitetura ou
comportamento difícil de reverter.

### Tasks

Usar tasks quando houver múltiplas etapas relevantes ou dependências. Para uma
mudança simples, uma lista curta é suficiente. Plano formal não é obrigatório.

### Implementação

A implementação pode ser executada pela IA, mas deve seguir o contexto, a SPEC
e os critérios definidos. A ferramenta não altera sozinha o significado de
"pronto".

### Verificação

Escolher a evidência adequada ao comportamento e ao risco:

- teste automatizado;
- teste de integração;
- inspeção;
- execução manual;
- QA visual;
- outra evidência apropriada.

> **Cada comportamento relevante deve possuir evidência adequada à sua natureza
e ao risco.**

Um teste que confirma apenas o mecanismo interno não prova necessariamente o
comportamento esperado. Regras críticas devem ser verificadas na camada que
realmente decide a regra.

### Regressão

Sempre considerar a compatibilidade com o restante do sistema. A profundidade é
proporcional ao impacto:

- mudança isolada: regressão focada pode bastar;
- mudança compartilhada: regressão mais ampla;
- migrations, autenticação/RLS, contratos críticos ou mudanças de alto impacto:
  suíte global quando aplicável.

Verificação da própria feature e regressão são responsabilidades diferentes.

### Revisão do diff

Antes da entrega, verificar se o escopo foi respeitado, se não há arquivos
experimentais, se a implementação é coerente com a SPEC, se existem alterações
inesperadas e quais limitações ou comportamentos permanecem não verificados.

### Entrega

Uma mudança está pronta quando o escopo foi atendido, os comportamentos
relevantes possuem evidência adequada, a regressão necessária foi executada, o
diff foi revisado e as incertezas relevantes foram declaradas.

## Garantias permanentes

1. O escopo deve ser explícito.
2. Requisitos e comportamentos devem ser observáveis.
3. Status não é evidência.
4. A evidência deve verificar comportamento, não apenas mecanismo.
5. A força da evidência deve ser proporcional ao risco.
6. Regras críticas devem ser verificadas na camada que decide a regra.
7. Verificação da feature e regressão são coisas diferentes.
8. O ambiente faz parte da verificação quando for relevante.
9. O diff deve ser revisado antes da entrega.
10. Ferramentas não são autoridade.

> Reprodução de um problema não é necessariamente explicação da causa, e
> explicação da causa não é necessariamente verificação da correção.

Problemas encontrados no próprio processo devem primeiro ser classificados e
compreendidos antes de virar mudanças permanentes na factory.

## Mecanismos condicionais

Os mecanismos abaixo continuam disponíveis, mas não são obrigatórios. Usá-los
quando houver risco, complexidade, incerteza ou necessidade concreta de
confiança adicional:

- mutation testing;
- revisão independente por subagentes ou LLMs;
- investigação causal;
- testes A/B;
- QA visual detalhado;
- auditoria profunda;
- regressão global;
- design ou análise de impacto detalhados;
- rastreabilidade mecânica completa;
- paralelização;
- planos detalhados.

Mutation testing é especialmente útil para lógica crítica, testes pouco
discriminantes, bugs silenciosos, invariantes e regras financeiras. Não é gate
universal.

Subagentes podem fazer revisão independente em mudanças complexas ou de alto
risco. Não são votação: a decisão continua baseada nas evidências e no
julgamento humano.

Investigação causal é apropriada para bugs, regressões, falhas intermitentes e
problemas dependentes do ambiente quando a causa não estiver clara. Não é uma
etapa de toda feature.

QA visual ou manual é apropriado quando houver impacto perceptível para o
usuário. Não é exigido para alterações sem impacto visual.

## O que não é obrigatório por padrão

O processo não exige universalmente:

- plano formal para toda mudança;
- paralelização ou worktrees;
- um commit por task;
- relatório periódico de execução;
- uma tag ou teste automatizado para cada critério de aceite;
- mutation testing;
- auditoria mecânica;
- `audit exit 0` como definição universal de pronto;
- lição aprendida após toda feature;
- revisão de escopo em múltiplos níveis;
- subagentes;
- testes A/B;
- suíte global para toda alteração.

A retirada dessas obrigações não torna as técnicas inúteis. Significa apenas que
elas não são garantias universais.

## OpenSpec

OpenSpec pode ser usado como referência ou esqueleto leve de change management
se isso reduzir trabalho real. Não devemos criar **OpenSpec + ONP completo +
outra camada própria**.

Não haverá migração do ONP para OpenSpec agora por preferência teórica. Primeiro
o processo simplificado será usado em projetos reais. Se uma experiência futura
demonstrar que OpenSpec reduz trabalho mantendo as garantias, a adoção poderá ser
reavaliada.

## Proporcionalidade

> **A complexidade do processo deve ser proporcional ao risco da mudança e ao
> valor da evidência produzida.**

Uma alteração simples não deve receber o mesmo aparato de uma alteração que
envolve dinheiro, RLS, autenticação, migrations ou contratos críticos. Isso é uma
decisão prática, não um novo formulário obrigatório de classificação de risco.

## Processo congelado

Esta versão está congelada experimentalmente. Não devemos alterar a metodologia
apenas porque encontramos uma melhoria teórica possível.

Uma mudança na factory deve ser motivada por:

- problema observado em projeto real;
- falha recorrente;
- evidência de que uma garantia importante não está sendo preservada;
- custo claramente desnecessário de um mecanismo existente.

Não mudar o processo apenas por preferência de ferramenta, possibilidade técnica,
nova ferramenta de IA, nova técnica de auditoria ou ideia teórica de melhoria.

O próximo passo prioritário é desenvolver os sistemas reais. A factory não deve
virar outro produto para manter.

Este documento consolida a direção do processo. Artefatos, relatórios e regras
anteriores permanecem como histórico ou documentação específica até serem
revisados no contexto de uma experiência real.
