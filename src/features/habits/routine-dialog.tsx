"use client";

import { useCallback, useEffect, useRef, useState, useTransition, type FormEvent } from "react";

import { useToast } from "@/components/sloth/toast";
import { deleteRoutineAction, saveRoutineAction } from "@/features/habits/actions";
import { PlantBadge } from "@/features/habits/plant-icon";
import {
    OPEN_ROUTINE_DIALOG_EVENT,
    type OpenRoutineDialogDetail,
    type RoutineHabitOption,
} from "@/features/habits/routine-events";
import { ROUTINE_BONUS } from "@/lib/habits";
import type { Routine } from "@/types/habits";

const MAX_STEPS = 12;

const inputClass =
    "mt-2 w-full rounded-2xl border border-sloth-border bg-white/70 px-4 py-3 text-sm text-sloth-ink outline-none transition focus:border-sloth-moss focus:ring-2 focus:ring-sloth-moss/15";

const iconButtonClass =
    "inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-lg text-sloth-muted transition hover:bg-sloth-beige hover:text-sloth-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sloth-forest disabled:cursor-default disabled:opacity-35 disabled:hover:bg-transparent";

type RoutineFormProps = {
    habits: RoutineHabitOption[];
    routines: Routine[];
    routine?: Routine;
    pending: boolean;
    onSubmit: (event: FormEvent<HTMLFormElement>) => void;
    onDelete: () => void;
};

