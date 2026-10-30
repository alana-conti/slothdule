# 02 — User Flows: Slothdule

## 1. Fluxo: abrir o app e entender o dia

```text
Usuário abre o Slothdule
↓
Tela Hoje é exibida
↓
Usuário vê "Em foco agora" (o que já está em andamento, de qualquer data), tarefas de hoje, depois as atrasadas (com um aviso "N atrasadas" no resumo do topo), e a carga estimada
↓
Usuário identifica a tarefa mais urgente
↓
Usuário inicia ou edita tarefa
```

### Critério de sucesso

O usuário deve entender em menos de 30 segundos:

- o que está atrasado;
- o que precisa ser feito hoje;
- se o dia está sobrecarregado;
- qual tarefa deve receber atenção primeiro.

### Lista de tarefas (linha compacta)

Cada tarefa é uma linha, não um card grande: círculo para concluir, título, prioridade, categoria, prazo e estimativa, botão ▶ para iniciar e seletor de status. Clicar no título (ou na seta) abre os detalhes na própria linha: descrição, prioridade calculada, Editar, Arquivar, Excluir e link para a tela da tarefa.

- **Em foco agora:** uma área fixa no alto da seção "Tarefas de hoje", com **2 espaços** e um contador (`0/2`, `1/2`, `2/2`). Reúne o que está em andamento (de qualquer data, inclusive atrasadas); quem está em foco sai da lista abaixo. Espaços vazios aparecem como "Espaço livre", convidando a iniciar uma tarefa. O limite é um convite, não uma trava: dá para iniciar mais (`3/2` em diante), e a área muda de tom e sugere terminar ou pausar uma antes de abrir outra frente.
- **Iniciar, pausar e retomar:** o botão ▶ inicia (A fazer → Em andamento). Em uma tarefa em andamento ele vira ❚❚; ao clicar, abre um pop-up com um campo opcional "Motivo da pausa" (por exemplo, "esperando o retorno da Ana"). **Enter** pausa, com ou sem recado; Esc ou Cancelar mantém a tarefa em andamento. A tarefa vai para Aguardando e o recado aparece na linha ("Em pausa: …"). Em uma tarefa aguardando o botão volta a ▶ e retoma (Em andamento), apagando o recado. Trocar para "Aguardando" pelo seletor não pede recado.
- Mudar o status é um clique (círculo, ▶ ou seletor), sem botão "Aplicar" e sem recarregar: a tela e o scroll ficam como estão.
- A confirmação aparece como toast; concluir, iniciar, mudar status e arquivar oferecem **Desfazer**, que devolve o status anterior. As Folhinhas já ganhas por uma conclusão não são retiradas ao desfazer, e reconcluir a mesma tarefa não rende Folhinhas de novo.
- Editar acontece dentro da linha; excluir pede confirmação na linha.

## 2. Fluxo: criar tarefa manualmente

```text
Usuário clica no botão flutuante “Nova tarefa” (canto inferior direito) ou aperta a tecla N
↓
Preenche título
↓
Seleciona categoria
↓
Opcionalmente seleciona cliente e projeto/POC
↓
Define prioridade
↓
Define data de início e prazo
↓
Define estimativa de tempo
↓
Adiciona checklist, links, áudio ou observações
↓
Salva tarefa
↓
Pop-up fecha, a pessoa continua na tela em que estava
↓
Toast do Slothdule confirma (com link “Abrir tarefa”)
↓
Tarefa aparece na tela Hoje, calendário e timeline
```

### Feedback de criação (toast)

O aviso segue a identidade do app: cartão creme com borda de folha, mascote como avatar, frase curta e afetiva (“Uma coisa a menos para guardar na cabeça.”), fio de tempo em verde-folha e animação suave (desligada com `prefers-reduced-motion`). Some sozinho em 5 s, pausa ao passar o mouse/foco e pode ser fechado. Erros de criação aparecem dentro do pop-up, sem apagar o que foi digitado. Componente: `src/components/sloth/toast.tsx`.

### Campos mínimos para salvar

- título;
- categoria;
- prioridade;
- prazo.

### Campos recomendados

- data de início;
- estimativa de tempo;
- cliente;
- projeto;
- checklist.

## 3. Fluxo: captura rápida por texto

```text
Usuário clica em “Captura rápida”
↓
Digita: “Revisar proposta da POC da empresa X até sexta”
↓
Sistema interpreta por regras
↓
Sistema sugere título, categoria, prazo, prioridade e checklist
↓
Usuário revisa
↓
Usuário confirma
↓
Tarefa é criada
```

### Observação

Na primeira versão, a captura rápida deve funcionar por regras simples, sem depender de IA paga.

### Exemplo de saída sugerida

