import { expect, test, type Page } from "@playwright/test";

import { createTaskByForm, taskCard, todayKey, uniqueTitle } from "./fixtures";

/** Cartão do Modo foco no menu lateral (desktop). */
function sidebarFocus(page: Page) {
  return page.getByRole("complementary").getByRole("region", { name: "Modo foco" });
}

async function startFromSidebar(page: Page, rhythm: RegExp) {
  const card = sidebarFocus(page);

  await card.getByRole("button", { name: "Modo foco" }).click();
  // O radio é visualmente oculto: o clique vai no rótulo, como a pessoa faz.
  await card.locator("label").filter({ hasText: rhythm }).click();
  await expect(card.getByRole("radio", { name: rhythm })).toBeChecked();
  await card.getByRole("button", { name: "Começar foco" }).click();

  return card;
}

test.describe("modo foco (pomodoro)", () => {
  test("começa pelo menu lateral, pausa, segue entre telas e encerra", async ({
    page,
  }) => {
    await page.goto("/today");
    await page.waitForLoadState("networkidle");

    const card = await startFromSidebar(page, /Ritmo preguiça/);
    const timer = card.getByRole("timer");

    await expect(timer).toHaveText(/^1[45]:\d{2}$/);
    await expect(card).toContainText("Foco livre");
    await expect(page).toHaveTitle(/^\d{2}:\d{2} · Foco · /);

    await card.getByRole("button", { name: "Pausar" }).click();
    await expect(card.getByRole("button", { name: "Retomar" })).toBeVisible();
    const pausedAt = await timer.textContent();

    // O foco vive no layout: trocar de tela não reinicia nem para o relógio.
    await page
      .getByRole("navigation", { name: "Navegação principal" })
      .getByRole("link", { name: "Calendário" })
      .click();
    await expect(page).toHaveURL(/\/calendar/);
    await expect(sidebarFocus(page).getByRole("timer")).toHaveText(pausedAt ?? "");

    // Recarregar também não perde a sessão.
    await page.reload();
    await expect(sidebarFocus(page).getByRole("timer")).toHaveText(pausedAt ?? "");

    await sidebarFocus(page).getByRole("button", { name: "Retomar" }).click();
    await sidebarFocus(page).getByRole("button", { name: "Encerrar foco" }).click();

    await expect(sidebarFocus(page).getByRole("timer")).toHaveCount(0);
    await expect(
      sidebarFocus(page).getByRole("button", { name: "Modo foco" }),
    ).toBeVisible();
  });

  test("o fim do foco avisa e começa a pausa sozinho", async ({ page }) => {
    await page.clock.install();
    await page.goto("/today");
    await page.waitForLoadState("networkidle");

    const card = await startFromSidebar(page, /Ritmo preguiça/);

    await page.clock.fastForward("15:01");

    await expect(
      page.getByRole("status").filter({ hasText: "Foco concluído" }),
    ).toBeVisible();
    await expect(card).toContainText("Pausa curta");
    await expect(card.getByRole("img", { name: "1 de 4 focos até a pausa longa" })).toBeVisible();

    await page.clock.fastForward("05:01");

    await expect(
      page.getByRole("status").filter({ hasText: "Pausa feita" }),
    ).toBeVisible();
    await expect(card.getByRole("button", { name: "Voltar ao foco" })).toBeVisible();
    await expect(card.getByRole("timer")).toHaveText("15:00");
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

    const card = sidebarFocus(page);
    await expect(card.getByRole("timer")).toBeVisible();
    await expect(card.getByRole("link", { name: title })).toBeVisible();
    // Na linha, o botão vira o relógio da tarefa em foco.
    await expect(row.getByRole("button", { name: /^Em foco, \d{2}:\d{2}/ })).toBeVisible();

    await row.getByRole("button", { name: "Concluir tarefa", exact: true }).click();

    await expect(card).toContainText("Foco livre");
    await expect(card.getByRole("timer")).toBeVisible();
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
