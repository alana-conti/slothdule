import { expect, type Page } from "@playwright/test";

// Credenciais do usuário de teste criado/reutilizado pelo setup.
export const E2E_EMAIL = "e2e@slothdule.dev";
export const E2E_PASSWORD = "slothdule-e2e-123456";
export const E2E_TITLE_PREFIX = "[e2e]";
// Categoria criada pelo setup para o formulário detalhado (obrigatória).
export const E2E_CATEGORY_NAME = "E2E";

export const API_URL = process.env.E2E_API_URL ?? "http://localhost:8002";
export const AUTH_STATE_PATH = ".playwright/.auth/user.json";

const APP_TIME_ZONE = "America/Sao_Paulo";

export function uniqueTitle(base: string) {
  return `${E2E_TITLE_PREFIX} ${base} ${Date.now().toString(36)}`;
}

/** Mesma regra do app (src/features/tasks/today.ts): data de hoje em pt-BR. */
export function todayKey(offsetDays = 0) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + offsetDays);
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: APP_TIME_ZONE,
  }).formatToParts(date);
  const values = new Map(parts.map((part) => [part.type, part.value]));

  return `${values.get("year")}-${values.get("month")}-${values.get("day")}`;
}

export function taskCard(page: Page, title: string) {
  return page
    .locator("article")
    .filter({ has: page.getByRole("heading", { name: title, exact: true }) });
}

export function statusToast(page: Page, text: string) {
  return page.getByRole("status").filter({ hasText: text });
}

export async function createTaskByForm(
  page: Page,
  options: { title: string; dueDate: string },
) {
  await page.goto("/today");
  // Sem hidratar, o clique no botão (ou a tecla N) não faz nada.
  await page.waitForLoadState("networkidle");

  await page.getByRole("button", { name: "Nova tarefa" }).click();
  const section = page.getByRole("dialog", { name: "O que precisa sair da cabeça?" });
  await section.getByLabel("Título").fill(options.title);
  await section
    .getByLabel("Categoria")
    .selectOption({ label: E2E_CATEGORY_NAME });
  await section.getByLabel("Prazo").fill(options.dueDate);

  await section.getByRole("button", { name: "Criar tarefa" }).click();

  await expectToastAndOpenTask(page, "Tarefa criada", options.title);
}

async function expectToastAndOpenTask(
  page: Page,
  toastText: string,
  title: string,
) {
  await expectToast(page, toastText);
  await expect(taskCard(page, title)).toBeVisible();
}

export async function expectToast(page: Page, text: string) {
  await expect(statusToast(page, text)).toBeVisible();
}

export async function readLeafBalance(page: Page) {
  const headerText = await page
    .locator("header p")
    .filter({ hasText: "Folhinhas" })
    .first()
    .textContent();

  const match = headerText?.match(/(\d+)\s*Folhinhas/);
  const balance = Number(match?.[1]);

  if (!Number.isFinite(balance)) {
    throw new Error("Não foi possível ler o saldo de Folhinhas no header.");
  }

  return balance;
}
