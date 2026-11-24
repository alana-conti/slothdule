import { describe, expect, it } from "vitest";

import {
    DEFAULT_FOCUS_STATE,
    advancePhase,
    formatClock,
    getCyclePosition,
    getPhaseProgress,
    getRemainingMs,
    isPhaseOver,
    parseFocusState,
    pauseSession,
    resumeSession,
    setSessionTask,
    settleSession,
    startSession,
} from "./pomodoro";
import type { FocusSession } from "./pomodoro";

const MINUTE = 60_000;
const T0 = 1_700_000_000_000;
const task = { id: "t1", title: "Escrever relatório" };

/** Termina o foco atual no tempo, quantas vezes for pedido. */
function completeFocusBlocks(session: FocusSession, count: number) {
    let current = session;

    for (let index = 0; index < count; index += 1) {
        if (current.phase !== "focus") {
            current = advancePhase(current, current.endsAt ?? T0, { completed: true });
        }

        current = resumeSession(current, current.endsAt ?? T0);
        current = advancePhase(current, current.endsAt!, { completed: true });
    }

    return current;
}

describe("startSession", () => {
    it("começa no foco, contando, com a duração do ritmo", () => {
        const session = startSession("classico", task, T0);

        expect(session).toMatchObject({
            completedFocus: 0,
            endsAt: T0 + 25 * MINUTE,
            phase: "focus",
            status: "running",
            task,
        });
        expect(getRemainingMs(session, T0)).toBe(25 * MINUTE);
    });

    it("usa a duração de cada ritmo", () => {
        expect(startSession("profundo", null, T0).endsAt).toBe(T0 + 50 * MINUTE);
        expect(startSession("preguica", null, T0).endsAt).toBe(T0 + 15 * MINUTE);
    });
});

describe("pausar e retomar", () => {
    it("pausar guarda o que falta e o relógio para", () => {
        const paused = pauseSession(startSession("classico", null, T0), T0 + 10 * MINUTE);

        expect(paused.status).toBe("paused");
        expect(paused.endsAt).toBeNull();
        expect(getRemainingMs(paused, T0 + 60 * MINUTE)).toBe(15 * MINUTE);
    });

    it("retomar volta a contar a partir de agora", () => {
        const paused = pauseSession(startSession("classico", null, T0), T0 + 10 * MINUTE);
        const resumed = resumeSession(paused, T0 + 30 * MINUTE);

        expect(resumed.status).toBe("running");
        expect(resumed.endsAt).toBe(T0 + 45 * MINUTE);
    });

    it("pausar o que já está pausado não muda nada", () => {
        const paused = pauseSession(startSession("classico", null, T0), T0);

        expect(pauseSession(paused, T0 + MINUTE)).toBe(paused);
    });
});

describe("progresso e fim da fase", () => {
    it("o progresso vai de 0 a 1", () => {
        const session = startSession("classico", null, T0);

        expect(getPhaseProgress(session, T0)).toBe(0);
        expect(getPhaseProgress(session, T0 + 12.5 * MINUTE)).toBe(0.5);
        expect(getPhaseProgress(session, T0 + 99 * MINUTE)).toBe(1);
    });

    it("só acaba quando está contando e o tempo zera", () => {
        const session = startSession("classico", null, T0);

        expect(isPhaseOver(session, T0 + 25 * MINUTE - 1)).toBe(false);
        expect(isPhaseOver(session, T0 + 25 * MINUTE)).toBe(true);
        expect(isPhaseOver(pauseSession(session, T0), T0 + 99 * MINUTE)).toBe(false);
    });
});

describe("advancePhase", () => {
    it("foco concluído conta e a pausa curta começa sozinha, na hora em que o foco acabou", () => {
        const session = startSession("classico", null, T0);
        const next = advancePhase(session, T0 + 26 * MINUTE, { completed: true });

        expect(next).toMatchObject({
            completedFocus: 1,
            endsAt: T0 + 30 * MINUTE,
            phase: "short_break",
            status: "running",
        });
    });

    it("a cada 4 focos no clássico vem a pausa longa", () => {
        const afterThree = completeFocusBlocks(startSession("classico", null, T0), 3);
        const afterFour = completeFocusBlocks(startSession("classico", null, T0), 4);

        expect(afterThree.phase).toBe("short_break");
        expect(afterFour.phase).toBe("long_break");
        expect(afterFour.completedFocus).toBe(4);
        expect(getRemainingMs(afterFour, afterFour.endsAt! - 15 * MINUTE)).toBe(15 * MINUTE);
    });

    it("no profundo a pausa longa vem a cada 3 focos", () => {
        const afterThree = completeFocusBlocks(startSession("profundo", null, T0), 3);

        expect(afterThree.phase).toBe("long_break");
    });

    it("pausa concluída deixa o foco pronto, esperando a pessoa", () => {
        const onBreak = advancePhase(startSession("classico", null, T0), T0 + 25 * MINUTE, {
            completed: true,
        });
        const next = advancePhase(onBreak, T0 + 30 * MINUTE, { completed: true });

        expect(next).toMatchObject({
            endsAt: null,
            phase: "focus",
            remainingMs: 25 * MINUTE,
            status: "ready",
        });
    });

    it("pular o foco não conta, e a pausa começa agora", () => {
        const next = advancePhase(startSession("classico", null, T0), T0 + 5 * MINUTE, {
            completed: false,
        });

        expect(next).toMatchObject({
            completedFocus: 0,
            endsAt: T0 + 10 * MINUTE,
            phase: "short_break",
            status: "running",
        });
    });

    it("pular a pausa já começa o próximo foco", () => {
        const onBreak = advancePhase(startSession("classico", null, T0), T0 + 25 * MINUTE, {
            completed: true,
        });
        const next = advancePhase(onBreak, T0 + 27 * MINUTE, { completed: false });

        expect(next).toMatchObject({
            endsAt: T0 + 52 * MINUTE,
            phase: "focus",
            status: "running",
        });
    });

    it("pular o foco que estava em pausa também funciona", () => {
        const paused = pauseSession(startSession("classico", null, T0), T0 + 5 * MINUTE);
        const next = advancePhase(paused, T0 + 40 * MINUTE, { completed: false });

        expect(next.phase).toBe("short_break");
        expect(next.endsAt).toBe(T0 + 45 * MINUTE);
    });
});

