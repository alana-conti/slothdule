# 10 — Gamificação: Folhinhas e Recompensas

## 1. Objetivo

A gamificação do Slothdule existe para transformar progresso em reconhecimento afetivo. Ela faz parte do MVP porque o app nasce como um presente pessoal, não apenas como uma ferramenta de produtividade.

O objetivo não é pressionar o usuário a produzir mais, mas criar pequenos sinais positivos de avanço.

## 2. Moeda interna

Nome da moeda: **Folhinhas**.

Direção de tom:

- leve;
- afetuosa;
- discreta;
- sem culpa;
- sem competição;
- sem punições.

## 3. Regras de ganho no MVP

| Evento | Folhinhas |
|---|---:|
| Concluir tarefa de prioridade baixa | +1 |
| Concluir tarefa de prioridade média | +3 |
| Concluir tarefa de prioridade alta | +5 |
| Concluir tarefa de prioridade crítica | +8 |
| Concluir antes do prazo | bônus +2 |
| Concluir checklist completo | bônus +2 |
| Fechar semana sem tarefa crítica atrasada | bônus +10 |

Para a primeira implementação, priorizar:

1. ganho base por prioridade;
2. bônus por checklist completo;
3. bônus por conclusão antes do prazo;
4. bônus semanal apenas depois que o restante estiver estável.

## 4. Regras importantes

- Não remover Folhinhas por atraso.
- Não exibir ranking.
- Não comparar com outros usuários.
- Não usar linguagem de cobrança.
- Não gerar Folhinhas duplicadas para a mesma conclusão de tarefa.
- Permitir ajustes manuais no futuro, mas registrar tudo no histórico.

## 5. Recompensas iniciais

| Recompensa | Custo |
|---|---:|
| Beijo | 5 |
| Café especial | 10 |
| Noite de filme | 25 |
| Jantar escolhido por ele | 50 |
| Presente surpresa | 80 |
| Final de semana especial | 150 |
| Viagem | 300 |

As recompensas devem ser configuráveis. Os valores acima são apenas sugestões iniciais.

## 6. Fluxo de ganho

```text
Usuário conclui tarefa
↓
App calcula ganho base por prioridade
↓
App calcula bônus aplicáveis
↓
App cria leaf_transactions positivas
↓
App marca task.leaf_awarded_at
↓
Saldo é atualizado
↓
Mascote exibe feedback discreto
```

## 7. Fluxo de resgate

```text
Usuário abre loja de recompensas
↓
App mostra saldo atual
↓
Usuário escolhe recompensa
↓
App valida saldo suficiente
↓
Usuário confirma
↓
App cria reward_redemption
↓
App cria leaf_transaction negativa
↓
Resgate fica com status requested
```

## 8. Estados de resgate

- `requested`: solicitado, ainda não entregue.
- `delivered`: entregue.
- `cancelled`: cancelado.

Se um resgate for cancelado, a devolução de Folhinhas deve ser registrada como nova transação positiva, nunca apagando o histórico original.

## 9. Mensagens sugeridas

### Ao ganhar Folhinhas

- “Mais uma tarefa saiu da árvore. Você ganhou {n} Folhinhas.”
- “Uma coisa de cada vez. +{n} Folhinhas para você.”
- “Tarefa concluída com calma. +{n} Folhinhas.”

### Ao resgatar recompensa

- “Recompensa solicitada. A preguiça já anotou.”
- “Boa escolha. Esse resgate ficou registrado.”

### Quando não há saldo suficiente

- “Ainda faltam algumas Folhinhas para essa recompensa.”
- “Quase lá. Mais algumas tarefas e ela será sua.”

## 10. Modelo técnico recomendado

Tabelas principais:

- `reward_items`
- `reward_redemptions`
- `leaf_transactions`

O saldo deve ser calculado pela soma de `leaf_transactions.amount`.

Isso preserva histórico e evita saldos sem explicação.
