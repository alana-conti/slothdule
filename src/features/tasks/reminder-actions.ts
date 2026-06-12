"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  createReminder,
  deleteReminder,
  updateReminder,
} from "@/features/tasks/data";
import {
  reminderChannels,
  reminderHorizons,
  type ReminderChannel,
  type ReminderHorizon,
} from "@/types/tasks";

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

function getReminderId(formData: FormData) {
  const reminderId = getText(formData, "reminderId");
  if (!reminderId) {
    throw new Error("Lembrete inválido.");
  }
  return reminderId;
}

function parseDateTimeToISO(dateTimeLocalStr: string, timeZoneOffset = "-03:00") {
  if (!dateTimeLocalStr) {
    throw new Error("Selecione data e hora para o lembrete.");
  }
  if (dateTimeLocalStr.includes("Z")) {
    return dateTimeLocalStr;
  }
  let formatted = dateTimeLocalStr;
  if (dateTimeLocalStr.split(":").length === 2) {
    formatted += ":00";
  }
  const dateObj = new Date(formatted + timeZoneOffset);
  if (isNaN(dateObj.getTime())) {
    throw new Error("Data e hora inválidas.");
  }
  return dateObj.toISOString();
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

export async function createReminderAction(formData: FormData) {
  let taskId = "";

  try {
    taskId = getTaskId(formData);
    
    const title = getText(formData, "title") || "Lembrete de tarefa";
    const remindAtRaw = getText(formData, "remindAt");
    const remindAt = parseDateTimeToISO(remindAtRaw);
    
    const channel = getText(formData, "channel");
    const horizon = getText(formData, "horizon");

    if (!reminderChannels.includes(channel as ReminderChannel)) {
      throw new Error("Canal de lembrete inválido.");
    }
    if (!reminderHorizons.includes(horizon as ReminderHorizon)) {
      throw new Error("Horizonte de lembrete inválido.");
    }

    await createReminder({
      taskId,
      title,
      remindAt,
      channel: channel as ReminderChannel,
      horizon: horizon as ReminderHorizon,
    });
  } catch (error) {
    redirectToTask(
      taskId,
      "error",
      error instanceof Error
        ? error.message
        : "Não foi possível criar o lembrete.",
    );
  }

  refreshTask(taskId);
  redirectToTask(taskId, "message", "Lembrete agendado com sucesso.");
}

export async function updateReminderAction(formData: FormData) {
  let taskId = "";

  try {
    taskId = getTaskId(formData);
    const reminderId = getReminderId(formData);
    
    const title = getText(formData, "title") || "Lembrete de tarefa";
    const remindAtRaw = getText(formData, "remindAt");
    const remindAt = parseDateTimeToISO(remindAtRaw);
    
    const channel = getText(formData, "channel");
    const horizon = getText(formData, "horizon");

    if (!reminderChannels.includes(channel as ReminderChannel)) {
      throw new Error("Canal de lembrete inválido.");
    }
    if (!reminderHorizons.includes(horizon as ReminderHorizon)) {
      throw new Error("Horizonte de lembrete inválido.");
    }

    await updateReminder({
      id: reminderId,
      taskId,
      title,
      remindAt,
      channel: channel as ReminderChannel,
      horizon: horizon as ReminderHorizon,
    });
  } catch (error) {
    redirectToTask(
      taskId,
      "error",
      error instanceof Error
        ? error.message
        : "Não foi possível atualizar o lembrete.",
    );
  }

  refreshTask(taskId);
  redirectToTask(taskId, "message", "Lembrete atualizado com sucesso.");
}

export async function deleteReminderAction(formData: FormData) {
  let taskId = "";

  try {
    taskId = getTaskId(formData);
    const reminderId = getReminderId(formData);
    await deleteReminder(reminderId, taskId);
  } catch (error) {
    redirectToTask(
      taskId,
      "error",
      error instanceof Error
        ? error.message
        : "Não foi possível remover o lembrete.",
    );
  }

  refreshTask(taskId);
  redirectToTask(taskId, "message", "Lembrete removido.");
}
