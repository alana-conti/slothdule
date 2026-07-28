import { redirect } from "next/navigation";

import { TopNavigation } from "@/components/sloth/top-navigation";
import { listTasks, listCategories, listClients, listProjects, getUserLeafBalance } from "@/features/tasks/data";
import { TimelineView } from "@/components/timeline/timeline-view";
import { createClient } from "@/lib/supabase/server";

export default async function TimelinePage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  if (!data?.claims) {
    redirect("/login");
  }

  const [tasks, categories, clients, projects, balance] = await Promise.all([
    listTasks(),
    listCategories(),
    listClients(),
    listProjects(),
    getUserLeafBalance(),
  ]);

  const email = typeof data.claims.email === "string" ? data.claims.email : "sua conta";

  return (
    <main className="min-h-screen px-5 py-8 sm:px-8 sm:py-12">
      <div className="mx-auto w-full max-w-6xl">
        <header className="flex flex-col gap-5 rounded-card border border-sloth-border bg-sloth-card p-6 shadow-soft sm:p-8 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold tracking-[0.2em] text-sloth-moss uppercase">
              Linha do Tempo
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-sloth-ink sm:text-4xl">
              Suas tarefas distribuídas no tempo.
            </h1>
            <p className="mt-2 text-sm text-sloth-muted">
              Visualização de cronograma · {email} · <span className="inline-flex items-center gap-1"><span className="text-sloth-leaf">🍃</span> {balance} Folhinhas</span>
            </p>
          </div>

          <TopNavigation current="timeline" />
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
