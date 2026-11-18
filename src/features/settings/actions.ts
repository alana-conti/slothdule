"use server";

import { revalidatePath } from "next/cache";

import { apiJson } from "@/lib/api/server";
import type { ApiUser } from "@/lib/api/server";

import { DISPLAY_NAME_MAX_LENGTH } from "./profile";

export type ProfileActionResult =
    | { ok: true; displayName: string | null }
    | { ok: false; error: string };

/** Salva o nome. Vazio apaga o nome e o app volta a mostrar o e-mail. */
export async function updateProfileAction(
    displayName: string,
): Promise<ProfileActionResult> {
    const name = displayName.trim();

    if (name.length > DISPLAY_NAME_MAX_LENGTH) {
        return {
            ok: false,
            error: `Use até ${DISPLAY_NAME_MAX_LENGTH} caracteres no nome.`,
        };
    }

    try {
        const user = await apiJson<ApiUser>("/auth/me", {
            body: JSON.stringify({ display_name: name || null }),
            method: "PATCH",
        });

        revalidatePath("/", "layout");

        return { ok: true, displayName: user.display_name };
    } catch (error) {
        return {
            ok: false,
            error:
                error instanceof Error
                    ? error.message
                    : "Não foi possível salvar seu perfil.",
        };
    }
}
