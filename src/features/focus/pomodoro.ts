/**
 * Regras do Modo foco (pomodoro), sem React e sem relógio próprio: toda função
 * recebe `now` (ms). O timer guarda a hora em que a fase termina, não conta
 * segundos, então não atrasa com a aba em segundo plano e sobrevive a recarregar
 * a página.
 */

export const focusRhythms = ["classico", "profundo", "preguica"] as const;

export type FocusRhythm = (typeof focusRhythms)[number];

export type FocusPhase = "focus" | "short_break" | "long_break";

/**
 * - `running`: contando, termina em `endsAt`.
 * - `paused`: parado no meio, guarda `remainingMs`.
 * - `ready`: a fase ainda não começou (a pausa acabou e o foco espera a pessoa).
 */
export type FocusStatus = "running" | "paused" | "ready";

export type FocusTask = {
    id: string;
    title: string;
};

export type FocusSession = {
    rhythm: FocusRhythm;
    phase: FocusPhase;
    status: FocusStatus;
    /** Fim da fase, quando `running`. */
    endsAt: number | null;
    /** Tempo que falta, quando `paused` ou `ready`. */
    remainingMs: number;
    /** Blocos de foco concluídos nesta sessão. */
    completedFocus: number;
    task: FocusTask | null;
};

export type FocusState = {
    /** Último ritmo escolhido: vale para a próxima sessão. */
    rhythm: FocusRhythm;
    session: FocusSession | null;
};

type RhythmConfig = {
    label: string;
    hint: string;
    focusMinutes: number;
    shortBreakMinutes: number;
    longBreakMinutes: number;
    /** A cada quantos focos vem a pausa longa. */
    focusPerLongBreak: number;
};

export const RHYTHMS: Record<FocusRhythm, RhythmConfig> = {
    classico: {
        focusMinutes: 25,
        focusPerLongBreak: 4,
        hint: "25 min de foco, 5 de pausa",
        label: "Clássico",
        longBreakMinutes: 15,
        shortBreakMinutes: 5,
    },
    profundo: {
        focusMinutes: 50,
        focusPerLongBreak: 3,
        hint: "50 min de foco, 10 de pausa",
        label: "Profundo",
        longBreakMinutes: 20,
        shortBreakMinutes: 10,
    },
    preguica: {
        focusMinutes: 15,
        focusPerLongBreak: 4,
        hint: "15 min de foco, 5 de pausa, para dias de pouca energia",
        label: "Ritmo preguiça",
        longBreakMinutes: 15,
        shortBreakMinutes: 5,
    },
};

export const PHASE_LABELS: Record<FocusPhase, string> = {
    focus: "Foco",
    long_break: "Pausa longa",
    short_break: "Pausa curta",
};

export const DEFAULT_FOCUS_STATE: FocusState = {
    rhythm: "classico",
    session: null,
};

const MINUTE = 60_000;

export function getPhaseDurationMs(rhythm: FocusRhythm, phase: FocusPhase) {
    const config = RHYTHMS[rhythm];

    switch (phase) {
        case "focus":
            return config.focusMinutes * MINUTE;
        case "short_break":
            return config.shortBreakMinutes * MINUTE;
        case "long_break":
            return config.longBreakMinutes * MINUTE;
    }
}

export function startSession(
    rhythm: FocusRhythm,
    task: FocusTask | null,
    now: number,
): FocusSession {
    const duration = getPhaseDurationMs(rhythm, "focus");

    return {
        completedFocus: 0,
        endsAt: now + duration,
        phase: "focus",
        remainingMs: duration,
        rhythm,
        status: "running",
        task,
    };
}

export function getRemainingMs(session: FocusSession, now: number) {
    if (session.status === "running" && session.endsAt !== null) {
        return Math.max(0, session.endsAt - now);
    }

    return Math.max(0, session.remainingMs);
}

/** De 0 (começando) a 1 (acabou). */
export function getPhaseProgress(session: FocusSession, now: number) {
    const total = getPhaseDurationMs(session.rhythm, session.phase);

    return Math.min(1, Math.max(0, 1 - getRemainingMs(session, now) / total));
}

export function isPhaseOver(session: FocusSession, now: number) {
    return session.status === "running" && getRemainingMs(session, now) === 0;
}

export function pauseSession(session: FocusSession, now: number): FocusSession {
    if (session.status !== "running") {
        return session;
    }

    return {
        ...session,
        endsAt: null,
        remainingMs: getRemainingMs(session, now),
        status: "paused",
    };
}

export function resumeSession(session: FocusSession, now: number): FocusSession {
    if (session.status === "running") {
        return session;
    }

    return {
        ...session,
        endsAt: now + session.remainingMs,
        status: "running",
    };
}

function nextBreak(session: FocusSession, completedFocus: number): FocusPhase {
    const { focusPerLongBreak } = RHYTHMS[session.rhythm];

    return completedFocus > 0 && completedFocus % focusPerLongBreak === 0
        ? "long_break"
        : "short_break";
}

