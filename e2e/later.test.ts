import { expect, test } from "@playwright/test";

import {
  E2E_CATEGORY_NAME,
  expectToast,
  openDetailedForm,
  taskCard,
  todayKey,
  uniqueTitle,
} from "./fixtures";

test.describe("sem pressa", () => {
  test("tarefa sem prazo fica em Sem pressa, fora de Hoje, e ganha data depois", async ({
    page,
  }) => {
    const title = uniqueTitle("Organizar fotos");

    await page.goto("/later");
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: "Nova tarefa" }).click();
    const dialog = page.getByRole("dialog", {
      name: "O que precisa sair da cabeça?",
    });
    await openDetailedForm(dialog);
    await dialog.getByLabel("Título").fill(title);
    await dialog
      .getByLabel("Categoria")
      .selectOption({ label: E2E_CATEGORY_NAME });
    // Prazo em branco = Sem pressa.
    await dialog.getByRole("button", { name: "Criar tarefa" }).click();

    await expectToast(page, "Tarefa criada");
    await expect(taskCard(page, title)).toBeVisible();
    await expect(
      taskCard(page, title).getByRole("button", { name: "Alterar prazo" }),
    ).toHaveText("Sem pressa");

    await page.goto("/today");
    await expect(page.getByRole("heading", { name: title })).toHaveCount(0);

    // Dar uma data tira a tarefa de Sem pressa; o botão a devolve.
    await page.goto("/later");
    const card = taskCard(page, title);
    await card.getByRole("button", { name: "Alterar prazo" }).click();
    await card.getByRole("textbox", { name: "Prazo" }).fill(todayKey(30));
    await card.getByRole("button", { name: "Salvar" }).click();
    await expectToast(page, "Tarefa atualizada");
    await page.reload();
    await expect(taskCard(page, title)).toHaveCount(0);

    await page.goto("/today");
    const dated = taskCard(page, title);
    await dated.getByRole("button", { name: "Alterar prazo" }).click();
    await dated.getByRole("button", { name: "Sem pressa" }).click();
    await expectToast(page, "Tarefa atualizada");

    await page.goto("/later");
    await expect(taskCard(page, title)).toBeVisible();
  });

  test("captura rápida entende 'algum dia'", async ({ page }) => {
    await page.goto("/today");
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: "Nova tarefa" }).click();
    await page
      .getByLabel("Descreva a tarefa rápida")
      .fill("Estudar embeddings algum dia");

    await expect(page.locator("#suggested-date")).toHaveValue("");
    await expect(page.locator("#suggested-title")).toHaveValue(
      "Estudar embeddings",
    );
  });
});
