"use client";

import { useCallback, useEffect, useRef, useState, useTransition, type FormEvent } from "react";

import { useToast } from "@/components/sloth/toast";
import { createHabitAction } from "@/features/habits/actions";
import { OPEN_NEW_HABIT_EVENT, type OpenNewHabitDetail } from "@/features/habits/new-habit-events";
import { NewHabitForm } from "@/features/habits/new-habit-form";

/** Pop-up de novo hábito, no mesmo molde do pop-up de nova tarefa. */
export function NewHabitDialog() {
    const dialogRef = useRef<HTMLDialogElement>(null);
    // Muda a cada abertura para o formulário começar sempre limpo.
    const [session, setSession] = useState(0);
    const [inFormation, setInFormation] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [pending, startTransition] = useTransition();
    const errorRef = useRef<HTMLParagraphElement>(null);
    const { toast } = useToast();

    const closeDialog = useCallback(() => {
        dialogRef.current?.close();
    }, []);

    useEffect(() => {
        function open(event: Event) {
            const dialog = dialogRef.current;

            if (!dialog || dialog.open) {
                return;
            }

            const detail = (event as CustomEvent<OpenNewHabitDetail>).detail;
            setInFormation(detail?.inFormation ?? 0);
            setSession((current) => current + 1);
            setError(null);
            dialog.showModal();
        }

        window.addEventListener(OPEN_NEW_HABIT_EVENT, open);

        return () => window.removeEventListener(OPEN_NEW_HABIT_EVENT, open);
    }, []);

    useEffect(() => {
        errorRef.current?.scrollIntoView({ block: "nearest" });
    }, [error]);

    // Envio controlado (em vez de `action`) para não perder o que foi
    // preenchido se der erro: o React limpa formulários ao fim de uma action.
    function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (pending) {
            return;
        }

        const formData = new FormData(event.currentTarget);
        setError(null);

        startTransition(async () => {
            try {
                const result = await createHabitAction(formData);

                if (!result.ok) {
                    setError(result.error);
                    return;
                }

                closeDialog();
                toast({
                    action: { href: `/routine/habits/${result.habitId}`, label: "Ver planta" },
                    description: `“${result.title}” foi plantado. Um cuidado de cada vez.`,
                    title: "Hábito plantado",
                });
            } catch {
                setError("Não foi possível plantar o hábito.");
            }
        });
    }

    return (
        <dialog
            aria-labelledby="new-habit-title"
            className="m-auto max-h-[90vh] w-[min(40rem,calc(100vw-2rem))] overflow-y-auto rounded-card border border-sloth-border bg-sloth-card text-sloth-ink shadow-soft backdrop:bg-sloth-ink/40"
            id="novo-habito"
            onClick={(event) => {
                // Clique no fundo escurecido (o próprio <dialog>) fecha.
                if (event.target === event.currentTarget) {
                    closeDialog();
                }
            }}
            ref={dialogRef}
        >
            <div aria-busy={pending} className="p-6 sm:p-8" key={session}>
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <p className="text-xs font-semibold tracking-[0.18em] text-sloth-moss uppercase">
                            Novo hábito
                        </p>
                        <h2 className="mt-2 text-2xl font-semibold text-sloth-ink" id="new-habit-title">
                            Plantar um hábito
                        </h2>
                        <p className="mt-1 text-sm text-sloth-muted">
                            Todo hábito começa como broto e cresce com os dias cuidados.
                        </p>
                    </div>
                    <button
                        aria-label="Fechar"
                        className="-mt-1 -mr-2 inline-flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-xl text-xl text-sloth-muted transition hover:bg-sloth-beige"
                        onClick={closeDialog}
                        type="button"
                    >
                        <span aria-hidden="true">×</span>
                    </button>
                </div>

                <div className="mt-6 border-t border-sloth-border pt-6">
                    {error ? (
                        <p
                            className="mb-4 rounded-2xl border border-sloth-terracotta/30 bg-sloth-terracotta/10 px-4 py-3 text-sm text-sloth-ink"
                            ref={errorRef}
                            role="alert"
                        >
                            {error}
                        </p>
                    ) : null}
                    <NewHabitForm inFormation={inFormation} onSubmit={handleSubmit} pending={pending} />
                </div>
            </div>
        </dialog>
    );
}