/**
 * Passa para a próxima fase.
 *
 * - Foco que terminou no tempo conta como concluído e a pausa começa sozinha:
 *   descansar não deveria depender de clicar.
 * - Pausa que terminou no tempo deixa o foco pronto, esperando a pessoa voltar.
 * - Pular (`completed: false`) não conta o foco, e a próxima fase já começa,
 *   porque foi a pessoa quem pediu.
 *
 * A fase seguinte começa na hora em que a anterior acabou (`endsAt`), não
 * agora: assim duas abas chegam no mesmo resultado, e voltar depois de um
 * tempo fora mostra o relógio certo.
 */
export function advancePhase(
    session: FocusSession,
    now: number,
    { completed }: { completed: boolean },
): FocusSession {
    const start =
        completed && session.status === "running" && session.endsAt !== null
            ? Math.min(session.endsAt, now)
            : now;

    if (session.phase === "focus") {
        const completedFocus = session.completedFocus + (completed ? 1 : 0);
        const phase = nextBreak(session, completedFocus);
        const duration = getPhaseDurationMs(session.rhythm, phase);

        return {
            ...session,
            completedFocus,
            endsAt: start + duration,
            phase,
            remainingMs: duration,
            status: "running",
        };
    }

    const duration = getPhaseDurationMs(session.rhythm, "focus");

    if (completed) {
        return {
            ...session,
            endsAt: null,
            phase: "focus",
            remainingMs: duration,
            status: "ready",
        };
    }

    return {
        ...session,
        endsAt: start + duration,
        phase: "focus",
        remainingMs: duration,
        status: "running",
    };
}

/**
 * Coloca a sessão em dia: fases que terminaram enquanto ninguém olhava passam
 * sozinhas. Para no foco "pronto", então dá no máximo dois passos.
 */
export function settleSession(session: FocusSession, now: number): FocusSession {
    let current = session;

    while (isPhaseOver(current, now)) {
        current = advancePhase(current, now, { completed: true });
    }

    return current;
}

/** Troca a tarefa sem mexer no relógio. */
export function setSessionTask(
    session: FocusSession,
    task: FocusTask | null,
): FocusSession {
    return { ...session, task };
}

/** "mm:ss", arredondando para cima: 0,4 s ainda mostra 00:01. */
export function formatClock(ms: number) {
    const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

/** Posição no ciclo até a pausa longa, para os pontinhos (ex.: 2 de 4). */
export function getCyclePosition(session: FocusSession) {
    const total = RHYTHMS[session.rhythm].focusPerLongBreak;
    const done = session.completedFocus % total;

    // Na pausa longa o ciclo acabou de fechar: mostra todos cheios.
    return {
        done: session.phase === "long_break" ? total : done,
        total,
    };
}

function isRhythm(value: unknown): value is FocusRhythm {
    return focusRhythms.includes(value as FocusRhythm);
}

function isPhase(value: unknown): value is FocusPhase {
    return value === "focus" || value === "short_break" || value === "long_break";
}

function isStatus(value: unknown): value is FocusStatus {
    return value === "running" || value === "paused" || value === "ready";
}

function isFiniteNumber(value: unknown): value is number {
    return typeof value === "number" && Number.isFinite(value);
}

function parseTask(value: unknown): FocusTask | null {
    if (!value || typeof value !== "object") {
        return null;
    }

    const task = value as Record<string, unknown>;

    return typeof task.id === "string" && typeof task.title === "string"
        ? { id: task.id, title: task.title }
        : null;
}

function parseSession(value: unknown): FocusSession | null {
    if (!value || typeof value !== "object") {
        return null;
    }

    const data = value as Record<string, unknown>;

    if (
        !isRhythm(data.rhythm) ||
        !isPhase(data.phase) ||
        !isStatus(data.status) ||
        !isFiniteNumber(data.remainingMs) ||
        !isFiniteNumber(data.completedFocus)
    ) {
        return null;
    }

    const endsAt = isFiniteNumber(data.endsAt) ? data.endsAt : null;

    if (data.status === "running" && endsAt === null) {
        return null;
    }

    return {
        completedFocus: Math.max(0, Math.floor(data.completedFocus)),
        endsAt: data.status === "running" ? endsAt : null,
        phase: data.phase,
        remainingMs: Math.max(0, data.remainingMs),
        rhythm: data.rhythm,
        status: data.status,
        task: parseTask(data.task),
    };
}

/**
 * Lê o que estiver salvo sem confiar no formato: sessão inválida vira "sem
 * sessão", ritmo inválido volta ao padrão.
 */
export function parseFocusState(raw: string | null): FocusState {
    if (!raw) {
        return DEFAULT_FOCUS_STATE;
    }

    let data: unknown;

    try {
        data = JSON.parse(raw);
    } catch {
        return DEFAULT_FOCUS_STATE;
    }

    if (!data || typeof data !== "object") {
        return DEFAULT_FOCUS_STATE;
    }

    const value = data as Record<string, unknown>;

    return {
        rhythm: isRhythm(value.rhythm) ? value.rhythm : DEFAULT_FOCUS_STATE.rhythm,
        session: parseSession(value.session),
    };
}
