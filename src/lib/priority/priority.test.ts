import { describe, it, expect } from "vitest";
import { calculatePriorityScore } from "./index";
import type { Task } from "@/types/tasks";

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
    clientId: null,
    projectId: null,
    createdAt: "2026-06-12T10:00:00Z",
    updatedAt: "2026-06-12T10:00:00Z",
    ...overrides,
  };
}

describe("calculatePriorityScore", () => {
  const currentDate = "2026-06-12";

  describe("Status", () => {
    it("should return score 0 for completed tasks", () => {
      const task = createTask({ status: "done", priority: "critical" });
      const result = calculatePriorityScore(task, currentDate);
      expect(result.score).toBe(0);
      expect(result.reasons[0].description).toBe("Tarefa já concluída");
    });

    it("should return score 0 for archived tasks", () => {
      const task = createTask({ status: "archived", priority: "critical" });
      const result = calculatePriorityScore(task, currentDate);
      expect(result.score).toBe(0);
      expect(result.reasons[0].description).toBe("Tarefa arquivada");
    });
  });

  describe("Manual Priority Base Scores", () => {
    it("should return base score 10 for low priority", () => {
      const task = createTask({ priority: "low", dueDate: "2026-06-20" }); // future due date adds 0
      const result = calculatePriorityScore(task, currentDate);
      expect(result.score).toBe(10);
    });

    it("should return base score 30 for medium priority", () => {
      const task = createTask({ priority: "medium", dueDate: "2026-06-20" });
      const result = calculatePriorityScore(task, currentDate);
      expect(result.score).toBe(30);
    });

    it("should return base score 60 for high priority", () => {
      const task = createTask({ priority: "high", dueDate: "2026-06-20" });
      const result = calculatePriorityScore(task, currentDate);
      expect(result.score).toBe(60);
    });

    it("should return base score 100 for critical priority", () => {
      const task = createTask({ priority: "critical", dueDate: "2026-06-20" });
      const result = calculatePriorityScore(task, currentDate);
      expect(result.score).toBe(100);
    });
  });

  describe("Due Date Factor", () => {
    it("should add 50 points when due is today", () => {
      const task = createTask({ priority: "medium", dueDate: "2026-06-12" });
      const result = calculatePriorityScore(task, currentDate);
      // medium priority (30) + due today (50) = 80
      expect(result.score).toBe(80);
      expect(result.reasons).toContainEqual({ description: "Prazo é hoje", points: 50 });
    });

    it("should add 25 points when due is tomorrow", () => {
      const task = createTask({ priority: "medium", dueDate: "2026-06-13" });
      const result = calculatePriorityScore(task, currentDate);
      // medium priority (30) + due tomorrow (25) = 55
      expect(result.score).toBe(55);
      expect(result.reasons).toContainEqual({ description: "Prazo é amanhã", points: 25 });
    });

    it("should add 80 points + 5 per day when overdue by 1 day", () => {
      const task = createTask({ priority: "medium", dueDate: "2026-06-11" });
      const result = calculatePriorityScore(task, currentDate);
      // medium priority (30) + base overdue (80) + 1 day * 5 (5) = 115
      expect(result.score).toBe(115);
      expect(result.reasons).toContainEqual({ description: "Passou do prazo há 1 dia", points: 85 });
    });

    it("should add 80 points + 5 per day when overdue by 5 days", () => {
      const task = createTask({ priority: "medium", dueDate: "2026-06-07" });
      const result = calculatePriorityScore(task, currentDate);
      // medium priority (30) + base overdue (80) + 5 days * 5 (25) = 135
      expect(result.score).toBe(135);
      expect(result.reasons).toContainEqual({ description: "Passou do prazo há 5 dias", points: 105 });
    });

    it("should cap dynamic overdue points at 40 (max 8 days overdue)", () => {
      const task = createTask({ priority: "medium", dueDate: "2026-06-02" }); // 10 days overdue
      const result = calculatePriorityScore(task, currentDate);
      // medium priority (30) + base overdue (80) + max dynamic overdue (40) = 150
      expect(result.score).toBe(150);
      expect(result.reasons).toContainEqual({ description: "Passou do prazo há 10 dias", points: 120 });
    });
  });

  describe("Status Adjustments", () => {
    it("should add 15 points if in_progress", () => {
      const task = createTask({ priority: "medium", dueDate: "2026-06-20", status: "in_progress" });
      const result = calculatePriorityScore(task, currentDate);
      // medium (30) + in_progress (15) = 45
      expect(result.score).toBe(45);
      expect(result.reasons).toContainEqual({ description: "Tarefa já em andamento", points: 15 });
    });

    it("should subtract 20 points if waiting", () => {
      const task = createTask({ priority: "medium", dueDate: "2026-06-20", status: "waiting" });
      const result = calculatePriorityScore(task, currentDate);
      // medium (30) - waiting (20) = 10
      expect(result.score).toBe(10);
      expect(result.reasons).toContainEqual({ description: "Aguardando (em pausa)", points: -20 });
    });
  });

  describe("Estimation Factor", () => {
    it("should add 10 points for quick win tasks (<= 15 min)", () => {
      const task = createTask({ priority: "medium", dueDate: "2026-06-20", estimatedMinutes: 15 });
      const result = calculatePriorityScore(task, currentDate);
      // medium (30) + quick win (10) = 40
      expect(result.score).toBe(40);
      expect(result.reasons).toContainEqual({
        description: "Tarefa curta, boa para começar (quick win ≤ 15 min)",
        points: 10,
      });
    });

    it("should add 5 points for moderate tasks (15 < min <= 60)", () => {
      const task = createTask({ priority: "medium", dueDate: "2026-06-20", estimatedMinutes: 45 });
      const result = calculatePriorityScore(task, currentDate);
      // medium (30) + moderate (5) = 35
      expect(result.score).toBe(35);
      expect(result.reasons).toContainEqual({
        description: "Tarefa de duração moderada (≤ 1h)",
        points: 5,
      });
    });

    it("should subtract 10 points for very long tasks (> 120 min)", () => {
      const task = createTask({ priority: "medium", dueDate: "2026-06-20", estimatedMinutes: 150 });
      const result = calculatePriorityScore(task, currentDate);
      // medium (30) - long task (10) = 20
      expect(result.score).toBe(20);
      expect(result.reasons).toContainEqual({
        description: "Tarefa muito longa (> 2h), ideal dividir em partes",
        points: -10,
      });
    });
  });

  describe("Score Clamping", () => {
    it("should not allow score to drop below 0", () => {
      // low priority (10) + waiting (-20) = -10 -> clamped to 0
      const task = createTask({ priority: "low", dueDate: "2026-06-20", status: "waiting" });
      const result = calculatePriorityScore(task, currentDate);
      expect(result.score).toBe(0);
    });
  });
});
