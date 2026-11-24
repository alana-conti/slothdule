"use client";

import { useSyncExternalStore } from "react";

/** Acompanha uma media query. No servidor (e no primeiro desenho) é falsa. */
export function useMediaQuery(query: string) {
    return useSyncExternalStore(
        (listener) => {
            const list = window.matchMedia(query);
            list.addEventListener("change", listener);
            return () => list.removeEventListener("change", listener);
        },
        () => window.matchMedia(query).matches,
        () => false,
    );
}

/** O mesmo corte do `lg:` do Tailwind, onde o menu lateral aparece. */
export const DESKTOP_QUERY = "(min-width: 64rem)";
