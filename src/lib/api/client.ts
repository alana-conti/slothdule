"use client";

import { getApiConfig } from "./config";

export function getPublicApiUrl() {
  return getApiConfig().publicApiUrl;
}

/** Upload direto para o backend (multipart). Retorna a linha de attachment criada. */
export async function uploadAttachmentFile(
  taskId: string,
  file: File | Blob,
  label: string,
  filename?: string,
) {
  const formData = new FormData();
  formData.append("taskId", taskId);

  if (file instanceof File) {
    formData.append("file", file, filename || file.name);
  } else {
    formData.append("file", file, filename || "audio.webm");
  }

  formData.append("label", label);

  const response = await fetch(
    `${getPublicApiUrl()}/tasks/${encodeURIComponent(taskId)}/attachments/upload`,
    {
      body: formData,
      credentials: "include",
      method: "POST",
    },
  );

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(
      typeof body?.detail === "string"
        ? body.detail
        : "Não foi possível enviar o arquivo.",
    );
  }

  return (await response.json()) as {
    id: string;
    url: string;
    mime_type: string | null;
    size_bytes: number | null;
  };
}
