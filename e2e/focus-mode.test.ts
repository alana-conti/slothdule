import { expect, test, type Page } from "@playwright/test";

import { createTaskByForm, taskCard, todayKey, uniqueTitle } from "./fixtures";

/** Painel do Modo foco no desktop: abre por cima do botão fixo no canto. */
function focusPanel(page: Page) {
  return page.locator("#painel-foco");
}

/** Pílula com o relógio, no canto, enquanto há sessão. */
function focusPill(page: Page) {
  return page.getByRole("button", { name: /^Modo foco: / });
}

async function chooseRhythmAndStart(page: Page, rhythm: RegExp) {
  const panel = focusPanel(page);

  // O radio é visualmente oculto: o clique vai no rótulo, como a pessoa faz.
  await panel.locator("label").filter({ hasText: rhythm }).click();
  await expect(panel.getByRole("radio", { name: rhythm })).toBeChecked();
  await panel.getByRole("button", { name: "Começar foco" }).click();

  return panel;
}

test.describe("modo foco (pomodoro)", () => {
  test("começa pelo botão do canto, pausa, segue entre telas e encerra", async ({
    page,
  }) => {
    await page.goto("/today");
    await page.waitForLoadState("networkidle");

    await page.getByRole("button", { name: "Modo foco", exact: true }).click();
    const panel = await chooseRhythmAndStart(page, /Ritmo preguiça/);
    const timer = panel.getByRole("timer");

    await expect(timer).toHaveText(/^1[45]:\d{2}$/);
    await expect(panel).toContainText("Foco livre");
    await expect(page).toHaveTitle(/^\d{2}:\d{2} · Foco · /);

    await panel.getByRole("button", { name: "Pausar" }).click();
    await expect(panel.getByRole("button", { name: "Retomar" })).toBeVisible();
    const pausedAt = (await timer.textContent()) ?? "";

    // O foco vive no layout: trocar de tela não reinicia nem para o relógio.
    await page
      .getByRole("navigation", { name: "Navegação principal" })
      .getByRole("link", { name: "Calendário" })
      .click();
    await expect(page).toHaveURL(/\/calendar/);
    await expect(focusPill(page)).toHaveAccessibleName(`Modo foco: Pausado, ${pausedAt}`);

    // Recarregar também não perde a sessão.
    await page.reload();
    await expect(focusPill(page)).toHaveAccessibleName(`Modo foco: Pausado, ${pausedAt}`);

    await page.getByRole("button", { name: "Retomar foco" }).click();
    await expect(focusPill(page)).toHaveAccessibleName(/^Modo foco: Foco, /);

    await focusPill(page).click();
    await focusPanel(page).getByRole("button", { name: "Encerrar foco" }).click();

    await expect(focusPill(page)).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Modo foco", exact: true }),
    ).toBeVisible();
  });

  test("a tecla F abre e fecha o painel, mas não dentro de campos", async ({ page }) => {
    await page.goto("/today");
    await page.waitForLoadState("networkidle");

    await page.keyboard.press("f");
    await expect(focusPanel(page)).toBeVisible();
    await expect(focusPanel(page)).toBeFocused();

    await page.keyboard.press("f");
    await expect(focusPanel(page)).toBeHidden();

    // Digitando no pop-up de nova tarefa, F é só uma letra.
    await page.keyboard.press("n");
    const dialog = page.getByRole("dialog", { name: "O que precisa sair da cabeça?" });
    await expect(dialog).toBeVisible();
    await page.keyboard.type("foco");
    await expect(focusPanel(page)).toBeHidden();
  });

  test("o fim do foco avisa e começa a pausa sozinho", async ({ page }) => {
    await page.clock.install();
    await page.goto("/today");
    await page.waitForLoadState("networkidle");

    await page.keyboard.press("f");
    const panel = await chooseRhythmAndStart(page, /Ritmo preguiça/);

    await page.clock.fastForward("15:01");

    await expect(
      page.getByRole("status").filter({ hasText: "Foco concluído" }),
    ).toBeVisible();
    await expect(panel).toContainText("Pausa curta");
    await expect(panel.getByRole("img", { name: "1 de 4 focos até a pausa longa" })).toBeVisible();

    await page.clock.fastForward("05:01");

    await expect(
      page.getByRole("status").filter({ hasText: "Pausa feita" }),
    ).toBeVisible();
    await expect(panel.getByRole("button", { name: "Voltar ao foco" })).toBeVisible();
    await expect(panel.getByRole("timer")).toHaveText("15:00");
  });

  test("Focar liga a tarefa em andamento ao foco, e concluí-la a desliga", async ({
    page,
  }) => {
    const title = uniqueTitle("Focar tarefa");
    await createTaskByForm(page, { title, dueDate: todayKey() });

    await taskCard(page, title)
      .getByRole("button", { name: "Iniciar tarefa", exact: true })
      .click();

    const row = page
      .getByRole("region", { name: "Em foco agora" })
      .locator("article")
      .filter({ has: page.getByRole("heading", { name: title, exact: true }) });

    await row.getByRole("button", { name: "Focar nesta tarefa" }).click();

    const panel = focusPanel(page);
    await expect(panel.getByRole("timer")).toBeVisible();
    await expect(panel.getByRole("link", { name: title })).toBeVisible();
    await expect(focusPill(page)).toContainText(title);
    // Na linha, o botão vira o relógio da tarefa em foco.
    await expect(row.getByRole("button", { name: /^Em foco, \d{2}:\d{2}/ })).toBeVisible();

    await row.getByRole("button", { name: "Concluir tarefa", exact: true }).click();

    // A tarefa sai do foco; o relógio segue, como foco livre.
    await expect(focusPill(page)).not.toContainText(title);
    await expect(focusPill(page)).toHaveAccessibleName(/^Modo foco: Foco, /);
  });
});

test.describe("modo foco no celular", () => {
  test.use({ viewport: { width: 390, height: 800 } });

  test("abre pelo menu Mais e mostra a pílula enquanto há sessão", async ({
    page,
  }) => {
    await page.goto("/today");
    await page.waitForLoadState("networkidle");

    const nav = page.getByRole("navigation", { name: "Navegação principal" });
    await nav.getByRole("button", { name: "Mais" }).click();
    await page.getByRole("button", { name: "Modo foco", exact: true }).click();

    const sheet = page.locator("#folha-foco");
    await expect(sheet).toBeVisible();
    await sheet.getByRole("button", { name: "Começar foco" }).click();
    await expect(sheet.getByRole("timer")).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(sheet).toBeHidden();

    const pill = page.getByRole("button", { name: /^Modo foco: Foco, \d{2}:\d{2}$/ });
    await expect(pill).toBeVisible();

    await page.getByRole("button", { name: "Pausar foco" }).click();
    await expect(
      page.getByRole("button", { name: /^Modo foco: Pausado/ }),
    ).toBeVisible();

    await page.getByRole("button", { name: /^Modo foco: Pausado/ }).click();
    await sheet.getByRole("button", { name: "Encerrar foco" }).click();
    await expect(page.getByRole("button", { name: /^Modo foco:/ })).toHaveCount(0);
  });
});
