import {
  taskPriorities,
  taskStatuses,
  workContexts,
  type Category,
  type Task,
} from "@/types/tasks";

const priorityLabels = {
  low: "Baixa",
  medium: "Média",
  high: "Alta",
  critical: "Crítica",
};

const statusLabels = {
  todo: "A fazer",
  in_progress: "Em andamento",
  waiting: "Aguardando",
  done: "Concluída",
  archived: "Arquivada",
};

const contextLabels = {
  personal: "Pessoal",
  internal_work: "Trabalho interno",
  client_work: "Trabalho para cliente",
};

type TaskFormProps = {
  /** Server Action. Use `onSubmit` quando precisar controlar o envio no cliente. */
  action?: (formData: FormData) => void | Promise<void>;
  onSubmit?: React.FormEventHandler<HTMLFormElement>;
  categories: Category[];
  submitLabel: string;
  task?: Task;
};

export function TaskForm({
  action,
  onSubmit,
  categories,
  submitLabel,
  task,
}: TaskFormProps) {
  return (
    <form
      action={action}
      className="grid gap-4 sm:grid-cols-2"
      onSubmit={onSubmit}
    >
      {task ? <input name="taskId" type="hidden" value={task.id} /> : null}

      <div className="sm:col-span-2">
        <label className="mb-2 block text-sm font-medium" htmlFor={`title-${task?.id ?? "new"}`}>
          Título
        </label>
        <input
          className="min-h-11 w-full rounded-2xl border border-sloth-border bg-sloth-card px-4 outline-none focus:border-sloth-moss focus:ring-3 focus:ring-sloth-moss/15"
          defaultValue={task?.title}
          id={`title-${task?.id ?? "new"}`}
          name="title"
          required
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium" htmlFor={`category-${task?.id ?? "new"}`}>
          Categoria
        </label>
        <select
          className="min-h-11 w-full rounded-2xl border border-sloth-border bg-sloth-card px-4 outline-none focus:border-sloth-moss"
          defaultValue={task?.categoryId}
          id={`category-${task?.id ?? "new"}`}
          name="categoryId"
          required
        >
          <option disabled value="">
            Selecione
          </option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium" htmlFor={`priority-${task?.id ?? "new"}`}>
          Prioridade
        </label>
        <select
          className="min-h-11 w-full rounded-2xl border border-sloth-border bg-sloth-card px-4 outline-none focus:border-sloth-moss"
          defaultValue={task?.priority ?? "medium"}
          id={`priority-${task?.id ?? "new"}`}
          name="priority"
        >
          {taskPriorities.map((priority) => (
            <option key={priority} value={priority}>
              {priorityLabels[priority]}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium" htmlFor={`due-date-${task?.id ?? "new"}`}>
          Prazo
        </label>
        <input
          className="min-h-11 w-full rounded-2xl border border-sloth-border bg-sloth-card px-4 outline-none focus:border-sloth-moss"
          defaultValue={task?.dueDate}
          id={`due-date-${task?.id ?? "new"}`}
          name="dueDate"
          required
          type="date"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium" htmlFor={`due-time-${task?.id ?? "new"}`}>
          Horário
        </label>
        <input
          className="min-h-11 w-full rounded-2xl border border-sloth-border bg-sloth-card px-4 outline-none focus:border-sloth-moss"
          defaultValue={task?.dueTime?.slice(0, 5)}
          id={`due-time-${task?.id ?? "new"}`}
          name="dueTime"
          type="time"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium" htmlFor={`start-date-${task?.id ?? "new"}`}>
          Início
        </label>
        <input
          className="min-h-11 w-full rounded-2xl border border-sloth-border bg-sloth-card px-4 outline-none focus:border-sloth-moss"
          defaultValue={task?.startDate ?? ""}
          id={`start-date-${task?.id ?? "new"}`}
          name="startDate"
          type="date"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium" htmlFor={`estimate-${task?.id ?? "new"}`}>
          Estimativa em minutos
        </label>
        <input
          className="min-h-11 w-full rounded-2xl border border-sloth-border bg-sloth-card px-4 outline-none focus:border-sloth-moss"
          defaultValue={task?.estimatedMinutes ?? ""}
          id={`estimate-${task?.id ?? "new"}`}
          min="0"
          name="estimatedMinutes"
          step="1"
          type="number"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium" htmlFor={`context-${task?.id ?? "new"}`}>
          Contexto
        </label>
        <select
          className="min-h-11 w-full rounded-2xl border border-sloth-border bg-sloth-card px-4 outline-none focus:border-sloth-moss"
          defaultValue={task?.workContext ?? "personal"}
          id={`context-${task?.id ?? "new"}`}
          name="workContext"
        >
          {workContexts.map((context) => (
            <option key={context} value={context}>
              {contextLabels[context]}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium" htmlFor={`status-${task?.id ?? "new"}`}>
          Status
        </label>
        <select
          className="min-h-11 w-full rounded-2xl border border-sloth-border bg-sloth-card px-4 outline-none focus:border-sloth-moss"
          defaultValue={task?.status ?? "todo"}
          id={`status-${task?.id ?? "new"}`}
          name="status"
        >
          {taskStatuses
            .filter((status) => task || status !== "archived")
            .map((status) => (
              <option key={status} value={status}>
                {statusLabels[status]}
              </option>
            ))}
        </select>
      </div>

      <div className="sm:col-span-2">
        <label className="mb-2 block text-sm font-medium" htmlFor={`description-${task?.id ?? "new"}`}>
          Observações
        </label>
        <textarea
          className="min-h-24 w-full resize-y rounded-2xl border border-sloth-border bg-sloth-card px-4 py-3 outline-none focus:border-sloth-moss focus:ring-3 focus:ring-sloth-moss/15"
          defaultValue={task?.description ?? ""}
          id={`description-${task?.id ?? "new"}`}
          name="description"
        />
      </div>

      <button
        className="min-h-11 rounded-2xl bg-sloth-moss px-5 font-semibold text-white transition hover:bg-sloth-forest sm:col-span-2"
        type="submit"
      >
        {submitLabel}
      </button>
    </form>
  );
}
