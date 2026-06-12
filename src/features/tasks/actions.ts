"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  archiveTask,
  createTask,
  deleteTask,
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

  if (result && result.leavesAwarded > 0) {
    redirectWithMessage(
      "message",
      `Uma coisa de cada vez. +${result.leavesAwarded} Folhinhas para você.`,
    );
  }

  redirectWithMessage("message", "Tarefa atualizada com calma.");
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
