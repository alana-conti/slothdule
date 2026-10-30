# 03 — Database Schema: Slothdule

## 1. Visão geral

O banco do Slothdule deve ser relacional e preparado para multiusuários, mesmo que a primeira versão tenha apenas um usuário real.

Backend recomendado: **Supabase/Postgres**.

Princípios:

- toda entidade privada deve ter `user_id`;
- usar Row Level Security no Supabase;
- evitar dados sem dono;
- manter estrutura simples no MVP;
- deixar espaço para expansão futura;
- registrar Folhinhas por transações, para manter histórico e evitar saldo sem explicação.

## 2. Tipos enumerados sugeridos

### task_status

- `todo`
- `in_progress`
- `waiting`
- `done`
- `archived`

### task_priority

- `low`
- `medium`
- `high`
- `critical`

### work_context

- `personal`
- `internal_work`
- `client_work`

### attachment_type

- `link`
- `audio`
- `file`

### reminder_channel

- `push`
- `app`
- `telegram`
- `whatsapp`

### reminder_horizon

- `short`
- `medium`
- `long`

### leaf_transaction_type

- `task_completion`
- `early_completion_bonus`
- `checklist_bonus`
- `weekly_bonus`
- `reward_redemption`
- `manual_adjustment`

### reward_redemption_status

- `requested`
- `delivered`
- `cancelled`

## 3. Tabela: profiles

Representa o perfil do usuário autenticado.

| Campo | Tipo | Observação |
|---|---|---|
| id | uuid | mesmo id do auth.users |
| display_name | text | nome exibido |
| avatar_url | text | opcional |
| created_at | timestamptz | automático |
| updated_at | timestamptz | automático |

## 4. Tabela: categories

Categorias de organização.

| Campo | Tipo | Observação |
|---|---|---|
| id | uuid | chave primária |
| user_id | uuid | dono da categoria; pode ser null para padrão global |
| name | text | Trabalho, Pessoal etc. |
| slug | text | trabalho, pessoal etc. |
| color | text | token/hex opcional |
| is_default | boolean | categoria padrão |
| created_at | timestamptz | automático |

Categorias iniciais:

- Trabalho.
- Pessoal.
- Estudos.
- Mercado.
- Casa.
- Saúde.
- Ideias.
- Financeiro.

## 5. Tabela: clients

Clientes vinculados a tarefas e projetos.

| Campo | Tipo | Observação |
|---|---|---|
| id | uuid | chave primária |
| user_id | uuid | dono |
| name | text | nome do cliente |
| notes | text | observações |
| created_at | timestamptz | automático |
| updated_at | timestamptz | automático |

## 6. Tabela: projects

Projetos, POCs, relatórios ou iniciativas internas.

| Campo | Tipo | Observação |
|---|---|---|
| id | uuid | chave primária |
| user_id | uuid | dono |
| client_id | uuid | opcional |
| name | text | nome do projeto |
| type | text | poc, relatório, estudo, interno etc. |
| status | text | ativo, pausado, finalizado |
| notes | text | observações |
| created_at | timestamptz | automático |
| updated_at | timestamptz | automático |

## 7. Tabela: tasks

Tabela principal.

| Campo | Tipo | Observação |
|---|---|---|
| id | uuid | chave primária |
| user_id | uuid | dono |
| category_id | uuid | categoria |
| client_id | uuid | opcional |
| project_id | uuid | opcional |
| title | text | obrigatório |
| description | text | opcional |
| work_context | work_context | pessoal, trabalho interno ou cliente |
| status | task_status | padrão: todo |
| priority | task_priority | padrão: medium |
| start_date | date | início planejado |
| due_date | date | prazo |
| due_time | time | horário opcional |
| estimated_minutes | integer | estimativa de esforço |
| completed_at | timestamptz | preenchido ao concluir |
| leaf_awarded_at | timestamptz | preenchido quando Folhinhas da conclusão forem geradas |
| sort_score | integer | score calculado opcional |
| pause_reason | text | recado opcional de quando a tarefa foi pausada (até 500 caracteres); só existe enquanto o status é `waiting` e é apagado ao sair dele (migration Alembic `0002_task_pause_reason`) |
| created_at | timestamptz | automático |
| updated_at | timestamptz | automático |

`leaf_awarded_at` ajuda a evitar que a mesma conclusão gere Folhinhas repetidas quando uma tarefa é reaberta e concluída novamente.

## 8. Tabela: subtasks

Checklist de tarefas.

| Campo | Tipo | Observação |
|---|---|---|
| id | uuid | chave primária |
| user_id | uuid | dono |
| task_id | uuid | tarefa principal |
| title | text | descrição da subtarefa |
| is_done | boolean | concluída ou não |
| position | integer | ordenação |
| created_at | timestamptz | automático |
| updated_at | timestamptz | automático |

