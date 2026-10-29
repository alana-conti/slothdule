import { expect, test } from "@playwright/test";

test.describe("captura rápida", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/today");
    await page.getByRole("button", { name: "Nova tarefa" }).click();
  });

  test("interpreta texto livre e cria a tarefa", async ({ page }) => {
    await page
      .getByLabel("Descreva a tarefa rápida")
      .fill(`Revisar proposta da POC urgente ${Date.now().toString(36)}`);

    // Sugestão estruturada derivada do texto
    await expect(page.locator("#suggested-title")).not.toHaveValue("");
    await expect(page.locator("#suggested-priority")).toHaveValue("high");
    await expect(page.locator("#suggested-date")).not.toHaveValue("");

    const suggestedTitle = await page
      .locator("#suggested-title")
      .evaluate((element) => (element as HTMLInputElement).value);

    await page.getByRole("button", { name: "Confirmar e Criar" }).click();

    await expect(
      page.getByRole("status").filter({ hasText: "Tarefa criada" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: suggestedTitle, exact: true }),
    ).toBeVisible();
  });

  // Nota: o parsing do app usa \b com palavras acentuadas ("amanhã", "crítico"),
  // que nunca casam em JS (ã/í não são word chars). A variante sem acento casará.
  test("palavras de prazo definem a data e limpa o título", async ({
    page,
  }) => {
    await page
      .getByLabel("Descreva a tarefa rápida")
      .fill("Enviar relatório amanha");

    const suggestedDate = await page
      .locator("#suggested-date")
      .evaluate((element) => (element as HTMLInputElement).value);
    const suggestedTitle = await page
      .locator("#suggested-title")
      .evaluate((element) => (element as HTMLInputElement).value);

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowKey = new Intl.DateTimeFormat("en-CA", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      timeZone: "America/Sao_Paulo",
    }).format(tomorrow);

    expect(suggestedDate).toBe(tomorrowKey);
    expect(suggestedTitle).toContain("Enviar relatório");
    expect(suggestedTitle).not.toContain("amanha");
  });
});
