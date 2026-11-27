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

/** O dia do app vira às 4h: a madrugada ainda conta como o dia anterior. */
export const DAY_STARTS_AT_HOUR = 4;

export function getTodayDateKey(
  date = new Date(),
  timeZone = "America/Sao_Paulo",
) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone,
    year: "numeric",
  }).formatToParts(
    new Date(date.getTime() - DAY_STARTS_AT_HOUR * 60 * 60 * 1000),
  );
  const values = new Map(parts.map((part) => [part.type, part.value]));

  return `${values.get("year")}-${values.get("month")}-${values.get("day")}`;
}

function parseDateKey(dateKey: string) {
  return new Date(`${dateKey}T00:00:00Z`).getTime();
}

function addDays(dateKey: string, days: number) {
  return new Date(parseDateKey(dateKey) + days * MILLISECONDS_PER_DAY)
    .toISOString()
    .slice(0, 10);
}

function daysBetween(fromKey: string, toKey: string) {
  return Math.round((parseDateKey(toKey) - parseDateKey(fromKey)) / MILLISECONDS_PER_DAY);
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

/** É de hoje: atrasada ou com hoje entre o início e o prazo. */
export function isTaskScheduledForToday(task: Task, todayDate: string) {
  const start = getTaskScheduleStart(task);

  // Sem prazo + início marcado = trazida para um dia; fica até concluir.
  return (
    isTaskOverdue(task, todayDate) ||
    (start !== null &&
      start <= todayDate &&
      (task.dueDate === null || task.dueDate >= todayDate))
  );
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
  const isScheduledForToday = (task: Task) =>
    isTaskScheduledForToday(task, todayDate);

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

/** Antecipação: olha prazos até esta distância e some por estes dias se recusada. */
export const HEAD_START_WINDOW_DAYS = 14;
export const HEAD_START_SNOOZE_DAYS = 3;

export type DayPlanGroups = {
  /** No plano de hoje, na ordem da pessoa. Em andamento fica no foco, fora daqui. */
  plan: Task[];
  /** Sem decisão hoje: de hoje (inclusive atrasadas) ou do plano de um dia anterior. */
  suggestions: Task[];
  /** De hoje, mas recusadas no plano: "Também para hoje". */
  outside: Task[];
  /** A antecipação do dia (no máximo uma), ainda sem decisão. */
  headStart: Task | null;
};

export function isInDayPlan(task: Task, todayDate: string) {
  return task.planDate === todayDate && task.planPosition !== null;
}

/** Estava no plano de um dia anterior e ainda não foi decidida hoje. */
export function wasInEarlierPlan(task: Task, todayDate: string) {
  return (
    task.planDate !== null &&
    task.planDate < todayDate &&
    task.planPosition !== null
  );
}

export function groupDayPlan(
  tasks: Task[],
  todayDate = getTodayDateKey(),
): DayPlanGroups {
  // Em andamento vai para "Em foco agora"; concluídas, para "Concluídas hoje".
  const waiting = tasks.filter(
    (task) => task.status === "todo" || task.status === "waiting",
  );
  const decidedToday = (task: Task) => task.planDate === todayDate;

  return {
    plan: waiting
      .filter((task) => isInDayPlan(task, todayDate))
      .sort((left, right) => left.planPosition! - right.planPosition!),
    suggestions: waiting
      .filter(
        (task) =>
          !decidedToday(task) &&
          (isTaskScheduledForToday(task, todayDate) ||
            wasInEarlierPlan(task, todayDate)),
      )
      .sort((a, b) =>
        compareByScore(a, b, todayDate, (l, r) =>
          (l.dueTime ?? "23:59").localeCompare(r.dueTime ?? "23:59"),
        ),
      ),
    outside: waiting
      .filter(
        (task) =>
          decidedToday(task) &&
          task.planPosition === null &&
          isTaskScheduledForToday(task, todayDate),
      )
      .sort((a, b) =>
        compareByScore(a, b, todayDate, (l, r) =>
          (l.dueTime ?? "23:59").localeCompare(r.dueTime ?? "23:59"),
        ),
      ),
    headStart: pickHeadStart(tasks, todayDate),
  };
}

/**
 * Uma tarefa futura para adiantar hoje, sem olhar a carga (quase ninguém
 * preenche a estimativa). Primeiro prazos próximos, depois Sem pressa.
 */
export function pickHeadStart(tasks: Task[], todayDate: string) {
  // Uma por dia: se já decidiu (aceitou ou recusou) uma antecipação hoje, chega.
  if (
    tasks.some(
      (task) =>
        task.planDate === todayDate &&
        !isTaskScheduledForToday(task, todayDate),
    )
  ) {
    return null;
  }

  const lastDay = addDays(todayDate, HEAD_START_WINDOW_DAYS);
  const snoozedSince = addDays(todayDate, -HEAD_START_SNOOZE_DAYS);
  const candidates = tasks.filter(
    (task) =>
      task.status === "todo" &&
      !isTaskScheduledForToday(task, todayDate) &&
      !wasInEarlierPlan(task, todayDate) &&
      // Recusada há pouco: descansa uns dias.
      !(task.planDate !== null && task.planDate > snoozedSince) &&
      // Criada hoje ainda não pede antecipação.
      getTodayDateKey(new Date(task.createdAt)) < todayDate,
  );
  const dated = candidates
    .filter(
      (task) =>
        task.dueDate !== null &&
        task.dueDate > todayDate &&
        task.dueDate <= lastDay,
    )
    .sort(
      (left, right) =>
        left.dueDate!.localeCompare(right.dueDate!) ||
        (right.estimatedMinutes ?? 0) - (left.estimatedMinutes ?? 0) ||
        left.createdAt.localeCompare(right.createdAt),
    );
  const someday = candidates
    .filter((task) => task.dueDate === null && task.startDate === null)
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt));

  return dated[0] ?? someday[0] ?? null;
}

const weekdayFormat = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "UTC",
  weekday: "long",
});

/** O motivo da antecipação, em uma frase calma e sem falar em horas. */
export function headStartReason(task: Task, todayDate: string) {
  if (task.dueDate === null) {
    const days = daysBetween(
      getTodayDateKey(new Date(task.createdAt)),
      todayDate,
    );
    const since =
      days <= 1
        ? "desde ontem"
        : days < 14
          ? `há ${days} dias`
          : `há ${Math.floor(days / 7)} semanas`;

    return `Em Sem pressa ${since}. Hoje pode ser o dia.`;
  }

  const days = daysBetween(todayDate, task.dueDate);

  if (days === 1) {
    return "Vence amanhã. Começar hoje tira o peso de amanhã.";
  }

  if (days < 7) {
    const weekday = weekdayFormat
      .format(new Date(`${task.dueDate}T00:00:00Z`))
      .replace("-feira", "");

    return `Vence ${weekday}. Começar hoje deixa a semana mais leve.`;
  }

  return `Vence dia ${Number(task.dueDate.slice(8))}. Começar cedo evita a correria no fim.`;
}
