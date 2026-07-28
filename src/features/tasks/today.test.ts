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
