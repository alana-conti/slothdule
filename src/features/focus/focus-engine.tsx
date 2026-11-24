"use client";

import { useEffect } from "react";

import { useToast } from "@/components/sloth/toast";
import { playSound } from "@/lib/audio/sounds";
import { isLetterShortcut } from "@/lib/keyboard";

import { setFocusState, toggleFocusPanel, useFocusState, useNow } from "./focus-store";
import {
    PHASE_LABELS,
    RHYTHMS,
    formatClock,
    getRemainingMs,
    isPhaseOver,
    settleSession,
} from "./pomodoro";
import type { FocusSession } from "./pomodoro";

/** Fase que acabou há mais que isso (aba fechada, celular bloqueado) passa em silêncio. */
const FRESH_MS = 60_000;

/** Prefixo que o foco põe no título da aba: "12:34 · Foco · ". */
const TITLE_PREFIX = /^\d{2,}:\d{2} · [^·]+ · /;

type Announcement = { title: string; description: string };

function describeTransition(next: FocusSession): Announcement {
    const config = RHYTHMS[next.rhythm];

    if (next.phase === "long_break") {
        return {
            description: `Um ciclo inteiro de foco. Pausa longa de ${config.longBreakMinutes} min: você merece.`,
            title: "Foco concluído",
        };
    }

    if (next.phase === "short_break") {
        return {
            description: `Hora de uma pausa de ${config.shortBreakMinutes} min. Estique o corpo, beba uma água.`,
            title: "Foco concluído",
        };
    }

    return {
        description: "Quando quiser, é só voltar ao foco.",
        title: "Pausa feita",
    };
}

/** Aviso do sistema quando a aba não está à vista. A tag evita aviso repetido entre abas. */
async function notifySystem({ title, description }: Announcement) {
    try {
        if (!("Notification" in window) || Notification.permission !== "granted") {
            return;
        }

        const options = {
            body: description,
            data: { url: "/today" },
            icon: "/icon.png",
            tag: "slothdule-focus",
        };
        const registration = await navigator.serviceWorker?.getRegistration();

        if (registration) {
            await registration.showNotification(title, options);
        } else {
            new Notification(title, options);
        }
    } catch {
        // Aviso é um extra: sem permissão ou sem suporte, segue sem.
    }
}

/**
 * Motor do Modo foco: vive uma vez no layout, sem interface. Passa as fases
 * quando o tempo acaba, avisa com som e mensagem, mostra o relógio no título
 * da aba e atende a tecla F (abre e fecha o painel).
 */
export function FocusEngine() {
    const { toast } = useToast();
    const { session } = useFocusState();
    const now = useNow(session?.status === "running");

    useEffect(() => {
        if (!session || !isPhaseOver(session, now)) {
            return;
        }

        const endedAt = session.endsAt ?? now;
        const next = settleSession(session, now);

        setFocusState({ rhythm: session.rhythm, session: next });

        if (now - endedAt > FRESH_MS) {
            return;
        }

        const announcement = describeTransition(next);

        if (document.visibilityState === "visible") {
            playSound(next.phase === "focus" ? "ding-ding" : "sino-de-vento");
            toast({ ...announcement, duration: 8000 });
        } else {
            void notifySystem(announcement);
        }
    }, [now, session, toast]);

    useEffect(() => {
        const base = document.title.replace(TITLE_PREFIX, "");

        if (!session || session.status === "ready") {
            if (base !== document.title) {
                document.title = base;
            }
            return;
        }

        const clock = formatClock(getRemainingMs(session, now));
        const label = session.status === "paused" ? "Pausado" : PHASE_LABELS[session.phase];

        document.title = `${clock} · ${label} · ${base}`;
    }, [now, session]);

    useEffect(() => {
        function handleKeyDown(event: KeyboardEvent) {
            if (isLetterShortcut(event, "f")) {
                event.preventDefault();
                toggleFocusPanel();
            }
        }

        window.addEventListener("keydown", handleKeyDown);

        return () => window.removeEventListener("keydown", handleKeyDown);
    }, []);

    // Ao sair do app (logout), o título volta ao normal.
    useEffect(
        () => () => {
            document.title = document.title.replace(TITLE_PREFIX, "");
        },
        [],
    );

    return null;
}
