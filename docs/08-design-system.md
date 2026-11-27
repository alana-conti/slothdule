# 08 — Design System: Slothdule

## 1. Personalidade visual

O Slothdule deve ser:

- minimalista;
- aconchegante;
- calmo;
- gentil;
- organizado;
- levemente afetivo;
- sem parecer infantil.

O app deve transmitir a ideia de produtividade tranquila.

## 2. Mascote

Mascote: **bicho-preguiça**.

Função do mascote:

- acolher;
- orientar;
- comemorar pequenas conclusões;
- aparecer em estados vazios;
- reforçar o tom calmo do app.

O mascote não deve ocupar espaço excessivo nem atrapalhar a produtividade.

## 3. Frases de personalidade

Possíveis frases:

- “Uma coisa de cada vez.”
- “Vamos organizar isso com calma?”
- “Seu dia parece cheio. Quer priorizar?”
- “Essa tarefa passou do prazo. Quer reorganizar?”
- “Tarefa concluída. A preguiça aprovou.”
- “Respira. A gente coloca isso no lugar.”
- “Hoje tem bastante coisa, mas dá para ordenar.”

## 4. Paleta sugerida

### Cores base

| Uso | Cor sugerida | Hex |
|---|---|---|
| Fundo principal | Creme claro | `#F8F3EA` |
| Fundo secundário | Bege suave | `#EFE3D0` |
| Texto principal | Marrom escuro | `#2F241D` |
| Texto secundário | Cinza quente | `#6F665C` |
| Card | Branco quente | `#FFFDF8` |
| Borda | Bege acinzentado | `#DED2C1` |

### Cores de marca

| Uso | Cor sugerida | Hex |
|---|---|---|
| Primária | Verde musgo | `#5F7A61` |
| Primária escura | Verde floresta | `#3F5A42` |
| Destaque | Dourado folha | `#C49A4A` |
| Sucesso | Verde folha | `#6F9B6D` |
| Atenção | Âmbar suave | `#D69E45` |
| Crítico | Terracota | `#C46A4A` |

## 5. Prioridades

| Prioridade | Tom visual sugerido |
|---|---|
| Baixa | neutro/suave |
| Média | verde/azul suave |
| Alta | âmbar |
| Crítica | terracota |

Evitar vermelho agressivo como padrão.

## 6. Tipografia

Sugestão:

- fonte sem serifa, limpa e confortável;
- títulos com peso médio/semibold;
- corpo com boa legibilidade;
- evitar excesso de caixa alta.

## 7. Componentes principais

### Cards

- cantos arredondados;
- sombra muito sutil ou borda suave;
- espaçamento confortável;
- foco em clareza.

### Botões

- botão primário: verde musgo;
- botão secundário: fundo claro com borda;
- botão destrutivo: discreto, não agressivo.

### Badges

Usar badges para:

- prioridade;
- status;
- categoria;
- cliente;
- projeto.

### Estados vazios

Usar mascote e frase gentil.

Exemplo:

> “Nada por aqui. A preguiça está descansando.”

## 8. Tom de mensagens

### Mensagens boas

- “Essa tarefa está atrasada. Quer reagendar?”
- “Você concluiu mais uma. Muito bem.”
- “Seu dia parece acima da carga ideal.”
- “Que tal mover isso para amanhã?”

### Mensagens a evitar

- “Você falhou.”
- “Urgente! Resolva agora.”
- “Você está improdutivo.”
- “Atrasado de novo.”

## 9. Gamificação visual no MVP

Moeda: **Folhinhas**.

A gamificação faz parte do MVP, mas deve continuar discreta, afetiva e sem pressão.

Visual sugerido:

- ícone de folha;
- animação discreta ao ganhar;
- saldo visível, mas não dominante;
- loja de recompensas com cards aconchegantes;
- mensagens de ganho sem tom de cobrança;
- nenhuma indicação visual de punição por atraso.

## 10. Acessibilidade

- Contraste suficiente.
- Botões grandes o bastante para Android.
- Estados visuais acompanhados de texto.
- Não depender apenas de cor para transmitir prioridade.
- Labels claros em formulários.


## 10. Navegação

- **Desktop (≥ 1024px):** barra lateral fixa à esquerda, em fundo creme. Marca no topo, botão "Nova tarefa" (único verde cheio), grupos com rótulo em caixa-alta ("Seu dia", "Cantinho"), saldo de Folhinhas e conta no rodapé.
- **Celular:** barra inferior com Hoje, Tempo, botão central "+" (nova tarefa), Agenda e "Mais" (Recompensas, conta, Sair).
- Item ativo = card branco quente com borda bege e texto verde floresta.
- Novas telas entram em `groups` em `src/components/sloth/app-navigation.tsx`; o menu vive no layout `(app)`, não nas páginas.
- O pop-up de nova tarefa abre por eventos (`src/features/tasks/new-task-events.ts`) ou pela tecla N.

## 12. Plano do dia e antecipação

- A seção **Plano do dia** é a única com fundo verde: verde folha (`sloth-leaf`) a 30% sobre o creme, borda verde folha e título em verde floresta. O musgo diluído fica acinzentado sobre o creme quente; o verde floresta como fundo pesaria demais numa seção longa.
- Dentro dela, os cards seguem brancos quentes e saltam sobre o verde; "Em foco agora" vira uma bandeja clara. Fundos tingidos de card (atrasada, antecipação) usam base sólida (`color-mix` com `sloth-card`) para não ficarem esverdeados.
- Texto pequeno sobre o verde é verde floresta, não cinza: o cinza quente fica abaixo de 4,5:1 ali.

- **Sugestão x plano:** o que já está no plano é card branco quente, sólido. Sugestão ainda não decidida é card **pontilhado** (borda de 2px tracejada) e translúcido, deixando o verde aparecer, com dois botões de texto: **Aceitar** (cheio, verde floresta) e **Hoje não** (contorno). A borda pontilhada é verde floresta, âmbar se a tarefa ficou de antes.
- A sugestão de adiantar uma tarefa futura é a exceção, para ficar claro que é especial: **fundo dourado de verdade** (degradê sólido de dourado folha claro para mais cheio, sem animação), borda dourada contínua de 2px, sombra leve e etiqueta "🍃 Adiantar" em dourado cheio com texto escuro. O "Aceitar" segue verde floresta: verde com dourado. No plano, a tarefa aceita mantém só a etiqueta dourada "Adiantada".
- O dourado não é alerta nem prioridade: marca "um passo à frente", sempre com o motivo em texto.