## 9. Tabela: reminders

Lembretes vinculados a tarefas ou independentes.

| Campo | Tipo | Observação |
|---|---|---|
| id | uuid | chave primária |
| user_id | uuid | dono |
| task_id | uuid | opcional |
| title | text | título do lembrete |
| remind_at | timestamptz | data/hora do lembrete |
| channel | reminder_channel | push/app/telegram/whatsapp |
| horizon | reminder_horizon | curto/médio/longo |
| is_sent | boolean | enviado ou não |
| created_at | timestamptz | automático |
| updated_at | timestamptz | automático |

## 10. Tabela: attachments

Links, áudios e arquivos vinculados a tarefas.

| Campo | Tipo | Observação |
|---|---|---|
| id | uuid | chave primária |
| user_id | uuid | dono |
| task_id | uuid | tarefa vinculada |
| type | attachment_type | link/audio/file |
| label | text | nome amigável |
| url | text | link externo ou caminho no storage |
| mime_type | text | opcional |
| size_bytes | bigint | opcional |
| created_at | timestamptz | automático |

## 11. Tabela: reward_items

Recompensas configuráveis para a gamificação do MVP.

| Campo | Tipo | Observação |
|---|---|---|
| id | uuid | chave primária |
| user_id | uuid | dono; null para recompensas padrão globais |
| title | text | Noite de filme |
| description | text | descrição |
| cost | integer | custo em Folhinhas |
| icon | text | emoji/ícone opcional |
| is_default | boolean | recompensa padrão |
| is_active | boolean | disponível ou não |
| created_at | timestamptz | automático |
| updated_at | timestamptz | automático |

Recompensas padrão sugeridas:

- Beijo — 5 Folhinhas.
- Café especial — 10 Folhinhas.
- Noite de filme — 25 Folhinhas.
- Jantar escolhido por ele — 50 Folhinhas.
- Presente surpresa — 80 Folhinhas.
- Final de semana especial — 150 Folhinhas.
- Viagem — 300 Folhinhas.

## 12. Tabela: reward_redemptions

Resgates de recompensas.

| Campo | Tipo | Observação |
|---|---|---|
| id | uuid | chave primária |
| user_id | uuid | dono |
| reward_item_id | uuid | recompensa |
| cost | integer | custo aplicado no momento do resgate |
| status | reward_redemption_status | requested/delivered/cancelled |
| notes | text | observações opcionais |
| redeemed_at | timestamptz | data do resgate |
| delivered_at | timestamptz | data de entrega, se houver |
| cancelled_at | timestamptz | data de cancelamento, se houver |
| created_at | timestamptz | automático |
| updated_at | timestamptz | automático |

## 13. Tabela: leaf_transactions

Histórico de ganhos e gastos de Folhinhas.

| Campo | Tipo | Observação |
|---|---|---|
| id | uuid | chave primária |
| user_id | uuid | dono |
| task_id | uuid | opcional, para ganhos por tarefa |
| reward_redemption_id | uuid | opcional, para gastos por resgate |
| type | leaf_transaction_type | tipo da transação |
| amount | integer | positivo para ganho, negativo para gasto |
| reason | text | motivo legível |
| created_at | timestamptz | automático |

### Regras de transação

- Ganhos devem usar valores positivos.
- Resgates devem usar valores negativos.
- Uma tarefa concluída não deve gerar o mesmo ganho de conclusão mais de uma vez.
- O saldo pode ser calculado pela soma de `amount` em `leaf_transactions`.

## 14. View: leaf_balances

View opcional para facilitar exibição de saldo.

| Campo | Tipo | Observação |
|---|---|---|
| user_id | uuid | usuário |
| balance | integer | soma das transações |

## 15. Regras de segurança

Todas as tabelas com `user_id` devem ter Row Level Security.

Regra geral:

```sql
user_id = auth.uid()
```

Categorias e recompensas globais podem ter `user_id is null`, mas itens criados por usuários devem obedecer ao dono.

## 16. Índices recomendados

- `tasks(user_id)`
- `tasks(user_id, due_date)`
- `tasks(user_id, status)`
- `tasks(user_id, priority)`
- `tasks(user_id, category_id)`
- `tasks(user_id, client_id)`
- `tasks(user_id, project_id)`
- `reminders(user_id, remind_at)`
- `attachments(user_id, task_id)`
- `subtasks(task_id, position)`
- `reward_items(user_id, is_active)`
- `reward_redemptions(user_id, status)`
- `leaf_transactions(user_id, created_at)`
- `leaf_transactions(user_id, task_id, type)`
