# 01 — Product Requirements Document: Slothdule

## 1. Visão geral

**Slothdule** é um planner pessoal/profissional com mascote de bicho-preguiça, pensado para organizar demandas de rotina com calma, clareza e priorização por prazo.

O app será usado inicialmente por uma pessoa que trabalha com engenharia de IA, elaboração e venda de POCs de IA e relatórios de maturidade. Ele já utiliza Trello e Google Calendar, mas enfrenta dificuldade com acúmulo de demandas, esquecimento e priorização incorreta.

O objetivo inicial é criar um presente funcional e privado, com possibilidade futura de expansão para outros usuários.

## 2. Problema a resolver

O usuário atual possui muitas demandas simultâneas, registradas em ferramentas diferentes ou surgindo ao longo do dia. O principal problema não é apenas registrar tarefas, mas:

- evitar acúmulo invisível;
- reduzir esquecimento;
- priorizar corretamente por prazo e criticidade;
- visualizar a duração das atividades no tempo;
- compreender carga diária/semanal;
- manter contexto de cada tarefa por meio de links, áudios e checklists.

## 3. Público inicial

### Usuário principal

- Profissional de tecnologia/IA.
- Atua com POCs, relatórios de maturidade, clientes, prazos e entregas técnicas/comerciais.
- Usa notebook Windows no trabalho.
- Usa celular Android fora do trabalho.
- Planeja o dia, mas registra demandas conforme surgem.
- Utiliza Trello e Google Calendar.

### Usuária secundária futura

- A pessoa que criou o projeto/presente também poderá utilizar o app posteriormente.

## 4. Proposta de valor

O Slothdule deve ajudar o usuário a responder rapidamente:

1. O que preciso fazer hoje?
2. O que está atrasado?
3. Qual tarefa é mais importante agora?
4. Meu dia está sobrecarregado?
5. Quais entregas estão próximas?
6. Quais tarefas pertencem a qual cliente/projeto/POC?
7. Onde guardei o link, áudio ou observação daquela tarefa?

## 5. Princípios do produto

1. **Calma acima de pressão:** o app deve organizar sem gerar ansiedade.
2. **Prazo como eixo central:** a organização principal será temporal.
3. **Entrada rápida, mas não necessariamente instantânea:** o usuário aceita levar alguns segundos para registrar uma tarefa corretamente.
4. **Contexto preservado:** tarefas podem guardar checklist, links, áudio e observações.
5. **Prioridade explicável:** a priorização inicial deve ser baseada em regras transparentes, não em IA opaca.
6. **MVP útil antes de ser completo:** começar com o que resolve o problema real.
7. **Preparado para crescer:** mesmo sendo privado no início, o app deve ter base técnica compatível com multiusuários no futuro.

## 6. Escopo do MVP

### Funcionalidades obrigatórias

- Autenticação simples.
- Tela inicial **Hoje**.
- Criação, edição e conclusão de tarefas.
- Categorias.
- Prioridade: baixa, média, alta, crítica.
- Status: a fazer, em andamento, aguardando, concluída, arquivada.
- Data de início.
- Data de prazo.
- Estimativa de tempo.
- Checklist/subtarefas.
- Cliente.
- Projeto/POC.
- Separação entre trabalho interno e trabalho para cliente.
- Calendário interno.
- Timeline.
- Visualização de carga diária/semanal.
- Destaque para tarefas atrasadas.
- Lembretes.
- Notificações discretas.
- Links anexados.
- Áudio gravado e vinculado à tarefa.
- Priorização por regras.
- Captura rápida por texto com sugestão de preenchimento.

### Funcionalidades fora do MVP, mas planejadas

- Upload de PDF e imagem.
- Sincronização com Google Calendar.
- Pipeline comercial.
- Telegram bot.
- WhatsApp bot.
- IA generativa paga ou local.
- Assistente em formato de chat.
- Gamificação com moedas do app.
- Loja de recompensas afetivas.
- Multiusuários completo.
- Publicação como produto aberto.

## 7. Categorias iniciais

### Categorias mínimas

- Trabalho.
- Pessoal.

### Categorias completas sugeridas

- Trabalho.
- Pessoal.
- Estudos.
- Mercado.
- Casa.
- Saúde.
- Ideias.
- Financeiro.

## 8. Entidades principais

- Usuário.
- Tarefa.
- Categoria.
- Cliente.
- Projeto/POC.
- Subtarefa.
- Lembrete.
- Anexo.
- Áudio.
- Recompensa futura.
- Transação de moedas futura.

## 9. Visualizações obrigatórias

### Hoje

Tela inicial do app. Deve mostrar:

- tarefas atrasadas;
- tarefas de hoje;
- próximas tarefas;
- carga estimada do dia;
- tarefas críticas;
- botão de nova tarefa;
- botão de captura rápida.

### Calendário

Deve mostrar tarefas distribuídas por data, com foco em prazo e início.

### Timeline

Deve mostrar duração das tarefas entre data de início e data de prazo. Precisa permitir alternância por:

- categoria;
- cliente;
- projeto;
- status;
- prioridade.

### Carga diária/semanal

Deve somar tempo estimado das tarefas abertas por dia e indicar dias sobrecarregados.

## 10. Notificações

As notificações devem ser discretas e gentis.

Exemplos:

- “Uma tarefa importante está chegando: revisar proposta da POC.”
- “Hoje há uma tarefa crítica para revisar.”
- “Seu dia parece cheio. Vale reorganizar?”

O app não deve usar mensagens alarmistas ou culpabilizantes.

## 11. Priorização inicial por regras

A primeira versão não deve depender de IA paga. A ordem sugerida de execução pode ser calculada por regras.

Fatores de priorização:

- tarefa atrasada;
- prazo hoje;
- prazo amanhã;
- prioridade manual;
- criticidade;
- tempo estimado;
- status;
- tarefa financeira com vencimento;
- tarefa longa ainda não iniciada;
- excesso de carga no mesmo dia.

A sugestão deve sempre trazer justificativa.

Exemplo:

> “Prioridade alta porque vence hoje e ainda não foi iniciada.”

## 12. Gamificação futura

O Slothdule poderá ter uma moeda interna chamada **Folhinhas**.

As folhinhas serão concedidas por tarefas concluídas e poderão ser trocadas por recompensas afetivas, como:

- beijo;
- café especial;
- noite de filme;
- jantar;
- presente surpresa;
- final de semana;
- viagem.

A gamificação deve ser positiva. Não deve haver punições por atraso na versão inicial.

## 13. Critérios de sucesso do MVP

O MVP será considerado bem-sucedido se:

1. O usuário conseguir registrar tarefas reais do dia a dia.
2. O app mostrar claramente o que fazer hoje.
3. Tarefas atrasadas ficarem visíveis.
4. A carga do dia/semana ajudar a evitar acúmulo.
5. A timeline der sensação clara de temporalidade.
6. Lembretes reduzirem esquecimento.
7. O usuário conseguir acessar pelo Android e pelo Windows.
8. O app for mais agradável e pessoal do que uma lista fria de tarefas.

## 14. Não objetivos do MVP

O MVP não precisa:

- substituir completamente Trello e Google Calendar;
- ter integração com WhatsApp;
- ter IA generativa paga;
- ter app nativo publicado em loja;
- funcionar como sistema corporativo para equipes;
- ter pagamentos ou assinaturas;
- aceitar múltiplos usuários externos.

