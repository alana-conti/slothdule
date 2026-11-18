/** Sons que a pessoa pode escolher para quando conclui uma tarefa. */
export const completionSounds = ["folhinha", "ding-ding", "sino-de-vento"] as const;

export type CompletionSound = (typeof completionSounds)[number];

/** Tudo que o app sabe tocar: os sons de conclusão e o de "dia completo". */
export type SoundName = CompletionSound | "dia-completo";

export type SoundSettings = {
    enabled: boolean;
    /** De 0 a 100. */
    volume: number;
    completionSound: CompletionSound;
};

export const DEFAULT_SOUND_SETTINGS: SoundSettings = {
    completionSound: "folhinha",
    enabled: true,
    volume: 60,
};

/** Fica no aparelho: dá para ter o celular mudo e o computador com som. */
export const SOUND_SETTINGS_STORAGE_KEY = "slothdule:sound-settings";

/** Ganho máximo da Web Audio no volume 100: os sons são sinais, não música. */
export const MAX_GAIN = 0.6;

function isCompletionSound(value: unknown): value is CompletionSound {
    return completionSounds.includes(value as CompletionSound);
}

export function clampVolume(value: number) {
    if (!Number.isFinite(value)) {
        return DEFAULT_SOUND_SETTINGS.volume;
    }

    return Math.min(100, Math.max(0, Math.round(value)));
}

/**
 * Lê o que estiver salvo sem confiar no formato: campo inválido ou ausente
 * volta ao padrão, e o resto é mantido.
 */
export function parseSoundSettings(raw: string | null): SoundSettings {
    if (!raw) {
        return DEFAULT_SOUND_SETTINGS;
    }

    let data: unknown;

    try {
        data = JSON.parse(raw);
    } catch {
        return DEFAULT_SOUND_SETTINGS;
    }

    if (!data || typeof data !== "object") {
        return DEFAULT_SOUND_SETTINGS;
    }

    const value = data as Record<string, unknown>;

    return {
        completionSound: isCompletionSound(value.completionSound)
            ? value.completionSound
            : DEFAULT_SOUND_SETTINGS.completionSound,
        enabled:
            typeof value.enabled === "boolean"
                ? value.enabled
                : DEFAULT_SOUND_SETTINGS.enabled,
        volume:
            typeof value.volume === "number"
                ? clampVolume(value.volume)
                : DEFAULT_SOUND_SETTINGS.volume,
    };
}

/** Ganho final para a Web Audio: zero quando os sons estão desligados. */
export function getSoundGain(settings: SoundSettings) {
    if (!settings.enabled) {
        return 0;
    }

    return (clampVolume(settings.volume) / 100) * MAX_GAIN;
}
