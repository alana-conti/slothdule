# 05 — Roadmap: Slothdule

## Visão geral

O roadmap do Slothdule está organizado em fases. Cada fase deve entregar valor real antes de avançar para a próxima.

## Fase 0 — Fundação

### Objetivo

Criar a base do projeto, documentação, repositório e ambiente técnico.

### Entregas

- Repositório GitHub criado.
- README inicial.
- Documentação em `/docs`.
- Projeto Next.js com TypeScript.
- Tailwind configurado.
- Supabase configurado.
- `.env.example` criado.
- Estrutura de pastas criada.

### Critério de conclusão

O projeto roda localmente e possui documentação suficiente para orientar o Codex.

## Fase 1 — Núcleo de tarefas

### Objetivo

Permitir que o usuário registre, edite e visualize tarefas reais.

### Entregas

- Autenticação simples.
- Perfis.
- Categorias.
- Clientes.
- Projetos/POCs.
- Tarefas.
- Subtarefas/checklists.
- Status.
- Prioridade.
- Data de início.
- Prazo.
- Estimativa de tempo.

### Critério de conclusão

O usuário consegue criar uma tarefa completa, vinculá-la a categoria/cliente/projeto e acompanhar checklist.

## Fase 2 — Tela Hoje

### Objetivo

Resolver o problema de acúmulo e esquecimento no uso diário.

### Entregas

- Tela inicial Hoje.
- Tarefas atrasadas.
- Tarefas de hoje.
- Próximas tarefas.
- Carga estimada do dia.
- Tarefas críticas em destaque.
- Botão de nova tarefa.
- Botão de captura rápida.

### Critério de conclusão

Ao abrir o app, o usuário sabe o que precisa fazer agora.

## Fase 3 — Temporalidade: calendário e timeline

### Objetivo

Dar sensação clara de tempo, duração e prazo.

### Entregas

- Calendário interno.
- Visualização semanal.
- Visualização mensal simples.
- Timeline por data de início e prazo.
- Filtros por categoria.
- Filtros por cliente.
- Filtros por projeto.
- Filtros por status.
- Filtros por prioridade.

### Critério de conclusão

O usuário consegue ver tarefas distribuídas no tempo e identificar sobrecarga.

## Fase 4 — Carga diária e priorização

### Objetivo

Ajudar a priorizar corretamente sem usar IA paga.

### Entregas

- Soma de estimativas por dia.
- Alerta de dia sobrecarregado.
- Score de prioridade por regras.
- Justificativas da sugestão.
- Ordenação sugerida do dia.

### Critério de conclusão

O app sugere a ordem do dia com explicações transparentes.

## Fase 5 — Lembretes e notificações

### Objetivo

Reduzir esquecimento.

### Entregas

- Tabela de lembretes.
- Criação de lembrete por tarefa.
- Permissão de notificação.
- Push/local notifications.
- Registro de inscrição push.
- Notificações discretas.

### Critério de conclusão

O usuário recebe alerta no horário definido.

## Fase 6 — Anexos, links e áudio

### Objetivo

Preservar contexto das tarefas.

### Entregas

- Links vinculados a tarefas.
- Gravação de áudio.
- Upload de áudio para storage.
- Reprodução de áudio.
- Estrutura preparada para PDF/imagem.

### Critério de conclusão

O usuário consegue salvar e reproduzir áudio dentro de uma tarefa.

## Fase 7 — Captura rápida

### Objetivo

Facilitar registro de demandas conforme surgem.

### Entregas

- Campo de texto livre.
- Parser por regras.
- Sugestão de categoria.
- Sugestão de prioridade.
- Sugestão de prazo.
- Sugestão de checklist.
- Confirmação antes de salvar.

### Critério de conclusão

O usuário escreve uma frase e o app sugere uma tarefa estruturada.

## Fase 8 — Gamificação afetiva

### Objetivo

Adicionar motivação leve e personalizada.

### Entregas

- Moeda interna: Folhinhas.
- Saldo de Folhinhas.
- Regras de ganho.
- Loja de recompensas.
- Resgate de recompensas.
- Histórico de transações.
- Mascote reagindo a conquistas.

### Critério de conclusão

O usuário ganha Folhinhas por tarefas concluídas e resgata recompensas configuráveis.

## Fase 9 — Integrações

### Objetivo

Tornar o Slothdule mais fluido no ecossistema real do usuário.

### Entregas possíveis

- Google Calendar.
- Telegram bot.
- WhatsApp Business/Cloud API.
- IA generativa.
- Assistente interno.
- Upload de PDF e imagem.

### Critério de conclusão

Pelo menos uma integração externa funciona sem comprometer privacidade ou simplicidade.

