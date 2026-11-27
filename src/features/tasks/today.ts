import { calculatePriorityScore } from "@/lib/priority";
import type { Task } from "@/types/tasks";

/** Quantas tarefas cabem "em foco" ao mesmo tempo. É um convite, não uma trava. */
export const FOCUS_LIMIT = 2;

export const OPEN_TASK_STATUSES = ["todo", "in_progress", "waiting"] as const;

export type TodayTaskGroups = {
  /** Tarefas em andamento, de qualquer data. Também aparecem no grupo da sua data. */
  inProgress: Task[];
  /** As atrasadas em aberto. Também fazem parte de `today`: atraso é coisa para hoje. */
  overdue: Task[];
  today: Task[];
  upcoming: Task[];
  /** Sem data e sem início marcado: ficam em "Sem pressa", fora de Hoje. */
  someday: Task[];
  /** Concluídas hoje, da mais recente para a mais antiga. */
  completedToday: Task[];
  /** Concluídas em outros dias. */
  completed: Task[];
  archived: Task[];
};

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

export function getTodayDateKey(
  date = new Date(),
  timeZone = "America/Sao_Paulo",
) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone,
    year: "numeric",
  }).formatToParts(date);
  const values = new Map(parts.map((part) => [part.type, part.value]));

  return `${values.get("year")}-${values.get("month")}-${values.get("day")}`;
}

function parseDateKey(dateKey: string) {
  return new Date(`${dateKey}T00:00:00Z`).getTime();
}

/**
 * Dia em que a tarefa passa a contar. `null` só para tarefa sem data e sem
 * início: ela não pertence a nenhum dia.
 */
export function getTaskScheduleStart(task: Task) {
  if (task.dueDate === null) {
    return task.startDate;
  }

  if (task.startDate && task.startDate <= task.dueDate) {
    return task.startDate;
  }

  return task.dueDate;
}

export function isTaskOverdue(task: Task, todayDate: string) {
  return task.dueDate !== null && task.dueDate < todayDate;
}

export function getTaskDurationDays(task: Task) {
  const startKey = getTaskScheduleStart(task);

  // Sem prazo não há intervalo para dividir a estimativa.
  if (startKey === null || task.dueDate === null) {
    return 1;
  }

  const start = parseDateKey(startKey);
  const due = parseDateKey(task.dueDate);

  return Math.max(1, Math.round((due - start) / MILLISECONDS_PER_DAY) + 1);
}

export function getTaskDailyEstimatedMinutes(task: Task) {
  if (task.estimatedMinutes === null) {
    return 0;
  }

  return task.estimatedMinutes / getTaskDurationDays(task);
}

/**
 * Dia (no fuso do app) em que a tarefa foi concluída, ou `null` se ela não está
 * feita. Tarefas antigas sem `completedAt` usam a última atualização.
 */
export function getTaskCompletedDateKey(task: Task) {
  if (task.status !== "done") {
    return null;
  }

  return getTodayDateKey(new Date(task.completedAt ?? task.updatedAt));
}

function getCompletedTimestamp(task: Task) {
  return task.completedAt ?? task.updatedAt;
}

function compareByScore(
  left: Task,
  right: Task,
  todayDate: string,
  fallbackCompare: (l: Task, r: Task) => number,
) {
  const scoreLeft = calculatePriorityScore(left, todayDate).score;
  const scoreRight = calculatePriorityScore(right, todayDate).score;

  if (scoreRight !== scoreLeft) {
    return scoreRight - scoreLeft;
  }

  return fallbackCompare(left, right);
}

export function groupTasksForToday(
  tasks: Task[],
  todayDate = getTodayDateKey(),
): TodayTaskGroups {
  const openTasks = tasks.filter((task) =>
    OPEN_TASK_STATUSES.includes(
      task.status as (typeof OPEN_TASK_STATUSES)[number],
    ),
  );
  const isOverdue = (task: Task) => isTaskOverdue(task, todayDate);
  const byDueDate = (l: Task, r: Task) =>
    (l.dueDate ?? "9999").localeCompare(r.dueDate ?? "9999");
  // Sem prazo + início marcado = trazida para um dia; fica até concluir.
  const isScheduledForToday = (task: Task) => {
    const start = getTaskScheduleStart(task);

    return (
      isOverdue(task) ||
      (start !== null &&
        start <= todayDate &&
        (task.dueDate === null || task.dueDate >= todayDate))
    );
  };

  return {
    inProgress: openTasks
      .filter((task) => task.status === "in_progress")
      .sort((a, b) => compareByScore(a, b, todayDate, byDueDate)),
    overdue: openTasks
      .filter(isOverdue)
      .sort((a, b) => compareByScore(a, b, todayDate, byDueDate)),
    today: openTasks
      .filter(isScheduledForToday)
      .sort((a, b) =>
        compareByScore(a, b, todayDate, (l, r) =>
          (l.dueTime ?? "23:59").localeCompare(r.dueTime ?? "23:59"),
        ),
      ),
    upcoming: openTasks
      .filter((task) => (getTaskScheduleStart(task) ?? "") > todayDate)
      .sort((a, b) => compareByScore(a, b, todayDate, byDueDate)),
    someday: openTasks
      .filter((task) => getTaskScheduleStart(task) === null)
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt)),
    completedToday: tasks
      .filter((task) => getTaskCompletedDateKey(task) === todayDate)
      .sort((left, right) =>
        getCompletedTimestamp(right).localeCompare(getCompletedTimestamp(left)),
      ),
    completed: tasks
      .filter(
        (task) =>
          task.status === "done" &&
          getTaskCompletedDateKey(task) !== todayDate,
      )
      .sort((left, right) =>
        getCompletedTimestamp(right).localeCompare(getCompletedTimestamp(left)),
      ),
    archived: tasks
      .filter((task) => task.status === "archived")
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)),
  };
}

/**
 * O dia acabou de ficar completo? Vale quando a tarefa recém-concluída era de
 * hoje (ou atrasada) e não sobrou nada aberto para hoje: atrasadas, de hoje ou
 * em andamento. Concluir algo adiantado de outro dia não conta.
 */
export function isDayComplete(
  tasks: Task[],
  completedTaskId: string,
  todayDate = getTodayDateKey(),
) {
  const completed = tasks.find((task) => task.id === completedTaskId);

  if (
    !completed ||
    getTaskCompletedDateKey(completed) !== todayDate ||
    // Sem data e sem início não é de dia nenhum, então não fecha o dia.
    (getTaskScheduleStart(completed) ?? "9999") > todayDate
  ) {
    return false;
  }

  const groups = groupTasksForToday(tasks, todayDate);

  return groups.inProgress.length === 0 && groups.today.length === 0;
}

export function getDailyEstimatedMinutes(tasks: Task[]) {
  return Math.round(
    tasks.reduce(
      (total, task) => total + getTaskDailyEstimatedMinutes(task),
      0,
    ),
  );
}

export function formatEstimatedMinutes(minutes: number) {
  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  return remainingMinutes > 0
    ? `${hours}h ${remainingMinutes}min`
    : `${hours}h`;
}
