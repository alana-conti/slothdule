import { describe, expect, it } from "vitest";

import {
  getDailyEstimatedMinutes,
  getTaskDailyEstimatedMinutes,
  getTaskCompletedDateKey,
  getTaskDurationDays,
  groupTasksForToday,
} from "./today";
import type { Task } from "../../types/tasks";

function createTask(overrides: Partial<Task> = {}): Task {
  return {
    id: "task-1",
    userId: "user-1",
    categoryId: "category-1",
    title: "Tarefa",
    description: null,
    workContext: "personal",
    status: "todo",
    priority: "medium",
    startDate: null,
    dueDate: "2026-06-12",
    dueTime: null,
    estimatedMinutes: 60,
    completedAt: null,
    leafAwardedAt: null,
    pauseReason: null,
    clientId: null,
    projectId: null,
    createdAt: "2026-06-10T12:00:00Z",
    updatedAt: "2026-06-10T12:00:00Z",
    ...overrides,
  };
}

describe("groupTasksForToday", () => {
  const today = "2026-06-12";

  it("includes an open task throughout its scheduled date range", () => {
    const task = createTask({
      status: "in_progress",
      startDate: "2026-06-12",
      dueDate: "2026-06-13",
    });

    expect(groupTasksForToday([task], today).today).toEqual([task]);
  });

  it("keeps a task upcoming until its start date", () => {
    const task = createTask({
      startDate: "2026-06-13",
      dueDate: "2026-06-14",
    });

    expect(groupTasksForToday([task], today).upcoming).toEqual([task]);
  });

  it("keeps overdue tasks separate from today's tasks", () => {
    const task = createTask({
      startDate: "2026-06-09",
      dueDate: "2026-06-11",
    });

    const groups = groupTasksForToday([task], today);

    expect(groups.overdue).toEqual([task]);
    expect(groups.today).toEqual([]);
  });
});

describe("tarefas em andamento", () => {
  const today = "2026-06-12";

  it("reúne as tarefas em andamento de qualquer data, sem as pausadas", () => {
    const overdue = createTask({
      id: "overdue",
      status: "in_progress",
      dueDate: "2026-06-10",
    });
    const current = createTask({ id: "current", status: "in_progress" });
    const upcoming = createTask({
      id: "upcoming",
      status: "in_progress",
      dueDate: "2026-06-20",
    });
    const waiting = createTask({ id: "waiting", status: "waiting" });
    const done = createTask({ id: "done", status: "done" });

    const ids = groupTasksForToday(
      [upcoming, waiting, done, current, overdue],
      today,
    ).inProgress.map((task) => task.id);

    expect(ids).toHaveLength(3);
    expect(ids).toEqual(
      expect.arrayContaining(["overdue", "current", "upcoming"]),
    );
  });

  it("mantém a tarefa em andamento também no grupo da sua data", () => {
    const task = createTask({ status: "in_progress" });
    const groups = groupTasksForToday([task], today);

    expect(groups.inProgress).toEqual([task]);
    expect(groups.today).toEqual([task]);
  });
});

describe("daily task estimates", () => {
  it("divides 120 minutes across two inclusive days", () => {
    const task = createTask({
      startDate: "2026-06-12",
      dueDate: "2026-06-13",
      estimatedMinutes: 120,
    });

    expect(getTaskDurationDays(task)).toBe(2);
    expect(getTaskDailyEstimatedMinutes(task)).toBe(60);
  });

  it("sums only each task's daily share", () => {
    const twoDayTask = createTask({
      startDate: "2026-06-12",
      dueDate: "2026-06-13",
      estimatedMinutes: 120,
    });
    const oneDayTask = createTask({
      id: "task-2",
      estimatedMinutes: 30,
    });

    expect(getDailyEstimatedMinutes([twoDayTask, oneDayTask])).toBe(90);
  });

  it("uses the due date as a one-day schedule when start date is absent", () => {
    const task = createTask({
      startDate: null,
      estimatedMinutes: 45,
    });

    expect(getTaskDurationDays(task)).toBe(1);
    expect(getTaskDailyEstimatedMinutes(task)).toBe(45);
  });
});

describe("concluídas hoje", () => {
  const today = "2026-06-12";

  it("separa o que foi concluído hoje do que foi concluído em outros dias", () => {
    const earlierToday = createTask({
      id: "earlier-today",
      status: "done",
      completedAt: "2026-06-12T12:00:00Z",
    });
    const laterToday = createTask({
      id: "later-today",
      status: "done",
      completedAt: "2026-06-12T18:30:00Z",
    });
    const yesterday = createTask({
      id: "yesterday",
      status: "done",
      completedAt: "2026-06-11T15:00:00Z",
    });
    const open = createTask({ id: "open" });

    const groups = groupTasksForToday(
      [earlierToday, yesterday, open, laterToday],
      today,
    );

    expect(groups.completedToday.map((task) => task.id)).toEqual([
      "later-today",
      "earlier-today",
    ]);
    expect(groups.completed.map((task) => task.id)).toEqual(["yesterday"]);
  });

  it("usa o fuso de São Paulo para decidir o dia da conclusão", () => {
    // 01:30 UTC do dia 13 ainda é 22:30 do dia 12 em São Paulo.
    const lateNight = createTask({
      status: "done",
      completedAt: "2026-06-13T01:30:00Z",
    });
    // 03:30 UTC do dia 12 ainda é 00:30 do dia 12 em São Paulo.
    const earlyMorning = createTask({
      id: "early",
      status: "done",
      completedAt: "2026-06-12T03:30:00Z",
    });
    // 02:30 UTC do dia 12 é 23:30 do dia 11 em São Paulo.
    const dayBefore = createTask({
      id: "day-before",
      status: "done",
      completedAt: "2026-06-12T02:30:00Z",
    });

    expect(getTaskCompletedDateKey(lateNight)).toBe("2026-06-12");
    expect(
      groupTasksForToday([lateNight, earlyMorning, dayBefore], today)
        .completedToday.map((task) => task.id),
    ).toEqual(["task-1", "early"]);
  });

  it("cai para a última atualização quando não há data de conclusão", () => {
    const legacy = createTask({
      status: "done",
      completedAt: null,
      updatedAt: "2026-06-12T14:00:00Z",
    });

    expect(groupTasksForToday([legacy], today).completedToday).toEqual([
      legacy,
    ]);
  });

  it("não conta tarefas abertas nem arquivadas", () => {
    const archived = createTask({
      status: "archived",
      completedAt: "2026-06-12T12:00:00Z",
    });
    const reopened = createTask({
      id: "reopened",
      status: "todo",
      completedAt: null,
      updatedAt: "2026-06-12T12:00:00Z",
    });

    expect(getTaskCompletedDateKey(archived)).toBeNull();
    expect(
      groupTasksForToday([archived, reopened], today).completedToday,
    ).toEqual([]);
  });
});
