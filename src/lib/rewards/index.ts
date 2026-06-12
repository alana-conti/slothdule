import type { Task, Subtask } from "@/types/tasks";

export type LeavesExplanation = {
  description: string;
  points: number;
};

export type LeavesCalculationResult = {
  totalLeaves: number;
  reasons: LeavesExplanation[];
};

/**
 * Calcula a quantidade de Folhinhas recebidas ao concluir uma tarefa.
 * Função pura e não punitiva.
 *
 * @param task A tarefa concluída
 * @param completedAtDateStr Data de conclusão da tarefa no formato "YYYY-MM-DD"
 * @param subtasks Lista opcional de subtarefas vinculadas a esta tarefa
 */
export function calculateCompletedTaskLeaves(
  task: Task,
  completedAtDateStr: string,
  subtasks?: Subtask[]
): LeavesCalculationResult {
  const reasons: LeavesExplanation[] = [];
  let totalLeaves = 0;

  // 1. Ganho Base por Prioridade
  const basePointsMap = {
    low: 1,
    medium: 3,
    high: 5,
    critical: 8,
  } as const;

  const priorityLabels = {
    low: "baixa",
    medium: "média",
    high: "alta",
    critical: "crítica",
  } as const;

  const basePoints = basePointsMap[task.priority] ?? 0;
  totalLeaves += basePoints;
  reasons.push({
    description: `Conclusão de tarefa de prioridade ${priorityLabels[task.priority]}`,
    points: basePoints,
  });

  // 2. Bônus por Conclusão Antes do Prazo
  if (task.dueDate) {
    const dueMs = new Date(`${task.dueDate}T00:00:00Z`).getTime();
    const completedMs = new Date(`${completedAtDateStr}T00:00:00Z`).getTime();

    if (completedMs < dueMs) {
      totalLeaves += 2;
      reasons.push({
        description: "Bônus: concluída antes do prazo",
        points: 2,
      });
    }
  }

  // 3. Bônus por Checklist Completo
  if (subtasks && subtasks.length > 0) {
    const allDone = subtasks.every((subtask) => subtask.isDone);
    if (allDone) {
      totalLeaves += 2;
      reasons.push({
        description: "Bônus: checklist completo finalizado",
        points: 2,
      });
    }
  }

  return {
    totalLeaves,
    reasons,
  };
}
