# 11 — Rotina e Hábitos

> Status: decisões de produto fechadas em 2026-11-18, pronto para prototipação. Detalhes menores na seção 4.

## 1. Objetivo

Permitir que a pessoa registre hábitos que quer manter e que o Slothdule a ajude a **definir uma rotina**, **mantê-la com consistência** e **evoluir os hábitos com o tempo**. Não é só uma lista de tarefas recorrentes: o app incentiva começar pequeno, reconhece a constância e sugere o próximo passo quando um hábito está firme.

Os princípios da gamificação (`10-gamification.md`) continuam valendo: sem punição, sem culpa, sem linguagem de cobrança.

## 2. Conceitos

- **Hábito**: a unidade. Algo que a pessoa quer manter ("beber água", "alongar 5 min") ou evitar ("não pedir delivery"). É o hábito que tem estágio, sequência e recompensa.
- **Rotina**: um encadeamento ordenado de hábitos ("Rotina da manhã": acordar → água → alongar → planejar o dia). É a forma de "engatar" hábitos uns nos outros (habit stacking).

Nome do menu: **Rotina**. É um grupo próprio no menu lateral, no mesmo nível de "Seu dia" e "Cantinho", com duas páginas:

- **Visão geral**: o dia dos hábitos. Botões de novo hábito e nova rotina, cuidados de hoje, Folhinhas de hábitos com o teto diário, e a lista do dia (rotinas encadeadas e hábitos soltos) para marcar feito ou folga.
- **Jardim**: como cada hábito está crescendo. Uma planta por hábito com estágio, progresso até o próximo estágio, avisos gentis de regressão e sugestões de evolução, com filtro por estágio. Cada planta abre o detalhe do hábito.

No celular, Visão geral e Jardim ficam no menu "Mais" da barra inferior, e as duas telas têm abas no topo para alternar entre elas. A barra inferior não mudou.

## 3. Decisões tomadas

### 3.1 Frequência

- Apenas **dias fixos da semana** (ex.: todos os dias; seg/qua/sex).
- Sem metas flexíveis do tipo "3x por semana, quando der" por enquanto.
- O progresso conta **ocorrências agendadas**, não dias de calendário: um hábito de seg/qua/sex não "falha" na terça.

### 3.2 Horário

Opcional, em três formas:

1. **Horário específico** (ex.: 07:30): aparece na timeline e pode gerar lembrete.
2. **Período** (manhã, tarde ou noite).
3. **Qualquer momento do dia.**

Em todos os casos, concluir em qualquer momento do dia agendado conta. Não existe penalidade por fazer fora do horário.

### 3.3 Hábitos de fazer e de evitar

Os dois tipos fazem parte do escopo.

- **Fazer**: o check-in registra que a pessoa fez.
- **Evitar**: o check-in registra que a pessoa conseguiu evitar naquele dia. O registro é sempre manual e afirmativo; o app nunca marca falha automaticamente nem pergunta de forma acusatória.

### 3.4 Estágios e recompensas

Cada hábito é uma plantinha que cresce com a constância:

| Estágio | Folhinhas por check-in |
|---|---:|
| Broto | +1 |
| Muda | +2 |
| Arbusto | +3 |
| Árvore | +4 |

- O teto é +4, abaixo de uma tarefa crítica (+8), para não inflar o saldo nem esvaziar o sentido da loja de recompensas.
- Faltar **não zera** e a planta **nunca morre**: ela para de crescer e, depois de faltas suficientes, volta **um** estágio.
- Não pode haver Folhinhas duplicadas para o mesmo hábito no mesmo dia.
- **Teto diário**: no máximo **10 Folhinhas por dia** vindas de hábitos, somando todos. Check-ins além do teto continuam contando para o crescimento da planta, só não rendem Folhinhas. O bônus de rotinas (+2, ver 3.9) é somado à parte, fora desse teto. Sem esse teto, 4 ou 5 hábitos diários renderiam uma "Viagem" (300) em menos de um mês.

### 3.5 Crescimento: contador acumulado

A planta cresce por **check-ins acumulados**, sem exigir sequência. Faltas isoladas não descontam nada.

Limiares (check-ins acumulados para atingir o estágio), conforme quantos dias por semana o hábito está agendado:

| Dias agendados/semana | Muda | Arbusto | Árvore |
|---|---:|---:|---:|
| 7 (todo dia) | 7 | 21 | 66 |
| 3 | 5 | 14 | 43 |
| 1 | 3 | 8 | 25 |

Para 2, 4, 5 e 6 dias por semana, interpolar entre as linhas (valores exatos a fixar na implementação, com testes).

Referência de tempo, cumprindo 80% das ocorrências: árvore em ~82 dias (diário), ~4 meses (3x/semana), ~7 meses (1x/semana).

### 3.6 Regressão e recuperação

- A planta volta **um** estágio depois de **~2 semanas de agenda sem nenhum check-in** (ocorrências agendadas, sem contar folgas). Faltas isoladas nunca fazem a planta descer.
- Ao descer, o contador fica perto do topo do estágio de baixo: para recuperar, bastam **¼ dos check-ins** do degrau perdido (ex.: 12 para voltar à árvore num hábito diário).
- A planta nunca desce abaixo de broto.

### 3.7 Folga

- **Dia de folga ilimitado**: a ocorrência fica congelada, não conta como falta e não rende Folhinhas.
- Um passo de rotina em folga impede o bônus de rotinas daquele dia (ver 3.9).

### 3.8 Hábitos de evitar

- Mesmas regras de crescimento, regressão e folga.
- Um deslize conta só como uma falta comum.
- A tela mostra o **total de dias cuidados**, nunca "dias desde o último deslize".

Base da decisão: Lally et al. (2009), mediana de 66 dias até a automaticidade (faixa 18–254); Singh et al. (2024), mediana de 59–66 dias; uma falta isolada não prejudica a formação; efeito *abstinence violation* em hábitos de evitar; sequências quebradas reduzem o engajamento (Silverman & Barasch, 2023). Sequência pura e força por média exponencial foram descartadas por punirem faltas.

### 3.9 Encadeamento

- A rotina é uma **lista ordenada de hábitos**, não um grafo de dependências entre hábitos soltos.
- A rotina pode ter uma âncora em texto livre ("depois do café").
- **Bônus de rotinas**: **+2 Folhinhas uma vez por dia**, quando todas as rotinas agendadas para o dia têm todos os passos feitos. Não é por rotina: duas rotinas completas no mesmo dia continuam rendendo +2.
- O bônus fica **fora do teto diário de 10** (ver 3.4).
- Um passo de **folga não completa a rotina**: naquele dia não há bônus. A folga continua sem contar como falta para a planta (ver 3.7).
- Os passos de um dia são os hábitos da rotina agendados para aquele dia; uma rotina sem passo no dia não conta. Hábitos soltos nunca seguram o bônus.
- Desfazer um cuidado (ou trocá-lo por folga) devolve o bônus, como devolve as Folhinhas do cuidado. Editar ou apagar a rotina nunca tira um bônus já ganho.
- Um hábito está em no máximo uma rotina; apagar a rotina deixa os hábitos soltos.

### 3.10 Rotina inicial "Organizar meu dia"

- Toda conta nasce com a rotina **Organizar meu dia** (âncora "ao começar o dia"), com um passo: o hábito **Montar o Plano do dia**, de segunda a sexta, de manhã. É um bom hábito para todo mundo e mostra a quem chega que rotinas existem.
- Contas criadas antes ganharam a mesma rotina pela migração `0007_starter_routine` (quem já tinha uma rotina com esse nome ficou como estava).
- É uma rotina comum: dá para editar, apagar ou adicionar passos. Como as outras, entra na conta do bônus de rotinas (3.9) nos dias úteis.
- Código: `backend/app/services/starter_routine.py`, chamado no cadastro por e-mail e pelo Google.

## 4. Pendente

- Limiares exatos para 2, 4, 5 e 6 dias por semana.

## 5. Direções já discutidas (a detalhar)

