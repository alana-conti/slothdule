"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { createAudioAttachmentAction } from "@/features/tasks/attachment-actions";

type AudioRecorderProps = {
  taskId: string;
};

export function AudioRecorder({ taskId }: AudioRecorderProps) {
  const router = useRouter();
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [label, setLabel] = useState("");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Clean up preview URL and timer on unmount
  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [audioUrl]);

  const startRecording = async () => {
    try {
      setUploadError(null);
      setAudioBlob(null);
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
        setAudioUrl(null);
      }
      chunksRef.current = [];

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const url = URL.createObjectURL(blob);
        setAudioBlob(blob);
        setAudioUrl(url);
        
        // Generate default label with current timestamp
        const timeStr = new Intl.DateTimeFormat("pt-BR", {
          day: "2-digit",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        }).format(new Date());
        setLabel(`Gravação de Áudio (${timeStr})`);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Erro ao iniciar gravação de áudio:", err);
      setUploadError("Não foi possível acessar o microfone.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      // Stop all microphone tracks to release mic resource
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    }
  };

  const cancelRecording = () => {
    setIsRecording(false);
    setRecordingTime(0);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    chunksRef.current = [];
    setAudioBlob(null);
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
  };

  const saveRecording = async () => {
    if (!audioBlob) return;

    try {
      setIsUploading(true);
      setUploadError(null);

      const supabase = createClient();
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error("Sua sessão expirou. Entre novamente para salvar o áudio.");
      }

      const contentType = (audioBlob.type || "audio/webm").split(";")[0];
      const extension =
        contentType === "audio/mp4"
          ? "m4a"
          : contentType === "audio/ogg"
            ? "ogg"
            : contentType === "audio/mpeg"
              ? "mp3"
              : "webm";
      const fileName = `${user.id}/${taskId}/${crypto.randomUUID()}.${extension}`;
      
      // Upload blob to Supabase Storage
      const { error: uploadErr } = await supabase.storage
        .from("attachments")
        .upload(fileName, audioBlob, {
          contentType,
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadErr) {
        if (uploadErr.message.toLowerCase().includes("bucket not found")) {
          throw new Error(
            "O armazenamento de áudio ainda não foi configurado. Aplique as migrations do Supabase.",
          );
        }

        throw new Error(`Não foi possível enviar o áudio: ${uploadErr.message}`);
      }

      // Fetch public URL
      const { data: { publicUrl } } = supabase.storage
        .from("attachments")
        .getPublicUrl(fileName);

      // Trigger server action to register attachment in DB
      const formData = new FormData();
      formData.append("taskId", taskId);
      formData.append("url", publicUrl);
      formData.append("label", label || "Gravação de Áudio");
      formData.append("mimeType", contentType);
      formData.append("sizeBytes", String(audioBlob.size));

      const result = await createAudioAttachmentAction(formData);

      if (result.error) {
        await supabase.storage.from("attachments").remove([fileName]);
        throw new Error(result.error);
      }

      // Reset state
      setAudioBlob(null);
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
        setAudioUrl(null);
      }
      setLabel("");
      router.refresh();
    } catch (err) {
      console.error("Erro ao salvar áudio:", err);
      setUploadError(err instanceof Error ? err.message : "Erro ao fazer upload do áudio.");
    } finally {
      setIsUploading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  return (
    <div className="rounded-2xl border border-dashed border-sloth-border bg-sloth-cream/10 p-4 mt-6">
      <h3 className="text-sm font-semibold text-sloth-ink mb-2">🎙️ Adicionar Gravação de Áudio</h3>
      
      {uploadError && (
        <p className="text-xs text-sloth-terracotta mb-3 font-semibold">
          {uploadError}
        </p>
      )}

      {/* Recording Phase */}
      {isRecording && (
        <div className="flex items-center justify-between bg-sloth-card p-3 rounded-xl border border-sloth-border mb-3 animate-pulse">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-sloth-terracotta" />
            <span className="text-xs font-semibold text-sloth-muted">Gravando...</span>
          </div>
          <span className="text-sm font-bold text-sloth-ink">{formatTime(recordingTime)}</span>
          <div className="flex gap-2">
            <button
              onClick={stopRecording}
              className="bg-sloth-moss text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-sloth-forest transition cursor-pointer"
            >
              Parar
            </button>
            <button
              onClick={cancelRecording}
              className="border border-sloth-border text-sloth-muted px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-sloth-beige/40 transition cursor-pointer"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Pre-recording Phase */}
      {!isRecording && !audioBlob && (
        <button
          onClick={startRecording}
          className="w-full min-h-10 border border-sloth-moss text-sloth-forest font-semibold rounded-xl text-xs hover:bg-sloth-moss/10 transition cursor-pointer flex items-center justify-center gap-2"
        >
          <span>🎙️</span> Iniciar Gravação
        </button>
      )}

      {/* Post-recording Save Phase */}
      {audioBlob && audioUrl && (
        <div className="space-y-3 bg-sloth-card p-4 rounded-xl border border-sloth-border">
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-sloth-muted" htmlFor="audio-label-input">
              Rótulo do Áudio
            </label>
            <input
              className="min-h-10 w-full rounded-lg border border-sloth-border bg-sloth-card px-3 outline-none focus:border-sloth-moss text-xs font-medium"
              id="audio-label-input"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Digite um rótulo"
              required
            />
          </div>

          <div className="flex items-center justify-center p-2 bg-sloth-beige/10 rounded-lg">
            <audio src={audioUrl} controls className="w-full max-w-md" />
          </div>

          <div className="flex gap-2 justify-end">
            <button
              onClick={cancelRecording}
              disabled={isUploading}
              className="border border-sloth-border text-sloth-muted px-4 py-2 rounded-xl text-xs font-semibold hover:bg-sloth-beige/40 transition cursor-pointer"
            >
              Descartar
            </button>
            <button
              onClick={saveRecording}
              disabled={isUploading}
              className="bg-sloth-moss text-white px-5 py-2 rounded-xl text-xs font-semibold hover:bg-sloth-forest transition cursor-pointer disabled:opacity-55"
            >
              {isUploading ? "Salvando..." : "Salvar Áudio"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
