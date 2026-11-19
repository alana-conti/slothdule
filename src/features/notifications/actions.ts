"use server";

import { apiFetch, apiJson } from "@/lib/api/server";

export type PushSubscriptionPayload = {
    endpoint: string;
    keys: { auth: string; p256dh: string };
};

/** Chave pública VAPID do backend; `null` quando o push não está configurado. */
export async function getPushPublicKeyAction(): Promise<string | null> {
    try {
        const data = await apiJson<{ public_key: string | null }>("/push/public-key");
        return data.public_key;
    } catch {
        return null;
    }
}

export async function savePushSubscriptionAction(subscription: PushSubscriptionPayload) {
    const response = await apiFetch("/push/subscriptions", {
        body: JSON.stringify(subscription),
        method: "POST",
    });

    return response.ok;
}

export async function removePushSubscriptionAction(endpoint: string) {
    const response = await apiFetch("/push/subscriptions/remove", {
        body: JSON.stringify({ endpoint }),
        method: "POST",
    });

    return response.ok;
}
