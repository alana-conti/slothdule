import { describe, expect, it } from "vitest";

import {
  getDailyEstimatedMinutes,
  getTaskDailyEstimatedMinutes,
  getTaskCompletedDateKey,
  getTaskDurationDays,
  groupDayPlan,
  groupTasksForToday,
  headStartReason,
  isDayComplete,
  pickHeadStart,
} from "./today";
import type { Task } from "../../types/tasks";

function createTask(overrides: Partial<Task> = {}): Task {
  return {
    id: "task-1",
    userId: "user-1",
    categoryId: "category-1",
    title: "Tarefa",
    description: null,
    workContext: "personal",
    status: "todo",
    priority: "medium",
    startDate: null,
    dueDate: "2026-06-12",
    dueTime: null,
    estimatedMinutes: 60,
    completedAt: null,
    leafAwardedAt: null,
    pauseReason: null,
    planDate: null,
    planPosition: null,
    clientId: null,
    projectId: null,
    createdAt: "2026-06-10T12:00:00Z",
    updatedAt: "2026-06-10T12:00:00Z",
    ...overrides,
  };
}

describe("groupTasksForToday", () => {
  const today = "2026-06-12";

  it("includes an open task throughout its scheduled date range", () => {
    const task = createTask({
      status: "in_progress",
      startDate: "2026-06-12",
      dueDate: "2026-06-13",
    });

    expect(groupTasksForToday([task], today).today).toEqual([task]);
  });

  it("keeps a task upcoming until its start date", () => {
    const task = createTask({
      startDate: "2026-06-13",
      dueDate: "2026-06-14",
    });

    expect(groupTasksForToday([task], today).upcoming).toEqual([task]);
  });

  it("traz as atrasadas para hoje, sem deixar de listá-las como atrasadas", () => {
    const task = createTask({
      startDate: "2026-06-09",
      dueDate: "2026-06-11",
    });

    const groups = groupTasksForToday([task], today);

    expect(groups.overdue).toEqual([task]);
    expect(groups.today).toEqual([task]);
    expect(groups.upcoming).toEqual([]);
  });
});

describe("tarefas em andamento", () => {
  const today = "2026-06-12";

  it("reúne as tarefas em andamento de qualquer data, sem as pausadas", () => {
    const overdue = createTask({
      id: "overdue",
      status: "in_progress",
      dueDate: "2026-06-10",
    });
    const current = createTask({ id: "current", status: "in_progress" });
    const upcoming = createTask({
      id: "upcoming",
      status: "in_progress",
      dueDate: "2026-06-20",
    });
    const waiting = createTask({ id: "waiting", status: "waiting" });
    const done = createTask({ id: "done", status: "done" });

    const ids = groupTasksForToday(
      [upcoming, waiting, done, current, overdue],
      today,
    ).inProgress.map((task) => task.id);

    expect(ids).toHaveLength(3);
    expect(ids).toEqual(
      expect.arrayContaining(["overdue", "current", "upcoming"]),
    );
  });

  it("mantém a tarefa em andamento também no grupo da sua data", () => {
    const task = createTask({ status: "in_progress" });
    const groups = groupTasksForToday([task], today);

    expect(groups.inProgress).toEqual([task]);
    expect(groups.today).toEqual([task]);
  });
});

describe("daily task estimates", () => {
  it("divides 120 minutes across two inclusive days", () => {
    const task = createTask({
      startDate: "2026-06-12",
      dueDate: "2026-06-13",
      estimatedMinutes: 120,
    });

    expect(getTaskDurationDays(task)).toBe(2);
    expect(getTaskDailyEstimatedMinutes(task)).toBe(60);
  });

  it("sums only each task's daily share", () => {
    const twoDayTask = createTask({
      startDate: "2026-06-12",
      dueDate: "2026-06-13",
      estimatedMinutes: 120,
    });
    const oneDayTask = createTask({
      id: "task-2",
      estimatedMinutes: 30,
    });

    expect(getDailyEstimatedMinutes([twoDayTask, oneDayTask])).toBe(90);
  });

  it("uses the due date as a one-day schedule when start date is absent", () => {
    const task = createTask({
      startDate: null,
      estimatedMinutes: 45,
    });

    expect(getTaskDurationDays(task)).toBe(1);
    expect(getTaskDailyEstimatedMinutes(task)).toBe(45);
  });
});

