import { describe, expect, it } from "vitest";

import {
    formatProgress,
    formatRoutineMeta,
    formatWeekdays,
    formatWhen,
    getRegressionAfter,
    getRestingNotice,
    getRoutineBonusState,
    getStageProgress,
    getStageThresholds,
    groupHabitsForDay,
    isInFormation,
    routineBonusMessage,
    sortHabitsForDay,
    splitHabitsByRoutine,
} from "./index";

describe("getStageThresholds", () => {
    it("usa as âncoras do doc para 1, 3 e 7 dias", () => {
        expect(getStageThresholds(7)).toEqual({ arbusto: 21, arvore: 66, muda: 7 });
        expect(getStageThresholds(3)).toEqual({ arbusto: 14, arvore: 43, muda: 5 });
        expect(getStageThresholds(1)).toEqual({ arbusto: 8, arvore: 25, muda: 3 });
    });

    it("interpola os outros dias igual ao backend", () => {
        expect(getStageThresholds(5)).toEqual({ arbusto: 18, arvore: 55, muda: 6 });
        expect(getStageThresholds(2)).toEqual({ arbusto: 11, arvore: 34, muda: 4 });
        expect(getStageThresholds(4)).toEqual({ arbusto: 16, arvore: 49, muda: 6 });
        expect(getStageThresholds(6)).toEqual({ arbusto: 19, arvore: 60, muda: 7 });
    });

    it("limita fora de 1 a 7", () => {
        expect(getStageThresholds(0)).toEqual(getStageThresholds(1));
        expect(getStageThresholds(9)).toEqual(getStageThresholds(7));
    });
});

describe("getRegressionAfter", () => {
    it("vale 2 semanas de agenda", () => {
        expect(getRegressionAfter(7)).toBe(14);
        expect(getRegressionAfter(3)).toBe(6);
    });
});

describe("formatWeekdays", () => {
    it("resume agendas comuns", () => {
        expect(formatWeekdays([1, 2, 3, 4, 5, 6, 7])).toBe("todos os dias");
        expect(formatWeekdays([5, 4, 3, 2, 1])).toBe("seg a sex");
        expect(formatWeekdays([7, 6])).toBe("fim de semana");
        expect(formatWeekdays([1, 3, 5])).toBe("seg, qua e sex");
        expect(formatWeekdays([2])).toBe("ter");
    });
});

describe("formatWhen e sortHabitsForDay", () => {
    const habits = [
        { period: null, timeOfDay: null, title: "Ler" },
        { period: "evening" as const, timeOfDay: null, title: "Alongar" },
        { period: null, timeOfDay: "07:30:00", title: "Água" },
        { period: "morning" as const, timeOfDay: null, title: "Planejar" },
    ];

    it("mostra horário, período ou qualquer hora", () => {
        expect(habits.map(formatWhen)).toEqual(["Qualquer hora", "Noite", "07:30", "Manhã"]);
    });

    it("ordena pela hora do dia e deixa qualquer hora por último", () => {
        expect(sortHabitsForDay(habits).map((habit) => habit.title)).toEqual([
            "Água",
            "Planejar",
            "Alongar",
            "Ler",
        ]);
    });
});

describe("progresso", () => {
    it("descreve o caminho até o próximo estágio", () => {
        expect(
            formatProgress({
                growth: 29,
                kind: "do",
                nextStage: "arvore",
                nextThreshold: 55,
                totalCheckins: 29,
            }),
        ).toBe("29 de 55 até árvore");
        expect(
            formatProgress({
                growth: 70,
                kind: "avoid",
                nextStage: null,
                nextThreshold: null,
                totalCheckins: 72,
            }),
        ).toBe("72 dias cuidados · estágio máximo");
    });

    it("calcula a fração dentro do estágio", () => {
        expect(getStageProgress({ currentThreshold: 18, growth: 29, nextThreshold: 55 })).toBeCloseTo(
            11 / 37,
        );
        expect(getStageProgress({ currentThreshold: 66, growth: 80, nextThreshold: null })).toBe(1);
    });

    it("broto e muda estão em formação", () => {
        expect(isInFormation("broto")).toBe(true);
        expect(isInFormation("muda")).toBe(true);
        expect(isInFormation("arbusto")).toBe(false);
    });
});

describe("getRestingNotice", () => {
    it("só avisa da metade da janela em diante", () => {
        expect(getRestingNotice({ missesInRow: 6, regressionAfter: 14, stage: "arbusto" })).toBeNull();
        expect(getRestingNotice({ missesInRow: 9, regressionAfter: 14, stage: "arbusto" })).toBe(
            "Faz 9 dias da agenda sem cuidado. Um cuidado já segura o arbusto, sem pressa.",
        );
    });

    it("broto nunca desce, então não avisa", () => {
        expect(getRestingNotice({ missesInRow: 13, regressionAfter: 14, stage: "broto" })).toBeNull();
    });
});

