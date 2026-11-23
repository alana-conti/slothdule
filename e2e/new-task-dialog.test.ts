import { expect, test } from "@playwright/test";

import {
  E2E_CATEGORY_NAME,
  openDetailedForm,
  todayKey,
  uniqueTitle,
} from "./fixtures";

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

  test("o formulário detalhado começa recolhido e abre ao clicar no texto", async ({
    page,
  }) => {
    await page.keyboard.press("n");
    const dialog = page.getByRole("dialog");
    const toggle = dialog.getByRole("button", { name: /formulário detalhado/ });

    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await expect(dialog.getByLabel("Título")).toBeHidden();

    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    await expect(dialog.getByLabel("Título")).toBeVisible();

    await toggle.click();
    await expect(dialog.getByLabel("Título")).toBeHidden();
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
    await openDetailedForm(dialog);
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
    await openDetailedForm(dialog);
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

  test("Enter no campo de captura rápida cria a tarefa", async ({ page }) => {
    const title = uniqueTitle("Criada com Enter");

    await page.getByRole("button", { name: "Nova tarefa" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Descreva a tarefa rápida").fill(title);
    await dialog.getByLabel("Descreva a tarefa rápida").press("Enter");

    await expect(dialog).toBeHidden();
    await expect(
      page.getByRole("status").filter({ hasText: "Tarefa criada" }),
    ).toBeVisible();
  });

  test("Enter no formulário detalhado cria a tarefa", async ({ page }) => {
    const title = uniqueTitle("Detalhada com Enter");

    await page.getByRole("button", { name: "Nova tarefa" }).click();
    const dialog = page.getByRole("dialog");
    await openDetailedForm(dialog);
    await dialog
      .locator("#category-new")
      .selectOption({ label: E2E_CATEGORY_NAME });
    await dialog.locator("#due-date-new").fill(todayKey());
    await dialog.getByLabel("Título").fill(title);
    await dialog.getByLabel("Título").press("Enter");

    await expect(dialog).toBeHidden();
    await expect(
      page.getByRole("status").filter({ hasText: "Tarefa criada" }),
    ).toContainText(title);
  });

  test("abre na hora e só desabilita a categoria enquanto carrega", async ({
    page,
  }) => {
    // Segura o carregamento das categorias (server action) por um tempo.
    await page.route("**/today", async (route) => {
      if (route.request().method() === "POST") {
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }
      await route.continue();
    });

    await page.keyboard.press("n");
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    // O formulário abre ao clicar e dá pra digitar; só a categoria espera.
    await openDetailedForm(dialog);
    await dialog.getByLabel("Título").fill("Digitando antes de carregar");
    await expect(dialog.locator("#category-new")).toBeDisabled();
    await expect(
      dialog.getByRole("button", { name: "Criar tarefa" }),
    ).toBeDisabled();

    await expect(dialog.locator("#category-new")).toBeEnabled();
    await expect(dialog.getByLabel("Título")).toHaveValue(
      "Digitando antes de carregar",
    );
  });
});
