"use client";

import { TimerIcon } from "./focus-panel";
import { focusOnTask, openFocusPanel, useFocusState, useNow } from "./focus-store";
import { formatClock, getRemainingMs } from "./pomodoro";
import type { FocusTask } from "./pomodoro";

/**
 * "Focar" de uma tarefa em andamento: liga a tarefa ao Modo foco (começando
 * uma sessão, se não houver). Quando ela já é a tarefa em foco, mostra o
 * relógio e abre o painel.
 */
export function FocusTaskButton({ task }: { task: FocusTask }) {
    const { session } = useFocusState();
    const isCurrent = session?.task?.id === task.id;
    const now = useNow(isCurrent && session?.status === "running");

    if (isCurrent && session) {
        const clock = formatClock(getRemainingMs(session, now));

        return (
            <button
                aria-label={`Em foco, ${clock}. Abrir modo foco`}
                className="inline-flex min-h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-full border border-sloth-moss/40 bg-sloth-moss px-3 text-xs font-semibold text-white tabular-nums transition hover:bg-sloth-forest"
                onClick={openFocusPanel}
                type="button"
            >
                <TimerIcon className="size-4" />
                {clock}
            </button>
        );
    }

    return (
        <button
            aria-label="Focar nesta tarefa"
            className="inline-flex min-h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-full border border-sloth-moss/40 bg-sloth-card px-3 text-xs font-semibold text-sloth-forest transition hover:bg-sloth-moss/10"
            onClick={() => {
                focusOnTask(task);
                openFocusPanel();
            }}
            title={session ? "Trocar a tarefa do foco atual" : "Começar um bloco de foco"}
            type="button"
        >
            <TimerIcon className="size-4" />
            Focar
        </button>
    );
}
