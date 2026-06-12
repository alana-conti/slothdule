# 03 — Database Schema: Slothdule

## 1. Visão geral

O banco do Slothdule deve ser relacional e preparado para multiusuários, mesmo que a primeira versão tenha apenas um usuário real.

Backend recomendado: **Supabase/Postgres**.

Princípios:

- toda entidade privada deve ter `user_id`;
- usar Row Level Security no Supabase;
- evitar dados sem dono;
- manter estrutura simples no MVP;
- deixar espaço para expansão futura.

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
| sort_score | integer | score calculado opcional |
| created_at | timestamptz | automático |
| updated_at | timestamptz | automático |

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
| channel | reminder_channel | push/app/etc. |
| horizon | reminder_horizon | curto/médio/longo |
| is_sent | boolean | controle de envio |
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

## 11. Tabela futura: reward_items

Recompensas configuráveis para a gamificação.

| Campo | Tipo | Observação |
|---|---|---|
| id | uuid | chave primária |
| user_id | uuid | dono |
| title | text | Noite de filme |
| description | text | descrição |
| cost | integer | custo em Folhinhas |
| is_active | boolean | disponível ou não |
| created_at | timestamptz | automático |

## 12. Tabela futura: coin_transactions

Histórico de ganhos e gastos de Folhinhas.

| Campo | Tipo | Observação |
|---|---|---|
| id | uuid | chave primária |
| user_id | uuid | dono |
| task_id | uuid | opcional |
| amount | integer | positivo ou negativo |
| reason | text | motivo |
| created_at | timestamptz | automático |

## 13. Tabela futura: reward_redemptions

Resgates de recompensas.

| Campo | Tipo | Observação |
|---|---|---|
| id | uuid | chave primária |
| user_id | uuid | dono |
| reward_item_id | uuid | recompensa |
| cost | integer | custo aplicado |
| status | text | requested, delivered, canceled |
| redeemed_at | timestamptz | data do resgate |

## 14. Regras de segurança

Todas as tabelas com `user_id` devem ter Row Level Security.

Regra geral:

```sql
user_id = auth.uid()
```

Categorias globais podem ter `user_id is null`, mas categorias criadas por usuários devem obedecer ao dono.

## 15. Índices recomendados

- `tasks(user_id)`
- `tasks(user_id, due_date)`
- `tasks(user_id, status)`
- `tasks(user_id, priority)`
- `tasks(user_id, category_id)`
- `tasks(user_id, client_id)`
- `tasks(user_id, project_id)`
- `reminders(user_id, remind_at)`
- `attachments(user_id, task_id)`

