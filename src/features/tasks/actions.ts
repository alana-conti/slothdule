"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  archiveTask,
  createRewardItem,
  createTask,
  deleteTask,
  getTask,
  markRewardRedemptionDelivered,
  updateTask,
  redeemReward,
} from "@/features/tasks/data";
import {
  taskPriorities,
  taskStatuses,
  workContexts,
  type TaskInput,
} from "@/types/tasks";

function getText(formData: FormData, field: string) {
  const value = formData.get(field);

  return typeof value === "string" ? value.trim() : "";
}

function getOptionalText(formData: FormData, field: string) {
  return getText(formData, field) || null;
}

function getEstimatedMinutes(formData: FormData) {
  const value = getText(formData, "estimatedMinutes");

  if (!value) {
    return null;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error("A estimativa deve ser um número inteiro positivo.");
  }

  return parsed;
}

function getPositiveInteger(formData: FormData, field: string, label: string) {
  const value = getText(formData, field);
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(`${label} deve ser um número inteiro maior que zero.`);
  }

  return parsed;
}

function parseTaskInput(formData: FormData): TaskInput {
  const title = getText(formData, "title");
  const categoryId = getText(formData, "categoryId");
  const dueDate = getText(formData, "dueDate");
  const priority = getText(formData, "priority");
  const status = getText(formData, "status") || "todo";
  const workContext = getText(formData, "workContext") || "personal";

  if (!title || !categoryId || !dueDate) {
    throw new Error("Preencha título, categoria e prazo.");
  }

  if (!taskPriorities.includes(priority as TaskInput["priority"])) {
    throw new Error("Prioridade inválida.");
  }

  if (!taskStatuses.includes(status as TaskInput["status"])) {
    throw new Error("Status inválido.");
  }

  if (!workContexts.includes(workContext as TaskInput["workContext"])) {
    throw new Error("Contexto inválido.");
  }

  return {
    title,
    categoryId,
    dueDate,
    priority: priority as TaskInput["priority"],
    status: status as TaskInput["status"],
    workContext: workContext as TaskInput["workContext"],
    description: getOptionalText(formData, "description"),
    startDate: getOptionalText(formData, "startDate"),
    dueTime: getOptionalText(formData, "dueTime"),
    estimatedMinutes: getEstimatedMinutes(formData),
  };
}

function getTaskId(formData: FormData) {
  const taskId = getText(formData, "taskId");

  if (!taskId) {
    throw new Error("Tarefa inválida.");
  }

  return taskId;
}

function redirectWithMessage(
  kind: "error" | "message",
  message: string,
  path = "/today",
): never {
  redirect(`${path}?${kind}=${encodeURIComponent(message)}`);
}

export async function createTaskAction(formData: FormData) {
  try {
    await createTask(parseTaskInput(formData));
  } catch (error) {
    redirectWithMessage(
      "error",
      error instanceof Error ? error.message : "Não foi possível criar a tarefa.",
    );
  }

  revalidatePath("/today");
  redirectWithMessage("message", "Tarefa criada. Uma coisa a menos para guardar na cabeça.");
}

export async function updateTaskAction(formData: FormData) {
  let result;
  try {
    result = await updateTask(getTaskId(formData), parseTaskInput(formData));
  } catch (error) {
    redirectWithMessage(
      "error",
      error instanceof Error
        ? error.message
        : "Não foi possível atualizar a tarefa.",
    );
  }

  revalidatePath("/today");
  revalidatePath("/rewards");

  if (result && result.leavesAwarded > 0) {
    redirectWithMessage(
      "message",
      `Uma coisa de cada vez. +${result.leavesAwarded} Folhinhas para você.`,
    );
  }

  redirectWithMessage("message", "Tarefa atualizada com calma.");
}

