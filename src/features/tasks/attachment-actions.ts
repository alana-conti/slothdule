"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  createAttachment,
  deleteAttachment,
  updateAttachment,
} from "@/features/tasks/data";

function getText(formData: FormData, field: string) {
  const value = formData.get(field);
  return typeof value === "string" ? value.trim() : "";
}

function getOptionalText(formData: FormData, field: string) {
  return getText(formData, field) || null;
}

function getTaskId(formData: FormData) {
  const taskId = getText(formData, "taskId");
  if (!taskId) {
    throw new Error("Tarefa inválida.");
  }
  return taskId;
}

function getAttachmentId(formData: FormData) {
  const attachmentId = getText(formData, "attachmentId");
  if (!attachmentId) {
    throw new Error("Anexo inválido.");
  }
  return attachmentId;
}

function getValidatedUrl(formData: FormData) {
  let url = getText(formData, "url");
  if (!url) {
    throw new Error("Digite o link do anexo.");
  }

  // Prepend https:// if no protocol is defined
  if (!/^https?:\/\//i.test(url)) {
    url = "https://" + url;
  }

  try {
    new URL(url);
  } catch {
    throw new Error("O link fornecido não é válido.");
  }

  return url;
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

export async function createAttachmentAction(formData: FormData) {
  let taskId = "";

  try {
    taskId = getTaskId(formData);
    const url = getValidatedUrl(formData);
    const label = getOptionalText(formData, "label");

    await createAttachment({
      taskId,
      type: "link",
      label,
      url,
    });
  } catch (error) {
    redirectToTask(
      taskId,
      "error",
      error instanceof Error
        ? error.message
        : "Não foi possível adicionar o anexo.",
    );
  }

  refreshTask(taskId);
  redirectToTask(taskId, "message", "Link adicionado.");
}

export async function updateAttachmentAction(formData: FormData) {
  let taskId = "";

  try {
    taskId = getTaskId(formData);
    const attachmentId = getAttachmentId(formData);
    const url = getValidatedUrl(formData);
    const label = getOptionalText(formData, "label");

    await updateAttachment({
      id: attachmentId,
      taskId,
      label,
      url,
    });
  } catch (error) {
    redirectToTask(
      taskId,
      "error",
      error instanceof Error
        ? error.message
        : "Não foi possível editar o anexo.",
    );
  }

  refreshTask(taskId);
  redirectToTask(taskId, "message", "Link atualizado.");
}

export async function deleteAttachmentAction(formData: FormData) {
  let taskId = "";

  try {
    taskId = getTaskId(formData);
    const attachmentId = getAttachmentId(formData);
    await deleteAttachment(attachmentId, taskId);
  } catch (error) {
    redirectToTask(
      taskId,
      "error",
      error instanceof Error
        ? error.message
        : "Não foi possível remover o anexo.",
    );
  }

  refreshTask(taskId);
  redirectToTask(taskId, "message", "Link removido.");
}

export async function createAudioAttachmentAction(formData: FormData) {
  let taskId = "";

  try {
    taskId = getTaskId(formData);
    const url = getText(formData, "url");
    if (!url) {
      throw new Error("Link do áudio ausente.");
    }
    const label = getOptionalText(formData, "label") || "Gravação de Áudio";
    const mimeType = getOptionalText(formData, "mimeType");
    const sizeBytes = formData.get("sizeBytes") ? Number(formData.get("sizeBytes")) : null;

    await createAttachment({
      taskId,
      type: "audio",
      label,
      url,
      mimeType,
      sizeBytes,
    });
  } catch (error) {
    redirectToTask(
      taskId,
      "error",
      error instanceof Error
        ? error.message
        : "Não foi possível adicionar a gravação de áudio.",
    );
  }

  refreshTask(taskId);
  redirectToTask(taskId, "message", "Gravação de áudio adicionada.");
}
