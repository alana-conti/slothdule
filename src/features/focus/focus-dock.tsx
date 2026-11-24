"use client";

import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

import { FocusPanelContent, TimerIcon } from "./focus-panel";
import {
    OPEN_FOCUS_PANEL_EVENT,
    pauseFocus,
    resumeFocus,
    useFocusState,
    useNow,
} from "./focus-store";
import { PHASE_LABELS, formatClock, getRemainingMs } from "./pomodoro";

function useOpenFocusPanelEvent(onOpen: () => void) {
    useEffect(() => {
        window.addEventListener(OPEN_FOCUS_PANEL_EVENT, onOpen);

        return () => window.removeEventListener(OPEN_FOCUS_PANEL_EVENT, onOpen);
    }, [onOpen]);
}

/**
 * Cartão do Modo foco no menu lateral (desktop). Sem sessão, fica recolhido
 * num botão; com sessão, mostra o relógio o tempo todo, em qualquer tela.
 */
export function FocusSidebarCard() {
    const { session } = useFocusState();
    const [expanded, setExpanded] = useState(false);
    const panelId = useId();
    const open = expanded || session !== null;

    useOpenFocusPanelEvent(() => setExpanded(true));

    return (
        <section
            aria-label="Modo foco"
            className={`rounded-2xl border p-3 ${
                session
                    ? "border-sloth-moss/30 bg-sloth-moss/5"
                    : "border-sloth-border bg-sloth-card/60"
            }`}
        >
            {session ? (
                <p className="mb-2 flex items-center gap-2 px-1 text-xs font-semibold tracking-[0.14em] text-sloth-muted/80 uppercase">
                    <TimerIcon className="size-4" />
                    Modo foco
                </p>
            ) : (
                <button
                    aria-controls={panelId}
                    aria-expanded={open}
                    className="flex w-full cursor-pointer items-center gap-2 rounded-xl px-1 text-left text-sm font-semibold text-sloth-forest focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sloth-forest"
                    onClick={() => setExpanded((current) => !current)}
                    type="button"
                >
                    <span className="text-sloth-moss">
                        <TimerIcon />
                    </span>
                    Modo foco
                    <span
                        aria-hidden="true"
                        className={`ml-auto text-[10px] text-sloth-muted transition-transform ${
                            open ? "rotate-180" : ""
                        }`}
                    >
                        ▼
                    </span>
                </button>
            )}

            {open ? (
                <div className={session ? "" : "mt-3"} id={panelId}>
                    <FocusPanelContent />
                </div>
            ) : null}
        </section>
    );
}

/** Pílula do celular: fase, relógio e pausar/retomar sem abrir nada. */
function FocusPill({ onOpen, open }: { onOpen: () => void; open: boolean }) {
    const { session } = useFocusState();
    const now = useNow(session?.status === "running");

    if (!session) {
        return null;
    }

    const clock = formatClock(getRemainingMs(session, now));
    const label =
        session.status === "ready"
            ? "Próximo foco"
            : session.status === "paused"
              ? "Pausado"
              : PHASE_LABELS[session.phase];

    return (
        <div className="mb-2 ml-auto flex w-fit max-w-full items-center gap-1 rounded-full border border-sloth-moss/30 bg-sloth-card/95 p-1 shadow-soft backdrop-blur-sm">
            <button
                aria-controls="folha-foco"
                aria-expanded={open}
                aria-label={`Modo foco: ${label}, ${clock}`}
                className="flex min-h-10 min-w-0 cursor-pointer items-center gap-2 rounded-full pr-2 pl-3 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sloth-forest"
                onClick={onOpen}
                type="button"
            >
                <span className={session.phase === "focus" ? "text-sloth-moss" : "text-sloth-gold"}>
                    <TimerIcon className="size-4" />
                </span>
                <span className="font-semibold text-sloth-ink tabular-nums">{clock}</span>
                <span className="truncate text-sloth-muted">
                    {label}
                    {session.task ? ` · ${session.task.title}` : ""}
                </span>
            </button>
            {session.status === "running" ? (
                <button
                    aria-label="Pausar foco"
                    className="inline-flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full bg-sloth-moss/10 text-[11px] text-sloth-forest transition hover:bg-sloth-moss/20"
                    onClick={pauseFocus}
                    type="button"
                >
                    <span aria-hidden="true">❚❚</span>
                </button>
            ) : (
                <button
                    aria-label={session.status === "ready" ? "Voltar ao foco" : "Retomar foco"}
                    className="inline-flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full bg-sloth-moss text-xs text-white transition hover:bg-sloth-forest"
                    onClick={resumeFocus}
                    type="button"
                >
                    <span aria-hidden="true">▶</span>
                </button>
            )}
        </div>
    );
}

/**
 * Modo foco no celular: a pílula acima da barra de navegação enquanto há
 * sessão, e uma folha com o painel inteiro (aberta pela pílula, pelo menu
 * "Mais" ou pelo botão Focar de uma tarefa).
 */
export function FocusMobileDock() {
    const pathname = usePathname();
    // Como o menu "Mais": a folha fecha sozinha ao trocar de tela.
    const [openFor, setOpenFor] = useState<string | null>(null);
    const open = openFor === pathname;
    const ref = useRef<HTMLDivElement>(null);

    useOpenFocusPanelEvent(() => setOpenFor(pathname));

    useEffect(() => {
        if (!open) {
            return;
        }

        function handlePointerDown(event: PointerEvent) {
            if (!ref.current?.contains(event.target as Node)) {
                setOpenFor(null);
            }
        }

        function handleKeyDown(event: KeyboardEvent) {
            if (event.key === "Escape") {
                setOpenFor(null);
            }
        }

        document.addEventListener("pointerdown", handlePointerDown);
        document.addEventListener("keydown", handleKeyDown);

        return () => {
            document.removeEventListener("pointerdown", handlePointerDown);
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [open]);

    return (
        <div ref={ref}>
            {open ? (
                <section
                    aria-label="Modo foco"
                    className="animate-menu-in mb-2 ml-auto w-full max-w-sm rounded-2xl border border-sloth-border bg-sloth-card p-4 shadow-soft"
                    id="folha-foco"
                >
                    <div className="mb-3 flex items-center justify-between gap-2">
                        <p className="flex items-center gap-2 text-xs font-semibold tracking-[0.14em] text-sloth-muted/80 uppercase">
                            <TimerIcon className="size-4" />
                            Modo foco
                        </p>
                        <button
                            aria-label="Fechar modo foco"
                            className="inline-flex size-8 cursor-pointer items-center justify-center rounded-full text-sm text-sloth-muted transition hover:bg-sloth-beige"
                            onClick={() => setOpenFor(null)}
                            type="button"
                        >
                            ✕
                        </button>
                    </div>
                    <FocusPanelContent />
                </section>
            ) : null}
            <FocusPill
                onOpen={() => setOpenFor(open ? null : pathname)}
                open={open}
            />
        </div>
    );
}
