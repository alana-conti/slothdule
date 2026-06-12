import { redirect } from "next/navigation";
import Link from "next/link";

import { logout } from "../login/actions";
import { listTasks } from "@/features/tasks/data";
import { CalendarView } from "@/components/calendar/calendar-view";
import { createClient } from "@/lib/supabase/server";

export default async function CalendarPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  if (!data?.claims) {
    redirect("/login");
  }

  const tasks = await listTasks();
  const email =
    typeof data.claims.email === "string" ? data.claims.email : "sua conta";

  return (
    <main className="min-h-screen px-5 py-8 sm:px-8 sm:py-12">
      <div className="mx-auto w-full max-w-6xl">
        <header className="flex flex-col gap-5 rounded-card border border-sloth-border bg-sloth-card p-6 shadow-soft sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div>
            <p className="text-xs font-semibold tracking-[0.2em] text-sloth-moss uppercase">
              Calendário
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-sloth-ink sm:text-4xl">
              Suas tarefas distribuídas no tempo.
            </h1>
            <p className="mt-2 text-sm text-sloth-muted">
              Visualização mensal · {email}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              className="inline-flex min-h-11 items-center rounded-2xl border border-sloth-border bg-sloth-card px-5 font-medium text-sloth-forest transition hover:bg-sloth-beige"
              href="/today"
            >
              Hoje
            </Link>
            <Link
              className="inline-flex min-h-11 items-center rounded-2xl border border-sloth-border bg-sloth-card px-5 font-medium text-sloth-forest transition hover:bg-sloth-beige"
              href="/timeline"
            >
              Linha do Tempo
            </Link>
            <form action={logout}>
              <button
                className="min-h-11 rounded-2xl border border-sloth-border bg-sloth-card px-5 font-medium text-sloth-forest transition hover:bg-sloth-beige"
                type="submit"
              >
                Sair
              </button>
            </form>
          </div>
        </header>

        <CalendarView tasks={tasks} />
      </div>
    </main>
  );
}
