import Image from "next/image";
import { redirect } from "next/navigation";

import { listCategories, listTasks, getUserLeafBalance } from "@/features/tasks/data";
import { TaskRow } from "@/features/tasks/task-row";
import {
  formatEstimatedMinutes,
  getDailyEstimatedMinutes,
  getTodayDateKey,
  groupTasksForToday,
} from "@/features/tasks/today";
import { calculatePriorityScore } from "@/lib/priority";
import { getCurrentUser } from "@/lib/api/server";
import type { Category, Task } from "@/types/tasks";

import { PwaNotificationManager } from "@/components/sloth/pwa-notification-manager";
import { TopNavigation } from "@/components/sloth/top-navigation";

type TodayPageProps = {
  searchParams: Promise<{
    error?: string;
    message?: string;
  }>;
};

type TaskSectionProps = {
  categories: Category[];
  categoriesById: Map<string, Category>;
  description: string;
  emptyMessage: string;
  id?: string;
  isOverdue?: boolean;
  label: string;
  tasks: Task[];
  title: string;
  todayDate: string;
};

function formatLongDate(date: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
    timeZone: "UTC",
    weekday: "long",
  }).format(new Date(`${date}T00:00:00Z`));
}

function TaskSection({
  categories,
  categoriesById,
  description,
  emptyMessage,
  id,
  isOverdue = false,
  label,
  tasks,
  title,
  todayDate,
}: TaskSectionProps) {
  return (
    <section
      className={`scroll-mt-6 rounded-card border p-5 sm:p-7 ${
        isOverdue
          ? "border-sloth-terracotta/30 bg-sloth-terracotta/5"
          : "border-sloth-border bg-sloth-card/55"
      }`}
      id={id}
    >
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p
            className={`text-xs font-semibold tracking-[0.18em] uppercase ${
              isOverdue ? "text-sloth-terracotta" : "text-sloth-moss"
            }`}
          >
            {label}
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-sloth-ink">
            {title}
          </h2>
          <p className="mt-1 text-sm text-sloth-muted">{description}</p>
        </div>
        <span
          className={`w-fit rounded-full px-3 py-1 text-sm font-semibold ${
            isOverdue
              ? "bg-sloth-terracotta/10 text-sloth-terracotta"
              : "bg-sloth-beige text-sloth-forest"
          }`}
        >
          {tasks.length}
        </span>
      </div>

      {tasks.length > 0 ? (
        <div className="grid gap-2">
          {tasks.map((task) => (
            <TaskRow
              categories={categories}
              category={categoriesById.get(task.categoryId)}
              isOverdue={isOverdue}
              key={task.id}
              priority={calculatePriorityScore(task, todayDate)}
              task={task}
            />
          ))}
        </div>
      ) : (
        <p className="rounded-2xl border border-dashed border-sloth-border bg-sloth-card px-5 py-7 text-center text-sm text-sloth-muted">
          {emptyMessage}
        </p>
      )}
    </section>
  );
}

