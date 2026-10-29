import { expect, test } from "@playwright/test";

import { E2E_EMAIL, E2E_PASSWORD } from "./fixtures";

test.describe("fluxo de autenticação", () => {
  // Contexto sempre limpo: /login redireciona usuários autenticados.
  test.use({ storageState: { cookies: [], origins: [] } });

  test("rota protegida sem sessão redireciona para /login", async ({ page }) => {
    await page.goto("/today");

    await expect(page).toHaveURL(/\/login/);
  });

  test("e-mail com conta leva ao passo de login", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("E-mail").fill(E2E_EMAIL);
    await page.getByRole("button", { name: "Continuar" }).click();

    await expect(
      page.getByRole("heading", { name: "Entrar no Slothdule" }),
    ).toBeVisible();
  });

  test("e-mail sem conta leva ao passo de cadastro", async ({ page }) => {
    await page.goto("/login");
    await page
      .getByLabel("E-mail")
      .fill(`novo-${Date.now().toString(36)}@slothdule.dev`);
    await page.getByRole("button", { name: "Continuar" }).click();

    await expect(
      page.getByRole("heading", { name: "Criar sua conta" }),
    ).toBeVisible();
  });

  test("login com senha incorreta mostra mensagem amigável", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.getByLabel("E-mail").fill(E2E_EMAIL);
    await page.getByRole("button", { name: "Continuar" }).click();

    const passwordField = page.getByLabel("Senha", { exact: true });
    await expect(passwordField).toBeVisible();
    await passwordField.fill("senha-errada");
    await page.getByRole("button", { name: "Entrar com calma" }).click();

    await expect(
      page.getByRole("alert").filter({ hasText: "E-mail ou senha incorretos" }),
    ).toBeVisible();
  });

  test("login com senha correta entra no app", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("E-mail").fill(E2E_EMAIL);
    await page.getByRole("button", { name: "Continuar" }).click();

    const passwordField = page.getByLabel("Senha", { exact: true });
    await expect(passwordField).toBeVisible();
    await passwordField.fill(E2E_PASSWORD);
    await page.getByRole("button", { name: "Entrar com calma" }).click();

    await expect(page).toHaveURL(/\/today/);
    await expect(page.locator("header").getByText(E2E_EMAIL)).toBeVisible();
  });
});

test.describe("sessão", () => {
  test("botão Sair volta para /login", async ({ page }) => {
    await page.goto("/today");
    await page.getByRole("button", { name: "Sair" }).click();

    await expect(page).toHaveURL(/\/login/);
  });
});