```text
Título: Revisar proposta da POC da empresa X
Categoria: Trabalho
Tipo: Trabalho para cliente
Cliente: Empresa X
Projeto: POC Empresa X
Prazo: próxima sexta-feira
Prioridade: Média
Checklist sugerido:
- Revisar escopo
- Conferir entregáveis
- Ajustar prazo
- Enviar versão final
```

## 4. Fluxo: adicionar checklist

```text
Usuário abre uma tarefa
↓
Clica em “Adicionar item”
↓
Escreve subtarefa
↓
Repete se necessário
↓
Marca subtarefas como concluídas ao longo da execução
↓
Quando todas forem concluídas, app pode sugerir concluir tarefa principal
```

### Regra

A tarefa principal não deve ser concluída automaticamente sem confirmação do usuário.

## 5. Fluxo: visualizar timeline

```text
Usuário acessa Timeline
↓
Escolhe agrupamento: categoria, cliente, projeto ou status
↓
Visualiza tarefas em barras entre data de início e prazo
↓
Identifica sobreposição de tarefas e prazos críticos
↓
Abre tarefa para editar prazo ou estimativa
```

### Critério de sucesso

A timeline deve permitir perceber:

- tarefas longas;
- tarefas sobrepostas;
- semanas carregadas;
- prazos próximos;
- projetos/clientes que concentram demanda.

## 6. Fluxo: visualizar carga diária

```text
Usuário acessa Hoje ou Semana
↓
Sistema soma tempo estimado das tarefas abertas por dia
↓
Sistema mostra carga diária
↓
Se carga estiver alta, exibe alerta gentil
↓
Usuário redistribui tarefas se necessário
```

### Exemplo

```text
Segunda: 7h estimadas
Terça: 3h estimadas
Quarta: 9h estimadas — dia pesado
Quinta: 4h estimadas
Sexta: 2h estimadas
```

## 7. Fluxo: criar lembrete

```text
Usuário abre uma tarefa
↓
Clica em “Adicionar lembrete”
↓
Escolhe data e horário
↓
Escolhe canal: app/push
↓
Salva
↓
App envia notificação discreta no horário definido
```

### Exemplo de notificação

> “Uma tarefa importante está chegando: revisar proposta da POC.”

## 8. Fluxo: gravar áudio vinculado a tarefa

```text
Usuário abre tarefa
↓
Clica em “Gravar áudio”
↓
Autoriza microfone
↓
Grava lembrete/contexto
↓
Salva áudio
↓
Áudio fica disponível dentro da tarefa
```

### Casos de uso

- registrar ideia após reunião;
- salvar instrução rápida;
- guardar contexto que seria demorado digitar;
- registrar lembrete pessoal.

## 9. Fluxo: tarefa atrasada

```text
Data de prazo passa sem conclusão
↓
Tarefa aparece em “Atrasadas” na tela Hoje
↓
Sistema aumenta score de prioridade
↓
Sistema sugere reagendar ou concluir
```

### Tom recomendado

Evitar culpa. Usar linguagem calma:

> “Essa tarefa passou do prazo. Quer reorganizar?”

## 10. Fluxo MVP: ganhar Folhinhas

```text
Usuário conclui uma tarefa
↓
App verifica prioridade, prazo e checklist
↓
App calcula Folhinhas ganhas
↓
App registra transação positiva
↓
Saldo é atualizado
↓
Mascote exibe mensagem gentil de progresso
```

### Exemplo

```text
Tarefa concluída: Revisar proposta da POC
Prioridade: alta
Ganho base: +5 Folhinhas
Bônus checklist completo: +2 Folhinhas
Total ganho: +7 Folhinhas
Saldo atual: 52 Folhinhas
```

### Regras de tom

- Não usar punições por atraso.
- Não remover Folhinhas automaticamente por tarefas vencidas.
- Não transformar o app em cobrança de produtividade.
- Usar frases curtas, positivas e afetivas.

Exemplo de mensagem:

> “Mais uma tarefa saiu da árvore. Você ganhou 7 Folhinhas.”

## 11. Fluxo MVP: resgatar recompensa

```text
Usuário acessa Folhinhas/Recompensas
↓
Visualiza saldo atual
↓
Visualiza recompensas disponíveis
↓
Escolhe recompensa
↓
App verifica se há saldo suficiente
↓
Usuário confirma resgate
↓
App registra resgate
↓
App registra transação negativa
↓
Recompensa fica com status solicitado
```

### Exemplo

```text
Saldo: 52 Folhinhas
Recompensa: Noite de filme — 25 Folhinhas
Saldo após resgate: 27 Folhinhas
Status: Solicitada
```

### Exemplo de recompensas iniciais

- Beijo.
- Café especial.
- Noite de filme.
- Jantar escolhido por ele.
- Presente surpresa.
- Final de semana especial.
- Viagem.

