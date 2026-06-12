"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  createSubtask,
  deleteSubtask,
  setSubtaskCompletion,
  updateSubtaskTitle,
} from "@/features/tasks/data";

function getText(formData: FormData, field: string) {
  const value = formData.get(field);

  return typeof value === "string" ? value.trim() : "";
}

function getTaskId(formData: FormData) {
  const taskId = getText(formData, "taskId");

  if (!taskId) {
    throw new Error("Tarefa inválida.");
  }

  return taskId;
}

function getSubtaskId(formData: FormData) {
  const subtaskId = getText(formData, "subtaskId");

  if (!subtaskId) {
    throw new Error("Subtarefa inválida.");
  }

  return subtaskId;
}

function getTitle(formData: FormData) {
  const title = getText(formData, "title");

  if (!title) {
    throw new Error("Digite um título para a subtarefa.");
  }

  return title;
}

function redirectToTask(
  taskId: string,
  kind: "error" | "message",
  message: string,
): never {
  redirect(
    `/tasks/${encodeURIComponent(taskId)}?${kind}=${encodeURIComponent(message)}`,
  );
}

function refreshTask(taskId: string) {
  revalidatePath(`/tasks/${taskId}`);
  revalidatePath("/today");
}

export async function createSubtaskAction(formData: FormData) {
  let taskId = "";

  try {
    taskId = getTaskId(formData);
    await createSubtask(taskId, getTitle(formData));
  } catch (error) {
    redirectToTask(
      taskId,
      "error",
      error instanceof Error
        ? error.message
        : "Não foi possível adicionar a subtarefa.",
    );
  }

  refreshTask(taskId);
  redirectToTask(taskId, "message", "Subtarefa adicionada.");
}

export async function updateSubtaskAction(formData: FormData) {
  let taskId = "";

  try {
    taskId = getTaskId(formData);
    await updateSubtaskTitle(
      taskId,
      getSubtaskId(formData),
      getTitle(formData),
    );
  } catch (error) {
    redirectToTask(
      taskId,
      "error",
      error instanceof Error
        ? error.message
        : "Não foi possível editar a subtarefa.",
    );
  }

  refreshTask(taskId);
  redirectToTask(taskId, "message", "Subtarefa atualizada.");
}

export async function toggleSubtaskAction(formData: FormData) {
  let taskId = "";

  try {
    taskId = getTaskId(formData);
    await setSubtaskCompletion(
      taskId,
      getSubtaskId(formData),
      getText(formData, "isDone") === "true",
    );
  } catch (error) {
    redirectToTask(
      taskId,
      "error",
      error instanceof Error
        ? error.message
        : "Não foi possível atualizar a subtarefa.",
    );
  }

  refreshTask(taskId);
  redirectToTask(taskId, "message", "Checklist atualizado.");
}

export async function deleteSubtaskAction(formData: FormData) {
  let taskId = "";

  try {
    taskId = getTaskId(formData);
    await deleteSubtask(taskId, getSubtaskId(formData));
  } catch (error) {
    redirectToTask(
      taskId,
      "error",
      error instanceof Error
        ? error.message
        : "Não foi possível remover a subtarefa.",
    );
  }

  refreshTask(taskId);
  redirectToTask(taskId, "message", "Subtarefa removida.");
}
