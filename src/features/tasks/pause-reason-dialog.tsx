"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { FormEvent } from "react";

type PauseReasonDialogProps = {
    taskTitle: string;
    /** Enter ou "Pausar": o motivo vem aparado e pode ser vazio. */
    onConfirm: (reason: string) => void;
    /** Esc, clique fora ou "Cancelar": a tarefa continua em andamento. */
    onCancel: () => void;
};

export const PAUSE_REASON_MAX_LENGTH = 500;

/**
 * Pop-up para dizer, se quiser, por que a tarefa foi pausada (ex.: "esperando
 * o retorno da Ana"). Montado só quando aberto; Enter confirma, com ou sem texto.
 */
export function PauseReasonDialog({
    taskTitle,
    onConfirm,
    onCancel,
}: PauseReasonDialogProps) {
    const dialogRef = useRef<HTMLDialogElement>(null);
    const titleId = useId();
    const hintId = useId();
    const [reason, setReason] = useState("");

    useEffect(() => {
        const dialog = dialogRef.current;

        if (dialog && !dialog.open) {
            dialog.showModal();
        }
    }, []);

    function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        onConfirm(reason.trim());
    }

    return (
        <dialog
            aria-labelledby={titleId}
            className="m-auto w-[min(28rem,calc(100vw-2rem))] rounded-card border border-sloth-border bg-sloth-card p-0 text-sloth-ink shadow-soft backdrop:bg-sloth-ink/40"
            // Esc dispara "cancel": tratamos nós mesmos para não deixar o
            // <dialog> fechar sozinho com o estado ainda aberto.
            onCancel={(event) => {
                event.preventDefault();
                onCancel();
            }}
            onClick={(event) => {
                // Clique no fundo escurecido (o próprio <dialog>) cancela.
                if (event.target === event.currentTarget) {
                    onCancel();
                }
            }}
            ref={dialogRef}
        >
            <form className="p-6" onSubmit={handleSubmit}>
                <p className="text-xs font-semibold tracking-[0.18em] text-sloth-moss uppercase">
                    Pausar tarefa
                </p>
                <h2
                    className="mt-2 text-xl font-semibold text-sloth-ink"
                    id={titleId}
                >
                    Quer deixar um recado?
                </h2>
                <p className="mt-1 line-clamp-2 text-sm text-sloth-muted">
                    “{taskTitle}”
                </p>

                <label
                    className="mt-5 mb-2 block text-sm font-medium"
                    htmlFor={`${titleId}-reason`}
                >
                    Motivo da pausa (opcional)
                </label>
                <input
                    aria-describedby={hintId}
                    autoComplete="off"
                    autoFocus
                    className="min-h-11 w-full rounded-2xl border border-sloth-border bg-sloth-card px-4 outline-none focus:border-sloth-moss focus:ring-3 focus:ring-sloth-moss/15"
                    id={`${titleId}-reason`}
                    maxLength={PAUSE_REASON_MAX_LENGTH}
                    onChange={(event) => setReason(event.target.value)}
                    placeholder="Ex.: esperando o retorno da Ana"
                    type="text"
                    value={reason}
                />
                <p className="mt-2 text-xs text-sloth-muted" id={hintId}>
                    Útil para lembrar de quem ou do quê você depende. Enter
                    pausa, com ou sem recado.
                </p>

                <div className="mt-6 flex flex-wrap justify-end gap-2">
                    <button
                        className="min-h-10 cursor-pointer rounded-xl border border-sloth-border bg-sloth-card px-4 text-sm font-medium text-sloth-muted transition hover:bg-sloth-beige"
                        onClick={onCancel}
                        type="button"
                    >
                        Cancelar
                    </button>
                    <button
                        className="min-h-10 cursor-pointer rounded-xl bg-sloth-moss px-5 text-sm font-semibold text-white transition hover:bg-sloth-forest"
                        type="submit"
                    >
                        Pausar
                    </button>
                </div>
            </form>
        </dialog>
    );
}