export async function updateTaskStatusAction(formData: FormData) {
  let taskId = "";
  let returnPath = "/today";
  let result;

  try {
    taskId = getTaskId(formData);
    returnPath =
      getText(formData, "returnTo") === "detail"
        ? `/tasks/${taskId}`
        : "/today";

    const status = getText(formData, "status");

    if (!taskStatuses.includes(status as TaskInput["status"])) {
      throw new Error("Status inválido.");
    }

    const task = await getTask(taskId);

    if (!task) {
      throw new Error("Tarefa não encontrada.");
    }

    result = await updateTask(taskId, {
      categoryId: task.categoryId,
      title: task.title,
      description: task.description,
      workContext: task.workContext,
      status: status as TaskInput["status"],
      priority: task.priority,
      startDate: task.startDate,
      dueDate: task.dueDate,
      dueTime: task.dueTime,
      estimatedMinutes: task.estimatedMinutes,
    });
  } catch (error) {
    redirectWithMessage(
      "error",
      error instanceof Error
        ? error.message
        : "Não foi possível atualizar o status.",
      returnPath,
    );
  }

  revalidatePath("/today");
  revalidatePath(`/tasks/${taskId}`);
  revalidatePath("/rewards");

  if (result && result.leavesAwarded > 0) {
    redirectWithMessage(
      "message",
      `Tarefa concluída. +${result.leavesAwarded} Folhinhas para você.`,
      returnPath,
    );
  }

  redirectWithMessage("message", "Status atualizado.", returnPath);
}

export async function archiveTaskAction(formData: FormData) {
  try {
    await archiveTask(getTaskId(formData));
  } catch (error) {
    redirectWithMessage(
      "error",
      error instanceof Error
        ? error.message
        : "Não foi possível arquivar a tarefa.",
    );
  }

  revalidatePath("/today");
  redirectWithMessage("message", "Tarefa arquivada.");
}

export async function deleteTaskAction(formData: FormData) {
  try {
    await deleteTask(getTaskId(formData));
  } catch (error) {
    redirectWithMessage(
      "error",
      error instanceof Error ? error.message : "Não foi possível excluir a tarefa.",
    );
  }

  revalidatePath("/today");
  revalidatePath("/calendar");
  revalidatePath("/timeline");
  revalidatePath("/rewards");
  redirectWithMessage("message", "Tarefa excluída.");
}

export async function redeemRewardAction(formData: FormData) {
  const rewardItemId = formData.get("rewardItemId");
  if (typeof rewardItemId !== "string" || !rewardItemId) {
    redirectWithMessage("error", "Recompensa inválida.", "/rewards");
  }

  try {
    await redeemReward(rewardItemId);
  } catch (error) {
    redirectWithMessage(
      "error",
      error instanceof Error
        ? error.message
        : "Não foi possível resgatar a recompensa.",
      "/rewards",
    );
  }

  revalidatePath("/rewards");
  redirectWithMessage(
    "message",
    "Recompensa solicitada. A preguiça já anotou.",
    "/rewards",
  );
}

export async function createRewardItemAction(formData: FormData) {
  try {
    const title = getText(formData, "title");

    if (!title) {
      throw new Error("Dê um nome para a recompensa.");
    }

    await createRewardItem({
      title,
      description: getOptionalText(formData, "description"),
      cost: getPositiveInteger(formData, "cost", "O custo"),
      icon: getOptionalText(formData, "icon"),
    });
  } catch (error) {
    redirectWithMessage(
      "error",
      error instanceof Error
        ? error.message
        : "Não foi possível criar a recompensa.",
      "/rewards",
    );
  }

  revalidatePath("/rewards");
  redirectWithMessage("message", "Recompensa personalizada criada.", "/rewards");
}

export async function markRewardRedemptionDeliveredAction(formData: FormData) {
  const redemptionId = getText(formData, "redemptionId");

  if (!redemptionId) {
    redirectWithMessage("error", "Resgate inválido.", "/rewards");
  }

  try {
    await markRewardRedemptionDelivered(redemptionId);
  } catch (error) {
    redirectWithMessage(
      "error",
      error instanceof Error
        ? error.message
        : "Não foi possível finalizar o resgate.",
      "/rewards",
    );
  }

  revalidatePath("/rewards");
  redirectWithMessage("message", "Resgate marcado como finalizado.", "/rewards");
}
