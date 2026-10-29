import { expect, test } from "@playwright/test";

import { E2E_CATEGORY_NAME, todayKey, uniqueTitle } from "./fixtures";

test.describe("pop-up de nova tarefa", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/today");
    // O atalho só existe depois da hidratação do React.
    await page.waitForLoadState("networkidle");
  });

  test("abre com a tecla N e fecha com Esc", async ({ page }) => {
    const dialog = page.getByRole("dialog", {
      name: "O que precisa sair da cabeça?",
    });
    await expect(dialog).toBeHidden();

    await page.keyboard.press("n");
    await expect(dialog).toBeVisible();
    await expect(page.getByLabel("Descreva a tarefa rápida")).toBeFocused();

    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
  });

  test("abre pelo botão fixo e fecha no botão Fechar", async ({ page }) => {
    const dialog = page.getByRole("dialog");

    await page.getByRole("button", { name: "Nova tarefa" }).click();
    await expect(dialog).toBeVisible();

    await dialog.getByRole("button", { name: "Fechar" }).click();
    await expect(dialog).toBeHidden();
  });

  test("digitar a letra n em um campo não abre o pop-up", async ({ page }) => {
    await page.getByRole("button", { name: "Nova tarefa" }).click();
    await page.getByLabel("Descreva a tarefa rápida").fill("");
    await page.getByLabel("Descreva a tarefa rápida").pressSequentially("nnn");

    await expect(page.getByLabel("Descreva a tarefa rápida")).toHaveValue("nnn");
    await expect(page.getByRole("dialog")).toHaveCount(1);
  });

  test("o menu superior não tem mais o botão Nova tarefa", async ({ page }) => {
    await expect(
      page
        .getByRole("navigation", { name: "Navegação principal" })
        .getByText("Nova tarefa"),
    ).toHaveCount(0);
  });

  for (const path of ["/timeline", "/calendar", "/rewards"]) {
    test(`funciona também em ${path}`, async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState("networkidle");

      await page.keyboard.press("n");
      const dialog = page.getByRole("dialog", {
        name: "O que precisa sair da cabeça?",
      });
      await expect(dialog).toBeVisible();
      // As categorias são carregadas ao abrir.
      await expect(page.getByLabel("Descreva a tarefa rápida")).toBeVisible();
    });
  }

  test("criar tarefa em outra tela mantém a tela e confirma com toast", async ({
    page,
  }) => {
    const title = uniqueTitle("Tarefa de outra tela");
    await page.goto("/timeline");
    await page.waitForLoadState("networkidle");

    await page.getByRole("button", { name: "Nova tarefa" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Título").fill(title);
    await dialog
      .getByLabel("Categoria")
      .selectOption({ label: E2E_CATEGORY_NAME });
    await dialog.getByLabel("Prazo").fill(todayKey());
    await dialog.getByRole("button", { name: "Criar tarefa" }).click();

    // Não redireciona: continua na Linha do Tempo, com o pop-up fechado.
    await expect(dialog).toBeHidden();
    await expect(page).toHaveURL(/\/timeline$/);

    const toast = page.getByRole("status").filter({ hasText: "Tarefa criada" });
    await expect(toast).toBeVisible();
    await expect(toast).toContainText(title);

    // O link do aviso leva ao detalhe da tarefa recém-criada.
    await toast.getByRole("link", { name: "Abrir tarefa" }).click();
    await expect(page).toHaveURL(/\/tasks\/[\w-]+$/);
    await expect(page.getByRole("heading", { name: title })).toBeVisible();
  });

  test("o toast some sozinho e pode ser fechado", async ({ page }) => {
    await page.goto("/rewards");
    await page.waitForLoadState("networkidle");

    await page.getByRole("button", { name: "Nova tarefa" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Título").fill(uniqueTitle("Toast fecha"));
    await dialog
      .getByLabel("Categoria")
      .selectOption({ label: E2E_CATEGORY_NAME });
    await dialog.getByLabel("Prazo").fill(todayKey());
    await dialog.getByRole("button", { name: "Criar tarefa" }).click();

    const toast = page.getByRole("status").filter({ hasText: "Tarefa criada" });
    await expect(toast).toBeVisible();
    await toast.getByRole("button", { name: "Fechar aviso" }).click();
    await expect(toast).toBeHidden();
  });
});
