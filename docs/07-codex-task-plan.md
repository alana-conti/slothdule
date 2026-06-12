# 07 — Codex Task Plan: Slothdule

## Como usar este arquivo

Cada tarefa abaixo foi escrita para ser enviada ao Codex como uma unidade pequena de trabalho. Antes de iniciar, garanta que os documentos em `/docs` estejam no repositório.

## Task 0.1 — Criar projeto base

### Objetivo

Criar a base do Slothdule com Next.js, TypeScript e Tailwind.

### Prompt sugerido

```text
Você está trabalhando no projeto Slothdule. Leia os arquivos em /docs antes de implementar.

Tarefa: criar o projeto base com Next.js, TypeScript e Tailwind. Configure a estrutura inicial de pastas conforme docs/04-architecture.md. Crie uma página inicial simples com o nome Slothdule, uma frase curta e um espaço reservado para o mascote.

Critérios de aceite:
- Projeto roda localmente.
- TypeScript está habilitado.
- Tailwind está configurado.
- Estrutura de pastas inicial existe.
- Página inicial mostra “Slothdule”.
- README explica como instalar e rodar.
- .env.example existe.
- Nenhuma chave sensível foi adicionada.
```

## Task 0.2 — Configurar tema visual inicial

### Objetivo

Criar os tokens visuais do projeto.

### Prompt sugerido

```text
Leia docs/08-design-system.md. Configure o tema visual inicial no Tailwind para o Slothdule, com paleta minimalista e aconchegante. A página inicial deve usar cards arredondados, cores suaves e linguagem calma. Não adicione biblioteca de UI externa nesta tarefa.

Critérios de aceite:
- Paleta do Slothdule configurada.
- Página inicial usa as cores do projeto.
- Há placeholder para mascote.
- Visual é minimalista e aconchegante.
```

## Task 1.1 — Criar migrations iniciais do Supabase

### Objetivo

Criar schema inicial do banco.

### Prompt sugerido

```text
Leia docs/03-database-schema.md. Crie migrations SQL para as tabelas iniciais do Slothdule: profiles, categories, clients, projects, tasks, subtasks, reminders e attachments. Inclua enums, chaves estrangeiras, índices e timestamps. Prepare Row Level Security, mas não implemente lógica de frontend nesta tarefa.

Critérios de aceite:
- Migration SQL criada em supabase/migrations.
- Tabelas principais existem.
- Enums existem.
- Índices principais existem.
- RLS está habilitada.
- Políticas básicas usam auth.uid().
```

## Task 1.2 — Criar seed de categorias

### Objetivo

Inserir categorias padrão.

### Prompt sugerido

```text
Crie um seed SQL com as categorias padrão do Slothdule: Trabalho, Pessoal, Estudos, Mercado, Casa, Saúde, Ideias e Financeiro. As categorias padrão devem poder ser reutilizadas por usuários e não devem quebrar RLS.

Critérios de aceite:
- Seed SQL criado.
- Categorias padrão inseridas com slugs.
- Não há duplicação desnecessária.
```

## Task 2.1 — Configurar Supabase client

### Objetivo

Permitir comunicação entre app e Supabase.

### Prompt sugerido

```text
Configure o cliente Supabase no app Next.js. Use variáveis de ambiente públicas apenas quando apropriado. Atualize .env.example. Não inclua chaves reais.

Critérios de aceite:
- Cliente Supabase está em src/lib/supabase.
- .env.example possui variáveis necessárias.
- Nenhuma chave real foi commitada.
```

## Task 2.2 — Implementar autenticação simples

### Objetivo

Permitir login seguro.

### Prompt sugerido

```text
Implemente autenticação simples usando Supabase Auth. Crie telas mínimas de login/logout. Após login, redirecione para a tela Hoje. Mantenha a UI alinhada ao design system.

Critérios de aceite:
- Usuário consegue fazer login.
- Usuário consegue sair.
- Tela Hoje é protegida.
- Usuário não autenticado é redirecionado ao login.
```

## Task 3.1 — Criar CRUD de tarefas

### Objetivo

Permitir criar, listar, editar e excluir tarefas.

### Prompt sugerido

```text
Implemente CRUD básico de tarefas conforme docs/03-database-schema.md. Crie tipos TypeScript, funções de acesso a dados e uma interface simples para listar e criar tarefas. Não implemente calendário ou timeline ainda.

Critérios de aceite:
- Usuário cria tarefa.
- Usuário lista suas tarefas.
- Usuário edita tarefa.
- Usuário exclui/arquiva tarefa.
- Usuário só vê suas próprias tarefas.
```

## Task 3.2 — Implementar subtarefas/checklists

### Objetivo

Adicionar checklists às tarefas.

### Prompt sugerido

```text
Implemente subtarefas vinculadas a tarefas. O usuário deve conseguir adicionar, marcar como concluída, editar e remover subtarefas dentro da tela de detalhe da tarefa.

Critérios de aceite:
- Subtarefas ficam vinculadas à tarefa correta.
- É possível marcar/desmarcar conclusão.
- Ordem das subtarefas é preservada por position.
```

