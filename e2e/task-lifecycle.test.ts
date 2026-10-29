import { expect, test } from "@playwright/test";

import {
  createTaskByForm,
  readLeafBalance,
  taskCard,
  todayKey,
  uniqueTitle,
} from "./fixtures";

test.describe("ciclo de vida da tarefa", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/today");
  });

  test("concluir tarefa rende Folhinhas", async ({ page }) => {
    const balanceBefore = await readLeafBalance(page);
    const title = uniqueTitle("Concluir tarefa");
    await createTaskByForm(page, { title, dueDate: todayKey() });

    const card = taskCard(page, title);
    await card
      .getByLabel("Status da tarefa")
      .selectOption({ label: "Feita" });
    await card.getByRole("button", { name: "Aplicar" }).click();

    await expect(
      page.getByRole("status").filter({ hasText: "Folhinhas" }),
    ).toBeVisible();

    await page.goto("/today");
    expect(await readLeafBalance(page)).toBeGreaterThan(balanceBefore);
  });

  test("mudar status atualiza o cartão", async ({ page }) => {
    const title = uniqueTitle("Em andamento");
    await createTaskByForm(page, { title, dueDate: todayKey() });

    const card = taskCard(page, title);
    await card
      .getByLabel("Status da tarefa")
      .selectOption({ label: "Em andamento" });
    await card.getByRole("button", { name: "Aplicar" }).click();

    await expect(
      page.getByRole("status").filter({ hasText: "Status atualizado." }),
    ).toBeVisible();
    await expect(
      card.locator("span").filter({ hasText: /^Em andamento$/ }),
    ).toBeVisible();
  });

  test("tarefa concluída fica em Concluídas e arquivadas", async ({
    page,
  }) => {
    const title = uniqueTitle("Histórico concluída");
    await createTaskByForm(page, { title, dueDate: todayKey() });

    const card = taskCard(page, title);
    await card.getByLabel("Status da tarefa").selectOption({ label: "Feita" });
    await card.getByRole("button", { name: "Aplicar" }).click();

    await expect(
      page.getByRole("status").filter({ hasText: "Folhinhas" }),
    ).toBeVisible();

    await page
      .locator("summary")
      .filter({ hasText: "Concluídas e arquivadas" })
      .click();
    await expect(taskCard(page, title)).toBeVisible();
  });

  test("arquivar tarefa move para Concluídas e arquivadas", async ({
    page,
  }) => {
    const title = uniqueTitle("Arquivar tarefa");
    await createTaskByForm(page, { title, dueDate: todayKey() });

    const card = taskCard(page, title);
    await card.getByRole("button", { name: "Arquivar" }).click();

    await expect(
      page.getByRole("status").filter({ hasText: "Tarefa arquivada." }),
    ).toBeVisible();

    await page
      .locator("summary")
      .filter({ hasText: "Concluídas e arquivadas" })
      .click();
    await expect(taskCard(page, title)).toBeVisible();
  });

  test("excluir tarefa remove permanentemente", async ({ page }) => {
    const title = uniqueTitle("Excluir tarefa");
    await createTaskByForm(page, { title, dueDate: todayKey() });

    const card = taskCard(page, title);
    await card.getByText("Excluir", { exact: true }).click();
    await expect(
      card.getByText("Excluir permanentemente?"),
    ).toBeVisible();
    await card
      .getByRole("button", { name: "Confirmar exclusão" })
      .click();

    await expect(
      page.getByRole("status").filter({ hasText: "Tarefa excluída." }),
    ).toBeVisible();
    await expect(taskCard(page, title)).toBeHidden();
  });
});
