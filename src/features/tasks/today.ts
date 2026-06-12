import { calculatePriorityScore } from "@/lib/priority";
import type { Task } from "@/types/tasks";

export const OPEN_TASK_STATUSES = ["todo", "in_progress", "waiting"] as const;

export type TodayTaskGroups = {
  overdue: Task[];
  today: Task[];
  upcoming: Task[];
  completed: Task[];
  archived: Task[];
};

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

  return {
    overdue: openTasks
      .filter((task) => task.dueDate < todayDate)
      .sort((a, b) =>
        compareByScore(a, b, todayDate, (l, r) =>
          l.dueDate.localeCompare(r.dueDate),
        ),
      ),
    today: openTasks
      .filter((task) => task.dueDate === todayDate)
      .sort((a, b) =>
        compareByScore(a, b, todayDate, (l, r) =>
          (l.dueTime ?? "23:59").localeCompare(r.dueTime ?? "23:59"),
        ),
      ),
    upcoming: openTasks
      .filter((task) => task.dueDate > todayDate)
      .sort((a, b) =>
        compareByScore(a, b, todayDate, (l, r) =>
          l.dueDate.localeCompare(r.dueDate),
        ),
      ),
    completed: tasks
      .filter((task) => task.status === "done")
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)),
    archived: tasks
      .filter((task) => task.status === "archived")
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)),
  };
}

export function getDailyEstimatedMinutes(tasks: Task[]) {
  return tasks.reduce(
    (total, task) => total + (task.estimatedMinutes ?? 0),
    0,
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
