# 06 — Codex Guidelines: Slothdule

## 1. Papel do Codex no projeto

O Codex deve atuar como executor técnico de tarefas pequenas e bem definidas. Ele não deve tomar decisões amplas de produto sem registrar e justificar a alteração.

Regra central:

> Produto, arquitetura e prioridades são definidos pela documentação. O Codex implementa conforme os documentos.

## 2. Antes de implementar qualquer tarefa

O Codex deve:

1. Ler os arquivos em `/docs`.
2. Verificar se a tarefa já está prevista no roadmap.
3. Conferir o schema antes de criar ou alterar dados.
4. Evitar mudanças amplas não solicitadas.
5. Preferir alterações pequenas, revisáveis e testáveis.
6. Não adicionar bibliotecas sem necessidade clara.
7. Não expor chaves, tokens ou credenciais.

## 3. Estilo de implementação

- Usar TypeScript.
- Preferir componentes pequenos.
- Separar lógica de negócio da interface.
- Criar funções puras para priorização e parsing.
- Usar nomes claros.
- Evitar abstrações prematuras.
- Manter o MVP simples.

## 4. Estrutura de resposta esperada do Codex

Ao finalizar uma tarefa, o Codex deve responder:

```text
Resumo do que foi feito:
- ...

Arquivos alterados:
- ...

Como testar:
1. ...
2. ...

Observações:
- ...
```

## 5. O que o Codex não deve fazer sem autorização

- Trocar a stack principal.
- Remover documentação.
- Alterar o nome Slothdule.
- Remover o conceito do mascote.
- Substituir Supabase por outro backend.
- Adicionar IA paga.
- Adicionar WhatsApp antes da fase planejada.
- Criar lógica de gamificação punitiva.
- Remover Folhinhas do MVP sem autorização.
- Enviar chaves para o GitHub.
- Desabilitar Row Level Security.

## 6. Critérios gerais de aceite

Toda tarefa deve ter:

- escopo claro;
- arquivos alterados coerentes;
- instruções de teste;
- ausência de erros de lint/typecheck quando aplicável;
- preservação das decisões de produto;
- nenhuma chave sensível exposta.

## 7. Segurança

### Variáveis de ambiente

Nunca commitar:

- `SUPABASE_SERVICE_ROLE_KEY`;
- tokens pessoais;
- chaves OpenAI;
- chaves VAPID privadas;
- senhas;
- arquivos `.env` reais.

Usar apenas `.env.example`.

### Banco de dados

- Habilitar Row Level Security.
- Garantir que usuários só acessem seus próprios dados.
- Usar `auth.uid()` nas políticas.

## 8. Git e commits

Commits devem ser pequenos e descritivos.

Exemplos bons:

```text
feat: add initial task schema
feat: create today dashboard layout
fix: correct priority score for overdue tasks
docs: update product requirements
```

Exemplos ruins:

```text
update stuff
big changes
final version
```

## 9. Tamanho das tarefas

Preferir tarefas que possam ser revisadas em uma única PR.

Tarefa boa:

> Criar função de cálculo de prioridade com testes unitários.

Tarefa ruim:

> Criar todo o app de planner com notificações, calendário e IA.

## 10. Tom e experiência do usuário

O app deve ter tom:

- calmo;
- gentil;
- claro;
- sem culpa;
- levemente afetivo.

Evitar mensagens agressivas como:

- “Você está atrasado!”
- “Você falhou!”
- “Urgente agora!”

Preferir:

- “Essa tarefa passou do prazo. Quer reorganizar?”
- “Seu dia parece cheio. Vamos priorizar?”
- “Uma coisa de cada vez.”

