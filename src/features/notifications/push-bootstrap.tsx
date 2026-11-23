"use client";

import { useEffect } from "react";

import { getPushState, promptPushOnFirstVisit, syncPush } from "./push-client";

/**
 * Sem nada na tela: mantém a inscrição deste aparelho em dia e, na primeira
 * visita depois do login, pede a permissão do navegador.
 */
export function PushBootstrap() {
    useEffect(() => {
        if (getPushState() === "granted") {
            void syncPush();
            return;
        }

        promptPushOnFirstVisit();
    }, []);

    return null;
}
