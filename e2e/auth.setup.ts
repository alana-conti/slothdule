import { expect, test as setup } from "@playwright/test";

import { API_URL, AUTH_STATE_PATH, E2E_CATEGORY_NAME, E2E_EMAIL, E2E_PASSWORD } from "./fixtures";

setup("autenticar usuário e2e e preparar dados", async ({ page }) => {
  const request = page.request;

  try {
    await request.get(`${API_URL}/health`);
  } catch {
    throw new Error(
      "Stack local não respondendo (web em :3000, API em :8002). Rode `make test-e2e` ou `make dev` antes de executar a suite.",
    );
  }

  const signup = await request.post(`${API_URL}/auth/signup`, {
    data: { email: E2E_EMAIL, password: E2E_PASSWORD },
  });
  const createdOrAlreadyExists = signup.ok() || signup.status() === 400;
  expect(
    createdOrAlreadyExists,
    "não foi possível garantir o usuário e2e",
  ).toBeTruthy();

  await page.goto("/login");
  await page.getByLabel("E-mail").fill(E2E_EMAIL);
  await page.getByRole("button", { name: "Continuar" }).click();

  const passwordField = page.getByLabel("Senha", { exact: true });
  await expect(passwordField).toBeVisible();
  await passwordField.fill(E2E_PASSWORD);
  await page.getByRole("button", { name: "Entrar com calma" }).click();

  await expect(page).toHaveURL(/\/today/);

  const categoriesResponse = await request.get(`${API_URL}/categories`);
  const categories = (await categoriesResponse.json()) as Array<{
    slug: string;
  }>;

  if (!categories.some((category) => category.slug === "e2e")) {
    const created = await request.post(`${API_URL}/categories`, {
      data: { name: E2E_CATEGORY_NAME, slug: "e2e" },
    });
    expect(created.ok(), "não foi possível criar a categoria e2e").toBeTruthy();
  }

  await page.context().storageState({ path: AUTH_STATE_PATH });
});