describe("groupHabitsForDay", () => {
    const base = { period: null, scheduledToday: true, timeOfDay: null, todayStatus: null };

    it("separa pendentes, feitos e folgas só da agenda de hoje", () => {
        const groups = groupHabitsForDay([
            { ...base, title: "Ler", timeOfDay: "22:00:00" },
            { ...base, title: "Água", period: "morning" as const },
            { ...base, title: "Alongar", todayStatus: "done" as const },
            { ...base, title: "Caminhar", todayStatus: "rest" as const },
            { ...base, title: "Inglês", scheduledToday: false },
        ]);

        expect(groups.pending.map((habit) => habit.title)).toEqual(["Água", "Ler"]);
        expect(groups.done.map((habit) => habit.title)).toEqual(["Alongar"]);
        expect(groups.rest.map((habit) => habit.title)).toEqual(["Caminhar"]);
        expect(groups.scheduled).toBe(4);
    });

    it("fica vazio sem hábitos na agenda", () => {
        expect(groupHabitsForDay([{ ...base, scheduledToday: false, title: "x" }])).toEqual({
            done: [],
            pending: [],
            rest: [],
            scheduled: 0,
        });
    });
});

describe("splitHabitsByRoutine", () => {
    type H = { id: string; scheduledToday: boolean; todayStatus: "done" | "rest" | null };
    const h = (id: string, todayStatus: H["todayStatus"] = null, scheduledToday = true): H => ({
        id,
        scheduledToday,
        todayStatus,
    });
    const morning = { anchor: "Depois de acordar", habitIds: ["c", "a", "off"], id: "r1", name: "Manhã" };
    const night = { anchor: null, habitIds: ["n"], id: "r2", name: "Noite" };

    it("mantém a ordem da rotina, só com os passos de hoje, e separa os soltos", () => {
        const habits = [h("a", "done"), h("c"), h("off", null, false), h("loose"), h("n", null, false)];
        const day = splitHabitsByRoutine([morning, night], habits);

        expect(day.routines).toHaveLength(1);
        expect(day.routines[0].steps.map((step) => step.id)).toEqual(["c", "a"]);
        expect(day.routines[0]).toMatchObject({ complete: false, done: 1, pending: 1, rest: 0 });
        expect(day.offToday.map((routine) => routine.id)).toEqual(["r2"]);
        expect(day.loose.map((habit) => habit.id)).toEqual(["loose"]);
    });

    it("folga não completa a rotina", () => {
        const day = splitHabitsByRoutine([morning], [h("a", "done"), h("c", "rest")]);

        expect(day.routines[0]).toMatchObject({ complete: false, pending: 0, rest: 1 });
    });

    it("rotina completa quando todos os passos de hoje estão feitos", () => {
        const day = splitHabitsByRoutine([morning], [h("a", "done"), h("c", "done"), h("off", null, false)]);

        expect(day.routines[0].complete).toBe(true);
    });
});

describe("getRoutineBonusState", () => {
    it("diz quantos passos faltam, somando todas as rotinas", () => {
        const state = getRoutineBonusState(
            [
                { pending: 1, rest: 0 },
                { pending: 2, rest: 0 },
            ],
            false,
        );

        expect(state).toEqual({ status: "pending", stepsLeft: 3 });
        expect(routineBonusMessage(state)).toBe(
            "Faltam 3 passos para completar as rotinas de hoje e ganhar +2 de bônus.",
        );
        expect(routineBonusMessage({ status: "pending", stepsLeft: 1 })).toMatch(/^Falta 1 passo/);
    });

    it("um passo de folga segura o bônus do dia", () => {
        expect(getRoutineBonusState([{ pending: 1, rest: 1 }], false)).toEqual({ status: "rest" });
    });

    it("quem decide se ganhou é o servidor", () => {
        const state = getRoutineBonusState([{ pending: 1, rest: 0 }], true);

        expect(state).toEqual({ status: "earned" });
        expect(routineBonusMessage(state)).toContain("além do teto de 10");
    });

    it("sem rotina hoje, sem mensagem", () => {
        expect(routineBonusMessage(getRoutineBonusState([], false))).toBeNull();
    });
});

describe("formatRoutineMeta", () => {
    it("junta a âncora e os passos", () => {
        expect(formatRoutineMeta({ anchor: "Depois do café", habitIds: ["a", "b"] })).toBe(
            "Depois do café · 2 passos",
        );
        expect(formatRoutineMeta({ anchor: null, habitIds: ["a", "b"] }, 1)).toBe("1 passo");
    });
});
