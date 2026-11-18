"use client";

import { useState, useTransition } from "react";

import { deleteHabitAction } from "@/features/habits/actions";

export function DeleteHabitControl({ habitId, title }: { habitId: string; title: string }) {
    const [confirming, setConfirming] = useState(false);
    const [pending, startTransition] = useTransition();

    if (!confirming) {
        return (
            <button
                className="min-h-11 cursor-pointer rounded-xl px-3 text-sm text-sloth-muted transition hover:bg-sloth-beige hover:text-sloth-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sloth-forest"
                onClick={() => setConfirming(true)}
                type="button"
            >
                Remover hábito
            </button>
        );
    }

    return (
        <div
            className="flex flex-wrap items-center gap-2 rounded-2xl border border-sloth-terracotta/30 bg-sloth-terracotta/8 p-3 text-sm text-sloth-ink"
            role="group"
        >
            <p className="min-w-0 flex-1">
                Remover “{title}” do jardim? As Folhinhas que ele já rendeu continuam com você.
            </p>
            <button
                className="min-h-10 cursor-pointer rounded-xl px-3 text-sm text-sloth-muted transition hover:bg-sloth-beige"
                disabled={pending}
                onClick={() => setConfirming(false)}
                type="button"
            >
                Manter
            </button>
            <button
                className="min-h-10 cursor-pointer rounded-xl bg-sloth-terracotta px-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
                disabled={pending}
                onClick={() => startTransition(() => deleteHabitAction(habitId))}
                type="button"
            >
                {pending ? "Removendo…" : "Remover"}
            </button>
        </div>
    );
}
