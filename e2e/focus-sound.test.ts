import { expect, test, type Page } from "@playwright/test";

/**
 * Som do Modo foco. As gravações, o piano e a mistura tocam de verdade no
 * navegador do teste. A live de lofi usa um dublê da API do YouTube: o
 * teste não depende da rede nem de uma live estar no ar.
 */

const YOUTUBE_API = "https://www.youtube.com/iframe_api";

/** Imita o mínimo da YT.Player: um iframe, ready, play/pause e trocar vídeo. */
const FAKE_YOUTUBE_API = `
window.YT = {
  Player: function (target, options) {
    var self = this;
    var frame = document.createElement("iframe");
    frame.title = "Live de teste";
    frame.dataset.videoId = options.videoId;
    frame.style.width = "100%";
    frame.style.height = "100%";
    target.replaceWith(frame);
    function state(data) { options.events.onStateChange({ data: data, target: self }); }
    self.playVideo = function () { state(1); };
    self.pauseVideo = function () { state(2); };
    self.setVolume = function (volume) { frame.dataset.volume = String(volume); };
    self.loadVideoById = function (id) { frame.dataset.videoId = id; state(1); };
    self.destroy = function () { frame.remove(); };
    setTimeout(function () { options.events.onReady({ target: self }); }, 50);
  },
};
window.onYouTubeIframeAPIReady && window.onYouTubeIframeAPIReady();
`;

function focusPanel(page: Page) {
  return page.locator("#painel-foco");
}

async function openSoundTab(page: Page, kind: "Lofi ao vivo" | "Ambiente") {
  await page.goto("/today");
  await page.waitForLoadState("networkidle");
  await page.keyboard.press("f");

  const panel = focusPanel(page);
  const sound = panel.getByRole("region", { name: "Som" });
  await sound.getByRole("button", { name: kind }).click();
  await expect(sound.getByRole("button", { name: kind })).toHaveAttribute("aria-pressed", "true");

  return sound;
}

/** O radio é visualmente oculto: o clique vai no rótulo, como a pessoa faz. */
async function pick(sound: ReturnType<Page["locator"]>, label: string) {
  await sound.locator("label").filter({ hasText: label }).click();
  await expect(sound.getByRole("radio", { checked: true })).toHaveCount(1);
}

test.describe("modo foco: som", () => {
  test("gravações tocam, pausam, seguem entre telas e desligam", async ({ page }) => {
    const sound = await openSoundTab(page, "Ambiente");

    await pick(sound, "Chuva");
    // "Pausar som" só aparece quando o <audio> avisa que está tocando de fato.
    await expect(sound.getByRole("button", { name: "Pausar som" })).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(focusPanel(page)).toBeHidden();
    const chip = page.getByRole("button", { name: "Som: Chuva. Abrir modo foco" });
    await expect(chip).toBeVisible();

    await page.getByRole("button", { name: "Pausar som" }).click();
    await expect(page.getByRole("button", { name: "Tocar som" })).toBeVisible();
    await page.getByRole("button", { name: "Tocar som" }).click();
    await expect(page.getByRole("button", { name: "Pausar som" })).toBeVisible();

    // O som vive no layout: trocar de tela não para.
    await page
      .getByRole("navigation", { name: "Navegação principal" })
      .getByRole("link", { name: "Calendário" })
      .click();
    await expect(page).toHaveURL(/\/calendar/);
    await expect(chip).toBeVisible();
    await expect(page.getByRole("button", { name: "Pausar som" })).toBeVisible();

    // O chip abre o painel; lá dá para trocar e desligar.
    await chip.click();
    const panelSound = focusPanel(page).getByRole("region", { name: "Som" });
    await pick(panelSound, "Degelo");
    await expect(page.getByRole("button", { name: "Som: Degelo. Abrir modo foco" })).toBeVisible();

    await panelSound.getByRole("button", { name: "Desligar som" }).click();
    await expect(page.getByRole("button", { name: /^Som: / })).toHaveCount(0);

    // Recarregar lembra a aba escolhida, mas não volta a tocar sozinho.
    await page.reload();
    await page.waitForLoadState("networkidle");
    await page.keyboard.press("f");
    await expect(
      focusPanel(page).getByRole("button", { name: "Ambiente" }),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByRole("button", { name: /^Som: / })).toHaveCount(0);
  });

  test("a mistura toca do Modo foco e as camadas mudam nas configurações", async ({ page }) => {
    const sound = await openSoundTab(page, "Ambiente");

    await sound.getByRole("button", { name: "Editar camadas" }).click();
    const settings = page.getByRole("dialog", { name: "Configurações" });
    const mix = settings.getByRole("region", { name: "Mistura do Modo foco" });
    await expect(mix).toBeInViewport();

    await mix.getByRole("button", { name: "Ouvir mistura" }).click();
    await expect(mix.getByRole("button", { name: "Pausar mistura" })).toBeVisible();

    // Mexer numa camada não para a mistura e fica guardado no aparelho.
    await mix.getByLabel("Passarinhos").fill("80");
    await expect(mix.getByText("80%")).toBeVisible();
    await expect(mix.getByRole("button", { name: "Pausar mistura" })).toBeVisible();

    await settings.getByRole("button", { name: "Fechar configurações" }).click();
    await expect(page.getByRole("button", { name: "Som: Minha mistura. Abrir modo foco" })).toBeVisible();

    await page.reload();
    await page.waitForLoadState("networkidle");
    await page.keyboard.press("f");
    await focusPanel(page)
      .getByRole("region", { name: "Som" })
      .getByRole("button", { name: "Editar camadas" })
      .click();
    await expect(settings.getByLabel("Passarinhos")).toHaveValue("80");
  });

  test("a live de lofi fica à vista, pausa, troca e desliga", async ({ page }) => {
    await page.route(YOUTUBE_API, (route) =>
      route.fulfill({ body: FAKE_YOUTUBE_API, contentType: "text/javascript" }),
    );
    const sound = await openSoundTab(page, "Lofi ao vivo");

    await pick(sound, "Jazz lofi");
    const card = page.getByRole("region", { name: "Lofi ao vivo" });
    const live = card.locator("iframe");

    await expect(live).toHaveAttribute("data-video-id", "E2vONfzoyRI");
    await expect(card).toContainText("Jazz lofi");

    // O YouTube pede o player à vista, com pelo menos 200×200.
    const box = await live.boundingBox();
    expect(box?.width).toBeGreaterThanOrEqual(200);
    expect(box?.height).toBeGreaterThanOrEqual(200);

    await card.getByRole("button", { name: "Pausar som" }).click();
    await expect(card.getByRole("button", { name: "Tocar som" })).toBeVisible();

    await pick(sound, "Piano calmo");
    await expect(live).toHaveAttribute("data-video-id", "N0snMcR6aaA");
    await expect(card.getByRole("button", { name: "Pausar som" })).toBeVisible();

    await card.getByRole("button", { name: "Desligar som" }).click();
    await expect(card).toHaveCount(0);
  });

  test("sem o YouTube, avisa com calma em vez de travar", async ({ page }) => {
    await page.route(YOUTUBE_API, (route) => route.abort());
    const sound = await openSoundTab(page, "Lofi ao vivo");

    await pick(sound, "Para estudar");

    await expect(
      page.getByRole("region", { name: "Lofi ao vivo" }).getByRole("status"),
    ).toContainText("Não deu para abrir o player do YouTube");
  });
});
