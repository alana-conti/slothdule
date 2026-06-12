# 04 — Architecture: Slothdule

## 1. Visão geral

O Slothdule será uma aplicação PWA com frontend em Next.js, backend gerenciado pelo Supabase e deploy na Vercel.

A escolha por PWA é adequada porque o usuário inicial utiliza Windows e Android. Assim, uma única aplicação pode funcionar no navegador do notebook e ser instalada no celular como app.

## 2. Arquitetura macro

```text
Usuário no Windows/Android
  ↓
PWA Slothdule — Next.js + TypeScript
  ↓
Supabase Client
  ↓
Supabase
  ├── Auth
  ├── Postgres Database
  ├── Storage
  ├── Realtime
  └── Edge Functions / scheduled jobs futuramente
  ↓
Vercel para deploy do frontend
```

## 3. Responsabilidades por camada

### Frontend

Responsável por:

- interface visual;
- formulários;
- tela Hoje;
- calendário;
- timeline;
- carga diária;
- checklist;
- captura rápida;
- gravação de áudio;
- permissões de notificação;
- experiência PWA.

### Supabase

Responsável por:

- autenticação;
- banco de dados;
- regras de segurança;
- armazenamento de áudio e arquivos futuros;
- sincronização em tempo real;
- APIs automáticas;
- futuras funções serverless.

### Vercel

Responsável por:

- hospedagem do app;
- deploy contínuo;
- variáveis de ambiente;
- preview deployments.

## 4. PWA

A aplicação deve incluir:

- manifest;
- ícones;
- service worker;
- configuração de instalação em Android;
- suporte progressivo a notificações;
- página responsiva para desktop e mobile.

## 5. Notificações

As notificações devem ser discretas e baseadas em lembretes.

Fluxo técnico desejado:

```text
Usuário cria lembrete
↓
App salva lembrete no Supabase
↓
Sistema verifica lembretes próximos
↓
Servidor envia push
↓
Service worker exibe notificação
```

No MVP, pode ser aceitável começar com notificações locais enquanto a arquitetura de push estiver em desenvolvimento, desde que isso fique documentado.

## 6. Áudio

Fluxo técnico:

```text
Usuário abre tarefa
↓
Autoriza microfone
↓
Navegador grava áudio
↓
Arquivo é enviado ao Supabase Storage
↓
Registro é salvo em attachments
↓
Áudio pode ser reproduzido na tarefa
```

## 7. Priorização por regras

A priorização não precisa usar IA inicialmente.

A função de score deve ficar em:

```text
src/lib/priority/
```

Entrada esperada:

- tarefa;
- data atual;
- status;
- prioridade manual;
- prazo;
- estimativa;
- categoria.

Saída esperada:

- score numérico;
- lista de razões explicáveis.

Exemplo:

```json
{
  "score": 92,
  "reasons": [
    "vence hoje",
    "prioridade alta",
    "ainda não iniciada"
  ]
}
```

## 8. Captura rápida

Primeira versão baseada em regras:

```text
Texto livre
↓
Parser simples
↓
Sugestão de campos
↓
Usuário confirma
↓
Tarefa criada
```

Parser deve detectar:

- expressões de prazo: hoje, amanhã, sexta, próxima semana;
- prioridade: urgente, crítico, importante;
- categoria: mercado, financeiro, trabalho, pessoal;
- termos de trabalho: POC, proposta, cliente, relatório, reunião;
- possível checklist padrão.

## 9. Futuras integrações

### Google Calendar

Inicialmente o calendário será interno. A integração futura deve permitir:

- importar eventos;
- exportar tarefas com prazo;
- evitar duplicidade;
- respeitar autorização OAuth.

### Telegram

Integração preferida antes do WhatsApp por simplicidade técnica.

Possíveis usos:

- capturar tarefa por mensagem;
- receber lembrete;
- enviar áudio.

### WhatsApp

Planejado apenas depois de avaliar custo, regras e complexidade.

Possíveis usos:

- captura de tarefas;
- lembretes;
- áudios.

## 10. Estrutura sugerida de código

```text
src/
  app/
    layout.tsx
    page.tsx
    today/
    tasks/
    calendar/
    timeline/
    settings/
  components/
    ui/
    layout/
    sloth/
  features/
    tasks/
    categories/
    clients/
    projects/
    reminders/
    attachments/
    timeline/
    calendar/
    rewards/
  lib/
    supabase/
    priority/
    quick-capture/
    notifications/
    audio/
    date/
  types/
```

## 11. Estratégia de desenvolvimento

1. Começar com documentação.
2. Criar base Next.js.
3. Configurar tema visual.
4. Criar schema Supabase.
5. Implementar autenticação.
6. Implementar CRUD de tarefas.
7. Implementar tela Hoje.
8. Implementar calendário e timeline.
9. Implementar lembretes.
10. Implementar áudio e links.
11. Implementar priorização por regras.
12. Implementar captura rápida.
13. Só depois integrar Telegram/WhatsApp/IA.

## 12. Requisitos não funcionais

- Responsivo para Android e Windows.
- Interface rápida.
- Sem exposição de chaves sensíveis.
- Row Level Security ativa.
- Acessibilidade mínima.
- Componentes reutilizáveis.
- Código revisável pelo Codex.
- Sem bibliotecas desnecessárias.

## 13. Referências técnicas oficiais

- Next.js PWA Guide: https://nextjs.org/docs/app/guides/progressive-web-apps
- Supabase Docs: https://supabase.com/docs
- Supabase Platform: https://supabase.com/
- OpenAI Codex GitHub: https://github.com/openai/codex

