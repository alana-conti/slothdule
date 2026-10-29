"use client";

import {
    useCallback,
    useEffect,
    useRef,
    useState,
    useTransition,
    type FormEvent,
} from "react";

import { useToast } from "@/components/sloth/toast";

import { QuickCapture } from "@/features/tasks/quick-capture";
import { TaskForm } from "@/features/tasks/task-form";
import {
    createTaskAction,
    listCategoriesAction,
} from "@/features/tasks/actions";
import type { Category } from "@/types/tasks";

function isTypingTarget(target: EventTarget | null) {
    if (!(target instanceof HTMLElement)) {
        return false;
    }

    return (
        target.isContentEditable ||
        ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)
    );
}

export function NewTaskDialog() {
    const dialogRef = useRef<HTMLDialogElement>(null);
    // Muda a cada abertura para o conteúdo começar sempre limpo.
    const [session, setSession] = useState(0);
    // As categorias só são buscadas quando o pop-up é usado (ou quando o botão
    // recebe hover/foco) e ficam em cache enquanto a página não for recarregada.
    const [categories, setCategories] = useState<Category[] | null>(null);
    const [loadFailed, setLoadFailed] = useState(false);
    const loadingRef = useRef(false);
    const { toast } = useToast();
    const [error, setError] = useState<string | null>(null);
    const [pending, startTransition] = useTransition();
    const errorRef = useRef<HTMLParagraphElement>(null);

    const loadCategories = useCallback(() => {
        if (categories || loadingRef.current) {
            return;
        }

        loadingRef.current = true;
        setLoadFailed(false);

        listCategoriesAction()
            .then(setCategories)
            .catch(() => setLoadFailed(true))
            .finally(() => {
                loadingRef.current = false;
            });
    }, [categories]);

    const openDialog = useCallback(() => {
        const dialog = dialogRef.current;

        if (!dialog || dialog.open) {
            return;
        }

        setSession((current) => current + 1);
        setError(null);
        dialog.showModal();
        loadCategories();
    }, [loadCategories]);

    const closeDialog = useCallback(() => {
        dialogRef.current?.close();
    }, []);

    // Controlamos o envio aqui (em vez de `action`) para não perder o que foi
    // digitado se der erro: o React limpa formulários ao fim de uma action.
    const handleSubmit = useCallback(
        (event: FormEvent<HTMLFormElement>) => {
            event.preventDefault();

            if (pending) {
                return;
            }

            const formData = new FormData(event.currentTarget);
            setError(null);

            startTransition(async () => {
                try {
                    const result = await createTaskAction(formData);

                    if (!result.ok) {
                        setError(result.error);
                        return;
                    }

                    closeDialog();
                    toast({
                        action: {
                            href: `/tasks/${result.taskId}`,
                            label: "Abrir tarefa",
                        },
                        description: `“${result.title}” entrou na sua lista. Uma coisa a menos para guardar na cabeça.`,
                        title: "Tarefa criada",
                    });
                } catch {
                    setError("Não foi possível criar a tarefa.");
                }
            });
        },
        [closeDialog, pending, toast],
    );

    useEffect(() => {
        errorRef.current?.scrollIntoView({ block: "nearest" });
    }, [error]);

    useEffect(() => {
        function handleKeyDown(event: KeyboardEvent) {
            if (
                event.key.toLowerCase() !== "n" ||
                event.repeat ||
                event.defaultPrevented ||
                event.metaKey ||
                event.ctrlKey ||
                event.altKey ||
                isTypingTarget(event.target) ||
                document.querySelector("dialog[open]")
            ) {
                return;
            }

            event.preventDefault();
            openDialog();
        }

        window.addEventListener("keydown", handleKeyDown);

        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [openDialog]);

    return (
        <>
            <button
                aria-keyshortcuts="N"
                aria-label="Nova tarefa"
                className="fixed right-5 bottom-5 z-40 inline-flex min-h-14 cursor-pointer items-center gap-2 rounded-full bg-sloth-moss px-5 text-sm font-semibold text-white shadow-soft transition hover:bg-sloth-forest focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sloth-forest sm:right-8 sm:bottom-8"
                onClick={openDialog}
                onFocus={loadCategories}
                onPointerEnter={loadCategories}
                type="button"
            >
                <span aria-hidden="true" className="text-2xl leading-none">
                    +
                </span>
                <span aria-hidden="true" className="hidden sm:inline">
                    Nova tarefa
                </span>
                <kbd
                    aria-hidden="true"
                    className="hidden rounded-md bg-white/20 px-1.5 py-0.5 font-sans text-xs sm:inline"
                >
                    N
                </kbd>
            </button>

            <dialog
                aria-labelledby="new-task-title"
                className="m-auto max-h-[90vh] w-[min(42rem,calc(100vw-2rem))] overflow-y-auto rounded-card border border-sloth-border bg-sloth-card text-sloth-ink shadow-soft backdrop:bg-sloth-ink/40"
                id="nova-tarefa"
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
                                Nova tarefa
                            </p>
                            <h2
                                className="mt-2 text-2xl font-semibold text-sloth-ink"
                                id="new-task-title"
                            >
                                O que precisa sair da cabeça?
                            </h2>
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
                        {loadFailed ? (
                            <div
                                className="rounded-2xl bg-sloth-terracotta/10 p-4 text-sm text-sloth-ink"
                                role="alert"
                            >
                                <p>Não foi possível carregar as categorias.</p>
                                <button
                                    className="mt-3 min-h-10 cursor-pointer rounded-xl border border-sloth-border bg-sloth-card px-4 text-sm font-medium text-sloth-forest transition hover:bg-sloth-beige"
                                    onClick={loadCategories}
                                    type="button"
                                >
                                    Tentar de novo
                                </button>
                            </div>
                        ) : categories === null ? (
                            <p
                                className="rounded-2xl bg-sloth-beige/50 p-4 text-sm text-sloth-muted"
                                role="status"
                            >
                                Carregando categorias…
                            </p>
                        ) : categories.length > 0 ? (
                            <>
                                {error ? (
                                    <p
                                        className="mb-4 rounded-2xl border border-sloth-terracotta/30 bg-sloth-terracotta/10 px-4 py-3 text-sm text-sloth-ink"
                                        ref={errorRef}
                                        role="alert"
                                    >
                                        {error}
                                    </p>
                                ) : null}
                                <QuickCapture
                                    categories={categories}
                                    onSubmit={handleSubmit}
                                />
                                <div className="relative flex items-center py-4">
                                    <div className="flex-grow border-t border-sloth-border/40"></div>
                                    <span className="mx-4 flex-shrink bg-sloth-card px-2 text-xs font-medium text-sloth-muted">
                                        ou use o formulário detalhado
                                    </span>
                                    <div className="flex-grow border-t border-sloth-border/40"></div>
                                </div>
                                <TaskForm
                                    categories={categories}
                                    onSubmit={handleSubmit}
                                    submitLabel="Criar tarefa"
                                />
                            </>
                        ) : (
                            <p className="rounded-2xl bg-sloth-beige/50 p-4 text-sloth-muted">
                                Nenhuma categoria disponível. Execute o seed do
                                Supabase antes de criar tarefas.
                            </p>
                        )}
                    </div>
                </div>
            </dialog>
        </>
    );
}
