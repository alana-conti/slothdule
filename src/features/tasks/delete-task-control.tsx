import { deleteTaskAction } from "@/features/tasks/actions";

type DeleteTaskControlProps = {
  taskId: string;
  taskTitle: string;
};

export function DeleteTaskControl({
  taskId,
  taskTitle,
}: DeleteTaskControlProps) {
  return (
    <details className="group relative">
      <summary className="inline-flex min-h-10 cursor-pointer list-none items-center rounded-xl border border-sloth-terracotta/35 bg-sloth-card px-4 text-sm font-medium text-sloth-terracotta transition hover:bg-sloth-terracotta/10">
        Excluir
      </summary>

      <div className="absolute right-0 top-full z-30 mt-3 w-72 rounded-2xl border border-sloth-terracotta/30 bg-sloth-card p-4 shadow-soft">
        <p className="font-semibold text-sloth-ink">
          Excluir permanentemente?
        </p>
        <p className="mt-2 text-sm leading-6 text-sloth-muted">
          “{taskTitle}” e seus dados vinculados serão removidos. Esta ação não
          pode ser desfeita.
        </p>

        <form action={deleteTaskAction} className="mt-4">
          <input name="taskId" type="hidden" value={taskId} />
          <button
            className="min-h-10 w-full rounded-xl bg-sloth-terracotta px-4 text-sm font-semibold text-white transition hover:brightness-95"
            type="submit"
          >
            Confirmar exclusão
          </button>
        </form>
      </div>
    </details>
  );
}
