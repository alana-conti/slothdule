import { expect, test } from "@playwright/test";

test.describe("configurações", () => {
  test("abre pelo menu lateral e salva o nome do perfil", async ({ page }) => {
    const name = `[e2e] Preguiça ${Date.now().toString(36)}`;

    await page.goto("/today");
    await page.waitForLoadState("networkidle");
    const aside = page.getByRole("complementary");

    await aside.getByRole("button", { name: "Abrir configurações" }).click();
    const dialog = page.getByRole("dialog", { name: "Configurações" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("tab", { name: "Perfil" })).toHaveAttribute(
      "aria-selected",
      "true",
    );

    const nameInput = dialog.getByLabel("Nome");
    await nameInput.fill(name);
    await dialog.getByRole("button", { name: "Salvar" }).click();
    await expect(dialog.getByRole("status")).toHaveText("Perfil salvo");
    await expect(aside).toContainText(name);

    // Deixa a conta e2e como estava: sem nome, o menu volta ao e-mail.
    await nameInput.fill("");
    await dialog.getByRole("button", { name: "Salvar" }).click();
    await expect(aside).not.toContainText(name);

    await dialog.getByRole("button", { name: "Fechar configurações" }).click();
    await expect(dialog).toBeHidden();
  });

  test("som escolhido e sons desligados ficam salvos no aparelho", async ({
    page,
  }) => {
    await page.goto("/today");
    await page.waitForLoadState("networkidle");

    const open = async () => {
      await page
        .getByRole("complementary")
        .getByRole("button", { name: "Abrir configurações" })
        .click();
      const dialog = page.getByRole("dialog", { name: "Configurações" });
      await dialog.getByRole("tab", { name: "Sons" }).click();
      return dialog;
    };

    let dialog = await open();
    await dialog.getByRole("radio", { name: /Ding-ding/ }).check();
    const toggle = dialog.getByRole("switch", { name: "Tocar sons" });
    await expect(toggle).toHaveAttribute("aria-checked", "true");
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-checked", "false");
    // Desligado, as opções ficam indisponíveis.
    await expect(dialog.getByRole("radio", { name: /Folhinha/ })).toBeDisabled();

    await page.reload();
    await page.waitForLoadState("networkidle");

    dialog = await open();
    await expect(dialog.getByRole("radio", { name: /Ding-ding/ })).toBeChecked();
    await expect(
      dialog.getByRole("switch", { name: "Tocar sons" }),
    ).toHaveAttribute("aria-checked", "false");
  });
});

test.describe("configurações no celular", () => {
  test.use({ viewport: { width: 390, height: 800 } });

  test("abre pelo menu Mais", async ({ page }) => {
    await page.goto("/today");
    await page.waitForLoadState("networkidle");

    await page
      .getByRole("navigation", { name: "Navegação principal" })
      .getByRole("button", { name: "Mais" })
      .click();
    await page.getByRole("button", { name: /Configurações/ }).click();

    const dialog = page.getByRole("dialog", { name: "Configurações" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("tab", { name: "Sons" })).toBeVisible();
  });
});
