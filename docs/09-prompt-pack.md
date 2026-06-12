# 09 — Prompt Pack: Slothdule

## 1. Prompt-base para qualquer tarefa

```text
Você está trabalhando no projeto Slothdule.

Slothdule é um planner pessoal/profissional em formato PWA, feito com Next.js, TypeScript, Tailwind e Supabase. O app será usado inicialmente por uma pessoa em Android e Windows. O objetivo é reduzir acúmulo de demandas, esquecimento e priorização incorreta, oferecendo tela Hoje, calendário, timeline, carga diária, checklists, lembretes, anexos por link/áudio, priorização por regras e gamificação com Folhinhas/recompensas afetivas no MVP.

O estilo visual deve ser minimalista, mas aconchegante. O mascote do app é um bicho-preguiça. O tom do app deve ser calmo, gentil e organizado.

Antes de implementar:
1. Leia os arquivos da pasta /docs.
2. Não altere decisões de produto sem registrar.
3. Faça mudanças pequenas e revisáveis.
4. Não adicione bibliotecas desnecessárias.
5. Não inclua chaves secretas no código.
6. Ao final, explique o que foi alterado e como testar.

Tarefa:
[descrever tarefa específica]

Critérios de aceite:
[descrever critérios objetivos]
```

## 2. Prompt para revisão de PR

```text
Revise esta alteração no projeto Slothdule.

Verifique:
- se a alteração segue os documentos em /docs;
- se preserva o estilo minimalista e aconchegante;
- se não adiciona dependências desnecessárias;
- se não expõe chaves sensíveis;
- se respeita o modelo de dados;
- se a implementação é pequena e revisável;
- se há riscos de segurança ou privacidade;
- se há erros de TypeScript, lint ou testes.

Ao final, apresente:
1. Pontos aprovados.
2. Problemas encontrados.
3. Sugestões de melhoria.
4. Se a PR pode ser aceita ou precisa de ajustes.
```

## 3. Prompt para criar documentação de feature

```text
Crie ou atualize a documentação da feature abaixo no projeto Slothdule.

Feature:
[nome da feature]

A documentação deve incluir:
- objetivo;
- comportamento esperado;
- telas afetadas;
- modelo de dados envolvido;
- regras de negócio;
- critérios de aceite;
- observações para implementação futura.

Mantenha a linguagem clara, em português, e compatível com os documentos existentes em /docs.
```

## 4. Prompt para criar teste de função

```text
Crie testes unitários para a função abaixo no projeto Slothdule.

Função:
[nome/caminho da função]

Os testes devem cobrir:
- caso padrão;
- caso de erro;
- casos extremos;
- comportamento esperado conforme documentação.

Não altere a lógica da função sem avisar. Se encontrar bug, descreva o bug antes de propor correção.
```

## 5. Prompt para implementação de priorização

```text
Implemente ou revise a priorização por regras do Slothdule.

A função deve considerar:
- tarefa atrasada;
- prazo hoje;
- prazo amanhã;
- prioridade manual: baixa, média, alta, crítica;
- status;
- estimativa de tempo;
- categoria Financeiro quando houver vencimento;
- tarefas longas ainda não iniciadas.

A função deve retornar:
- score numérico;
- lista de razões explicáveis em linguagem simples.

Não use IA paga. A função deve ser pura e testável.
```

## 6. Prompt para captura rápida

```text
Implemente captura rápida por regras no Slothdule.

Entrada: texto livre do usuário.

A função deve tentar detectar:
- prazos: hoje, amanhã, sexta, próxima semana;
- prioridade: urgente, crítico, importante;
- categoria: trabalho, pessoal, mercado, financeiro, casa, saúde, estudos;
- contexto profissional: cliente, POC, proposta, relatório, reunião;
- possível checklist padrão.

Saída: sugestão estruturada de tarefa.

Importante:
- o app deve mostrar a sugestão antes de salvar;
- o usuário precisa confirmar;
- não usar IA paga nesta tarefa.
```

## 7. Prompt para manter consistência visual

```text
Revise a interface implementada no Slothdule e ajuste para ficar compatível com o design system.

Critérios:
- minimalista;
- aconchegante;
- cores suaves;
- cards arredondados;
- linguagem calma;
- mascote discreto;
- boa experiência em Android e Windows;
- sem aparência corporativa fria.

Não altere funcionalidades. Ajuste apenas UI/UX.
```



## 8. Prompt para implementar Folhinhas

```text
Implemente ou revise a gamificação com Folhinhas no Slothdule.

Regras de produto:
- Folhinhas fazem parte do MVP.
- Ganhos devem ser positivos e explicáveis.
- Não deve haver punição por atraso.
- Saldo deve ser calculado a partir do histórico de transações.
- A conclusão de uma mesma tarefa não deve gerar Folhinhas repetidas indevidamente.

Regras iniciais:
- baixa: +1
- média: +3
- alta: +5
- crítica: +8
- conclusão antes do prazo: bônus +2
- checklist completo: bônus +2

A função deve retornar:
- total de Folhinhas;
- transações sugeridas;
- razões legíveis para o usuário.

Inclua testes unitários para os principais casos.
```

## 9. Prompt para implementar loja de recompensas

```text
Implemente ou revise a loja de recompensas do Slothdule.

Regras de produto:
- Recompensas fazem parte do MVP.
- O usuário deve ver saldo de Folhinhas.
- O usuário deve ver recompensas ativas e seus custos.
- O usuário só pode resgatar se tiver saldo suficiente.
- O resgate deve criar reward_redemption e uma leaf_transaction negativa.
- Status inicial do resgate: requested.
- Não implementar pagamentos, ranking ou competição social.

Recompensas padrão:
- Beijo — 5
- Café especial — 10
- Noite de filme — 25
- Jantar escolhido por ele — 50
- Presente surpresa — 80
- Final de semana especial — 150
- Viagem — 300
```
