"use client";

import { useLayoutEffect, useState, useSyncExternalStore } from "react";

import {
    DEFAULT_FOCUS_STATE,
    advancePhase,
    parseFocusState,
    pauseSession,
    resumeSession,
    setSessionTask,
    startSession,
} from "./pomodoro";
import type { FocusRhythm, FocusState, FocusTask } from "./pomodoro";

/**
 * O Modo foco fica no aparelho (localStorage): sobrevive a trocar de tela e a
 * recarregar a página, e as abas abertas acompanham umas às outras.
 */
export const FOCUS_STORAGE_KEY = "slothdule:focus";

/** Qualquer botão pode pedir para abrir o painel de foco (menu, tarefa). */
export const OPEN_FOCUS_PANEL_EVENT = "slothdule:open-focus-panel";

const listeners = new Set<() => void>();
let cachedRaw: string | null | undefined;
let cachedState: FocusState = DEFAULT_FOCUS_STATE;
/** Sem armazenamento (aba anônima, bloqueado), o estado vive só na memória. */
let memoryOnly = false;

function readRaw() {
    try {
        return window.localStorage.getItem(FOCUS_STORAGE_KEY);
    } catch {
        return null;
    }
}

/** Estado atual. Mesmo objeto enquanto nada mudar (pede o useSyncExternalStore). */
export function getFocusState(): FocusState {
    if (typeof window === "undefined" || memoryOnly) {
        return cachedState;
    }

    const raw = readRaw();

    if (raw !== cachedRaw) {
        cachedRaw = raw;
        cachedState = parseFocusState(raw);
    }

    return cachedState;
}

function getServerState() {
    return DEFAULT_FOCUS_STATE;
}

export function setFocusState(next: FocusState) {
    const raw = JSON.stringify(next);

    try {
        window.localStorage.setItem(FOCUS_STORAGE_KEY, raw);
        cachedRaw = raw;
    } catch {
        memoryOnly = true;
    }

    cachedState = next;
    listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
    listeners.add(listener);

    function handleStorage(event: StorageEvent) {
        if (event.key === FOCUS_STORAGE_KEY) {
            listener();
        }
    }

    window.addEventListener("storage", handleStorage);

    return () => {
        listeners.delete(listener);
        window.removeEventListener("storage", handleStorage);
    };
}

export function useFocusState() {
    return useSyncExternalStore(subscribe, getFocusState, getServerState);
}

/** Relógio que anda a cada segundo enquanto `active`. */
export function useNow(active: boolean) {
    const [now, setNow] = useState(() => Date.now());

    // Layout effect: ao começar ou retomar, o relógio acerta antes de desenhar,
    // sem mostrar por um quadro a hora de quando o componente montou.
    useLayoutEffect(() => {
        if (!active) {
            return;
        }

        const tick = () => setNow(Date.now());
        const id = window.setInterval(tick, 1000);
        // Voltar para a aba atualiza na hora, sem esperar o próximo segundo.
        document.addEventListener("visibilitychange", tick);
        tick();

        return () => {
            window.clearInterval(id);
            document.removeEventListener("visibilitychange", tick);
        };
    }, [active]);

    return now;
}

export function openFocusPanel() {
    window.dispatchEvent(new Event(OPEN_FOCUS_PANEL_EVENT));
}

export function startFocus(task: FocusTask | null = null, rhythm?: FocusRhythm) {
    const state = getFocusState();
    const chosen = rhythm ?? state.rhythm;

    setFocusState({
        rhythm: chosen,
        session: startSession(chosen, task, Date.now()),
    });
}

/**
 * "Focar" numa tarefa: com uma sessão já aberta, só troca a tarefa (o relógio
 * segue); sem sessão, começa uma no último ritmo escolhido.
 */
export function focusOnTask(task: FocusTask) {
    const state = getFocusState();

    if (!state.session) {
        startFocus(task);
        return;
    }

    setFocusState({ ...state, session: setSessionTask(state.session, task) });
}

export function chooseRhythm(rhythm: FocusRhythm) {
    setFocusState({ ...getFocusState(), rhythm });
}

export function pauseFocus() {
    const state = getFocusState();

    if (state.session) {
        setFocusState({ ...state, session: pauseSession(state.session, Date.now()) });
    }
}

export function resumeFocus() {
    const state = getFocusState();

    if (state.session) {
        setFocusState({ ...state, session: resumeSession(state.session, Date.now()) });
    }
}

export function skipFocusPhase() {
    const state = getFocusState();

    if (state.session) {
        setFocusState({
            ...state,
            session: advancePhase(state.session, Date.now(), { completed: false }),
        });
    }
}

export function clearFocusTask() {
    const state = getFocusState();

    if (state.session) {
        setFocusState({ ...state, session: setSessionTask(state.session, null) });
    }
}

export function stopFocus() {
    setFocusState({ ...getFocusState(), session: null });
}
