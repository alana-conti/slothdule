"use client";

import { useState, useSyncExternalStore } from "react";

import {
    enablePush,
    getPushState,
    pushResultMessages,
    type PushState,
} from "@/features/notifications/push-client";

const noop = () => () => {};

/** "Lembrar no horário" do novo hábito, com o atalho para ativar o push aqui. */
export function ReminderField() {
    const [remind, setRemind] = useState(false);
    const initialState = useSyncExternalStore<PushState>(noop, getPushState, () => "default");
    const [pushState, setPushState] = useState<PushState | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const state = pushState ?? initialState;

    async function activate() {
        setBusy(true);
        const result = await enablePush();
        setBusy(false);
        setPushState(getPushState());
        setMessage(
            result === "enabled"
                ? "Pronto. Este aparelho vai receber os lembretes."
                : pushResultMessages[result],
        );
    }

    return (
        <div className="mt-3 rounded-2xl border border-sloth-border bg-sloth-card p-3">
            <label className="flex min-h-10 cursor-pointer items-center gap-3 text-sm text-sloth-ink">
                <input
                    checked={remind}
                    className="size-5 shrink-0 cursor-pointer accent-sloth-moss"
                    name="remind"
                    onChange={(event) => setRemind(event.target.checked)}
                    type="checkbox"
                />
                <span>
                    <span className="font-medium">Lembrar no horário</span>
                    <span className="block text-[13px] text-sloth-muted">
                        Uma notificação gentil, só se ainda não tiver cuidado nesse dia.
                    </span>
                </span>
            </label>

            {remind && state !== "granted" ? (
                <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-sloth-border/70 pt-3 text-[13px] text-sloth-muted">
                    <p className="min-w-0 flex-1">
                        {state === "denied"
                            ? pushResultMessages.denied
                            : state === "unsupported"
                              ? pushResultMessages.unsupported
                              : "Para o lembrete chegar, ative as notificações neste aparelho."}
                    </p>
                    {state === "default" ? (
                        <button
                            className="min-h-10 cursor-pointer rounded-xl border border-sloth-moss px-3 text-sm font-semibold text-sloth-forest transition hover:bg-sloth-moss hover:text-white disabled:opacity-60"
                            disabled={busy}
                            onClick={activate}
                            type="button"
                        >
                            {busy ? "Ativando…" : "Ativar notificações"}
                        </button>
                    ) : null}
                </div>
            ) : null}

            {message ? (
                <p aria-live="polite" className="mt-2 text-[13px] font-medium text-sloth-forest">
                    {message}
                </p>
            ) : null}
        </div>
    );
}