describe("concluídas hoje", () => {
  const today = "2026-06-12";

  it("separa o que foi concluído hoje do que foi concluído em outros dias", () => {
    const earlierToday = createTask({
      id: "earlier-today",
      status: "done",
      completedAt: "2026-06-12T12:00:00Z",
    });
    const laterToday = createTask({
      id: "later-today",
      status: "done",
      completedAt: "2026-06-12T18:30:00Z",
    });
    const yesterday = createTask({
      id: "yesterday",
      status: "done",
      completedAt: "2026-06-11T15:00:00Z",
    });
    const open = createTask({ id: "open" });

    const groups = groupTasksForToday(
      [earlierToday, yesterday, open, laterToday],
      today,
    );

    expect(groups.completedToday.map((task) => task.id)).toEqual([
      "later-today",
      "earlier-today",
    ]);
    expect(groups.completed.map((task) => task.id)).toEqual(["yesterday"]);
  });

  it("usa o fuso de São Paulo e a virada às 4h para decidir o dia da conclusão", () => {
    // 01:30 UTC do dia 13 ainda é 22:30 do dia 12 em São Paulo.
    const lateNight = createTask({
      status: "done",
      completedAt: "2026-06-13T01:30:00Z",
    });
    // 07:30 UTC do dia 12 é 04:30 do dia 12 em São Paulo: o dia já virou.
    const earlyMorning = createTask({
      id: "early",
      status: "done",
      completedAt: "2026-06-12T07:30:00Z",
    });
    // 05:30 UTC do dia 12 é 02:30 do dia 12 em São Paulo: madrugada ainda é o dia 11.
    const dayBefore = createTask({
      id: "day-before",
      status: "done",
      completedAt: "2026-06-12T05:30:00Z",
    });

    expect(getTaskCompletedDateKey(lateNight)).toBe("2026-06-12");
    expect(
      groupTasksForToday([lateNight, earlyMorning, dayBefore], today)
        .completedToday.map((task) => task.id),
    ).toEqual(["task-1", "early"]);
  });

  it("cai para a última atualização quando não há data de conclusão", () => {
    const legacy = createTask({
      status: "done",
      completedAt: null,
      updatedAt: "2026-06-12T14:00:00Z",
    });

    expect(groupTasksForToday([legacy], today).completedToday).toEqual([
      legacy,
    ]);
  });

  it("não conta tarefas abertas nem arquivadas", () => {
    const archived = createTask({
      status: "archived",
      completedAt: "2026-06-12T12:00:00Z",
    });
    const reopened = createTask({
      id: "reopened",
      status: "todo",
      completedAt: null,
      updatedAt: "2026-06-12T12:00:00Z",
    });

    expect(getTaskCompletedDateKey(archived)).toBeNull();
    expect(
      groupTasksForToday([archived, reopened], today).completedToday,
    ).toEqual([]);
  });
});

describe("isDayComplete", () => {
  const today = "2026-06-12";
  // 15h em São Paulo, no dia de hoje.
  const doneNow = {
    completedAt: "2026-06-12T18:00:00Z",
    status: "done" as const,
  };

  it("é verdade quando a última tarefa de hoje acaba de ser concluída", () => {
    const tasks = [
      createTask({ id: "a", ...doneNow }),
      createTask({ id: "b", ...doneNow, completedAt: "2026-06-12T13:00:00Z" }),
      createTask({ id: "futura", dueDate: "2026-06-15" }),
    ];

    expect(isDayComplete(tasks, "a", today)).toBe(true);
  });

  it("não vale enquanto sobrar tarefa aberta para hoje", () => {
    const tasks = [
      createTask({ id: "a", ...doneNow }),
      createTask({ id: "b", status: "waiting" }),
    ];

    expect(isDayComplete(tasks, "a", today)).toBe(false);
  });

  it("não vale com tarefa atrasada aberta, que agora também é de hoje", () => {
    const tasks = [
      createTask({ id: "a", ...doneNow }),
      createTask({ id: "atrasada", dueDate: "2026-06-10" }),
    ];

    expect(isDayComplete(tasks, "a", today)).toBe(false);
  });

  it("não vale com tarefa de outro dia ainda em andamento", () => {
    const tasks = [
      createTask({ id: "a", ...doneNow }),
      createTask({ id: "foco", dueDate: "2026-06-20", status: "in_progress" }),
    ];

    expect(isDayComplete(tasks, "a", today)).toBe(false);
  });

  it("vale quando a concluída era atrasada", () => {
    const tasks = [createTask({ id: "a", ...doneNow, dueDate: "2026-06-09" })];

    expect(isDayComplete(tasks, "a", today)).toBe(true);
  });

  it("não conta tarefa adiantada de outro dia", () => {
    const tasks = [createTask({ id: "a", ...doneNow, dueDate: "2026-06-14" })];

    expect(isDayComplete(tasks, "a", today)).toBe(false);
  });

  it("não vale se a tarefa não está concluída ou não existe", () => {
    const tasks = [createTask({ id: "a", status: "todo" })];

    expect(isDayComplete(tasks, "a", today)).toBe(false);
    expect(isDayComplete(tasks, "sumiu", today)).toBe(false);
  });
});

