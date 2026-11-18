import { expect, test } from "@playwright/test";

test.describe("menu lateral", () => {
  test("leva entre as telas e marca a tela atual", async ({ page }) => {
    await page.goto("/today");
    const nav = page.getByRole("navigation", { name: "Navegação principal" });

    await expect(nav.getByRole("link", { name: "Hoje" })).toHaveAttribute(
      "aria-current",
      "page",
    );

    await nav.getByRole("link", { name: "Calendário" }).click();
    await expect(page).toHaveURL(/\/calendar/);
    await expect(nav.getByRole("link", { name: "Calendário" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expect(nav.getByRole("link", { name: "Hoje" })).not.toHaveAttribute(
      "aria-current",
      "page",
    );

    await nav.getByRole("link", { name: "Recompensas" }).click();
    await expect(page).toHaveURL(/\/rewards/);
  });

  test("mostra o saldo de Folhinhas e o e-mail da conta", async ({ page }) => {
    await page.goto("/timeline");
    const aside = page.getByRole("complementary");

    await expect(aside.getByText("Folhinhas")).toBeVisible();
    await expect(
      aside.getByRole("button", { name: "Abrir configurações" }),
    ).toBeVisible();
    // Sair mora na aba Perfil das configurações, não no menu.
    await expect(aside.getByRole("button", { name: "Sair" })).toHaveCount(0);
  });
});

test.describe("barra inferior no celular", () => {
  test.use({ viewport: { width: 390, height: 800 } });

  test("troca de tela, abre Mais e cria tarefa pelo botão central", async ({
    page,
  }) => {
    await page.goto("/today");
    await page.waitForLoadState("networkidle");
    const nav = page.getByRole("navigation", { name: "Navegação principal" });

    await nav.getByRole("link", { name: "Agenda" }).click();
    await expect(page).toHaveURL(/\/calendar/);

    await nav.getByRole("button", { name: "Mais" }).click();
    await expect(page.getByRole("link", { name: /Recompensas/ })).toBeVisible();
    const settings = page.getByRole("button", { name: /Configurações/ });
    await expect(settings).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(settings).toBeHidden();

    await page.getByRole("button", { name: "Nova tarefa" }).click();
    await expect(
      page.getByRole("dialog", { name: "O que precisa sair da cabeça?" }),
    ).toBeVisible();
  });
});
