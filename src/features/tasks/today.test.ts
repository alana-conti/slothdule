import { describe, expect, it } from "vitest";

import {
  getDailyEstimatedMinutes,
  getTaskDailyEstimatedMinutes,
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
