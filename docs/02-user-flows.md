# 02 — User Flows: Slothdule

## 1. Fluxo: abrir o app e entender o dia

```text
Usuário abre o Slothdule
↓
Tela Hoje é exibida
↓
Usuário vê "Em foco agora" (o que já está em andamento, de qualquer data), tarefas de hoje (as atrasadas entram aqui, marcadas só com "Ficou de antes"; por dentro a prioridade conta um nível acima para ordenar a lista, sem alterar o que foi salvo e sem mostrar isso na etiqueta; o resumo do topo diz quantas ficaram de dias anteriores), e a carga estimada
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
- prioridade.

O prazo é opcional: deixar em branco guarda a tarefa em **Sem pressa** (ver fluxo "Sem pressa").

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
(“algum dia”, “sem pressa” ou “sem data” deixam o prazo em branco)
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


## 12. Fluxo: Modo foco (pomodoro)

```text
Usuário inicia uma tarefa (▶) e ela vai para "Em foco agora"
↓
Clica em "Focar" na linha da tarefa
↓
Começa um bloco de foco no último ritmo escolhido, ligado àquela tarefa
↓
O relógio fica à vista em qualquer tela (canto inferior direito no desktop, pílula no celular)
↓
Ao fim do foco: som suave, mensagem calma, e a pausa começa sozinha
↓
Ao fim da pausa: o próximo foco fica pronto, esperando a pessoa voltar
```

- **Onde fica:** no desktop, fixo no canto inferior direito, em verde-floresta para se destacar, em todas as telas. Sem sessão é um botão "Modo foco"; com sessão vira uma pílula com relógio, fase, tarefa e pausar/retomar. O painel inteiro abre para cima, sem sair da tela. No celular, uma pílula acima da barra de navegação enquanto há sessão; tocar nela abre a folha com o painel. Sem sessão, o Modo foco abre pelo menu **Mais**.
- **Atalho:** a tecla **F** abre e fecha o painel (como N abre a nova tarefa). Não vale dentro de campos de texto nem com um pop-up aberto. Esc fecha.
- **Ritmos:** Clássico (25/5, pausa longa de 15 a cada 4 focos), Profundo (50/10, pausa longa de 20 a cada 3) e Ritmo preguiça (15/5, para dias de pouca energia). O último ritmo escolhido vale para a próxima sessão.
- **Ferramenta, não recompensa:** o Modo foco não dá Folhinhas. Ele existe para ajudar a manter o ritmo, não para pontuar. Pausar, pular ou encerrar não tira nada.
- **Tarefa ligada:** "Focar" com uma sessão já aberta só troca a tarefa, sem reiniciar o relógio. Concluir a tarefa em foco a desliga, e o relógio segue como foco livre. Na linha da tarefa em foco, o botão vira o relógio.
- **Relógio confiável:** a sessão guarda a hora de término, não conta segundos; fica no aparelho (localStorage), sobrevive a trocar de tela e a recarregar, e as abas abertas acompanham umas às outras. Quem volta depois de um tempo fora encontra a fase certa.
- **Avisos:** com a aba à vista, som e toast. Com a aba em segundo plano e notificações permitidas, aviso do sistema. O título da aba mostra o relógio ("12:34 · Foco · Slothdule").
- **Som para trabalhar:** no painel, a seção **Som** tem duas abas. Um clique escolhe e já toca; o som é independente do relógio (dá para ouvir sem sessão) e segue tocando ao trocar de tela.
  - **Lofi ao vivo:** lives curadas do YouTube (Lofi Girl e Chillhop), em `src/features/focus/sound/catalog.ts`. O player usa `youtube-nocookie.com` e fica **sempre à vista enquanto toca, com 356×200**, como pedem as regras do YouTube (mínimo de 200×200, sem esconder o vídeo nem tocar só o áudio): no desktop, acima da pílula no canto; no celular, acima da barra. Ele não se esconde, só desliga. Os canais às vezes encerram uma live e abrem outra com novo ID: o player avisa ("Essa live não abre aqui agora") e basta trocar o `videoId` no catálogo.
  - **Ambiente:** quatro gravações reais (chuva, trovão longe, degelo e passarinhos), trechos de 75 s em loop vindos do Wikimedia Commons, em `public/sounds/foco/`, tocados num `<audio>`: seguem com a tela bloqueada e aparecem nos controles de mídia. Também um **piano suave** feito no app (notas soltas numa escala pentatônica, nunca repete) e **Minha mistura**, que junta as gravações e o piano com um volume por camada. Piano e mistura usam Web Audio e podem parar quando o celular bloqueia a tela. Enquanto toca, um chip com o nome do som e pausar/tocar fica ao lado do Modo foco. Os sons sintetizados da primeira versão saíram: soavam artificiais demais para trabalhar.
  - **Editar camadas:** o painel só toca a mistura; o link **Editar camadas** abre Configurações › Sons já na seção **Mistura do Modo foco**, com um controle por camada e os créditos das gravações. Os volumes ficam no aparelho e mudam na hora se a mistura estiver tocando.
  - **Preferências:** a aba escolhida e o volume ficam no aparelho. O que está tocando vale só para a aba do navegador: recarregar para o som, porque o navegador exige um clique para voltar a tocar.
- **Spotify:** fora por enquanto. Desde fevereiro de 2026 um app do Spotify em modo de desenvolvimento aceita só 5 usuários, e a cota maior é para empresas grandes. O caminho viável é o link da playlist no perfil (embed no desktop, "Abrir no Spotify" no celular).
- **Próximas fases:** histórico de foco (tempo real gasto ao lado da estimativa da tarefa), aviso por Web Push com a tela bloqueada e o link da playlist do Spotify no perfil.

## 13. Fluxo: Sem pressa (tarefas sem data)

```text
Usuário cria uma tarefa e deixa o prazo em branco
↓
A tarefa vai para "Sem pressa" (menu Seu dia; no celular, em Mais)
↓
Ela não aparece em Hoje, na Linha do tempo nem no Calendário, e nunca fica atrasada
↓
Quando chegar a hora, o usuário dá uma data pelo selo "Sem pressa" na linha
```

- **Nome:** "Sem pressa", não "backlog". É o lugar do que vai acontecer um dia, sem cobrança. Rota `/later`.
- **Dado:** `due_date` vazio. Sem data e sem data de início = Sem pressa (`someday` em `groupTasksForToday`). Com data de início e sem prazo, a tarefa entra em Hoje a partir desse dia e fica até ser concluída, sem nunca virar "Ficou de antes".
- **Ida e volta:** o selo de prazo da linha mostra "Sem pressa". No editor de prazo, o botão **Sem pressa** tira a data de uma tarefa que já tinha.
- **Ordem:** da mais antiga para a mais nova.
- **Folhinhas:** sem prazo não há bônus de "antes do prazo"; o ganho por prioridade continua igual.
- **Próxima fase:** sugerir, em dias leves, adiantar uma tarefa futura ou de Sem pressa ("Trazer pra hoje", "Só 25 min", "Agora não"), sempre com o motivo à vista.