describe("settleSession", () => {
    it("não mexe na fase que ainda está correndo", () => {
        const session = startSession("classico", null, T0);

        expect(settleSession(session, T0 + MINUTE)).toBe(session);
    });

    it("quem volta no meio da pausa vê a pausa com o tempo certo", () => {
        const settled = settleSession(startSession("classico", null, T0), T0 + 27 * MINUTE);

        expect(settled.phase).toBe("short_break");
        expect(getRemainingMs(settled, T0 + 27 * MINUTE)).toBe(3 * MINUTE);
    });

    it("quem volta muito depois encontra o próximo foco pronto, sem contar a mais", () => {
        const settled = settleSession(startSession("classico", null, T0), T0 + 3 * 60 * MINUTE);

        expect(settled).toMatchObject({
            completedFocus: 1,
            phase: "focus",
            status: "ready",
        });
    });
});

describe("setSessionTask", () => {
    it("troca a tarefa sem mexer no relógio", () => {
        const session = startSession("classico", null, T0);
        const next = setSessionTask(session, task);

        expect(next.task).toEqual(task);
        expect(next.endsAt).toBe(session.endsAt);
    });
});

describe("formatClock", () => {
    it("mostra mm:ss arredondando para cima", () => {
        expect(formatClock(25 * MINUTE)).toBe("25:00");
        expect(formatClock(61_000)).toBe("01:01");
        expect(formatClock(400)).toBe("00:01");
        expect(formatClock(0)).toBe("00:00");
        expect(formatClock(-5)).toBe("00:00");
    });

    it("passa de 60 minutos sem virar hora", () => {
        expect(formatClock(75 * MINUTE)).toBe("75:00");
    });
});

describe("getCyclePosition", () => {
    it("conta os focos do ciclo atual", () => {
        expect(getCyclePosition(startSession("classico", null, T0))).toEqual({ done: 0, total: 4 });
        expect(getCyclePosition(completeFocusBlocks(startSession("classico", null, T0), 2))).toEqual({
            done: 2,
            total: 4,
        });
    });

    it("na pausa longa o ciclo aparece cheio", () => {
        const onLongBreak = completeFocusBlocks(startSession("classico", null, T0), 4);

        expect(getCyclePosition(onLongBreak)).toEqual({ done: 4, total: 4 });
    });
});

describe("parseFocusState", () => {
    it("sem nada salvo, ou salvo quebrado, volta ao padrão", () => {
        expect(parseFocusState(null)).toEqual(DEFAULT_FOCUS_STATE);
        expect(parseFocusState("{")).toEqual(DEFAULT_FOCUS_STATE);
        expect(parseFocusState("42")).toEqual(DEFAULT_FOCUS_STATE);
    });

    it("lê de volta o que foi salvo", () => {
        const state = { rhythm: "profundo" as const, session: startSession("profundo", task, T0) };

        expect(parseFocusState(JSON.stringify(state))).toEqual(state);
    });

    it("ritmo desconhecido volta ao padrão e mantém a sessão", () => {
        const session = startSession("classico", null, T0);
        const parsed = parseFocusState(JSON.stringify({ rhythm: "turbo", session }));

        expect(parsed.rhythm).toBe("classico");
        expect(parsed.session).toEqual(session);
    });

    it("descarta sessão com campos inválidos", () => {
        const session = startSession("classico", null, T0);

        expect(parseFocusState(JSON.stringify({ session: { ...session, phase: "lanche" } })).session).toBeNull();
        expect(parseFocusState(JSON.stringify({ session: { ...session, endsAt: null } })).session).toBeNull();
        expect(parseFocusState(JSON.stringify({ session: { ...session, remainingMs: "x" } })).session).toBeNull();
    });

    it("tarefa malformada vira sessão sem tarefa", () => {
        const session = { ...startSession("classico", null, T0), task: { id: 1 } };

        expect(parseFocusState(JSON.stringify({ session })).session?.task).toBeNull();
    });
});
