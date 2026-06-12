import {
  createAttachmentAction,
  deleteAttachmentAction,
  updateAttachmentAction,
} from "@/features/tasks/attachment-actions";
import { AudioRecorder } from "@/features/tasks/audio-recorder";
import type { Attachment } from "@/types/tasks";

type AttachmentListProps = {
  attachments: Attachment[];
  taskId: string;
};

export function AttachmentList({ attachments, taskId }: AttachmentListProps) {
  const links = attachments.filter((att) => att.type === "link");
  const audios = attachments.filter((att) => att.type === "audio");

  return (
    <section className="rounded-card border border-sloth-border bg-sloth-card p-6 shadow-soft sm:p-8">
      <div>
        <p className="text-xs font-semibold tracking-[0.18em] text-sloth-moss uppercase">
          Links e Recursos
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-sloth-ink">
          Recursos de apoio para realizar com calma
        </h2>
      </div>

      {/* Seção de Links */}
      <div className="mt-6">
        <h3 className="text-sm font-semibold text-sloth-ink border-b border-sloth-border/30 pb-1.5 mb-3">🔗 Links Úteis</h3>
        {/* Formulário para adicionar link */}
        <form
          action={createAttachmentAction}
          className="flex flex-col gap-3 rounded-2xl bg-sloth-beige/35 p-4 sm:flex-row mb-4"
        >
          <input name="taskId" type="hidden" value={taskId} />
          
          <div className="flex-1">
            <label className="sr-only" htmlFor="url-new">
              Link (URL)
            </label>
            <input
              className="min-h-11 w-full rounded-xl border border-sloth-border bg-sloth-card px-4 outline-none focus:border-sloth-moss text-sm"
              id="url-new"
              name="url"
              placeholder="Link (URL): https://exemplo.com"
              required
              type="text"
            />
          </div>

          <div className="flex-1">
            <label className="sr-only" htmlFor="label-new">
              Rótulo (opcional)
            </label>
            <input
              className="min-h-11 w-full rounded-xl border border-sloth-border bg-sloth-card px-4 outline-none focus:border-sloth-moss text-sm"
              id="label-new"
              name="label"
              placeholder="Rótulo do link"
              type="text"
            />
          </div>

          <button
            className="min-h-11 rounded-xl bg-sloth-moss px-5 font-semibold text-white transition hover:bg-sloth-forest cursor-pointer text-sm"
            type="submit"
          >
            Adicionar Link
          </button>
        </form>

        {links.length > 0 ? (
          <ol className="grid gap-3">
            {links.map((link) => (
              <li
                className="rounded-2xl border border-sloth-border bg-sloth-card p-4"
                key={link.id}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex-1 min-w-0">
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-semibold text-sloth-forest hover:text-sloth-moss hover:underline inline-flex items-center gap-1.5 max-w-full"
                      title={link.url}
                    >
                      <span>🔗</span>
                      <span className="truncate">{link.label || link.url}</span>
                      <span className="text-[10px] text-sloth-muted">↗</span>
                    </a>
                    {link.label && (
                      <p className="text-xs text-sloth-muted truncate mt-0.5 ml-5">
                        {link.url}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <details className="group">
                      <summary className="inline-flex min-h-10 cursor-pointer list-none items-center rounded-xl border border-sloth-border px-4 text-xs font-semibold text-sloth-forest transition hover:bg-sloth-beige select-none">
                        Editar
                      </summary>
                      <form
                        action={updateAttachmentAction}
                        className="absolute right-0 left-0 sm:left-auto sm:right-6 mt-3 z-10 w-full sm:w-96 rounded-2xl border border-sloth-border bg-sloth-card p-5 shadow-lg grid gap-3"
                      >
                        <input name="taskId" type="hidden" value={taskId} />
                        <input name="attachmentId" type="hidden" value={link.id} />
                        
                        <div>
                          <label className="mb-1 block text-xs font-semibold text-sloth-muted" htmlFor={`url-edit-${link.id}`}>
                            Link (URL)
                          </label>
                          <input
                            className="min-h-10 w-full rounded-lg border border-sloth-border bg-sloth-card px-3 outline-none focus:border-sloth-moss text-xs font-medium"
                            defaultValue={link.url}
                            id={`url-edit-${link.id}`}
                            name="url"
                            required
                            type="text"
                          />
                        </div>

                        <div>
                          <label className="mb-1 block text-xs font-semibold text-sloth-muted" htmlFor={`label-edit-${link.id}`}>
                            Rótulo (opcional)
                          </label>
                          <input
                            className="min-h-10 w-full rounded-lg border border-sloth-border bg-sloth-card px-3 outline-none focus:border-sloth-moss text-xs"
                            defaultValue={link.label || ""}
                            id={`label-edit-${link.id}`}
                            name="label"
                            type="text"
                          />
                        </div>

                        <button
                          className="min-h-10 rounded-lg bg-sloth-moss text-xs font-bold text-white transition hover:bg-sloth-forest cursor-pointer mt-1"
                          type="submit"
                        >
                          Salvar Alterações
                        </button>
                      </form>
                    </details>

                    <form action={deleteAttachmentAction}>
                      <input name="taskId" type="hidden" value={taskId} />
                      <input name="attachmentId" type="hidden" value={link.id} />
                      <button
                        className="min-h-10 rounded-xl border border-sloth-terracotta/35 px-4 text-xs font-semibold text-sloth-terracotta transition hover:bg-sloth-terracotta/10 cursor-pointer"
                        type="submit"
                      >
                        Remover
                      </button>
                    </form>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <p className="rounded-2xl border border-dashed border-sloth-border px-5 py-6 text-center text-sloth-muted text-xs bg-sloth-cream/10">
            Nenhum link anexado.
          </p>
        )}
      </div>

      {/* Seção de Áudio */}
      <div className="mt-8 pt-6 border-t border-sloth-border/50">
        <h3 className="text-sm font-semibold text-sloth-ink border-b border-sloth-border/30 pb-1.5 mb-3">🎙️ Gravações de Áudio</h3>
        
        {audios.length > 0 ? (
          <ol className="grid gap-3">
            {audios.map((audio) => (
              <li
                className="rounded-2xl border border-sloth-border bg-sloth-card p-4"
                key={audio.id}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-sloth-ink truncate">
                      🎙️ {audio.label || "Gravação de Áudio"}
                    </p>
                    <p className="text-xs text-sloth-muted mt-0.5">
                      {audio.sizeBytes ? `${(audio.sizeBytes / 1024).toFixed(1)} KB · ` : ""}
                      {new Intl.DateTimeFormat("pt-BR", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                        timeZone: "America/Sao_Paulo",
                      }).format(new Date(audio.createdAt))}
                    </p>
                    <div className="mt-2.5">
                      <audio src={audio.url} controls className="w-full max-w-md" />
                    </div>
                  </div>

                  <form action={deleteAttachmentAction} className="self-start sm:self-center">
                    <input name="taskId" type="hidden" value={taskId} />
                    <input name="attachmentId" type="hidden" value={audio.id} />
                    <button
                      className="min-h-10 rounded-xl border border-sloth-terracotta/35 px-4 text-xs font-semibold text-sloth-terracotta transition hover:bg-sloth-terracotta/10 cursor-pointer"
                      type="submit"
                    >
                      Remover
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <p className="rounded-2xl border border-dashed border-sloth-border px-5 py-6 text-center text-sloth-muted text-xs bg-sloth-cream/10">
            Nenhuma gravação de áudio anexada.
          </p>
        )}

        {/* Gravador de Áudio */}
        <AudioRecorder taskId={taskId} />
      </div>
    </section>
  );
}
