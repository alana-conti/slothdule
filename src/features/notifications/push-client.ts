"use client";

import {
    getPushPublicKeyAction,
    savePushSubscriptionAction,
    type PushSubscriptionPayload,
} from "@/features/notifications/actions";

export type PushState = "unsupported" | "default" | "denied" | "granted";

export type EnablePushResult =
    | "enabled"
    | "denied"
    | "dismissed"
    | "unsupported"
    /** O backend ainda não tem as chaves VAPID: a permissão vale, mas nada chega. */
    | "unavailable"
    | "failed";

export function getPushState(): PushState {
    if (
        typeof window === "undefined" ||
        !("Notification" in window) ||
        !("serviceWorker" in navigator) ||
        !("PushManager" in window)
    ) {
        return "unsupported";
    }

    return Notification.permission;
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
        return await subscribeAndSave();
    } catch {
        return "failed";
    }
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