describe("tarefas sem data (Sem pressa)", () => {
  const today = "2026-06-12";

  it("ficam em someday, fora de hoje, das próximas e das atrasadas", () => {
    const task = createTask({ dueDate: null });
    const groups = groupTasksForToday([task], today);

    expect(groups.someday).toEqual([task]);
    expect(groups.today).toEqual([]);
    expect(groups.upcoming).toEqual([]);
    expect(groups.overdue).toEqual([]);
  });

  it("entram em hoje quando ganham início, e nunca ficam atrasadas", () => {
    const task = createTask({ dueDate: null, startDate: "2026-06-01" });
    const groups = groupTasksForToday([task], today);

    expect(groups.today).toEqual([task]);
    expect(groups.overdue).toEqual([]);
    expect(groups.someday).toEqual([]);
  });

  it("com início futuro, aparecem nas próximas", () => {
    const task = createTask({ dueDate: null, startDate: "2026-06-20" });

    expect(groupTasksForToday([task], today).upcoming).toEqual([task]);
  });

  it("em andamento continuam em foco", () => {
    const task = createTask({ dueDate: null, status: "in_progress" });

    expect(groupTasksForToday([task], today).inProgress).toEqual([task]);
  });

  it("ordenam pela mais antiga e vão para o fim quando misturadas por prazo", () => {
    const old = createTask({
      id: "old",
      dueDate: null,
      createdAt: "2026-05-01T12:00:00Z",
    });
    const recent = createTask({ id: "recent", dueDate: null });
    const dated = createTask({ id: "dated", status: "in_progress" });
    const groups = groupTasksForToday(
      [recent, old, { ...old, id: "foco", status: "in_progress" }, dated],
      today,
    );

    // Em andamento também segue listada em Sem pressa.
    expect(groups.someday.map((task) => task.id)).toEqual([
      "old",
      "foco",
      "recent",
    ]);
    expect(groups.inProgress.map((task) => task.id)).toEqual(["dated", "foco"]);
  });

  it("contam a estimativa inteira em um dia", () => {
    const task = createTask({ dueDate: null, estimatedMinutes: 90 });

    expect(getTaskDurationDays(task)).toBe(1);
    expect(getTaskDailyEstimatedMinutes(task)).toBe(90);
  });

  it("concluir uma delas não fecha o dia", () => {
    const tasks = [
      createTask({
        id: "a",
        dueDate: null,
        completedAt: "2026-06-12T18:00:00Z",
        status: "done",
      }),
    ];

    expect(isDayComplete(tasks, "a", today)).toBe(false);
  });
});

describe("plano do dia", () => {
  // Sexta-feira, 12 de junho de 2026.
  const today = "2026-06-12";
  const ids = (tasks: Task[]) => tasks.map((task) => task.id);

  it("sem decisão hoje, o que é de hoje vira sugestão", () => {
    const dueToday = createTask({ id: "hoje" });
    const overdue = createTask({ id: "atrasada", dueDate: "2026-06-10" });
    const future = createTask({ id: "futura", dueDate: "2026-06-30" });
    const groups = groupDayPlan([dueToday, overdue, future], today);

    expect(ids(groups.suggestions).sort()).toEqual(["atrasada", "hoje"]);
    expect(groups.plan).toEqual([]);
    expect(groups.outside).toEqual([]);
  });

  it("aceitas entram no plano na ordem da pessoa; recusadas ficam fora", () => {
    const tasks = [
      createTask({ id: "b", planDate: today, planPosition: 1 }),
      createTask({ id: "a", planDate: today, planPosition: 0 }),
      createTask({ id: "recusada", planDate: today, planPosition: null }),
    ];
    const groups = groupDayPlan(tasks, today);

    expect(ids(groups.plan)).toEqual(["a", "b"]);
    expect(ids(groups.outside)).toEqual(["recusada"]);
    expect(groups.suggestions).toEqual([]);
  });

  it("decisões de ontem não valem hoje; o plano de ontem volta como sugestão", () => {
    const tasks = [
      createTask({ id: "recusada-ontem", planDate: "2026-06-11", planPosition: null }),
      createTask({
        id: "plano-ontem",
        dueDate: "2026-06-20",
        planDate: "2026-06-11",
        planPosition: 0,
      }),
    ];

    expect(ids(groupDayPlan(tasks, today).suggestions).sort()).toEqual([
      "plano-ontem",
      "recusada-ontem",
    ]);
  });

  it("só sugere atrasadas e prazo hoje; o resto de hoje vai direto para fora do plano", () => {
    const tasks = [
      createTask({ id: "longa", startDate: "2026-06-08", dueDate: "2026-06-19" }),
      createTask({ id: "sem-prazo", startDate: "2026-06-10", dueDate: null }),
      createTask({ id: "hoje" }),
    ];
    const groups = groupDayPlan(tasks, today);

    expect(ids(groups.suggestions)).toEqual(["hoje"]);
    expect(ids(groups.outside).sort()).toEqual(["longa", "sem-prazo"]);
  });

  it("uma futura aceita fica no plano mesmo sem ser de hoje", () => {
    const task = createTask({ dueDate: "2026-06-20", planDate: today, planPosition: 0 });

    expect(groupDayPlan([task], today).plan).toEqual([task]);
  });

  it("em andamento e concluídas ficam fora das listas do plano", () => {
    const tasks = [
      createTask({ id: "foco", status: "in_progress", planDate: today, planPosition: 0 }),
      createTask({ id: "feita", status: "done" }),
    ];
    const groups = groupDayPlan(tasks, today);

    expect([...groups.plan, ...groups.suggestions, ...groups.outside]).toEqual([]);
  });
});

