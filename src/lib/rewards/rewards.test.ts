import { describe, it, expect } from "vitest";
import { calculateCompletedTaskLeaves } from "./index";
import type { Task, Subtask } from "@/types/tasks";

// Helper to create a dummy task
function createTask(overrides: Partial<Task>): Task {
  return {
    id: "task-1",
    userId: "user-1",
    categoryId: "cat-1",
    title: "Test Task",
    description: "Description",
    workContext: "personal",
    status: "todo",
    priority: "medium",
    startDate: null,
    dueDate: "2026-06-12",
    dueTime: null,
    estimatedMinutes: null,
    completedAt: null,
    leafAwardedAt: null,
    pauseReason: null,
    clientId: null,
    projectId: null,
    createdAt: "2026-06-12T10:00:00Z",
    updatedAt: "2026-06-12T10:00:00Z",
    ...overrides,
  };
}

// Helper to create a dummy subtask
function createSubtask(overrides: Partial<Subtask>): Subtask {
  return {
    id: "sub-1",
    userId: "user-1",
    taskId: "task-1",
    title: "Subtask",
    isDone: false,
    position: 1,
    createdAt: "2026-06-12T10:00:00Z",
    updatedAt: "2026-06-12T10:00:00Z",
    ...overrides,
  };
}

describe("calculateCompletedTaskLeaves", () => {
  const completedDate = "2026-06-12";

  describe("Base Priority Points", () => {
    it("should return +1 leaf for low priority task completed on the due date", () => {
      const task = createTask({ priority: "low", dueDate: "2026-06-12" });
      const result = calculateCompletedTaskLeaves(task, completedDate);
      expect(result.totalLeaves).toBe(1);
      expect(result.reasons).toContainEqual({
        description: "Conclusão de tarefa de prioridade baixa",
        points: 1,
      });
    });

    it("should return +3 leaves for medium priority task completed on the due date", () => {
      const task = createTask({ priority: "medium", dueDate: "2026-06-12" });
      const result = calculateCompletedTaskLeaves(task, completedDate);
      expect(result.totalLeaves).toBe(3);
      expect(result.reasons).toContainEqual({
        description: "Conclusão de tarefa de prioridade média",
        points: 3,
      });
    });

    it("should return +5 leaves for high priority task completed on the due date", () => {
      const task = createTask({ priority: "high", dueDate: "2026-06-12" });
      const result = calculateCompletedTaskLeaves(task, completedDate);
      expect(result.totalLeaves).toBe(5);
      expect(result.reasons).toContainEqual({
        description: "Conclusão de tarefa de prioridade alta",
        points: 5,
      });
    });

    it("should return +8 leaves for critical priority task completed on the due date", () => {
      const task = createTask({ priority: "critical", dueDate: "2026-06-12" });
      const result = calculateCompletedTaskLeaves(task, completedDate);
      expect(result.totalLeaves).toBe(8);
      expect(result.reasons).toContainEqual({
        description: "Conclusão de tarefa de prioridade crítica",
        points: 8,
      });
    });
  });

  describe("Early Completion Bonus", () => {
    it("should add +2 bonus leaves if task is completed before the due date", () => {
      const task = createTask({ priority: "medium", dueDate: "2026-06-13" });
      const result = calculateCompletedTaskLeaves(task, completedDate); // completed on 2026-06-12
      // base (3) + early bonus (2) = 5
      expect(result.totalLeaves).toBe(5);
      expect(result.reasons).toContainEqual({
        description: "Bônus: concluída antes do prazo",
        points: 2,
      });
    });

    it("should not add bonus leaves if task is completed on the due date", () => {
      const task = createTask({ priority: "medium", dueDate: "2026-06-12" });
      const result = calculateCompletedTaskLeaves(task, completedDate);
      expect(result.totalLeaves).toBe(3);
    });

    it("should not add bonus leaves if task is completed after the due date (overdue, no penalty)", () => {
      const task = createTask({ priority: "medium", dueDate: "2026-06-10" });
      const result = calculateCompletedTaskLeaves(task, completedDate); // completed on 2026-06-12
      expect(result.totalLeaves).toBe(3);
    });
  });

  describe("Checklist Completion Bonus", () => {
    it("should add +2 bonus leaves if all checklist items are completed", () => {
      const task = createTask({ priority: "medium", dueDate: "2026-06-12" });
      const subtasks = [
        createSubtask({ isDone: true }),
        createSubtask({ id: "sub-2", isDone: true }),
      ];
      const result = calculateCompletedTaskLeaves(task, completedDate, subtasks);
      // base (3) + checklist bonus (2) = 5
      expect(result.totalLeaves).toBe(5);
      expect(result.reasons).toContainEqual({
        description: "Bônus: checklist completo finalizado",
        points: 2,
      });
    });

    it("should not add bonus leaves if at least one checklist item is not completed", () => {
      const task = createTask({ priority: "medium", dueDate: "2026-06-12" });
      const subtasks = [
        createSubtask({ isDone: true }),
        createSubtask({ id: "sub-2", isDone: false }),
      ];
      const result = calculateCompletedTaskLeaves(task, completedDate, subtasks);
      expect(result.totalLeaves).toBe(3);
    });

    it("should not add bonus leaves if the checklist is empty", () => {
      const task = createTask({ priority: "medium", dueDate: "2026-06-12" });
      const result = calculateCompletedTaskLeaves(task, completedDate, []);
      expect(result.totalLeaves).toBe(3);
    });
  });

  describe("Combination of Bonuses", () => {
    it("should combine base + early bonus + checklist bonus", () => {
      const task = createTask({ priority: "critical", dueDate: "2026-06-15" }); // due 15, completed 12
      const subtasks = [createSubtask({ isDone: true })];
      const result = calculateCompletedTaskLeaves(task, completedDate, subtasks);
      // base (8) + early bonus (2) + checklist bonus (2) = 12
      expect(result.totalLeaves).toBe(12);
      expect(result.reasons).toHaveLength(3);
    });
  });
});
