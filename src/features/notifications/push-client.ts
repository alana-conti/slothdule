"use client";

import {
    getPushPublicKeyAction,
    removePushSubscriptionAction,
    savePushSubscriptionAction,
    type PushSubscriptionPayload,
} from "@/features/notifications/actions";
import { pickMascotNotification } from "@/lib/mascot-notifications";

/** Desligado nas configurações: o navegador ainda permite, mas o app não inscreve. */
const OPT_OUT_STORAGE_KEY = "slothdule:push-opt-out";
/** Já pedimos a permissão uma vez neste aparelho; não insistimos de novo. */
const PROMPTED_STORAGE_KEY = "slothdule:push-prompted";

function readFlag(key: string) {
    try {
        return window.localStorage.getItem(key) === "1";
    } catch {
        return false;
    }
}

function writeFlag(key: string, value: boolean) {
    try {
        if (value) {
            window.localStorage.setItem(key, "1");
        } else {
            window.localStorage.removeItem(key);
        }
    } catch {
        // Sem armazenamento (aba privada): segue sem lembrar a escolha.
    }
}

export type PushState = "unsupported" | "default" | "denied" | "granted";

export type EnablePushResult =
    | "enabled"
    | "denied"
    | "dismissed"
    | "unsupported"
    /** O backend ainda não tem as chaves VAPID: a permissão vale, mas nada chega. */
    | "unavailable"
    | "failed";

function isPushSupported() {
    return (
        typeof window !== "undefined" &&
        "Notification" in window &&
        "serviceWorker" in navigator &&
        "PushManager" in window
    );
}

/**
 * Estado das notificações para o app. Com a permissão dada mas desligadas
 * nas configurações, vale como "default": dá para ativar de novo sem o
 * navegador perguntar outra vez.
 */
export function getPushState(): PushState {
    if (!isPushSupported()) {
        return "unsupported";
    }

    const permission = Notification.permission;

    if (permission === "granted" && readFlag(OPT_OUT_STORAGE_KEY)) {
        return "default";
    }

    return permission;
}

function urlBase64ToUint8Array(base64String: string) {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const rawData = window.atob(base64);
    const output = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        output[i] = rawData.charCodeAt(i);
    }

    return output;
}

function sameKey(subscription: PushSubscription, key: Uint8Array) {
    const current = subscription.options.applicationServerKey;

    if (!current) {
        return false;
    }

    const bytes = new Uint8Array(current);

    return bytes.length === key.length && bytes.every((value, index) => value === key[index]);
}

/**
 * Garante que este aparelho está inscrito com a chave atual do backend e
 * avisa o backend. Exige permissão já concedida.
 */
async function subscribeAndSave(): Promise<EnablePushResult> {
    const publicKey = await getPushPublicKeyAction();

    if (!publicKey) {
        return "unavailable";
    }

    const key = urlBase64ToUint8Array(publicKey);
    const registration = await navigator.serviceWorker.ready;
    let subscription = await registration.pushManager.getSubscription();

    // Chave trocada no servidor: a inscrição antiga não recebe mais nada.
    if (subscription && !sameKey(subscription, key)) {
        await subscription.unsubscribe();
        subscription = null;
    }

    subscription ??= await registration.pushManager.subscribe({
        applicationServerKey: key,
        userVisibleOnly: true,
    });

    const json = subscription.toJSON();

    if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
        return "failed";
    }

    const saved = await savePushSubscriptionAction({
        endpoint: json.endpoint,
        keys: { auth: json.keys.auth, p256dh: json.keys.p256dh },
    } satisfies PushSubscriptionPayload);

    return saved ? "enabled" : "failed";
}

/** Pede permissão (se preciso) e inscreve este aparelho nos lembretes. */
export async function enablePush(): Promise<EnablePushResult> {
    const state = getPushState();

    if (state === "unsupported") {
        return "unsupported";
    }

    if (state === "denied") {
        return "denied";
    }

    if (state === "default") {
        const permission = await Notification.requestPermission();

        if (permission === "denied") {
            return "denied";
        }

        if (permission !== "granted") {
            return "dismissed";
        }
    }

    try {
        const result = await subscribeAndSave();

        if (result === "enabled") {
            writeFlag(OPT_OUT_STORAGE_KEY, false);
        }

        return result;
    } catch {
        return "failed";
    }
}

/**
 * Desliga as notificações neste aparelho: cancela a inscrição e avisa o
 * backend. A permissão do navegador fica como está (só a pessoa muda lá).
 */
export async function disablePush() {
    writeFlag(OPT_OUT_STORAGE_KEY, true);

    if (!isPushSupported()) {
        return;
    }

    try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();

        if (subscription) {
            const { endpoint } = subscription;

            await subscription.unsubscribe();
            await removePushSubscriptionAction(endpoint);
        }
    } catch {
        // A escolha já está salva: sem inscrição local, nada chega aqui.
    }
}

/** Uma notificação de exemplo, mostrada direto pelo service worker. */
export async function sendTestNotification() {
    if (getPushState() !== "granted") {
        return false;
    }

    try {
        const registration = await navigator.serviceWorker.ready;
        const notification = pickMascotNotification();

        await registration.showNotification(`${notification.title} 🦥`, {
            badge: "/images/sloth-mascot.png",
            body: notification.body,
            icon: "/images/sloth-mascot.png",
            tag: "sloth-test-reminder",
        });

        return true;
    } catch {
        return false;
    }
}

let firstVisitPromptStarted = false;

/**
 * Na primeira visita deste aparelho, pede a permissão sem mostrar nada na
 * tela: só o pedido do próprio navegador. Navegadores que exigem um gesto
 * (Safari, Firefox) recusam o pedido na hora; aí ele vem no primeiro toque.
 */
export function promptPushOnFirstVisit() {
    if (
        firstVisitPromptStarted ||
        !isPushSupported() ||
        Notification.permission !== "default" ||
        readFlag(PROMPTED_STORAGE_KEY)
    ) {
        return;
    }

    firstVisitPromptStarted = true;
    writeFlag(PROMPTED_STORAGE_KEY, true);

    const startedAt = performance.now();

    void enablePush().then((result) => {
        // Resposta em menos de um instante: o navegador nem mostrou o pedido.
        if (result !== "dismissed" || performance.now() - startedAt > 600) {
            return;
        }

        const askOnGesture = () => {
            window.removeEventListener("click", askOnGesture, true);
            window.removeEventListener("keydown", askOnGesture, true);

            if (Notification.permission === "default") {
                void enablePush();
            }
        };

        window.addEventListener("click", askOnGesture, true);
        window.addEventListener("keydown", askOnGesture, true);
    });
}

/** Com permissão já dada, mantém a inscrição deste aparelho em dia, em silêncio. */
export async function syncPush() {
    if (getPushState() !== "granted") {
        return;
    }

    try {
        await subscribeAndSave();
    } catch {
        // Silencioso: o botão de ativar continua disponível para tentar de novo.
    }
}

export const pushResultMessages: Record<Exclude<EnablePushResult, "enabled">, string> = {
    denied: "As notificações estão bloqueadas no navegador. Dá para liberar nas configurações do site.",
    dismissed: "Tudo bem. Quando quiser, é só ativar de novo.",
    failed: "Não deu para ativar os lembretes agora. Tente de novo daqui a pouco.",
    unavailable: "Os lembretes por push ainda não estão configurados no servidor.",
    unsupported: "Este navegador não recebe notificações. No iPhone, instale o Slothdule na tela de início.",
};
