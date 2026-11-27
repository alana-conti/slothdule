import { expect, test, type Page } from "@playwright/test";

import { createTaskByForm, taskCard, todayKey, uniqueTitle } from "./fixtures";

function section(page: Page, heading: string) {
  return page
    .locator("section")
    .filter({ has: page.getByRole("heading", { name: heading, exact: true }) });
}

test.describe("plano do dia", () => {
  test("aceitar põe no plano; recusar deixa em Também para hoje, de onde dá para trazer", async ({
    page,
  }) => {
    const accepted = uniqueTitle("Plano aceita");
    const declined = uniqueTitle("Plano recusada");
    await createTaskByForm(page, { title: accepted, dueDate: todayKey() });
    await createTaskByForm(page, { title: declined, dueDate: todayKey() });

    const suggestions = page.getByRole("region", { name: "Sugestões para o plano" });
    const plan = page.getByRole("list", { name: "Plano do dia, em ordem" });
    await expect(taskCard(page, accepted)).toBeVisible();
    await expect(suggestions).toContainText(accepted);
    await expect(suggestions).toContainText(declined);

    await taskCard(page, accepted).getByRole("button", { name: "Aceitar" }).click();
    await expect(plan).toContainText(accepted);

    await taskCard(page, declined).getByRole("button", { name: "Hoje não" }).click();
    const outside = section(page, "Também para hoje");
    await expect(outside).toContainText(declined);
    await expect(suggestions.filter({ hasText: declined })).toHaveCount(0);

    // Vale depois de recarregar e pode voltar para o plano.
    await page.reload();
    await expect(plan).toContainText(accepted);
    await taskCard(page, declined).getByRole("button", { name: "Pôr no plano" }).click();
    await expect(plan).toContainText(declined);

    // Tirar do plano devolve para Também para hoje.
    const card = taskCard(page, declined);
    await card.getByRole("button", { name: "Mostrar detalhes" }).click();
    await card.getByRole("button", { name: "Tirar do plano" }).click();
    await expect(outside).toContainText(declined);
  });

  test("reordenar pelo teclado muda a ordem e ela fica salva", async ({
    page,
  }) => {
    const first = uniqueTitle("Plano primeira");
    const second = uniqueTitle("Plano segunda");
    await createTaskByForm(page, { title: first, dueDate: todayKey() });
    await createTaskByForm(page, { title: second, dueDate: todayKey() });

    const plan = page.getByRole("list", { name: "Plano do dia, em ordem" });
    for (const title of [first, second]) {
      await taskCard(page, title).getByRole("button", { name: "Aceitar" }).click();
      await expect(plan).toContainText(title);
    }

    const order = async () =>
      (await plan.getByRole("heading", { level: 3 }).allTextContents()).filter(
        (text) => text === first || text === second,
      );
    await expect.poll(order).toEqual([first, second]);

    // Com o foco no botão Mover, a seta já move uma posição (sem pegar e soltar).
    const handle = page.getByRole("button", { name: `Mover ${second}:` });
    await handle.focus();
    await page.keyboard.press("ArrowUp");
    await expect.poll(order).toEqual([second, first]);
    // O foco segue a tarefa: dá para continuar apertando as setas.
    await expect(handle).toBeFocused();

    await page.reload();
    await expect.poll(order).toEqual([second, first]);
  });

  test("arrastar o próprio card com o mouse muda a ordem; clicar segue abrindo os detalhes", async ({
    page,
  }) => {
    const first = uniqueTitle("Card primeira");
    const second = uniqueTitle("Card segunda");
    await createTaskByForm(page, { title: first, dueDate: todayKey() });
    await createTaskByForm(page, { title: second, dueDate: todayKey() });

    const plan = page.getByRole("list", { name: "Plano do dia, em ordem" });
    for (const title of [first, second]) {
      await taskCard(page, title).getByRole("button", { name: "Aceitar" }).click();
      await expect(plan).toContainText(title);
    }

    const order = async () =>
      (await plan.getByRole("heading", { level: 3 }).allTextContents()).filter(
        (text) => text === first || text === second,
      );
    await expect.poll(order).toEqual([first, second]);

    // Pega pelo título e solta em cima da primeira.
    await taskCard(page, second).scrollIntoViewIfNeeded();
    const from = await taskCard(page, second).getByRole("heading").boundingBox();
    const to = await taskCard(page, first).boundingBox();
    if (!from || !to) throw new Error("cards fora da tela");
    await page.mouse.move(from.x + 20, from.y + from.height / 2);
    await page.mouse.down();
    await page.mouse.move(from.x + 20, from.y - 10, { steps: 5 });
    await page.mouse.move(from.x + 20, to.y + 5, { steps: 10 });
    await page.mouse.up();
    await expect.poll(order).toEqual([second, first]);
    // Arrastar não conta como clique: o título não entrou em edição.
    await expect(plan.getByLabel("Título da tarefa")).toHaveCount(0);

    await page.reload();
    await expect.poll(order).toEqual([second, first]);
  });
});
