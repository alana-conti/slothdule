import {
  createSubtaskAction,
  deleteSubtaskAction,
  toggleSubtaskAction,
  updateSubtaskAction,
} from "@/features/tasks/subtask-actions";
import type { Subtask } from "@/types/tasks";

type SubtaskListProps = {
  subtasks: Subtask[];
  taskId: string;
};

export function SubtaskList({ subtasks, taskId }: SubtaskListProps) {
  const completedCount = subtasks.filter((subtask) => subtask.isDone).length;

  return (
    <section className="rounded-card border border-sloth-border bg-sloth-card p-6 shadow-soft sm:p-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold tracking-[0.18em] text-sloth-moss uppercase">
            Checklist
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-sloth-ink">
            Passos menores, ritmo mais leve
          </h2>
        </div>
        <p className="text-sm text-sloth-muted" aria-live="polite">
          {completedCount} de {subtasks.length} concluídas
        </p>
      </div>

      <form
        action={createSubtaskAction}
        className="mt-6 flex flex-col gap-3 rounded-2xl bg-sloth-beige/40 p-4 sm:flex-row"
      >
        <input name="taskId" type="hidden" value={taskId} />
        <div className="flex-1">
          <label
            className="sr-only"
            htmlFor={`new-subtask-${taskId}`}
          >
            Nova subtarefa
          </label>
          <input
            className="min-h-11 w-full rounded-2xl border border-sloth-border bg-sloth-card px-4 outline-none focus:border-sloth-moss focus:ring-3 focus:ring-sloth-moss/15"
            id={`new-subtask-${taskId}`}
            name="title"
            placeholder="Adicionar um pequeno passo"
            required
          />
        </div>
        <button
          className="min-h-11 rounded-2xl bg-sloth-moss px-5 font-semibold text-white transition hover:bg-sloth-forest"
          type="submit"
        >
          Adicionar
        </button>
      </form>

      {subtasks.length > 0 ? (
        <ol className="mt-6 grid gap-3">
          {subtasks.map((subtask) => (
            <li
              className="rounded-2xl border border-sloth-border bg-sloth-card p-4"
              data-position={subtask.position}
              key={subtask.id}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <form action={toggleSubtaskAction}>
                  <input name="taskId" type="hidden" value={taskId} />
                  <input
                    name="subtaskId"
                    type="hidden"
                    value={subtask.id}
                  />
                  <input
                    name="isDone"
                    type="hidden"
                    value={String(!subtask.isDone)}
                  />
                  <button
                    aria-label={
                      subtask.isDone
                        ? `Desmarcar ${subtask.title}`
                        : `Concluir ${subtask.title}`
                    }
                    aria-pressed={subtask.isDone}
                    className={`flex min-h-10 min-w-10 items-center justify-center rounded-xl border text-sm font-semibold transition ${
                      subtask.isDone
                        ? "border-sloth-leaf bg-sloth-leaf text-sloth-forest"
                        : "border-sloth-border bg-sloth-card text-sloth-muted hover:bg-sloth-beige"
                    }`}
                    type="submit"
                  >
                    {subtask.isDone ? "Feita" : "Fazer"}
                  </button>
                </form>

                <p
                  className={`min-w-0 flex-1 ${
                    subtask.isDone
                      ? "text-sloth-muted line-through"
                      : "font-medium text-sloth-ink"
                  }`}
                >
                  {subtask.title}
                </p>

                <div className="flex flex-wrap gap-2">
                  <details>
                    <summary className="inline-flex min-h-10 cursor-pointer list-none items-center rounded-xl border border-sloth-border px-4 text-sm font-medium text-sloth-forest transition hover:bg-sloth-beige">
                      Editar
                    </summary>
                    <form
                      action={updateSubtaskAction}
                      className="mt-3 flex flex-col gap-2 rounded-2xl bg-sloth-beige/40 p-3 sm:flex-row"
                    >
                      <input name="taskId" type="hidden" value={taskId} />
                      <input
                        name="subtaskId"
                        type="hidden"
                        value={subtask.id}
                      />
                      <label className="sr-only" htmlFor={`subtask-${subtask.id}`}>
                        Título da subtarefa
                      </label>
                      <input
                        className="min-h-10 rounded-xl border border-sloth-border bg-sloth-card px-3 outline-none focus:border-sloth-moss"
                        defaultValue={subtask.title}
                        id={`subtask-${subtask.id}`}
                        name="title"
                        required
                      />
                      <button
                        className="min-h-10 rounded-xl bg-sloth-moss px-4 text-sm font-semibold text-white transition hover:bg-sloth-forest"
                        type="submit"
                      >
                        Salvar
                      </button>
                    </form>
                  </details>

                  <form action={deleteSubtaskAction}>
                    <input name="taskId" type="hidden" value={taskId} />
                    <input
                      name="subtaskId"
                      type="hidden"
                      value={subtask.id}
                    />
                    <button
                      className="min-h-10 rounded-xl border border-sloth-terracotta/35 px-4 text-sm font-medium text-sloth-terracotta transition hover:bg-sloth-terracotta/10"
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
        <p className="mt-6 rounded-2xl border border-dashed border-sloth-border px-5 py-8 text-center text-sloth-muted">
          Ainda não há pequenos passos. Adicione o primeiro quando fizer
          sentido.
        </p>
      )}
    </section>
  );
}
