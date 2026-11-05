import { redirect } from "next/navigation";

import { listTasks, listCategories, listClients, listProjects } from "@/features/tasks/data";
import { TimelineView } from "@/components/timeline/timeline-view";
import { getCurrentUser } from "@/lib/api/server";

export default async function TimelinePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const [tasks, categories, clients, projects] = await Promise.all([
    listTasks(),
    listCategories(),
    listClients(),
    listProjects(),
  ]);

  return (
    <main className="min-h-screen px-5 py-8 sm:px-8 sm:py-12">
      <div className="mx-auto w-full max-w-6xl">
        <header className="rounded-card border border-sloth-border bg-sloth-card p-6 shadow-soft sm:p-8">
          <div className="min-w-0">
            <p className="text-xs font-semibold tracking-[0.2em] text-sloth-moss uppercase">
              Linha do Tempo
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-sloth-ink sm:text-4xl">
              Suas tarefas distribuídas no tempo.
            </h1>
            <p className="mt-2 text-sm text-sloth-muted">
              Visualização de cronograma
            </p>
          </div>
        </header>

        <TimelineView
          tasks={tasks}
          categories={categories}
          clients={clients}
          projects={projects}
        />
      </div>
    </main>
  );
}
