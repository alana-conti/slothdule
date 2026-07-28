"use client";

import { useMemo, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";

import { createFileAttachmentAction } from "@/features/tasks/attachment-actions";
import { createClient } from "@/lib/supabase/client";

type FileUploaderProps = {
  taskId: string;
};

const allowedMimeTypes = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "text/csv",
]);

const extensionByMimeType: Record<string, string> = {
  "application/pdf": "pdf",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    "docx",
  "application/vnd.ms-excel": "xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "application/vnd.ms-powerpoint": "ppt",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation":
    "pptx",
  "text/plain": "txt",
  "text/csv": "csv",
};

const maxFileSizeBytes = 10 * 1024 * 1024;

function getSafeExtension(file: File) {
  const mimeExtension = extensionByMimeType[file.type];

  if (mimeExtension) {
    return mimeExtension;
  }

  const extension = file.name.split(".").pop()?.toLowerCase();
  return extension?.replace(/[^a-z0-9]/g, "") || "file";
}

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FileUploader({ taskId }: FileUploaderProps) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [label, setLabel] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const selectedFileDescription = useMemo(() => {
    if (!file) {
      return null;
    }

    return `${file.name} · ${formatFileSize(file.size)}`;
  }, [file]);

  const onFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0] ?? null;
    setUploadError(null);
    setFile(null);

    if (!selected) {
      return;
    }

    if (!allowedMimeTypes.has(selected.type)) {
      setUploadError(
        "Formato não suportado. Envie PDF, Word, Excel, PowerPoint, TXT ou CSV.",
      );
      event.target.value = "";
      return;
    }

    if (selected.size > maxFileSizeBytes) {
      setUploadError("O documento deve ter no máximo 10 MB.");
      event.target.value = "";
      return;
    }

    setFile(selected);
    setLabel(selected.name.replace(/\.[^.]+$/, ""));
  };

  const uploadFile = async () => {
    if (!file) {
      setUploadError("Escolha um documento para anexar.");
      return;
    }

    try {
      setIsUploading(true);
      setUploadError(null);

      const supabase = createClient();
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error(
          "Sua sessão expirou. Entre novamente para anexar o documento.",
        );
      }

      const contentType = file.type || "application/octet-stream";
      const extension = getSafeExtension(file);
      const fileName = `${user.id}/${taskId}/${crypto.randomUUID()}.${extension}`;

      const { error: uploadErr } = await supabase.storage
        .from("attachments")
        .upload(fileName, file, {
          contentType,
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadErr) {
        if (uploadErr.message.toLowerCase().includes("bucket not found")) {
          throw new Error(
            "O armazenamento de anexos ainda não foi configurado. Aplique as migrations do Supabase.",
          );
        }

        throw new Error(
          `Não foi possível enviar o documento: ${uploadErr.message}`,
        );
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("attachments").getPublicUrl(fileName);

      const formData = new FormData();
      formData.append("taskId", taskId);
      formData.append("url", publicUrl);
      formData.append("label", label || file.name);
      formData.append("mimeType", contentType);
      formData.append("sizeBytes", String(file.size));

      const result = await createFileAttachmentAction(formData);

      if (result.error) {
        await supabase.storage.from("attachments").remove([fileName]);
        throw new Error(result.error);
      }

      setFile(null);
      setLabel("");
      router.refresh();
    } catch (error) {
      setUploadError(
        error instanceof Error
          ? error.message
          : "Erro ao fazer upload do documento.",
      );
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="mt-6 rounded-2xl border border-dashed border-sloth-border bg-sloth-cream/10 p-4">
      <h3 className="mb-2 text-sm font-semibold text-sloth-ink">
        📄 Adicionar Documento
      </h3>

      {uploadError ? (
        <p className="mb-3 text-xs font-semibold text-sloth-terracotta">
          {uploadError}
        </p>
      ) : null}

      <div className="grid gap-3">
        <div>
          <label
            className="mb-1.5 block text-xs font-semibold text-sloth-muted"
            htmlFor="document-file-input"
          >
            Documento ou PDF
          </label>
          <input
            accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,text/plain,text/csv"
            className="block w-full cursor-pointer rounded-xl border border-sloth-border bg-sloth-card px-3 py-2 text-xs text-sloth-muted file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-sloth-beige file:px-3 file:py-2 file:text-xs file:font-semibold file:text-sloth-forest hover:file:bg-sloth-moss/15"
            disabled={isUploading}
            id="document-file-input"
            onChange={onFileChange}
            type="file"
          />
          <p className="mt-1.5 text-[11px] leading-relaxed text-sloth-muted">
            Aceita PDF, Word, Excel, PowerPoint, TXT e CSV até 10 MB.
          </p>
        </div>

        {selectedFileDescription ? (
          <p className="rounded-xl bg-sloth-beige/25 px-3 py-2 text-xs font-medium text-sloth-muted">
            {selectedFileDescription}
          </p>
        ) : null}

        <div>
          <label
            className="mb-1.5 block text-xs font-semibold text-sloth-muted"
            htmlFor="document-label-input"
          >
            Rótulo do documento
          </label>
          <input
            className="min-h-10 w-full rounded-lg border border-sloth-border bg-sloth-card px-3 text-xs font-medium outline-none focus:border-sloth-moss"
            disabled={isUploading}
            id="document-label-input"
            onChange={(event) => setLabel(event.target.value)}
            placeholder="Ex.: Briefing, contrato, referência..."
            type="text"
            value={label}
          />
        </div>

        <div className="flex justify-end">
          <button
            className="rounded-xl bg-sloth-moss px-5 py-2 text-xs font-semibold text-white transition hover:bg-sloth-forest disabled:cursor-not-allowed disabled:opacity-55"
            disabled={!file || isUploading}
            onClick={uploadFile}
            type="button"
          >
            {isUploading ? "Enviando..." : "Anexar documento"}
          </button>
        </div>
      </div>
    </div>
  );
}
