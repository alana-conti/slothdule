import { expect, test } from "@playwright/test";

import { createTaskByForm, taskCard, todayKey, uniqueTitle } from "./fixtures";

test.describe("tela Hoje", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/today");
  });

  test("mostra o resumo do dia", async ({ page }) => {
    await expect(page.getByText("Carga estimada de hoje")).toBeVisible();
    await expect(page.getByText("Tarefas para hoje")).toBeVisible();
    await expect(page.getByText("Prioritárias hoje")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Uma coisa de cada vez" })).toBeVisible();
  });

  test("cria tarefa manual e exibe em Tarefas de hoje", async ({ page }) => {
    const title = uniqueTitle("Tarefa manual");
    await createTaskByForm(page, { title, dueDate: todayKey() });

    const todaySection = page
      .locator("section")
      .filter({ has: page.getByRole("heading", { name: "Tarefas de hoje" }) });
    await expect(todaySection).toContainText(title);
  });

  test("tarefa atrasada aparece em Tarefas de hoje, marcada com calma", async ({
    page,
  }) => {
    const title = uniqueTitle("Tarefa atrasada");
    await createTaskByForm(page, { title, dueDate: todayKey(-2) });

    const card = taskCard(page, title);
    await expect(card).toBeVisible();
    await expect(card.getByText("Ficou de antes")).toBeVisible();
    await expect(
      page
        .locator("section")
        .filter({ has: page.getByRole("heading", { name: "Tarefas de hoje" }) }),
    ).toContainText(title);
    await expect(
      page.getByRole("heading", { name: "Tarefas atrasadas" }),
    ).toHaveCount(0);
  });

  test("a área Em foco agora é fixa na Hoje e mostra o contador N/2", async ({
    page,
  }) => {
    const focus = page.getByRole("region", { name: "Em foco agora" });
    const counter = focus.getByText(/^\d+\/2 em foco$/);

    await expect(focus).toBeVisible();
    await expect(counter).toBeVisible();

    const readCount = async () =>
      Number((await counter.textContent())?.split("/")[0]);
    const before = await readCount();

    const title = uniqueTitle("Contador de foco");
    await createTaskByForm(page, { title, dueDate: todayKey() });
    await taskCard(page, title)
      .getByRole("button", { name: "Iniciar tarefa", exact: true })
      .click();

    await expect(focus).toContainText(title);
    expect(await readCount()).toBe(before + 1);
  });

  test("passar de dois em foco não bloqueia, só avisa com calma", async ({
    page,
  }) => {
    const focus = page.getByRole("region", { name: "Em foco agora" });

    for (const base of ["Foco um", "Foco dois", "Foco três"]) {
      const title = uniqueTitle(base);
      await createTaskByForm(page, { title, dueDate: todayKey() });
      await taskCard(page, title)
        .getByRole("button", { name: "Iniciar tarefa", exact: true })
        .click();
      await expect(focus).toContainText(title);
    }

    await expect(focus.getByText(/^([3-9]|\d{2,})\/2 em foco$/)).toBeVisible();
    await expect(focus.getByText("Muita coisa ao mesmo tempo")).toBeVisible();
  });

  test("tarefa futura aparece em Próximas tarefas", async ({ page }) => {
    const title = uniqueTitle("Tarefa futura");
    await createTaskByForm(page, { title, dueDate: todayKey(7) });

    await expect(taskCard(page, title)).toBeVisible();
    await expect(
      page
        .locator("section")
        .filter({ has: page.getByRole("heading", { name: "Próximas tarefas" }) }),
    ).toContainText(title);
  });

  test("concluir uma tarefa leva para Concluídas hoje e aumenta o contador", async ({
    page,
  }) => {
    const done = page.getByRole("group", { name: "Concluídas hoje" });
    const counter = done.getByText(/^\d+ tarefas? concluídas? hoje$/);

    await expect(done).toBeVisible();
    const readCount = async () =>
      Number((await counter.textContent())?.split(" ")[0]);
    const before = await readCount();

    const title = uniqueTitle("Concluída hoje");
    await createTaskByForm(page, { title, dueDate: todayKey() });
    await taskCard(page, title)
      .getByRole("button", { name: "Concluir tarefa", exact: true })
      .click();

    await expect.poll(readCount).toBe(before + 1);

    // Começa recolhida: a tarefa só aparece ao abrir a área.
    await expect(done.getByRole("heading", { name: title })).toBeHidden();
    await done.getByText("Concluídas hoje", { exact: true }).click();
    await expect(done.getByRole("heading", { name: title })).toBeVisible();
  });
});
