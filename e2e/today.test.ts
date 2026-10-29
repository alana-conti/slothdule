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
    await expect(
      card.getByText("Essa tarefa passou do prazo. Quer reorganizar?"),
    ).toBeVisible();
    await expect(
      page
        .locator("section")
        .filter({ has: page.getByRole("heading", { name: "Tarefas atrasadas" }) }),
    ).toContainText(title);
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
