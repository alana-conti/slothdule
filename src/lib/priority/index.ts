import type { Task, TaskPriority } from "@/types/tasks";

export type PriorityExplanation = {
  description: string;
  points: number;
};

export type PriorityScoreResult = {
  score: number;
  reasons: PriorityExplanation[];
};

/**
 * Calcula o score de prioridade de uma tarefa com base na data atual.
 * Função pura e sem efeitos colaterais.
 *
 * @param task A tarefa a ser pontuada
 * @param currentDateStr Data atual no formato "YYYY-MM-DD"
 */
export function calculatePriorityScore(
  task: Task,
  currentDateStr: string
): PriorityScoreResult {
  const reasons: PriorityExplanation[] = [];
  let score = 0;

  // 1. Status da Tarefa
  // Tarefas concluídas ou arquivadas não devem ter prioridade ativa (score zero).
  if (task.status === "done") {
    return {
      score: 0,
      reasons: [{ description: "Tarefa já concluída", points: 0 }],
    };
  }
  if (task.status === "archived") {
    return {
      score: 0,
      reasons: [{ description: "Tarefa arquivada", points: 0 }],
    };
  }

  // 2. Prioridade Manual (Base)
  const priorityScores: Record<TaskPriority, number> = {
    critical: 100,
    high: 60,
    medium: 30,
    low: 10,
  };

  const priorityLabels: Record<TaskPriority, string> = {
    critical: "crítica",
    high: "alta",
    medium: "média",
    low: "baixa",
  };

  const basePoints = priorityScores[task.priority] ?? 0;
  score += basePoints;
  reasons.push({
    description: `Prioridade manual definida como ${priorityLabels[task.priority]}`,
    points: basePoints,
  });

  // 3. Fator de Prazo (dueDate)
  const taskDueDate = task.dueDate;
  if (taskDueDate) {
    const currentMs = new Date(`${currentDateStr}T00:00:00Z`).getTime();
    const dueMs = new Date(`${taskDueDate}T00:00:00Z`).getTime();

    if (dueMs < currentMs) {
      // Atrasada
      const diffMs = currentMs - dueMs;
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      // Bônus base de atraso: +80 pontos
      // Bônus dinâmico: +5 pontos por dia de atraso (máximo de +40 pontos, correspondente a 8 dias)
      const dynamicOverduePoints = Math.min(diffDays * 5, 40);
      const overdueTotal = 80 + dynamicOverduePoints;
      score += overdueTotal;

      const dayWord = diffDays === 1 ? "dia" : "dias";
      reasons.push({
        description: `Passou do prazo há ${diffDays} ${dayWord}`,
        points: overdueTotal,
      });
    } else if (dueMs === currentMs) {
      // Prazo hoje
      score += 50;
      reasons.push({
        description: "Prazo é hoje",
        points: 50,
      });
    } else {
      // Verificar se é amanhã
      const tomorrow = new Date(`${currentDateStr}T00:00:00Z`);
      tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
      const tomorrowDateStr = tomorrow.toISOString().split("T")[0];

      if (taskDueDate === tomorrowDateStr) {
        score += 25;
        reasons.push({
          description: "Prazo é amanhã",
          points: 25,
        });
      } else {
        // Prazo no futuro
        reasons.push({
          description: "Prazo futuro",
          points: 0,
        });
      }
    }
  }

  // 4. Ajustes por Status Ativo
  if (task.status === "in_progress") {
    score += 15;
    reasons.push({
      description: "Tarefa já em andamento",
      points: 15,
    });
  } else if (task.status === "waiting") {
    score -= 20;
    reasons.push({
      description: "Aguardando (em pausa)",
      points: -20,
    });
  }

  // 5. Ajuste por Estimativa de Tempo
  if (task.estimatedMinutes !== null && task.estimatedMinutes !== undefined) {
    if (task.estimatedMinutes > 0 && task.estimatedMinutes <= 15) {
      score += 10;
      reasons.push({
        description: "Tarefa curta, boa para começar (quick win ≤ 15 min)",
        points: 10,
      });
    } else if (task.estimatedMinutes > 15 && task.estimatedMinutes <= 60) {
      score += 5;
      reasons.push({
        description: "Tarefa de duração moderada (≤ 1h)",
        points: 5,
      });
    } else if (task.estimatedMinutes > 120) {
      score -= 10;
      reasons.push({
        description: "Tarefa muito longa (> 2h), ideal dividir em partes",
        points: -10,
      });
    }
  }

  // Clampar o score final para que nunca seja menor que zero
  if (score < 0) {
    score = 0;
  }

  return {
    score,
    reasons,
  };
}
