import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

import {
  archiveTaskAction,
  updateTaskAction,
} from "@/features/tasks/actions";
import { DeleteTaskControl } from "@/features/tasks/delete-task-control";
import { listCategories, listTasks, getUserLeafBalance } from "@/features/tasks/data";
import { TaskForm } from "@/features/tasks/task-form";
import { TaskStatusControl } from "@/features/tasks/task-status-control";
import {
  formatEstimatedMinutes,
  getDailyEstimatedMinutes,
  getTaskDailyEstimatedMinutes,
  getTaskDurationDays,
  getTodayDateKey,
  groupTasksForToday,
} from "@/features/tasks/today";
import { calculatePriorityScore } from "@/lib/priority";
import { getCurrentUser } from "@/lib/api/server";
import type { Category, Task, TaskPriority, TaskStatus } from "@/types/tasks";

import { PwaNotificationManager } from "@/components/sloth/pwa-notification-manager";
import { TopNavigation } from "@/components/sloth/top-navigation";

const priorityLabels: Record<TaskPriority, string> = {
  low: "Baixa",
  medium: "Média",
  high: "Alta",
  critical: "Crítica",
};

const priorityClasses: Record<TaskPriority, string> = {
  low: "border-sloth-border bg-sloth-beige/45 text-sloth-muted",
  medium: "border-sloth-leaf/30 bg-sloth-leaf/10 text-sloth-forest",
  high: "border-sloth-amber/35 bg-sloth-amber/10 text-sloth-ink",
  critical:
    "border-sloth-terracotta/35 bg-sloth-terracotta/10 text-sloth-ink",
};

const statusLabels: Record<TaskStatus, string> = {
  todo: "A fazer",
  in_progress: "Em andamento",
  waiting: "Aguardando",
  done: "Concluída",
  archived: "Arquivada",
};

type TodayPageProps = {
  searchParams: Promise<{
    error?: string;
    message?: string;
  }>;
};

type TaskCardProps = {
  categories: Category[];
  category?: Category;
  isOverdue?: boolean;
  task: Task;
};

type TaskSectionProps = {
  categories: Category[];
  categoriesById: Map<string, Category>;
  description: string;
  emptyMessage: string;
  isOverdue?: boolean;
  label: string;
  tasks: Task[];
  title: string;
};

function formatDate(date: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}

function formatLongDate(date: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
    timeZone: "UTC",
    weekday: "long",
  }).format(new Date(`${date}T00:00:00Z`));
}

