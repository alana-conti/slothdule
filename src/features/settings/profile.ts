/** Limite do nome no Perfil; o backend valida o mesmo valor. */
export const DISPLAY_NAME_MAX_LENGTH = 60;

/** Dados da conta que o menu e a tela de Perfil mostram. */
export type SettingsUser = {
    avatarUrl: string | null;
    createdAt: string | null;
    displayName: string | null;
    email: string;
    googleLinked: boolean;
};

/** Letra do avatar quando não há foto: do nome, ou do e-mail. */
export function getUserInitial(user: Pick<SettingsUser, "displayName" | "email">) {
    return (user.displayName?.trim() || user.email).charAt(0).toUpperCase();
}

/** "maio de 2026", no fuso do app. */
export function formatMemberSince(createdAt: string | null) {
    if (!createdAt) {
        return null;
    }

    const date = new Date(createdAt);

    if (Number.isNaN(date.getTime())) {
        return null;
    }

    return new Intl.DateTimeFormat("pt-BR", {
        month: "long",
        timeZone: "America/Sao_Paulo",
        year: "numeric",
    }).format(date);
}