export default async function TodayPage({ searchParams }: TodayPageProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const [{ error, message }, categories, tasks, balance] = await Promise.all([
    searchParams,
    listCategories(),
    listTasks(),
    getUserLeafBalance(),
  ]);

  const email = user.email || "sua conta";
  const todayDate = getTodayDateKey();
  const groups = groupTasksForToday(tasks, todayDate);
  const dailyMinutes = getDailyEstimatedMinutes(groups.today);
  const dailyLoad = formatEstimatedMinutes(dailyMinutes);
  const isHeavyDay = dailyMinutes > 8 * 60;
  const criticalToday = groups.today.filter(
    (task) => task.priority === "critical",
  ).length;
  const categoriesById = new Map(
    categories.map((category) => [category.id, category]),
  );

  return (
    <main className="min-h-screen px-5 py-8 sm:px-8 sm:py-12">
      <div className="mx-auto w-full max-w-6xl">
        <header className="flex flex-col gap-5 rounded-card border border-sloth-border bg-sloth-card p-6 shadow-soft sm:p-8 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold tracking-[0.2em] text-sloth-moss uppercase">
              Hoje
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-sloth-ink sm:text-4xl">
              Uma coisa de cada vez
            </h1>
            <p className="mt-2 text-sm text-sloth-muted">
              {formatLongDate(todayDate)} · {email} · <span className="inline-flex items-center gap-1"><span className="text-sloth-leaf">🍃</span> {balance} Folhinhas</span>
            </p>
          </div>

          <TopNavigation current="today" />
        </header>

        {message ? (
          <div
            className="mt-6 flex items-center gap-3 rounded-2xl border border-sloth-leaf/30 bg-sloth-leaf/10 px-5 py-4 text-sm text-sloth-forest shadow-sm"
            role="status"
          >
            <span className="text-2xl shrink-0" aria-label="Mascote bicho-preguiça">🦥</span>
            <p className="font-medium leading-relaxed">{message}</p>
          </div>
        ) : null}

        {error ? (
          <p
            className="mt-6 rounded-2xl border border-sloth-terracotta/30 bg-sloth-terracotta/10 px-5 py-4 text-sm text-sloth-ink"
            role="alert"
          >
            {error}
          </p>
        ) : null}

        <div className="mt-6">
          <PwaNotificationManager />
        </div>

        <section
          aria-label="Resumo do dia"
          className="mt-6 grid gap-4 sm:grid-cols-3"
        >
          <article
            className={`rounded-card border p-6 ${
              isHeavyDay
                ? "border-sloth-amber/40 bg-sloth-amber/10"
                : "border-sloth-border bg-sloth-card"
            }`}
          >
            <p className="text-sm font-medium text-sloth-muted">
              Carga estimada de hoje
            </p>
            <p className="mt-2 text-3xl font-semibold text-sloth-ink">
              {dailyLoad}
            </p>
            <p className="mt-2 text-sm text-sloth-muted">
              {isHeavyDay
                ? "Seu dia parece acima da carga ideal."
                : "Tarefas abertas previstas para hoje."}
            </p>
          </article>

          <article className="rounded-card border border-sloth-border bg-sloth-card p-6">
            <p className="text-sm font-medium text-sloth-muted">
              Tarefas para hoje
            </p>
            <p className="mt-2 text-3xl font-semibold text-sloth-ink">
              {groups.today.length}
            </p>
            <p className="mt-2 text-sm text-sloth-muted">
              {groups.today.length === 0
                ? "O espaço de hoje está livre"
                : "Passos que pedem atenção agora"}
            </p>
            {groups.overdue.length > 0 ? (
              <a
                className="mt-2 inline-flex text-sm font-medium text-sloth-terracotta underline-offset-2 hover:underline"
                href="#atrasadas"
              >
                {groups.overdue.length === 1
                  ? "1 atrasada, mais abaixo ↓"
                  : `${groups.overdue.length} atrasadas, mais abaixo ↓`}
              </a>
            ) : null}
          </article>

          <article className="rounded-card border border-sloth-border bg-sloth-card p-6">
            <p className="text-sm font-medium text-sloth-muted">
              Prioridade crítica hoje
            </p>
            <p className="mt-2 text-3xl font-semibold text-sloth-ink">
              {criticalToday}
            </p>
            <p className="mt-2 text-sm text-sloth-muted">
              {criticalToday > 0
                ? "Vale começar por aqui, sem pressa"
                : "Nenhuma tarefa crítica para hoje"}
            </p>
          </article>
        </section>

        <div className="mt-8 grid gap-7">
          <TaskSection
            categories={categories}
            categoriesById={categoriesById}
            description="Tarefas previstas para hoje, inclusive as que atravessam mais de um dia."
            emptyMessage="Nenhuma tarefa prevista para hoje."
            id="hoje"
            label="Agora"
            tasks={groups.today}
            title="Tarefas de hoje"
            todayDate={todayDate}
          />

          <TaskSection
            categories={categories}
            categoriesById={categoriesById}
            description="Prazos que passaram e ainda estão abertos"
            emptyMessage="Nada atrasado. O dia começa mais leve."
            id="atrasadas"
            isOverdue
            label="Atenção!"
            tasks={groups.overdue}
            title="Tarefas atrasadas"
            todayDate={todayDate}
          />

          <TaskSection
            categories={categories}
            categoriesById={categoriesById}
            description="Entregas futuras, ordenadas pelo prazo."
            emptyMessage="Nenhuma próxima tarefa por enquanto."
            label="No horizonte"
            tasks={groups.upcoming}
            title="Próximas tarefas"
            todayDate={todayDate}
          />
        </div>

        {groups.completed.length > 0 || groups.archived.length > 0 ? (
          <section className="mt-8">
            <details>
              <summary className="cursor-pointer text-sm font-medium text-sloth-muted">
                Concluídas e arquivadas (
                {groups.completed.length + groups.archived.length})
              </summary>
              <div className="mt-4 grid gap-2">
                {[...groups.completed, ...groups.archived].map((task) => (
                  <TaskRow
                    categories={categories}
                    category={categoriesById.get(task.categoryId)}
                    key={task.id}
                    priority={calculatePriorityScore(task, todayDate)}
                    task={task}
                  />
                ))}
              </div>
            </details>
          </section>
        ) : null}

        {groups.overdue.length === 0 &&
        groups.today.length === 0 &&
        groups.upcoming.length === 0 ? (
          <div className="mt-8 flex flex-col items-center rounded-card border border-dashed border-sloth-border bg-sloth-card px-6 py-10 text-center">
            <Image
              alt="Mascote bicho-preguiça descansando"
              className="h-auto w-32"
              height={877}
              src="/images/sloth-mascot.png"
              width={900}
            />
            <p className="mt-3 font-medium text-sloth-forest">
              Nada aberto por aqui. A preguiça está descansando.
            </p>
          </div>
        ) : null}
      </div>
    </main>
  );
}