function TaskCard({
  categories,
  category,
  isOverdue = false,
  task,
}: TaskCardProps) {
  const todayDate = getTodayDateKey();
  const priorityResult = calculatePriorityScore(task, todayDate);
  const durationDays = getTaskDurationDays(task);
  const dailyEstimatedMinutes = Math.round(
    getTaskDailyEstimatedMinutes(task),
  );

  return (
    <article
      className={`rounded-card border p-5 shadow-[0_12px_35px_rgba(47,36,29,0.05)] sm:p-6 ${
        isOverdue
          ? "border-sloth-terracotta/35 bg-sloth-terracotta/5"
          : "border-sloth-border bg-sloth-card"
      }`}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex-1">
          <div className="flex flex-wrap gap-2 text-xs font-medium">
            <span
              className={`rounded-full border px-3 py-1 ${priorityClasses[task.priority]}`}
            >
              {priorityLabels[task.priority]}
            </span>
            <span className="rounded-full border border-sloth-border px-3 py-1 text-sloth-muted">
              {statusLabels[task.status]}
            </span>
            {category ? (
              <span className="rounded-full bg-sloth-beige px-3 py-1 text-sloth-forest">
                {category.name}
              </span>
            ) : null}
          </div>

          <h3 className="mt-4 text-xl font-semibold text-sloth-ink">
            {task.title}
          </h3>
          {task.description ? (
            <p className="mt-2 leading-7 text-sloth-muted">
              {task.description}
            </p>
          ) : null}
          {isOverdue ? (
            <p className="mt-3 text-sm font-medium text-sloth-terracotta">
              Essa tarefa passou do prazo. Quer reorganizar?
            </p>
          ) : null}

          {/* Seção de Prioridade Calculada Explicável */}
          {task.status !== "done" && task.status !== "archived" && (
            <details className="mt-4 group/priority text-xs border border-dashed border-sloth-border/50 rounded-2xl bg-sloth-cream/35 p-3.5 max-w-md">
              <summary className="cursor-pointer list-none flex items-center justify-between text-sloth-muted font-medium hover:text-sloth-forest transition select-none">
                <span className="flex items-center gap-2">
                  <svg
                    className="h-3.5 w-3.5 text-sloth-moss"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                    />
                  </svg>
                  Prioridade calculada:{" "}
                  <strong className="font-semibold text-sloth-ink">
                    {priorityResult.score} pts
                  </strong>
                </span>
                <span className="text-[10px] text-sloth-muted/70 transition-transform group-open/priority:rotate-180">
                  ▼
                </span>
              </summary>
              <ul className="mt-2.5 space-y-1.5 text-sloth-muted leading-relaxed">
                {priorityResult.reasons.map((reason, idx) => (
                  <li
                    className="flex items-center justify-between gap-4 border-b border-sloth-border/20 pb-1 last:border-0 last:pb-0"
                    key={idx}
                  >
                    <span>{reason.description}</span>
                    <span
                      className={`font-semibold shrink-0 ${
                        reason.points >= 0
                          ? "text-sloth-leaf"
                          : "text-sloth-terracotta"
                      }`}
                    >
                      {reason.points >= 0 ? `+${reason.points}` : reason.points}
                    </span>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>

        <div className="shrink-0 text-sm text-sloth-muted">
          <p>Prazo: {formatDate(task.dueDate)}</p>
          {task.dueTime ? <p>Às {task.dueTime.slice(0, 5)}</p> : null}
          {task.estimatedMinutes !== null ? (
            durationDays > 1 ? (
              <>
                <p>{formatEstimatedMinutes(dailyEstimatedMinutes)} por dia</p>
                <p>
                  {formatEstimatedMinutes(task.estimatedMinutes)} em{" "}
                  {durationDays} dias
                </p>
              </>
            ) : (
              <p>{formatEstimatedMinutes(task.estimatedMinutes)} estimados</p>
            )
          ) : (
            <p>Sem estimativa</p>
          )}
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-sloth-border/70 pt-4">
        <TaskStatusControl
          returnTo="today"
          status={task.status}
          taskId={task.id}
        />

        <details className="group relative">
          <summary className="inline-flex min-h-10 cursor-pointer list-none items-center rounded-xl border border-sloth-border bg-sloth-card px-4 text-sm font-medium text-sloth-forest transition hover:bg-sloth-beige">
            Editar
          </summary>
          <div className="absolute left-0 top-full z-20 mt-3 w-[min(42rem,calc(100vw-3rem))] rounded-2xl border border-sloth-border bg-sloth-card p-4 shadow-soft sm:p-5">
            <TaskForm
              action={updateTaskAction}
              categories={categories}
              submitLabel="Salvar alterações"
              task={task}
            />
          </div>
        </details>

        {task.status !== "archived" ? (
          <form action={archiveTaskAction}>
            <input name="taskId" type="hidden" value={task.id} />
            <button
              className="min-h-10 rounded-xl border border-sloth-border bg-sloth-card px-4 text-sm font-medium text-sloth-muted transition hover:bg-sloth-beige"
              type="submit"
            >
              Arquivar
            </button>
          </form>
        ) : null}

        <DeleteTaskControl taskId={task.id} taskTitle={task.title} />

        <Link
          className="ml-auto inline-flex min-h-10 items-center rounded-xl bg-sloth-moss px-4 text-sm font-semibold text-white transition hover:bg-sloth-forest"
          href={`/tasks/${task.id}`}
        >
          Ver detalhes e subtarefas
        </Link>
      </div>
    </article>
  );
}

function TaskSection({
  categories,
  categoriesById,
  description,
  emptyMessage,
  isOverdue = false,
  label,
  tasks,
  title,
}: TaskSectionProps) {
  return (
    <section
      className={`rounded-card border p-5 sm:p-7 ${
        isOverdue
          ? "border-sloth-terracotta/30 bg-sloth-terracotta/5"
          : "border-sloth-border bg-sloth-card/55"
      }`}
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
        <div className="grid gap-4">
          {tasks.map((task) => (
            <TaskCard
              categories={categories}
              category={categoriesById.get(task.categoryId)}
              isOverdue={isOverdue}
              key={task.id}
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
            description="Prazos que passaram e ainda estão abertos"
            emptyMessage="Nada atrasado. O dia começa mais leve."
            isOverdue
            label="Atenção!"
            tasks={groups.overdue}
            title="Tarefas atrasadas"
          />

          <TaskSection
            categories={categories}
            categoriesById={categoriesById}
            description="Tarefas previstas para hoje, inclusive as que atravessam mais de um dia."
            emptyMessage="Nenhuma tarefa prevista para hoje."
            label="Agora"
            tasks={groups.today}
            title="Tarefas de hoje"
          />

          <TaskSection
            categories={categories}
            categoriesById={categoriesById}
            description="Entregas futuras, ordenadas pelo prazo."
            emptyMessage="Nenhuma próxima tarefa por enquanto."
            label="No horizonte"
            tasks={groups.upcoming}
            title="Próximas tarefas"
          />
        </div>

        {groups.completed.length > 0 || groups.archived.length > 0 ? (
          <section className="mt-8">
            <details>
              <summary className="cursor-pointer text-sm font-medium text-sloth-muted">
                Concluídas e arquivadas (
                {groups.completed.length + groups.archived.length})
              </summary>
              <div className="mt-4 grid gap-4 opacity-85">
                {[...groups.completed, ...groups.archived].map((task) => (
                  <TaskCard
                    categories={categories}
                    category={categoriesById.get(task.categoryId)}
                    key={task.id}
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
