import Image from "next/image";
import { redirect } from "next/navigation";

import { listCategories, listTasks } from "@/features/tasks/data";
import { TaskRow } from "@/features/tasks/task-row";
import { getTodayDateKey, groupTasksForToday } from "@/features/tasks/today";
import { calculatePriorityScore } from "@/lib/priority";
import { getCurrentUser } from "@/lib/api/server";

export default async function LaterPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const [categories, tasks] = await Promise.all([
    listCategories(),
    listTasks(),
  ]);
  const todayDate = getTodayDateKey();
  const { someday } = groupTasksForToday(tasks, todayDate);

  return (
    <main className="min-h-screen px-5 py-8 sm:px-8 sm:py-12">
      <div className="mx-auto w-full max-w-6xl">
        <header className="rounded-card border border-sloth-border bg-sloth-card p-6 shadow-soft sm:p-8">
          <div className="min-w-0">
            <p className="text-xs font-semibold tracking-[0.2em] text-sloth-moss uppercase">
              Sem pressa
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-sloth-ink sm:text-4xl">
              Cada coisa no seu tempo
            </h1>
            <p className="mt-2 text-sm text-sloth-muted">
              O que vai acontecer um dia, sem data marcada. Fica guardado aqui,
              longe da tela Hoje, até você dar uma data.
            </p>
          </div>
        </header>

        {someday.length > 0 ? (
          <section
            aria-label="Tarefas sem data"
            className="mt-8 rounded-card border border-sloth-border bg-sloth-card/55 p-5 sm:p-7"
          >
            <div className="grid gap-2">
              {someday.map((task) => (
                <TaskRow
                  categories={categories}
                  key={task.id}
                  priority={calculatePriorityScore(task, todayDate)}
                  task={task}
                />
              ))}
            </div>
          </section>
        ) : (
          <div className="mt-8 flex flex-col items-center rounded-card border border-dashed border-sloth-border bg-sloth-card px-6 py-10 text-center">
            <Image
              alt="Mascote bicho-preguiça descansando"
              className="h-auto w-32"
              height={877}
              src="/images/sloth-mascot.png"
              width={900}
            />
            <p className="mt-3 font-medium text-sloth-forest">
              Nada guardado para depois. Cabeça leve.
            </p>
            <p className="mt-1 text-sm text-sloth-muted">
              Ao criar uma tarefa, deixe o prazo em branco para ela vir para cá.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
