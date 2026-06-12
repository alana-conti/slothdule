import {
  createReminderAction,
  deleteReminderAction,
  updateReminderAction,
} from "@/features/tasks/reminder-actions";
import {
  reminderChannels,
  reminderHorizons,
  type Reminder,
  type ReminderChannel,
  type ReminderHorizon,
} from "@/types/tasks";

type ReminderListProps = {
  reminders: Reminder[];
  taskId: string;
};

const channelLabels: Record<ReminderChannel, string> = {
  push: "Notificação Push",
  app: "No Aplicativo",
  telegram: "Telegram",
  whatsapp: "WhatsApp",
};

const channelIcons: Record<ReminderChannel, string> = {
  push: "🔔",
  app: "📱",
  telegram: "✈️",
  whatsapp: "💬",
};

const horizonLabels: Record<ReminderHorizon, string> = {
  short: "15 min antes (Curto)",
  medium: "1h antes (Médio)",
  long: "1 dia antes (Longo)",
};

function formatReminderTime(isoStr: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(isoStr));
}

function formatISOToDateTimeLocal(isoStr: string, timeZone = "America/Sao_Paulo") {
  const date = new Date(isoStr);
  const formatPart = (options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat("en-US", { ...options, timeZone }).format(date);
  
  const year = formatPart({ year: "numeric" });
  const month = formatPart({ month: "2-digit" });
  const day = formatPart({ day: "2-digit" });
  const hour = formatPart({ hour: "2-digit", hour12: false });
  const minute = formatPart({ minute: "2-digit" });
  
  const normalizedHour = hour === "24" ? "00" : hour;
  
  return `${year}-${month}-${day}T${normalizedHour}:${minute}`;
}

export function ReminderList({ reminders, taskId }: ReminderListProps) {
  return (
    <section className="rounded-card border border-sloth-border bg-sloth-card p-6 shadow-soft sm:p-8">
      <div>
        <p className="text-xs font-semibold tracking-[0.18em] text-sloth-moss uppercase">
          Lembretes
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-sloth-ink">
          Pequenos avisos para manter o foco
        </h2>
      </div>

      {/* Formulário de Criação */}
      <form
        action={createReminderAction}
        className="mt-6 grid gap-4 rounded-2xl bg-sloth-beige/35 p-4 sm:grid-cols-4 sm:items-end"
      >
        <input name="taskId" type="hidden" value={taskId} />
        
        <div className="sm:col-span-2">
          <label className="mb-1.5 block text-xs font-semibold text-sloth-muted" htmlFor="title-new">
            Descrição do Lembrete
          </label>
          <input
            className="min-h-11 w-full rounded-xl border border-sloth-border bg-sloth-card px-4 outline-none focus:border-sloth-moss focus:ring-3 focus:ring-sloth-moss/15 text-sm"
            id="title-new"
            name="title"
            placeholder="Ex: Iniciar revisão de código"
            required
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold text-sloth-muted" htmlFor="remindAt-new">
            Data e Hora
          </label>
          <input
            className="min-h-11 w-full rounded-xl border border-sloth-border bg-sloth-card px-3 outline-none focus:border-sloth-moss text-sm"
            id="remindAt-new"
            name="remindAt"
            required
            type="datetime-local"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold text-sloth-muted" htmlFor="channel-new">
            Canal
          </label>
          <select
            className="min-h-11 w-full rounded-xl border border-sloth-border bg-sloth-card px-3 outline-none focus:border-sloth-moss text-sm"
            id="channel-new"
            name="channel"
            defaultValue="push"
          >
            {reminderChannels.map((c) => (
              <option key={c} value={c}>
                {channelIcons[c]} {channelLabels[c]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold text-sloth-muted" htmlFor="horizon-new">
            Horizonte
          </label>
          <select
            className="min-h-11 w-full rounded-xl border border-sloth-border bg-sloth-card px-3 outline-none focus:border-sloth-moss text-sm"
            id="horizon-new"
            name="horizon"
            defaultValue="short"
          >
            {reminderHorizons.map((h) => (
              <option key={h} value={h}>
                {horizonLabels[h]}
              </option>
            ))}
          </select>
        </div>

        <button
          className="min-h-11 rounded-xl bg-sloth-moss px-5 font-semibold text-white transition hover:bg-sloth-forest sm:col-span-4 cursor-pointer text-sm"
          type="submit"
        >
          Agendar Lembrete
        </button>
      </form>

      {/* Lista de Lembretes */}
      {reminders.length > 0 ? (
        <ol className="mt-6 grid gap-4">
          {reminders.map((reminder) => (
            <li
              className="rounded-2xl border border-sloth-border bg-sloth-card p-4 shadow-sm"
              key={reminder.id}
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-sloth-beige/60 border border-sloth-border/40 px-2.5 py-0.5 text-xs font-medium text-sloth-forest">
                      {channelIcons[reminder.channel]} {channelLabels[reminder.channel]}
                    </span>
                    <span className="rounded-full bg-sloth-cream border border-sloth-border/20 px-2.5 py-0.5 text-xs font-medium text-sloth-muted">
                      ⏱️ {horizonLabels[reminder.horizon]}
                    </span>
                    {reminder.isSent ? (
                      <span className="rounded-full bg-sloth-leaf/10 border border-sloth-leaf/30 px-2.5 py-0.5 text-xs font-semibold text-sloth-forest">
                        Enviado
                      </span>
                    ) : (
                      <span className="rounded-full bg-sloth-amber/10 border border-sloth-amber/30 px-2.5 py-0.5 text-xs font-semibold text-sloth-gold">
                        Agendado
                      </span>
                    )}
                  </div>
                  <h3 className="mt-2 text-base font-semibold text-sloth-ink">
                    {reminder.title}
                  </h3>
                  <p className="text-xs text-sloth-muted mt-1">
                    Agendado para: <strong className="text-sloth-ink font-semibold">{formatReminderTime(reminder.remindAt)}</strong>
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <details className="group">
                    <summary className="inline-flex min-h-10 cursor-pointer list-none items-center rounded-xl border border-sloth-border px-4 text-xs font-semibold text-sloth-forest transition hover:bg-sloth-beige select-none">
                      Editar
                    </summary>
                    <form
                      action={updateReminderAction}
                      className="absolute right-0 left-0 sm:left-auto sm:right-6 mt-3 z-10 w-full sm:w-96 rounded-2xl border border-sloth-border bg-sloth-card p-5 shadow-lg grid gap-3"
                    >
                      <input name="taskId" type="hidden" value={taskId} />
                      <input name="reminderId" type="hidden" value={reminder.id} />
                      
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-sloth-muted" htmlFor={`title-edit-${reminder.id}`}>
                          Descrição
                        </label>
                        <input
                          className="min-h-10 w-full rounded-lg border border-sloth-border bg-sloth-card px-3 outline-none focus:border-sloth-moss text-xs font-medium"
                          defaultValue={reminder.title}
                          id={`title-edit-${reminder.id}`}
                          name="title"
                          required
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-xs font-semibold text-sloth-muted" htmlFor={`remindAt-edit-${reminder.id}`}>
                          Data e Hora
                        </label>
                        <input
                          className="min-h-10 w-full rounded-lg border border-sloth-border bg-sloth-card px-3 outline-none focus:border-sloth-moss text-xs"
                          defaultValue={formatISOToDateTimeLocal(reminder.remindAt)}
                          id={`remindAt-edit-${reminder.id}`}
                          name="remindAt"
                          required
                          type="datetime-local"
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-xs font-semibold text-sloth-muted" htmlFor={`channel-edit-${reminder.id}`}>
                          Canal
                        </label>
                        <select
                          className="min-h-10 w-full rounded-lg border border-sloth-border bg-sloth-card px-2 outline-none focus:border-sloth-moss text-xs"
                          defaultValue={reminder.channel}
                          id={`channel-edit-${reminder.id}`}
                          name="channel"
                        >
                          {reminderChannels.map((c) => (
                            <option key={c} value={c}>
                              {channelIcons[c]} {channelLabels[c]}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="mb-1 block text-xs font-semibold text-sloth-muted" htmlFor={`horizon-edit-${reminder.id}`}>
                          Horizonte
                        </label>
                        <select
                          className="min-h-10 w-full rounded-lg border border-sloth-border bg-sloth-card px-2 outline-none focus:border-sloth-moss text-xs"
                          defaultValue={reminder.horizon}
                          id={`horizon-edit-${reminder.id}`}
                          name="horizon"
                        >
                          {reminderHorizons.map((h) => (
                            <option key={h} value={h}>
                              {horizonLabels[h]}
                            </option>
                          ))}
                        </select>
                      </div>

                      <button
                        className="min-h-10 rounded-lg bg-sloth-moss text-xs font-bold text-white transition hover:bg-sloth-forest cursor-pointer mt-1"
                        type="submit"
                      >
                        Salvar Alterações
                      </button>
                    </form>
                  </details>

                  <form action={deleteReminderAction}>
                    <input name="taskId" type="hidden" value={taskId} />
                    <input name="reminderId" type="hidden" value={reminder.id} />
                    <button
                      className="min-h-10 rounded-xl border border-sloth-terracotta/35 px-4 text-xs font-semibold text-sloth-terracotta transition hover:bg-sloth-terracotta/10 cursor-pointer"
                      type="submit"
                    >
                      Remover
                    </button>
                  </form>
                </div>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-6 rounded-2xl border border-dashed border-sloth-border px-5 py-8 text-center text-sloth-muted text-sm bg-sloth-cream/10">
          Nenhum lembrete agendado para esta tarefa. Adicione um acima quando precisar.
        </p>
      )}
    </section>
  );
}
