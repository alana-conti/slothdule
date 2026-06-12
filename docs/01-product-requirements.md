# 01 — Product Requirements Document: Slothdule

## 1. Visão geral

**Slothdule** é um planner pessoal/profissional com mascote de bicho-preguiça, pensado para organizar demandas de rotina com calma, clareza, priorização por prazo e pequenas recompensas afetivas.

O app será usado inicialmente por uma pessoa que trabalha com engenharia de IA, elaboração e venda de POCs de IA e relatórios de maturidade. Ele já utiliza Trello e Google Calendar, mas enfrenta dificuldade com acúmulo de demandas, esquecimento e priorização incorreta.

O objetivo inicial é criar um presente funcional e privado, com possibilidade futura de expansão para outros usuários. A gamificação com **Folhinhas** e recompensas afetivas faz parte do MVP, pois reforça o caráter pessoal do presente e transforma conclusão de tarefas em reconhecimento positivo.

## 2. Problema a resolver

O usuário atual possui muitas demandas simultâneas, registradas em ferramentas diferentes ou surgindo ao longo do dia. O principal problema não é apenas registrar tarefas, mas:

- evitar acúmulo invisível;
- reduzir esquecimento;
- priorizar corretamente por prazo e criticidade;
- visualizar a duração das atividades no tempo;
- compreender carga diária/semanal;
- manter contexto de cada tarefa por meio de links, áudios e checklists;
- criar uma experiência de progresso mais leve, afetiva e motivadora.

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
8. Quantas Folhinhas ganhei pelo meu progresso?
9. Quais recompensas posso resgatar?

## 5. Princípios do produto

1. **Calma acima de pressão:** o app deve organizar sem gerar ansiedade.
2. **Prazo como eixo central:** a organização principal será temporal.
3. **Entrada rápida, mas não necessariamente instantânea:** o usuário aceita levar alguns segundos para registrar uma tarefa corretamente.
4. **Contexto preservado:** tarefas podem guardar checklist, links, áudio e observações.
5. **Prioridade explicável:** a priorização inicial deve ser baseada em regras transparentes, não em IA opaca.
6. **Recompensa sem culpa:** Folhinhas devem reconhecer progresso, nunca punir atraso.
7. **MVP útil antes de ser completo:** começar com o que resolve o problema real.
8. **Preparado para crescer:** mesmo sendo privado no início, o app deve ter base técnica compatível com multiusuários no futuro.

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
- Moeda interna **Folhinhas**.
- Ganho automático de Folhinhas ao concluir tarefas.
- Saldo de Folhinhas.
- Histórico de transações de Folhinhas.
- Loja de recompensas afetivas.
- Resgate de recompensas.
- Mensagens do mascote associadas a progresso e resgates.

### Funcionalidades fora do MVP, mas planejadas

- Upload de PDF e imagem.
- Sincronização com Google Calendar.
- Pipeline comercial avançado.
- Telegram bot.
- WhatsApp bot.
- IA generativa paga ou local.
- Assistente em formato de chat.
- Multiusuários completo.
- Publicação como produto aberto.
- Pagamentos ou assinaturas.

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
- Item de recompensa.
- Transação de Folhinhas.
- Resgate de recompensa.

## 9. Visualizações obrigatórias

### Hoje

Tela inicial do app. Deve mostrar:

- tarefas atrasadas;
- tarefas de hoje;
- próximas tarefas;
- carga estimada do dia;
- tarefas críticas;
- botão de nova tarefa;
- botão de captura rápida;
- saldo discreto de Folhinhas;
- feedback do mascote quando tarefas forem concluídas.

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

### Folhinhas e recompensas

Deve mostrar:

- saldo atual;
- histórico de ganhos e gastos;
- recompensas disponíveis;
- custo de cada recompensa;
- confirmação de resgate;
- status do resgate.

## 10. Notificações

As notificações devem ser discretas e gentis.

Exemplos:

- “Uma tarefa importante está chegando: revisar proposta da POC.”
- “Hoje há uma tarefa crítica para revisar.”
- “Seu dia parece cheio. Vale reorganizar?”
- “Você concluiu uma tarefa e ganhou Folhinhas.”

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

## 12. Gamificação no MVP: Folhinhas

A moeda interna do Slothdule será chamada **Folhinhas**.

As Folhinhas devem ser concedidas por tarefas concluídas e poderão ser trocadas por recompensas afetivas. A gamificação deve ser positiva, discreta e opcional. Não deve haver punição por atraso, perda automática de saldo ou mensagens de culpa.

### Regras iniciais de ganho

| Evento | Folhinhas |
|---|---:|
| Concluir tarefa de prioridade baixa | +1 |
| Concluir tarefa de prioridade média | +3 |
| Concluir tarefa de prioridade alta | +5 |
| Concluir tarefa de prioridade crítica | +8 |
| Concluir antes do prazo | bônus +2 |
| Concluir checklist completo | bônus +2 |
| Fechar semana sem tarefa crítica atrasada | bônus +10 |

Para o MVP, o ganho por conclusão de tarefa é obrigatório. Os bônus podem ser implementados na mesma estrutura, mas devem ser testáveis e explicáveis.

### Recompensas iniciais sugeridas

| Recompensa | Custo sugerido |
|---|---:|
| Beijo | 5 |
| Café especial | 10 |
| Noite de filme | 25 |
| Jantar escolhido por ele | 50 |
| Presente surpresa | 80 |
| Final de semana especial | 150 |
| Viagem | 300 |

As recompensas devem ser configuráveis para que o app possa crescer no futuro.

### Estados de resgate

- solicitado;
- entregue;
- cancelado.

### Comportamento esperado

1. Usuário conclui uma tarefa.
2. O app calcula Folhinhas de acordo com prioridade e bônus.
3. O app registra uma transação positiva.
4. O saldo é atualizado.
5. O mascote mostra uma mensagem curta e gentil.
6. Usuário pode acessar a loja e resgatar uma recompensa.
7. O resgate gera uma transação negativa e fica registrado no histórico.

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
9. O usuário ganhar Folhinhas ao concluir tarefas.
10. O usuário conseguir ver saldo, histórico e recompensas disponíveis.
11. O usuário conseguir resgatar uma recompensa sem atrito.

## 14. Não objetivos do MVP

O MVP não precisa:

- substituir completamente Trello e Google Calendar;
- ter integração com WhatsApp;
- ter IA generativa paga;
- ter app nativo publicado em loja;
- funcionar como sistema corporativo para equipes;
- ter pagamentos ou assinaturas;
- aceitar múltiplos usuários externos;
- ter economia complexa, ranking, competição social ou punições.