- **Começar pequeno**: ao criar um hábito, sugerir a versão mínima ("2 minutos de leitura") e desencorajar mais de 1 ou 2 hábitos em formação ao mesmo tempo.
- **Evoluir**: quando a planta vira árvore, o mascote sugere com calma subir a régua (5 → 10 min) ou engatar um novo hábito depois dele.
- **Onde aparece**: grupo "Rotina" no menu (Visão geral e Jardim, ver seção 2); seção compacta "Rotina de hoje" na tela Hoje, separada das tarefas e fora da carga do dia e dos atrasados; hábitos com horário na timeline.
- **Retrospectiva semanal** leve, em fase posterior.

## 6. Modelo de dados (rascunho)

Tabelas novas, sem reaproveitar `tasks`:

- `habits`: título, tipo (fazer/evitar), dias da semana, horário opcional, período opcional, versão/meta atual, rotina e posição opcionais (`routine_id`, `routine_position`).
- `habit_checkins`: um por hábito por dia (único), ligado à `leaf_transaction` gerada.
- `routines`: nome, âncora opcional.
- `routine_bonuses`: um por pessoa por dia (único), ligado à `leaf_transaction` do tipo `routine_bonus`.

Estágio e sequência calculados por funções puras em `src/lib/habits/`, com testes Vitest, no mesmo padrão de `src/lib/rewards/`. RLS escopado por `auth.uid()`.

## 7. Fatias de implementação

1. Hábito + check-in + estágio + Folhinhas. **Feita em 2026-11-18**: rotas `/routine` (Visão geral), `/routine/garden` (Jardim) e `/routine/habits/[id]`, com o novo hábito em pop-up (como o de nova tarefa); API `/habits` (`backend/app/routers/habits.py`); regras em `backend/app/services/habits.py` e `src/lib/habits/`. Check-in vale para hoje e os últimos 7 dias da agenda; desmarcar devolve as Folhinhas daquele cuidado. Ainda sem rotinas encadeadas, edição de hábito na tela e bônus de rotinas.
2. Seção "Rotina de hoje" na tela Hoje. **Feita em 2026-11-19**: card compacto abaixo dos resumos do dia, com cuidados feitos de quantos, Folhinhas de hábitos/teto, o próximo cuidado em destaque, os demais pendentes marcáveis ali mesmo e os feitos/folgas recolhidos. Não entra na carga estimada nem nos atrasados; sem hábitos na agenda do dia, o card não aparece.
3. Horário e lembretes. **Feita em 2026-11-19**: hábitos com horário específico aparecem na Linha do tempo (grupo "Rotina com horário", com o horário nos dias da agenda e o estado de hoje). Opção "Lembrar no horário" no novo hábito: um Web Push por dia, a partir do horário e por até 30 min, só se o hábito ainda não teve cuidado nem folga. Envio por `backend/app/services/reminders.py` (laço de 1 min dentro da API, `app/scheduler.py`); `habit_reminder_deliveries` garante no máximo um lembrete por hábito por dia. Inscrições em `/push/subscriptions`. Exige `VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY` (gerar com `backend/scripts/generate_vapid_keys.py`); sem elas o push fica desligado. Lembretes de tarefa com canal `push` também saem pelo mesmo laço (`backend/app/services/task_reminders.py`): a partir de `remind_at` e por até 30 min, só se a tarefa não estiver concluída nem arquivada, com o link `/tasks/<id>`; `reminders.is_sent` é virado por um UPDATE atômico antes do envio (no máximo um envio, mesmo com vários processos) e volta a `false` quando o lembrete é remarcado.
4. Rotinas encadeadas. **Feita em 2026-11-19**: botão "Nova rotina" na Visão geral abre um pop-up com nome, âncora ("Começa depois de quê?") e os passos em ordem (subir, descer, tirar); o mesmo pop-up edita e apaga. Na Visão geral, "Hoje na rotina" mostra cada rotina como uma corrente de passos e, ao lado, "Ao longo do dia" com os hábitos soltos, mais o aviso do bônus (quantos passos faltam, folga ou completo). "Passo a passo" (`/routine/routines/[id]`) é o modo rotina: um passo por vez, com feito, folga hoje ou deixar para depois, e um resumo no fim. A Rotina de hoje, na tela Hoje, mostra o aviso do bônus e leva ao passo a passo. API `/routines` (`backend/app/routers/routines.py`); bônus em `backend/app/services/routines.py`.
5. Sugestões de evolução.