describe("antecipação do dia", () => {
  const today = "2026-06-12";
  const old = "2026-05-01T12:00:00Z";

  it("prefere o prazo mais perto e, no empate, a tarefa mais longa", () => {
    const tasks = [
      createTask({ id: "longe", dueDate: "2026-06-20", createdAt: old }),
      createTask({ id: "curta", dueDate: "2026-06-15", estimatedMinutes: 30, createdAt: old }),
      createTask({ id: "longa", dueDate: "2026-06-15", estimatedMinutes: 180, createdAt: old }),
      createTask({ id: "sem-data", dueDate: null, createdAt: old }),
    ];

    expect(pickHeadStart(tasks, today)?.id).toBe("longa");
  });

  it("sem prazo próximo, sugere a mais antiga de Sem pressa", () => {
    const tasks = [
      createTask({ id: "fora-da-janela", dueDate: "2026-06-27", createdAt: old }),
      createTask({ id: "nova", dueDate: null, createdAt: "2026-06-01T12:00:00Z" }),
      createTask({ id: "antiga", dueDate: null, createdAt: old }),
    ];

    expect(pickHeadStart(tasks, today)?.id).toBe("antiga");
  });

  it("ignora o que já é de hoje, não está a fazer ou foi criado hoje", () => {
    const tasks = [
      createTask({ id: "de-hoje", createdAt: old }),
      createTask({ id: "aguardando", dueDate: "2026-06-14", status: "waiting", createdAt: old }),
      createTask({ id: "criada-hoje", dueDate: "2026-06-14", createdAt: "2026-06-12T12:00:00Z" }),
    ];

    expect(pickHeadStart(tasks, today)).toBeNull();
  });

  it("recusada descansa 3 dias e depois volta", () => {
    const declined = (planDate: string) =>
      createTask({ dueDate: "2026-06-20", createdAt: old, planDate, planPosition: null });

    expect(pickHeadStart([declined("2026-06-10")], today)).toBeNull();
    expect(pickHeadStart([declined("2026-06-09")], today)).not.toBeNull();
  });

  it("é uma por dia: depois de aceitar ou recusar uma hoje, não sugere outra", () => {
    const next = createTask({ id: "proxima", dueDate: "2026-06-16", createdAt: old });

    for (const planPosition of [0, null]) {
      const decided = createTask({
        id: "decidida",
        dueDate: "2026-06-15",
        createdAt: old,
        planDate: today,
        planPosition,
      });

      expect(pickHeadStart([decided, next], today)).toBeNull();
    }
  });

  it("explica o motivo sem falar em horas", () => {
    expect(headStartReason(createTask({ dueDate: "2026-06-13" }), today)).toBe(
      "Vence amanhã. Começar hoje tira o peso de amanhã.",
    );
    expect(headStartReason(createTask({ dueDate: "2026-06-16" }), today)).toBe(
      "Vence terça. Começar hoje deixa a semana mais leve.",
    );
    expect(headStartReason(createTask({ dueDate: "2026-06-22" }), today)).toBe(
      "Vence dia 22. Começar cedo evita a correria no fim.",
    );
    expect(
      headStartReason(createTask({ dueDate: null, createdAt: old }), today),
    ).toBe("Em Sem pressa há 6 semanas. Hoje pode ser o dia.");
  });
});
