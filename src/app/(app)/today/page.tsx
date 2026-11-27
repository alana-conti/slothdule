import Image from "next/image";
import { redirect } from "next/navigation";

import { getHabitToday, listHabits, listRoutines } from "@/features/habits/data";
import { TodayRoutineCard } from "@/features/habits/today-routine-card";
import { listCategories, listTasks } from "@/features/tasks/data";
import { AcceptAllButton, DayPlanList } from "@/features/tasks/day-plan-list";
import { TaskRow } from "@/features/tasks/task-row";
import {
  FOCUS_LIMIT,
  formatEstimatedMinutes,
  getDailyEstimatedMinutes,
  getTodayDateKey,
  groupDayPlan,
  groupTasksForToday,
  headStartReason,
  isInDayPlan,
  isTaskOverdue,
  isTaskScheduledForToday,
  wasInEarlierPlan,
} from "@/features/tasks/today";
import type { DayPlanGroups } from "@/features/tasks/today";
import { calculatePriorityScore, getEffectivePriority } from "@/lib/priority";
import { getCurrentUser } from "@/lib/api/server";
import type { Category, Task } from "@/types/tasks";


type TodayPageProps = {
  searchParams: Promise<{
    error?: string;
    message?: string;
  }>;
};

type TaskSectionProps = {
  categories: Category[];
  /**
   * Concluídas hoje: ficam numa área recolhida no fim da seção, com contador.
   * Passar a prop (mesmo vazia) é o que mostra a área.
   */
  completedTodayTasks?: Task[];
  description: string;
  emptyMessage: string;
  /**
   * Em andamento: ficam numa área fixa "Em foco agora" no alto da seção, com
   * FOCUS_LIMIT espaços. Passar a prop (mesmo vazia) é o que mostra a área.
   */
  focusTasks?: Task[];
  id?: string;
  label: string;
  /** Dia do plano: mostra "Pôr no plano" em cada linha ("Também para hoje"). */
  planDate?: string;
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

type FocusAreaProps = {
  categories: Category[];
  tasks: Task[];
  todayDate: string;
};

/**
 * Área fixa com FOCUS_LIMIT espaços para o que está em andamento. Passar do
 * limite não é bloqueado: só muda o tom, para a pessoa perceber sozinha.
 */
function FocusArea({
  categories,
  tasks,
  todayDate,
}: FocusAreaProps) {
  const isOver = tasks.length > FOCUS_LIMIT;
  const freeSlots = Math.max(0, FOCUS_LIMIT - tasks.length);

  return (
    <div
      aria-label="Em foco agora"
      className={`mb-4 rounded-2xl border p-3 ${
        isOver
          ? // Base sólida: o âmbar translúcido vira oliva sobre o verde do plano.
            "border-sloth-amber/70 bg-[color-mix(in_srgb,var(--color-sloth-amber)_14%,var(--color-sloth-card))]"
          : "border-sloth-moss/30 bg-sloth-card/70"
      }`}
      role="region"
    >
      <div className="mb-2 flex items-center justify-between gap-3 px-1">
        <p
          className={`text-xs font-semibold tracking-[0.14em] uppercase ${
            isOver ? "text-sloth-ink" : "text-sloth-moss"
          }`}
        >
          Em foco agora
        </p>
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
            isOver
              ? "bg-sloth-amber/25 text-sloth-ink"
              : "bg-sloth-moss/10 text-sloth-forest"
          }`}
        >
          {tasks.length}/{FOCUS_LIMIT}
          <span className="sr-only"> em foco</span>
        </span>
      </div>

      <div className="grid gap-2">
        {tasks.map((task) => (
          <TaskRow
            categories={categories}
            focusable
            // Em foco pode vir de qualquer data: o atraso continua visível.
            isOverdue={isTaskOverdue(task, todayDate)}
            key={task.id}
            priority={calculatePriorityScore(task, todayDate)}
            task={task}
          />
        ))}

        {Array.from({ length: freeSlots }, (_, index) => (
          <div
            className="flex min-h-16 items-center gap-3 rounded-2xl border border-dashed border-sloth-moss/35 px-4 py-3 text-sm text-sloth-muted"
            key={`free-${index}`}
          >
            <span
              aria-hidden="true"
              className="inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-dashed border-sloth-moss/40 text-xs text-sloth-moss"
            >
              ▶
            </span>
            Espaço livre. Inicie uma tarefa com ▶ para trazê-la para o foco.
          </div>
        ))}
      </div>

      {isOver ? (
        <p className="mt-3 px-1 text-sm text-sloth-ink">
          Muita coisa ao mesmo tempo. Que tal terminar ou pausar uma antes de
          abrir outra frente?
        </p>
      ) : null}
    </div>
  );
}

type CompletedTodayAreaProps = {
  categories: Category[];
  tasks: Task[];
  todayDate: string;
};

/**
 * O que já saiu da frente hoje. Começa recolhida para não pesar na lista, mas o
 * contador fica sempre à vista: ver o número subir é o que dá gás.
 */
function CompletedTodayArea({
  categories,
  tasks,
  todayDate,
}: CompletedTodayAreaProps) {
  const count = tasks.length;

  return (
    <details
      aria-label="Concluídas hoje"
      className="group/done mt-4 rounded-2xl border border-sloth-leaf/30 bg-sloth-leaf/5"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-2xl px-4 py-3 transition select-none hover:bg-sloth-leaf/10 [&::-webkit-details-marker]:hidden">
        <span className="flex min-w-0 items-center gap-3">
          <span
            aria-hidden="true"
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-sloth-leaf/15 text-sm font-semibold text-sloth-forest"
          >
            ✓
          </span>
          <span className="min-w-0">
            <span className="block text-xs font-semibold tracking-[0.14em] text-sloth-forest uppercase">
              Concluídas hoje
            </span>
            <span className="block text-sm text-sloth-muted">
              {count === 0
                ? "O primeiro passo do dia também conta."
                : count === 1
                  ? "Uma coisa a menos na cabeça."
                  : `${count} coisas a menos na cabeça.`}
            </span>
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-2">
          <span className="rounded-full bg-sloth-leaf/15 px-3 py-1 text-sm font-semibold text-sloth-forest">
            {count}
            <span className="sr-only">
              {count === 1 ? " tarefa concluída hoje" : " tarefas concluídas hoje"}
            </span>
          </span>
          <span
            aria-hidden="true"
            className="text-[10px] text-sloth-muted/70 transition-transform group-open/done:rotate-180"
          >
            ▼
          </span>
        </span>
      </summary>

      <div className="grid gap-2 px-3 pb-3">
        {count > 0 ? (
          tasks.map((task) => (
            <TaskRow
              categories={categories}
              key={task.id}
              priority={calculatePriorityScore(task, todayDate)}
              task={task}
            />
          ))
        ) : (
          <p className="rounded-2xl border border-dashed border-sloth-leaf/30 px-4 py-5 text-center text-sm text-sloth-muted">
            Quando você concluir uma tarefa hoje, ela aparece aqui.
          </p>
        )}
      </div>
    </details>
  );
}

function TaskSection({
  categories,
  completedTodayTasks,
  description,
  emptyMessage,
  focusTasks,
  id,
  label,
  planDate,
  tasks,
  title,
  todayDate,
}: TaskSectionProps) {
  return (
    <section
      className="scroll-mt-6 rounded-card border border-sloth-border bg-sloth-card/55 p-5 sm:p-7"
      id={id}
    >
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold tracking-[0.18em] text-sloth-moss uppercase">
            {label}
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-sloth-ink">
            {title}
          </h2>
          <p className="mt-1 text-sm text-sloth-muted">{description}</p>
        </div>
        <span className="w-fit rounded-full bg-sloth-beige px-3 py-1 text-sm font-semibold text-sloth-forest">
          {tasks.length + (focusTasks?.length ?? 0)}
        </span>
      </div>

      {focusTasks ? (
        <FocusArea
          categories={categories}
          tasks={focusTasks}
          todayDate={todayDate}
        />
      ) : null}

      {tasks.length > 0 ? (
        <div className="grid gap-2">
          {tasks.map((task) => (
            <TaskRow
              categories={categories}
              isOverdue={isTaskOverdue(task, todayDate)}
              key={task.id}
              plan={planDate ? { date: planDate, mode: "out" } : undefined}
              priority={calculatePriorityScore(task, todayDate)}
              task={task}
            />
          ))}
        </div>
      ) : (focusTasks?.length ?? 0) === 0 ? (
        <p className="rounded-2xl border border-dashed border-sloth-border bg-sloth-card px-5 py-7 text-center text-sm text-sloth-muted">
          {emptyMessage}
        </p>
      ) : null}

      {completedTodayTasks ? (
        <CompletedTodayArea
          categories={categories}
          tasks={completedTodayTasks}
          todayDate={todayDate}
        />
      ) : null}
    </section>
  );
}

type DayPlanSectionProps = {
  categories: Category[];
  completedTodayTasks: Task[];
  focusTasks: Task[];
  groups: DayPlanGroups;
  todayDate: string;
};

/**
 * A seção principal do dia. No começo do dia, o que é de hoje chega como
 * sugestão ("Aceitar" põe no plano, "Hoje não" deixa em "Também para hoje"), mais uma
 * antecipação em dourado. O que entra no plano é ordenado arrastando.
 */
function DayPlanSection({
  categories,
  completedTodayTasks,
  focusTasks,
  groups,
  todayDate,
}: DayPlanSectionProps) {
  const { headStart, plan, suggestions } = groups;
  const hasSuggestions = suggestions.length > 0 || headStart !== null;
  const isEmpty = plan.length === 0 && !hasSuggestions && focusTasks.length === 0;

  return (
    <section
      // Verde folha diluído no creme: destaca a seção principal sem
      // virar um bloco escuro; os cards brancos quentes saltam por cima.
      className="scroll-mt-6 rounded-card border border-sloth-leaf/60 bg-sloth-leaf/30 p-5 shadow-soft sm:p-7"
      id="hoje"
    >
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold tracking-[0.18em] text-sloth-forest uppercase">
            Agora
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-sloth-forest">
            Plano do dia
          </h2>
          {/* Floresta, não cinza: sobre o verde, o cinza fica abaixo de 4,5:1. */}
          <p className="mt-1 text-sm text-sloth-forest">
            {plan.length === 0 && hasSuggestions
              ? "O que entra hoje? Aceite ou recuse as sugestões e depois arraste para ordenar."
              : "Sua ordem para hoje. Arraste uma tarefa para mudar (no celular, segure antes de arrastar)."}
          </p>
        </div>
        <span className="w-fit rounded-full bg-sloth-card px-3 py-1 text-sm font-semibold text-sloth-forest">
          {plan.length + focusTasks.length}
          <span className="sr-only"> no plano</span>
        </span>
      </div>

      <FocusArea
        categories={categories}
        tasks={focusTasks}
        todayDate={todayDate}
      />

      {plan.length > 0 ? (
        <DayPlanList
          categories={categories}
          items={plan.map((task) => {
            const isHeadStart = !isTaskScheduledForToday(task, todayDate);

            return {
              isOverdue: isTaskOverdue(task, todayDate),
              plan: {
                date: todayDate,
                headStart: isHeadStart,
                mode: "in",
                tag: isHeadStart ? "Adiantada" : undefined,
              },
              priority: calculatePriorityScore(task, todayDate),
              task,
            };
          })}
          planDate={todayDate}
        />
      ) : null}

      {hasSuggestions ? (
        <div
          aria-label="Sugestões para o plano"
          className={`grid gap-2 ${plan.length > 0 ? "mt-5" : ""}`}
          role="region"
        >
          <div className="flex items-center justify-between gap-3 px-1">
            <p className="text-xs font-semibold tracking-[0.14em] text-sloth-forest uppercase">
              Sugestões para o plano
            </p>
            {suggestions.length > 1 ? (
              <AcceptAllButton
                planDate={todayDate}
                planIds={plan.map((task) => task.id)}
                suggestionIds={suggestions.map((task) => task.id)}
              />
            ) : null}
          </div>
          {/* A antecipação vem primeiro: com muitas sugestões, não se perde no fim. */}
          {headStart ? (
            <TaskRow
              categories={categories}
              key={headStart.id}
              plan={{
                date: todayDate,
                headStart: true,
                mode: "suggested",
                reason: headStartReason(headStart, todayDate),
                tag: "Adiantar",
              }}
              priority={calculatePriorityScore(headStart, todayDate)}
              task={headStart}
            />
          ) : null}
          {suggestions.map((task) => (
            <TaskRow
              categories={categories}
              isOverdue={isTaskOverdue(task, todayDate)}
              key={task.id}
              plan={{
                date: todayDate,
                mode: "suggested",
                tag: wasInEarlierPlan(task, todayDate)
                  ? "Estava no plano"
                  : undefined,
              }}
              priority={calculatePriorityScore(task, todayDate)}
              task={task}
            />
          ))}
        </div>
      ) : null}

      {isEmpty ? (
        <p className="rounded-2xl border border-dashed border-sloth-border bg-sloth-card px-5 py-7 text-center text-sm text-sloth-muted">
          {completedTodayTasks.length > 0
            ? "Tudo o que estava no plano está feito."
            : "Nada previsto para hoje. Dia leve."}
        </p>
      ) : null}

      <CompletedTodayArea
        categories={categories}
        tasks={completedTodayTasks}
        todayDate={todayDate}
      />
    </section>
  );
}

export default async function TodayPage({ searchParams }: TodayPageProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const [{ error, message }, categories, tasks, routine] = await Promise.all([
    searchParams,
    listCategories(),
    listTasks(),
    // A Rotina é um extra na tela Hoje: se a API de hábitos falhar, o resto
    // da tela segue normal.
    Promise.all([listHabits(), getHabitToday(), listRoutines()]).catch(() => null),
  ]);

  const todayDate = getTodayDateKey();
  const groups = groupTasksForToday(tasks, todayDate);
  const dailyMinutes = getDailyEstimatedMinutes(groups.today);
  const dailyLoad = formatEstimatedMinutes(dailyMinutes);
  const isHeavyDay = dailyMinutes > 8 * 60;
  const criticalToday = groups.today.filter(
    (task) => getEffectivePriority(task, todayDate) === "critical",
  ).length;
  // Quem está em andamento vai para a área "Em foco agora" dentro de Hoje e sai
  // da lista da sua data.
  const notInProgress = (task: Task) => task.status !== "in_progress";
  const dayPlan = groupDayPlan(tasks, todayDate);
  // O que já está no plano (adiantado) ou sugerido para adiantar não repete abaixo.
  const upcomingRest = groups.upcoming.filter(
    (task) =>
      notInProgress(task) &&
      !isInDayPlan(task, todayDate) &&
      task.id !== dayPlan.headStart?.id,
  );

  return (
    <main className="min-h-screen px-5 py-8 sm:px-8 sm:py-12">
      <div className="mx-auto w-full max-w-6xl">
        <header className="rounded-card border border-sloth-border bg-sloth-card p-6 shadow-soft sm:p-8">
          <div className="min-w-0">
            <p className="text-xs font-semibold tracking-[0.2em] text-sloth-moss uppercase">
              Hoje
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-sloth-ink sm:text-4xl">
              Uma coisa de cada vez
            </h1>
            <p className="mt-2 text-sm text-sloth-muted">
              {formatLongDate(todayDate)}
            </p>
          </div>
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
              Carga estimada
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
              Tarefas
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
              Prioritárias
            </p>
            <p className="mt-2 text-3xl font-semibold text-sloth-ink">
              {criticalToday}
            </p>
            <p className="mt-2 text-sm text-sloth-muted">
              {criticalToday > 0
                ? "Vale começar por aqui, sem pressa"
                : "Nenhuma tarefa prioritária para hoje"}
            </p>
          </article>
        </section>

        {routine ? (
          <TodayRoutineCard habits={routine[0]} routines={routine[2]} today={routine[1]} />
        ) : null}

        <div className="mt-8 grid gap-7">
          <DayPlanSection
            categories={categories}
            completedTodayTasks={groups.completedToday}
            focusTasks={groups.inProgress}
            groups={dayPlan}
            todayDate={todayDate}
          />

          {dayPlan.outside.length > 0 ? (
            <TaskSection
              categories={categories}
              description="São de hoje, mas estão fora do plano. Dá para trazer quando quiser."
              emptyMessage=""
              label="Fora do plano"
              planDate={todayDate}
              tasks={dayPlan.outside}
              title="Também para hoje"
              todayDate={todayDate}
            />
          ) : null}

          <TaskSection
            categories={categories}
            description="Entregas futuras, ordenadas pelo prazo."
            emptyMessage="Nenhuma próxima tarefa por enquanto."
            label="No horizonte"
            tasks={upcomingRest}
            title="Próximas tarefas"
            todayDate={todayDate}
          />
        </div>

        {groups.completed.length > 0 || groups.archived.length > 0 ? (
          <section className="mt-8">
            <details>
              <summary className="cursor-pointer text-sm font-medium text-sloth-muted">
                Histórico: concluídas antes de hoje e arquivadas (
                {groups.completed.length + groups.archived.length})
              </summary>
              <div className="mt-4 grid gap-2">
                {[...groups.completed, ...groups.archived].map((task) => (
                  <TaskRow
                    categories={categories}
                    key={task.id}
                    priority={calculatePriorityScore(task, todayDate)}
                    task={task}
                  />
                ))}
              </div>
            </details>
          </section>
        ) : null}

        {groups.today.length === 0 &&
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