## Task 4.1 — Criar tela Hoje

### Objetivo

Criar a principal tela do app.

### Prompt sugerido

```text
Crie a tela Hoje conforme docs/01-product-requirements.md e docs/02-user-flows.md. Ela deve mostrar tarefas atrasadas, tarefas de hoje, próximas tarefas e carga estimada do dia.

Critérios de aceite:
- Tela Hoje é a página inicial após login.
- Tarefas atrasadas aparecem em destaque.
- Tarefas de hoje aparecem separadas.
- Carga diária soma estimated_minutes das tarefas abertas.
```

## Task 4.2 — Implementar score de prioridade

### Objetivo

Criar priorização por regras.

### Prompt sugerido

```text
Crie a função de score de prioridade em src/lib/priority. A função deve receber uma tarefa e a data atual, retornando score numérico e razões explicáveis. Considere atraso, prazo hoje, prazo amanhã, prioridade manual, status e estimativa.

Critérios de aceite:
- Função pura implementada.
- Testes unitários cobrem os principais casos.
- A tela Hoje pode usar o score para ordenar tarefas.
- Justificativas são legíveis.
```

## Task 5.1 — Criar calendário interno

### Objetivo

Mostrar tarefas no tempo.

### Prompt sugerido

```text
Implemente uma visualização de calendário interno simples para tarefas. Mostre tarefas por due_date e permita abrir a tarefa ao clicar. Não implemente sincronização com Google Calendar nesta tarefa.

Critérios de aceite:
- Calendário mostra tarefas por data.
- Tarefas atrasadas são visualmente diferenciadas.
- Clique abre detalhe da tarefa.
```

## Task 5.2 — Criar timeline

### Objetivo

Visualizar duração das atividades.

### Prompt sugerido

```text
Crie uma tela de timeline que mostre tarefas entre start_date e due_date. Permita alternar agrupamento por categoria, cliente, projeto e status. Mantenha a implementação simples e sem bibliotecas pesadas, a menos que justifique antes.

Critérios de aceite:
- Timeline mostra barras por tarefa.
- Agrupamento alterna entre categoria, cliente, projeto e status.
- Tarefas sem start_date usam due_date como fallback.
```

## Task 6.1 — Criar lembretes

### Objetivo

Permitir lembretes vinculados a tarefas.

### Prompt sugerido

```text
Implemente CRUD de lembretes vinculados a tarefas. O usuário deve criar lembrete com data/hora, canal e horizonte. Ainda não implemente push real nesta tarefa.

Critérios de aceite:
- Lembretes são criados.
- Lembretes aparecem no detalhe da tarefa.
- Lembretes podem ser editados/removidos.
```

## Task 6.2 — Implementar notificações discretas

### Objetivo

Enviar notificações ao usuário.

### Prompt sugerido

```text
Implemente suporte inicial a notificações da PWA conforme a arquitetura. Solicite permissão do usuário e registre a inscrição push quando possível. Use mensagens discretas e alinhadas ao tom do Slothdule.

Critérios de aceite:
- App solicita permissão.
- Service worker está configurado.
- Uma notificação de teste pode ser exibida.
- Não há mensagens alarmistas.
```

## Task 7.1 — Implementar anexos por link

### Objetivo

Permitir guardar links em tarefas.

### Prompt sugerido

```text
Implemente anexos do tipo link em tarefas. O usuário deve adicionar, editar e remover links com label. Mostre os links no detalhe da tarefa.

Critérios de aceite:
- Link fica vinculado à tarefa.
- Label é exibido.
- Link abre em nova aba.
```

## Task 7.2 — Implementar gravação de áudio

### Objetivo

Salvar áudios vinculados a tarefas.

### Prompt sugerido

```text
Implemente gravação de áudio no navegador e upload para Supabase Storage. O áudio deve ficar registrado como attachment do tipo audio e poder ser reproduzido no detalhe da tarefa.

Critérios de aceite:
- Usuário consegue gravar áudio.
- Áudio é salvo no storage.
- Registro é criado em attachments.
- Usuário consegue reproduzir o áudio.
```

## Task 8.1 — Captura rápida por regras

### Objetivo

Transformar texto livre em tarefa sugerida.

### Prompt sugerido

```text
Implemente captura rápida por texto usando regras simples. Detecte expressões como hoje, amanhã, sexta, urgente, crítico, reunião, POC, proposta, relatório, mercado e financeiro. Mostre sugestão antes de salvar.

Critérios de aceite:
- Usuário digita uma frase.
- App sugere campos estruturados.
- Usuário confirma antes de criar tarefa.
- Não usa IA paga.
```

## Task 9.1 — Preparar estrutura de gamificação

### Objetivo

Criar base futura das Folhinhas.

### Prompt sugerido

```text
Prepare a estrutura de gamificação sem ativar a loja na UI principal. Crie documentação e, se apropriado, migrations para reward_items, coin_transactions e reward_redemptions. Não adicione punições por atraso.

Critérios de aceite:
- Estrutura futura está documentada.
- Não interfere no MVP.
- Regras são positivas, sem punição.
```

