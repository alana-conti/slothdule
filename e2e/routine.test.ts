import { expect, test, type Page } from "@playwright/test";

import { E2E_TITLE_PREFIX, statusToast } from "./fixtures";

/** Planta um hábito pelo pop-up da Visão geral e fecha o toast de confirmação. */
async function plantHabit(page: Page, title: string) {
  await page.goto("/routine");
  // Sem hidratar, o clique no botão não abre o pop-up.
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "Novo hábito" }).click();
  const dialog = page.getByRole("dialog", { name: "Plantar um hábito" });
  await dialog.getByLabel("Que hábito você quer cultivar?").fill(title);
  await dialog.getByRole("button", { name: "Plantar hábito" }).click();
  await expect(dialog).toBeHidden();
  const planted = statusToast(page, "Hábito plantado");
  await planted.getByRole("button", { name: "Fechar aviso" }).click();
  await expect(planted).toBeHidden();
}

test.describe("rotina e hábitos", () => {
  test("planta um hábito, cuida dele hoje e acompanha no jardim", async ({ page }) => {
    const title = `${E2E_TITLE_PREFIX} Beber água ${Date.now()}`;
    const nav = page.getByRole("navigation", { name: "Navegação principal" });

    await page.goto("/routine");
    // Sem hidratar, o clique no botão não abre o pop-up.
    await page.waitForLoadState("networkidle");
    await expect(nav.getByRole("link", { name: "Visão geral" })).toHaveAttribute(
      "aria-current",
      "page",
    );

    await page.getByRole("button", { name: "Novo hábito" }).click();
    const dialog = page.getByRole("dialog", { name: "Plantar um hábito" });
    await expect(dialog).toBeVisible();
    await dialog.getByLabel("Que hábito você quer cultivar?").fill(title);
    await dialog.getByText("Período", { exact: true }).click();
    await dialog.getByText("Manhã", { exact: true }).click();
    await dialog.getByRole("button", { name: "Plantar hábito" }).click();

    await expect(dialog).toBeHidden();
    const planted = statusToast(page, "Hábito plantado");
    await expect(planted).toContainText(title);
    // O aviso cobre o fim da lista: fecha antes de marcar o cuidado.
    await planted.getByRole("button", { name: "Fechar aviso" }).click();
    await expect(planted).toBeHidden();

    await page.getByRole("button", { name: `Marcar como feito: ${title}` }).click();
    // Com o teto diário já alcançado o cuidado ainda conta; o título é o mesmo.
    await expect(page.getByText("Cuidado registrado")).toBeVisible();
    await expect(
      page.getByRole("button", { name: `Desmarcar “${title}”` }),
    ).toHaveAttribute("aria-pressed", "true");

    await nav.getByRole("link", { name: "Jardim" }).click();
    await expect(page).toHaveURL(/\/routine\/garden/);
    await page.getByRole("link", { name: title }).click();

    await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
    await expect(page.getByText(/1 dia cuidado desde/)).toBeVisible();
    await expect(nav.getByRole("link", { name: "Jardim" })).toHaveAttribute(
      "aria-current",
      "page",
    );

    await page.getByRole("button", { name: "Remover hábito" }).click();
    await page.getByRole("button", { name: "Remover", exact: true }).click();
    await expect(page).toHaveURL(/\/routine\/garden/);
    await expect(page.getByRole("link", { name: title })).toHaveCount(0);
  });

  test("folga hoje não conta como cuidado e pode ser desfeita", async ({ page }) => {
    const title = `${E2E_TITLE_PREFIX} Não pedir delivery ${Date.now()}`;

    await page.goto("/routine");
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: "Novo hábito" }).click();
    const dialog = page.getByRole("dialog", { name: "Plantar um hábito" });
    await dialog.getByText("Evitar", { exact: true }).click();
    await dialog.getByLabel("O que você quer evitar?").fill(title);
    await dialog.getByRole("button", { name: "Plantar hábito" }).click();
    await expect(dialog).toBeHidden();
    const planted = statusToast(page, "Hábito plantado");
    await planted.getByRole("button", { name: "Fechar aviso" }).click();
    await expect(planted).toBeHidden();

    const row = page.getByRole("listitem").filter({ hasText: title });
    await row.getByRole("button", { name: "Folga hoje" }).click();
    await expect(row.getByRole("button", { name: "Desfazer folga" })).toBeVisible();
    await expect(
      row.getByRole("button", { name: `Hoje consegui evitar: ${title}` }),
    ).toBeDisabled();

    await row.getByRole("button", { name: "Desfazer folga" }).click();
    await expect(
      row.getByRole("button", { name: `Hoje consegui evitar: ${title}` }),
    ).toBeEnabled();
  });

  test("cuida de um hábito pela Rotina de hoje, na tela Hoje", async ({ page }) => {
    const title = `${E2E_TITLE_PREFIX} Alongar ${Date.now()}`;
    await plantHabit(page, title);

    await page.goto("/today");
    await page.waitForLoadState("networkidle");
    const card = page.getByRole("region", { name: "Rotina de hoje" });
    await expect(card).toBeVisible();

    await card.getByRole("button", { name: `Marcar como feito: ${title}` }).click();
    await expect(statusToast(page, "Cuidado registrado")).toBeVisible();

    // Feito, o hábito sai da lista e vai para os cuidados feitos (recolhidos).
    await card.getByText(/cuidados? feitos?/).click();
    await expect(
      card.getByRole("button", { name: `Desmarcar “${title}”` }),
    ).toHaveAttribute("aria-pressed", "true");
  });

  test("hábito com horário e lembrete aparece na Linha do tempo", async ({ page }) => {
    const title = `${E2E_TITLE_PREFIX} Tomar vitamina ${Date.now()}`;

    await page.goto("/routine");
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: "Novo hábito" }).click();
    const dialog = page.getByRole("dialog", { name: "Plantar um hábito" });
    await dialog.getByLabel("Que hábito você quer cultivar?").fill(title);
    await dialog.getByText("Horário", { exact: true }).click();
    await dialog.getByLabel("Que horas?").fill("07:30");
    await dialog.getByRole("checkbox", { name: /Lembrar no horário/ }).check();
    await dialog.getByRole("button", { name: "Plantar hábito" }).click();
    await expect(dialog).toBeHidden();

    await page.goto("/timeline");
    const routine = page.getByRole("group", { name: "Rotina com horário" });
    await expect(routine.getByRole("link", { name: `07:30 ${title}` })).toBeVisible();

    await routine.getByRole("link", { name: `07:30 ${title}` }).click();
    await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
    await expect(page.getByText("Lembrete no horário")).toBeVisible();
  });
});

