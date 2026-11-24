"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { FocusPanelContent, TimerIcon } from "./focus-panel";
import type { FocusTone } from "./focus-panel";
import {
    OPEN_FOCUS_PANEL_EVENT,
    TOGGLE_FOCUS_PANEL_EVENT,
    pauseFocus,
    resumeFocus,
    useFocusState,
    useNow,
} from "./focus-store";
import { PHASE_LABELS, formatClock, getRemainingMs } from "./pomodoro";
import type { FocusSession } from "./pomodoro";

/**
 * Abre e fecha o painel: pelos eventos (botão Focar, menu Mais, tecla F), por
 * Esc e por clique fora. Como o menu "Mais", fecha sozinho ao trocar de tela.
 */
function useFocusPanel(
    rootRef: React.RefObject<HTMLDivElement | null>,
    panelRef: React.RefObject<HTMLElement | null>,
) {
    const pathname = usePathname();
    const [openFor, setOpenFor] = useState<string | null>(null);
    const open = openFor === pathname;
    // Pela tecla F, o foco do teclado vai para o painel; por clique, fica onde está.
    const focusPanelOnOpen = useRef(false);

    useEffect(() => {
        function handleOpen() {
            setOpenFor(pathname);
        }

        function handleToggle() {
            focusPanelOnOpen.current = true;
            setOpenFor((current) => (current === pathname ? null : pathname));
        }

        window.addEventListener(OPEN_FOCUS_PANEL_EVENT, handleOpen);
        window.addEventListener(TOGGLE_FOCUS_PANEL_EVENT, handleToggle);

        return () => {
            window.removeEventListener(OPEN_FOCUS_PANEL_EVENT, handleOpen);
            window.removeEventListener(TOGGLE_FOCUS_PANEL_EVENT, handleToggle);
        };
    }, [pathname]);

    useEffect(() => {
        if (!open) {
            return;
        }

        if (focusPanelOnOpen.current) {
            focusPanelOnOpen.current = false;
            panelRef.current?.focus();
        }

        function handlePointerDown(event: PointerEvent) {
            if (!rootRef.current?.contains(event.target as Node)) {
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
    }, [open, panelRef, rootRef]);

    return {
        close: () => setOpenFor(null),
        open,
        toggle: () => setOpenFor(open ? null : pathname),
    };
}

const PANEL_TONES: Record<FocusTone, { panel: string; title: string; close: string }> = {
    dark: {
        close: "text-white/70 hover:bg-white/15 hover:text-white",
        panel: "w-80 border-sloth-forest bg-sloth-forest text-white",
        title: "text-white/75",
    },
    light: {
        close: "text-sloth-muted hover:bg-sloth-beige",
        panel: "w-full max-w-sm border-sloth-border bg-sloth-card",
        title: "text-sloth-muted/80",
    },
};

function FocusPanel({
    id,
    onClose,
    panelRef,
    tone,
}: {
    id: string;
    onClose: () => void;
    panelRef: React.RefObject<HTMLElement | null>;
    tone: FocusTone;
}) {
    const classes = PANEL_TONES[tone];

    return (
        <section
            aria-label="Modo foco"
            className={`animate-menu-in mb-2 ml-auto rounded-2xl border p-4 shadow-soft outline-none ${classes.panel}`}
            id={id}
            ref={panelRef}
            tabIndex={-1}
        >
            <div className="mb-3 flex items-center justify-between gap-2">
                <p
                    className={`flex items-center gap-2 text-xs font-semibold tracking-[0.14em] uppercase ${classes.title}`}
                >
                    <TimerIcon className="size-4" />
                    Modo foco
                </p>
                <button
                    aria-label="Fechar modo foco"
                    className={`inline-flex size-8 cursor-pointer items-center justify-center rounded-full text-sm transition ${classes.close}`}
                    onClick={onClose}
                    type="button"
                >
                    ✕
                </button>
            </div>
            <FocusPanelContent tone={tone} />
        </section>
    );
}

function pillLabel(session: FocusSession) {
    if (session.status === "ready") {
        return "Próximo foco";
    }

    return session.status === "paused" ? "Pausado" : PHASE_LABELS[session.phase];
}

const PILL_TONES: Record<
    FocusTone,
    { frame: string; clock: string; detail: string; pause: string; resume: string; icon: (session: FocusSession) => string }
> = {
    dark: {
        clock: "text-white",
        detail: "text-white/75",
        frame: "border-sloth-forest bg-sloth-forest text-white",
        icon: (session) => (session.phase === "focus" ? "text-sloth-cream" : "text-sloth-gold"),
        pause: "bg-white/15 text-white hover:bg-white/25",
        resume: "bg-sloth-cream text-sloth-forest hover:bg-white",
    },
    light: {
        clock: "text-sloth-ink",
        detail: "text-sloth-muted",
        frame: "border-sloth-moss/30 bg-sloth-card/95 backdrop-blur-sm",
        icon: (session) => (session.phase === "focus" ? "text-sloth-moss" : "text-sloth-gold"),
        pause: "bg-sloth-moss/10 text-sloth-forest hover:bg-sloth-moss/20",
        resume: "bg-sloth-moss text-white hover:bg-sloth-forest",
    },
};

/** Pílula com sessão: fase, relógio e pausar/retomar sem abrir nada. */
function SessionPill({
    controls,
    onOpen,
    open,
    session,
    tone,
}: {
    controls: string;
    onOpen: () => void;
    open: boolean;
    session: FocusSession;
    tone: FocusTone;
}) {
    const now = useNow(session.status === "running");
    const classes = PILL_TONES[tone];
    const clock = formatClock(getRemainingMs(session, now));
    const label = pillLabel(session);

    return (
        <div
            className={`ml-auto flex w-fit max-w-full items-center gap-1 rounded-full border p-1 shadow-soft ${classes.frame}`}
        >
            <button
                aria-controls={controls}
                aria-expanded={open}
                aria-keyshortcuts="F"
                aria-label={`Modo foco: ${label}, ${clock}`}
                className="flex min-h-10 min-w-0 cursor-pointer items-center gap-2 rounded-full pr-2 pl-3 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sloth-forest"
                onClick={onOpen}
                type="button"
            >
                <span className={classes.icon(session)}>
                    <TimerIcon className="size-4" />
                </span>
                <span className={`font-semibold tabular-nums ${classes.clock}`}>{clock}</span>
                <span className={`max-w-56 truncate ${classes.detail}`}>
                    {label}
                    {session.task ? ` · ${session.task.title}` : ""}
                </span>
            </button>
            {session.status === "running" ? (
                <button
                    aria-label="Pausar foco"
                    className={`inline-flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full text-[11px] transition ${classes.pause}`}
                    onClick={pauseFocus}
                    type="button"
                >
                    <span aria-hidden="true">❚❚</span>
                </button>
            ) : (
                <button
                    aria-label={session.status === "ready" ? "Voltar ao foco" : "Retomar foco"}
                    className={`inline-flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full text-xs transition ${classes.resume}`}
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
 * Modo foco no desktop: fixo no canto inferior direito, em verde-floresta, em
 * todas as telas. Sem sessão é um botão discreto; com sessão, a pílula com o
 * relógio. O painel abre por cima, sem sair da tela.
 */
export function FocusDesktopDock() {
    const { session } = useFocusState();
    const rootRef = useRef<HTMLDivElement>(null);
    const panelRef = useRef<HTMLElement>(null);
    const panel = useFocusPanel(rootRef, panelRef);
    const panelId = "painel-foco";

    return (
        <div
            className="fixed right-6 bottom-6 z-40 hidden max-w-[calc(100vw-18rem)] flex-col items-end lg:flex"
            ref={rootRef}
        >
            {panel.open ? (
                <FocusPanel id={panelId} onClose={panel.close} panelRef={panelRef} tone="dark" />
            ) : null}
            {session ? (
                <SessionPill
                    controls={panelId}
                    onOpen={panel.toggle}
                    open={panel.open}
                    session={session}
                    tone="dark"
                />
            ) : (
                <button
                    aria-controls={panelId}
                    aria-expanded={panel.open}
                    aria-keyshortcuts="F"
                    className="flex min-h-12 cursor-pointer items-center gap-2 rounded-full border border-sloth-forest bg-sloth-forest pr-2 pl-4 text-sm font-semibold text-white shadow-soft transition hover:bg-sloth-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sloth-forest"
                    onClick={panel.toggle}
                    type="button"
                >
                    <TimerIcon />
                    Modo foco
                    <kbd
                        aria-hidden="true"
                        className="rounded-md bg-white/20 px-1.5 py-0.5 font-sans text-xs"
                    >
                        F
                    </kbd>
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
    const { session } = useFocusState();
    const rootRef = useRef<HTMLDivElement>(null);
    const panelRef = useRef<HTMLElement>(null);
    const panel = useFocusPanel(rootRef, panelRef);
    const panelId = "folha-foco";

    return (
        <div ref={rootRef}>
            {panel.open ? (
                <FocusPanel id={panelId} onClose={panel.close} panelRef={panelRef} tone="light" />
            ) : null}
            {session ? (
                <div className="mb-2">
                    <SessionPill
                        controls={panelId}
                        onOpen={panel.toggle}
                        open={panel.open}
                        session={session}
                        tone="light"
                    />
                </div>
            ) : null}
        </div>
    );
}
