import { expect, test } from "@playwright/test";

import {
  E2E_CATEGORY_NAME,
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

  test("em andamento vai para a área Em foco agora dentro de Hoje; pausar vai para aguardando e retomar volta", async ({
    page,
  }) => {
    const title = uniqueTitle("Foco e pausa");
    await createTaskByForm(page, { title, dueDate: todayKey() });

    const hoje = page.locator("section").filter({
      has: page.getByRole("heading", { name: "Tarefas de hoje", exact: true }),
    });
    const focus = page.getByRole("region", { name: "Em foco agora" });
    await expect(focus.filter({ hasText: title })).toHaveCount(0);

    await taskCard(page, title)
      .getByRole("button", { name: "Iniciar tarefa", exact: true })
      .click();

    // A área de foco fica dentro da seção Hoje, não é outra seção.
    await expect(hoje.getByRole("region", { name: "Em foco agora" })).toContainText(
      title,
    );
    await expect(
      page.getByRole("heading", { name: "Em foco agora" }),
    ).toHaveCount(0);

    const card = taskCard(page, title);
    await card
      .getByRole("button", { name: "Pausar tarefa", exact: true })
      .click();
    await page
      .getByRole("dialog", { name: "Quer deixar um recado?" })
      .getByRole("button", { name: "Pausar", exact: true })
      .click();

    await expectToast(page, "Tarefa pausada");
    await expect(card.getByLabel("Status da tarefa")).toHaveValue("waiting");
    await expect(focus.filter({ hasText: title })).toHaveCount(0);
    await expect(hoje).toContainText(title);

    await card
      .getByRole("button", { name: "Retomar tarefa", exact: true })
      .click();

    await expectToast(page, "Tarefa retomada");
    await expect(card.getByLabel("Status da tarefa")).toHaveValue(
      "in_progress",
    );
    await expect(focus).toContainText(title);
  });

  test("pausar pede um recado opcional; Enter pausa com o motivo e ele aparece na linha", async ({
    page,
  }) => {
    const title = uniqueTitle("Pausa com motivo");
    const reason = "esperando o retorno da Ana";
    await createTaskByForm(page, { title, dueDate: todayKey() });

    const card = taskCard(page, title);
    await card
      .getByRole("button", { name: "Iniciar tarefa", exact: true })
      .click();
    await expect(card.getByLabel("Status da tarefa")).toHaveValue(
      "in_progress",
    );

    await card
      .getByRole("button", { name: "Pausar tarefa", exact: true })
      .click();
    const dialog = page.getByRole("dialog", { name: "Quer deixar um recado?" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByLabel("Motivo da pausa (opcional)")).toBeFocused();

    await page.keyboard.type(reason);
    await page.keyboard.press("Enter");

    await expect(dialog).toBeHidden();
    await expectToast(page, "Tarefa pausada");
    await expect(card.getByLabel("Status da tarefa")).toHaveValue("waiting");
    await expect(card).toContainText(`Em pausa: ${reason}`);

    // O recado sobrevive ao recarregamento e some quando a tarefa é retomada.
    await page.reload();
    await expect(taskCard(page, title)).toContainText(`Em pausa: ${reason}`);
    await taskCard(page, title)
      .getByRole("button", { name: "Retomar tarefa", exact: true })
      .click();
    await expect(taskCard(page, title)).not.toContainText("Em pausa:");
  });

  test("Enter sem escrever nada também pausa; Esc cancela e mantém em andamento", async ({
    page,
  }) => {
    const title = uniqueTitle("Pausa sem motivo");
    await createTaskByForm(page, { title, dueDate: todayKey() });

    const card = taskCard(page, title);
    await card
      .getByRole("button", { name: "Iniciar tarefa", exact: true })
      .click();
    await expect(card.getByLabel("Status da tarefa")).toHaveValue(
      "in_progress",
    );

    const dialog = page.getByRole("dialog", { name: "Quer deixar um recado?" });

    await card
      .getByRole("button", { name: "Pausar tarefa", exact: true })
      .click();
    await expect(dialog).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(card.getByLabel("Status da tarefa")).toHaveValue(
      "in_progress",
    );

    await card
      .getByRole("button", { name: "Pausar tarefa", exact: true })
      .click();
    await expect(dialog).toBeVisible();
    await page.keyboard.press("Enter");

    await expect(dialog).toBeHidden();
    await expectToast(page, "Tarefa pausada");
    await expect(card.getByLabel("Status da tarefa")).toHaveValue("waiting");
    await expect(card).not.toContainText("Em pausa:");
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

  test("clicar no fundo do card abre e fecha os detalhes", async ({ page }) => {
    const title = uniqueTitle("Abrir pelo fundo");
    await createTaskByForm(page, { title, dueDate: todayKey() });

    const card = taskCard(page, title);
    const toggle = card.getByRole("button", { name: "Mostrar detalhes" });
    await expect(toggle).toHaveAttribute("aria-expanded", "false");

    // Um ponto vazio da linha (no respiro do canto), longe de qualquer botão.
    await card.click({ position: { x: 6, y: 6 } });
    await expect(
      card.getByRole("button", { name: "Ocultar detalhes" }),
    ).toHaveAttribute("aria-expanded", "true");

    await card.click({ position: { x: 6, y: 6 } });
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
  });

  test("editar prioridade, prazo e estimativa direto na linha", async ({
    page,
  }) => {
    const title = uniqueTitle("Editar na linha");
    await createTaskByForm(page, { title, dueDate: todayKey() });

    const card = taskCard(page, title);

    await card.getByRole("button", { name: /^Prioridade:/ }).click();
    await card.getByRole("option", { name: "Alta" }).click();
    await expectToast(page, "Tarefa atualizada");
    await expect(
      card.getByRole("button", { name: "Prioridade: Alta" }),
    ).toBeVisible();

    await card.getByRole("button", { name: /^Categoria:/ }).click();
    await card.getByRole("option", { name: E2E_CATEGORY_NAME }).click();

    await card.getByRole("button", { name: "Alterar estimativa" }).click();
    await card.getByLabel("Estimativa em minutos").fill("90");
    await card.getByRole("button", { name: "Salvar", exact: true }).click();
    await expect(
      card.getByRole("button", { name: "Alterar estimativa" }),
    ).toContainText("1h 30min");

    await card.getByRole("button", { name: "Alterar prazo" }).click();
    await card.getByLabel("Horário").fill("18:30");
    await card.getByRole("button", { name: "Salvar", exact: true }).click();
    await expect(
      card.getByRole("button", { name: "Alterar prazo" }),
    ).toContainText("18:30");

    // Persistiu no servidor, não só na tela.
    await page.reload();
    await expect(
      taskCard(page, title).getByRole("button", { name: "Prioridade: Alta" }),
    ).toBeVisible();
  });

  test("menu de prioridade funciona pelo teclado e fecha com Esc", async ({
    page,
  }) => {
    const title = uniqueTitle("Menu teclado");
    await createTaskByForm(page, { title, dueDate: todayKey() });

    const card = taskCard(page, title);
    const trigger = card.getByRole("button", { name: /^Prioridade:/ });

    await trigger.focus();
    await page.keyboard.press("ArrowDown");
    await expect(card.getByRole("listbox", { name: "Prioridade" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(card.getByRole("listbox")).toHaveCount(0);
    await expect(trigger).toBeFocused();

    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
    await expectToast(page, "Tarefa atualizada");
    await expect(
      card.getByRole("button", { name: "Prioridade: Alta" }),
    ).toBeVisible();

    // Abrir o menu não deve abrir os detalhes do card.
    await expect(
      card.getByRole("button", { name: "Mostrar detalhes" }),
    ).toHaveAttribute("aria-expanded", "false");
  });

  test("clicar no título edita o nome sem abrir os detalhes", async ({
    page,
  }) => {
    const title = uniqueTitle("Título na linha");
    const newTitle = `${title} renomeada`;
    await createTaskByForm(page, { title, dueDate: todayKey() });

    const card = taskCard(page, title);
    await card.getByRole("heading", { name: title }).getByRole("button").click();

    const input = card.getByRole("textbox", { name: "Título da tarefa" });
    await expect(input).toBeFocused();
    await expect(
      card.getByRole("button", { name: "Mostrar detalhes" }),
    ).toHaveAttribute("aria-expanded", "false");

    // Esc descarta o que foi digitado.
    await input.fill("não salvar");
    await page.keyboard.press("Escape");
    await expect(taskCard(page, title)).toBeVisible();

    await card.getByRole("heading", { name: title }).getByRole("button").click();
    await card
      .getByRole("textbox", { name: "Título da tarefa" })
      .fill(newTitle);
    await page.keyboard.press("Enter");

    await expectToast(page, "Tarefa atualizada");
    await expect(taskCard(page, newTitle)).toBeVisible();

    await page.reload();
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
