import { updateTaskStatusAction } from "@/features/tasks/actions";
import type { TaskStatus } from "@/types/tasks";

type TaskStatusControlProps = {
  taskId: string;
  status: TaskStatus;
  returnTo: "today" | "detail";
};

const statusOptions: Array<{ value: TaskStatus; label: string }> = [
  { value: "todo", label: "A fazer" },
  { value: "in_progress", label: "Em andamento" },
  { value: "waiting", label: "Aguardando" },
  { value: "done", label: "Feita" },
  { value: "archived", label: "Arquivada" },
];

export function TaskStatusControl({
  taskId,
  status,
  returnTo,
}: TaskStatusControlProps) {
  return (
    <form
      action={updateTaskStatusAction}
      className="flex items-center"
    >
      <input name="taskId" type="hidden" value={taskId} />
      <input name="returnTo" type="hidden" value={returnTo} />

      <label>
        <span className="sr-only">Status da tarefa</span>
        <select
          aria-label="Status da tarefa"
          className="min-h-10 rounded-xl border border-sloth-border bg-sloth-card px-3 text-sm font-medium text-sloth-ink outline-none transition hover:bg-sloth-beige focus:border-sloth-moss"
          defaultValue={status}
          name="status"
        >
          {statusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <button
        className="ml-2 min-h-10 rounded-xl border border-sloth-moss px-3 text-xs font-semibold text-sloth-forest transition hover:bg-sloth-moss hover:text-white"
        type="submit"
      >
        Aplicar
      </button>
    </form>
  );
}
