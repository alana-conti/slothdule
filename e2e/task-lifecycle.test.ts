import { expect, test } from "@playwright/test";

import {
  createTaskByForm,
  expectToast,
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
    await card.getByRole("button", { name: "Concluir tarefa", exact: true }).click();

    await expect(
      page.getByRole("status").filter({ hasText: "Folhinhas" }),
    ).toBeVisible();

    await page.goto("/today");
    expect(await readLeafBalance(page)).toBeGreaterThan(balanceBefore);
  });

  test("mudar status pelo seletor atualiza a linha sem sair da tela", async ({
    page,
  }) => {
    const title = uniqueTitle("Em andamento");
    await createTaskByForm(page, { title, dueDate: todayKey() });

    const card = taskCard(page, title);
    await card
      .getByLabel("Status da tarefa")
      .selectOption({ label: "Aguardando" });

    await expectToast(page, "Status atualizado");
    await expect(page).toHaveURL(/\/today$/);
    await expect(card.getByLabel("Status da tarefa")).toHaveValue("waiting");
  });

  test("iniciar tarefa com um clique e desfazer", async ({ page }) => {
    const title = uniqueTitle("Iniciar e desfazer");
    await createTaskByForm(page, { title, dueDate: todayKey() });

    const card = taskCard(page, title);
    await card.getByRole("button", { name: "Iniciar tarefa", exact: true }).click();

    await expectToast(page, "Status atualizado");
    await expect(card.getByLabel("Status da tarefa")).toHaveValue(
      "in_progress",
    );
    await expect(
      card.getByRole("button", { name: "Iniciar tarefa", exact: true }),
    ).toBeHidden();

    await page.getByRole("button", { name: "Desfazer", exact: true }).click();

    await expectToast(page, "Desfeito");
    await expect(card.getByLabel("Status da tarefa")).toHaveValue("todo");
  });

  test("concluir pode ser desfeito", async ({ page }) => {
    const title = uniqueTitle("Concluir e desfazer");
    await createTaskByForm(page, { title, dueDate: todayKey() });

    await taskCard(page, title)
      .getByRole("button", { name: "Concluir tarefa", exact: true })
      .click();
    await expectToast(page, "Tarefa concluída");
    await page.getByRole("button", { name: "Desfazer", exact: true }).click();
    await expectToast(page, "Desfeito");

    const card = taskCard(page, title);
    await expect(card.getByLabel("Status da tarefa")).toHaveValue("todo");
    await expect(
      page.locator("section").filter({
        has: page.getByRole("heading", { name: "Tarefas de hoje" }),
      }),
    ).toContainText(title);
  });

  test("tarefa concluída fica em Concluídas e arquivadas", async ({
    page,
  }) => {
    const title = uniqueTitle("Histórico concluída");
    await createTaskByForm(page, { title, dueDate: todayKey() });

    const card = taskCard(page, title);
    await card.getByRole("button", { name: "Concluir tarefa", exact: true }).click();

    await expect(
      page.getByRole("status").filter({ hasText: "Folhinhas" }),
    ).toBeVisible();

    await page
      .locator("summary")
      .filter({ hasText: "Concluídas e arquivadas" })
      .click();
    await expect(taskCard(page, title)).toBeVisible();
  });

  test("editar tarefa dentro da linha e salvar", async ({ page }) => {
    const title = uniqueTitle("Editar tarefa");
    const newTitle = `${title} editada`;
    await createTaskByForm(page, { title, dueDate: todayKey() });

    const card = taskCard(page, title);
    await card.getByRole("button", { name: "Mostrar detalhes" }).click();
    await card.getByRole("button", { name: "Editar", exact: true }).click();
    await card.getByLabel("Título").fill(newTitle);
    await card.getByRole("button", { name: "Salvar alterações" }).click();

    await expectToast(page, "Tarefa atualizada");
    await expect(taskCard(page, newTitle)).toBeVisible();
  });

  test("arquivar tarefa move para Concluídas e arquivadas", async ({
    page,
  }) => {
    const title = uniqueTitle("Arquivar tarefa");
    await createTaskByForm(page, { title, dueDate: todayKey() });

    const card = taskCard(page, title);
    await card.getByRole("button", { name: "Mostrar detalhes" }).click();
    await card.getByRole("button", { name: "Arquivar", exact: true }).click();

    await expectToast(page, "Tarefa arquivada");

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
    await card.getByRole("button", { name: "Mostrar detalhes" }).click();
    await card.getByRole("button", { name: "Excluir", exact: true }).click();
    await expect(
      card.getByText("Excluir permanentemente?"),
    ).toBeVisible();
    await card
      .getByRole("button", { name: "Confirmar exclusão" })
      .click();

    await expectToast(page, "Tarefa excluída");
    await expect(taskCard(page, title)).toBeHidden();
  });
});