function RoutineForm({ habits, onDelete, onSubmit, pending, routine, routines }: RoutineFormProps) {
    const [steps, setSteps] = useState<string[]>(routine?.habitIds ?? []);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const byId = new Map(habits.map((habit) => [habit.id, habit]));
    const routineName = new Map(routines.map((item) => [item.id, item.name]));
    const available = habits.filter((habit) => !steps.includes(habit.id));
    const full = steps.length >= MAX_STEPS;

    function move(index: number, delta: number) {
        setSteps((current) => {
            const next = [...current];
            const [item] = next.splice(index, 1);
            next.splice(index + delta, 0, item);
            return next;
        });
    }

    return (
        <form className="grid grid-cols-1 gap-6" onSubmit={onSubmit}>
            {routine ? <input name="routineId" type="hidden" value={routine.id} /> : null}

            <label className="block text-sm font-medium text-sloth-ink">
                Nome da rotina
                <input
                    autoComplete="off"
                    autoFocus
                    className={inputClass}
                    defaultValue={routine?.name}
                    maxLength={80}
                    name="name"
                    placeholder="Ex.: Rotina da manhã"
                    required
                />
            </label>

            <label className="block text-sm font-medium text-sloth-ink">
                Começa depois de quê? <span className="font-normal text-sloth-muted">(opcional)</span>
                <input
                    autoComplete="off"
                    className={inputClass}
                    defaultValue={routine?.anchor ?? ""}
                    maxLength={80}
                    name="anchor"
                    placeholder="Ex.: Depois de acordar"
                />
            </label>

            <fieldset>
                <legend className="text-sm font-medium text-sloth-ink">Passos, em ordem</legend>
                <p className="mt-1 text-[13px] leading-relaxed text-sloth-muted">
                    Um hábito puxa o outro. Cada passo continua sendo uma planta própria.
                </p>

                {steps.length > 0 ? (
                    <ol aria-label="Passos da rotina" className="mt-3 grid grid-cols-1 gap-1.5">
                        {steps.map((id, index) => {
                            const habit = byId.get(id);

                            if (!habit) {
                                return null;
                            }

                            return (
                                <li
                                    className="flex items-center gap-1 rounded-2xl border border-sloth-moss/25 bg-sloth-moss/5 py-1.5 pr-1 pl-2 sm:gap-2 sm:pl-3"
                                    key={id}
                                >
                                    <input name="habitIds" type="hidden" value={id} />
                                    <span className="w-5 shrink-0 text-center text-sm font-semibold text-sloth-moss">
                                        {index + 1}
                                    </span>
                                    {/* No celular, o espaço fica para o nome do passo. */}
                                    <span className="hidden sm:contents">
                                        <PlantBadge stage={habit.stage} />
                                    </span>
                                    <span className="ml-1 min-w-0 flex-1 truncate text-sm font-medium text-sloth-ink sm:ml-0">
                                        {habit.title}
                                    </span>
                                    <button
                                        aria-label={`Subir “${habit.title}”`}
                                        className={iconButtonClass}
                                        disabled={index === 0}
                                        onClick={() => move(index, -1)}
                                        type="button"
                                    >
                                        <svg aria-hidden="true" className="size-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
                                            <path d="m18 15-6-6-6 6" />
                                        </svg>
                                    </button>
                                    <button
                                        aria-label={`Descer “${habit.title}”`}
                                        className={iconButtonClass}
                                        disabled={index === steps.length - 1}
                                        onClick={() => move(index, 1)}
                                        type="button"
                                    >
                                        <svg aria-hidden="true" className="size-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
                                            <path d="m6 9 6 6 6-6" />
                                        </svg>
                                    </button>
                                    <button
                                        aria-label={`Tirar “${habit.title}” da rotina`}
                                        className={iconButtonClass}
                                        onClick={() => setSteps((current) => current.filter((value) => value !== id))}
                                        type="button"
                                    >
                                        <svg aria-hidden="true" className="size-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2" viewBox="0 0 24 24">
                                            <path d="M6 6l12 12M18 6 6 18" />
                                        </svg>
                                    </button>
                                </li>
                            );
                        })}
                    </ol>
                ) : (
                    <p className="mt-3 rounded-2xl border border-dashed border-sloth-border px-4 py-4 text-center text-sm text-sloth-muted">
                        Escolha abaixo o primeiro passo.
                    </p>
                )}

                {habits.length === 0 ? (
                    <p className="mt-3 text-sm text-sloth-muted">
                        Plante um hábito primeiro: a rotina encadeia hábitos que você já tem.
                    </p>
                ) : available.length > 0 ? (
                    <div className="mt-4">
                        <p className="text-[13px] font-medium text-sloth-muted">
                            {full ? `Uma rotina tem no máximo ${MAX_STEPS} passos.` : "Adicionar passo"}
                        </p>
                        <ul className="mt-2 flex flex-wrap gap-2">
                            {available.map((habit) => {
                                const elsewhere =
                                    habit.routineId && habit.routineId !== routine?.id
                                        ? routineName.get(habit.routineId)
                                        : undefined;

                                return (
                                    <li key={habit.id}>
                                        <button
                                            className="inline-flex min-h-10 cursor-pointer items-center gap-1.5 rounded-full border text-left border-sloth-border bg-sloth-card px-3.5 text-sm text-sloth-ink transition hover:border-sloth-moss hover:bg-sloth-moss/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sloth-forest disabled:cursor-default disabled:opacity-50"
                                            disabled={full}
                                            onClick={() => setSteps((current) => [...current, habit.id])}
                                            title={elsewhere ? `Sai da ${elsewhere} e entra nesta` : undefined}
                                            type="button"
                                        >
                                            <span aria-hidden="true" className="text-sloth-moss">+</span>
                                            {habit.title}
                                            {elsewhere ? (
                                                <span className="text-xs text-sloth-muted">· em {elsewhere}</span>
                                            ) : null}
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                ) : null}
            </fieldset>

            <p className="rounded-2xl border border-sloth-gold/35 bg-sloth-gold/10 p-4 text-sm leading-relaxed text-sloth-ink">
                Quando todas as rotinas do dia fecham, você ganha +{ROUTINE_BONUS} Folhinhas de bônus,
                além do teto diário. Um passo de folga não fecha a rotina, e tudo bem.
            </p>

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
                {routine ? (
                    confirmDelete ? (
                        <div className="flex flex-wrap items-center gap-2 text-sm text-sloth-ink">
                            <span>Apagar a rotina? Os hábitos continuam, soltos.</span>
                            <button
                                className="min-h-10 cursor-pointer rounded-xl bg-sloth-terracotta/15 px-3 font-semibold text-sloth-ink transition hover:bg-sloth-terracotta/25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sloth-forest disabled:opacity-60"
                                disabled={pending}
                                onClick={onDelete}
                                type="button"
                            >
                                Apagar
                            </button>
                            <button
                                className="min-h-10 cursor-pointer rounded-xl px-3 text-sloth-muted transition hover:bg-sloth-beige focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sloth-forest"
                                onClick={() => setConfirmDelete(false)}
                                type="button"
                            >
                                Manter
                            </button>
                        </div>
                    ) : (
                        <button
                            className="min-h-11 cursor-pointer self-start rounded-xl px-3 text-sm text-sloth-muted transition hover:bg-sloth-beige hover:text-sloth-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sloth-forest"
                            onClick={() => setConfirmDelete(true)}
                            type="button"
                        >
                            Apagar rotina
                        </button>
                    )
                ) : (
                    <span />
                )}
                <button
                    className="flex min-h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-sloth-moss px-5 text-base font-semibold text-white transition hover:bg-sloth-forest focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sloth-forest disabled:opacity-60 sm:w-auto"
                    disabled={pending || steps.length === 0}
                    type="submit"
                >
                    {pending ? "Salvando…" : routine ? "Salvar rotina" : "Criar rotina"}
                </button>
            </div>
        </form>
    );
}

/** Pop-up de nova rotina (ou editar), no mesmo molde do de novo hábito. */
export function RoutineDialog() {
    const dialogRef = useRef<HTMLDialogElement>(null);
    const [session, setSession] = useState(0);
    const [detail, setDetail] = useState<OpenRoutineDialogDetail>({ habits: [], routines: [] });
    const [error, setError] = useState<string | null>(null);
    const [pending, startTransition] = useTransition();
    const errorRef = useRef<HTMLParagraphElement>(null);
    const { toast } = useToast();
    const editing = detail.routine;

    const closeDialog = useCallback(() => {
        dialogRef.current?.close();
    }, []);

    useEffect(() => {
        function open(event: Event) {
            const dialog = dialogRef.current;

            if (!dialog || dialog.open) {
                return;
            }

            setDetail((event as CustomEvent<OpenRoutineDialogDetail>).detail);
            setSession((current) => current + 1);
            setError(null);
            dialog.showModal();
        }

        window.addEventListener(OPEN_ROUTINE_DIALOG_EVENT, open);

        return () => window.removeEventListener(OPEN_ROUTINE_DIALOG_EVENT, open);
    }, []);

    useEffect(() => {
        errorRef.current?.scrollIntoView({ block: "nearest" });
    }, [error]);

    function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (pending) {
            return;
        }

        const formData = new FormData(event.currentTarget);
        setError(null);

        startTransition(async () => {
            const result = await saveRoutineAction(formData).catch(() => null);

            if (!result || !result.ok) {
                setError(result?.error ?? "Não foi possível salvar a rotina.");
                return;
            }

            closeDialog();
            toast({
                description: editing
                    ? `“${result.name}” foi atualizada.`
                    : `“${result.name}” está pronta. Um passo puxa o outro.`,
                title: editing ? "Rotina salva" : "Rotina criada",
            });
        });
    }

    function handleDelete() {
        if (!editing || pending) {
            return;
        }

        startTransition(async () => {
            const result = await deleteRoutineAction(editing.id).catch(() => null);

            if (!result || !result.ok) {
                setError(result && !result.ok ? result.error : "Não foi possível apagar a rotina.");
                return;
            }

            closeDialog();
            toast({
                description: "Os hábitos continuam no jardim, agora soltos.",
                title: "Rotina apagada",
            });
        });
    }

    return (
        <dialog
            aria-labelledby="rotina-dialogo-titulo"
            className="m-auto max-h-[90vh] w-[min(40rem,calc(100vw-2rem))] overflow-y-auto rounded-card border border-sloth-border bg-sloth-card text-sloth-ink shadow-soft backdrop:bg-sloth-ink/40"
            id="rotina-dialogo"
            onClick={(event) => {
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
                            {editing ? "Editar rotina" : "Nova rotina"}
                        </p>
                        <h2 className="mt-2 text-2xl font-semibold text-sloth-ink" id="rotina-dialogo-titulo">
                            {editing ? editing.name : "Encadear hábitos"}
                        </h2>
                        <p className="mt-1 text-sm text-sloth-muted">
                            Uma sequência curta, sempre na mesma ordem, fica mais fácil de lembrar.
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
                    <RoutineForm
                        habits={detail.habits}
                        onDelete={handleDelete}
                        onSubmit={handleSubmit}
                        pending={pending}
                        routine={detail.routine}
                        routines={detail.routines}
                    />
                </div>
            </div>
        </dialog>
    );
}
