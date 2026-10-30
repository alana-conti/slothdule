import { expect, test } from "@playwright/test";

import { createTaskByForm, taskCard, todayKey, uniqueTitle } from "./fixtures";

test.describe("tela Hoje", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/today");
  });

  test("mostra o resumo do dia", async ({ page }) => {
    await expect(page.getByText("Carga estimada de hoje")).toBeVisible();
    await expect(page.getByText("Tarefas para hoje")).toBeVisible();
    await expect(page.getByText("Prioridade crítica hoje")).toBeVisible();
    await expect(page.getByText("Uma coisa de cada vez")).toBeVisible();
  });

  test("cria tarefa manual e exibe em Tarefas de hoje", async ({ page }) => {
    const title = uniqueTitle("Tarefa manual");
    await createTaskByForm(page, { title, dueDate: todayKey() });

    const todaySection = page
      .locator("section")
      .filter({ has: page.getByRole("heading", { name: "Tarefas de hoje" }) });
    await expect(todaySection).toContainText(title);
  });

  test("tarefa atrasada aparece em Tarefas atrasadas", async ({ page }) => {
    const title = uniqueTitle("Tarefa atrasada");
    await createTaskByForm(page, { title, dueDate: todayKey(-2) });

    const card = taskCard(page, title);
    await expect(card).toBeVisible();
    await expect(card.getByText("Passou do prazo")).toBeVisible();
    await expect(
      page
        .locator("section")
        .filter({ has: page.getByRole("heading", { name: "Tarefas atrasadas" }) }),
    ).toContainText(title);
  });

  test("tarefas de hoje vêm antes das atrasadas", async ({ page }) => {
    const title = uniqueTitle("Ordem das seções");
    await createTaskByForm(page, { title, dueDate: todayKey(-1) });

    const headings = await page
      .getByRole("heading", { level: 2 })
      .allTextContents();

    expect(headings.indexOf("Tarefas de hoje")).toBeGreaterThanOrEqual(0);
    expect(headings.indexOf("Tarefas de hoje")).toBeLessThan(
      headings.indexOf("Tarefas atrasadas"),
    );
    await expect(
      page.getByRole("link", { name: /atrasadas?, mais abaixo/ }),
    ).toBeVisible();
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
});
