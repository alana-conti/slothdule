/**
 * Som para trabalhar no Modo foco: lives de lofi do YouTube e sons de
 * ambiente (gravações da natureza, um piano feito no app e a mistura deles).
 */

export type SoundKind = "lofi" | "nature";

export type LofiStation = {
    id: string;
    label: string;
    channel: string;
    /** ID do vídeo da live no YouTube. */
    videoId: string;
};

/**
 * Lives curadas. Os canais às vezes encerram uma live e abrem outra com novo
 * ID (a "lofi hip hop radio 📚" da Lofi Girl já trocou): quando uma cair, o
 * player avisa e basta trocar o `videoId` aqui. Conferidas em 24/11/2026.
 */
export const LOFI_STATIONS: readonly LofiStation[] = [
    { channel: "Lofi Girl", id: "estudar", label: "Para estudar", videoId: "rFZHOHl-L8A" },
    { channel: "Lofi Girl", id: "jazz", label: "Jazz lofi", videoId: "E2vONfzoyRI" },
    { channel: "Lofi Girl", id: "piano", label: "Piano calmo", videoId: "N0snMcR6aaA" },
    { channel: "Chillhop Music", id: "chillhop", label: "Chillhop", videoId: "5yx6BWlEVcY" },
    { channel: "Lofi Girl", id: "synthwave", label: "Synthwave", videoId: "4xDzrJKXOOY" },
];

export function findStation(id: string) {
    return LOFI_STATIONS.find((station) => station.id === id) ?? null;
}

/**
 * Gravações reais, em loop de 75 s com emenda suave, cortadas de arquivos do
 * Wikimedia Commons. Ficam em `public/sounds/foco/`.
 */
export const recordings = ["chuva-janela", "chuva-trovao", "degelo", "passaros"] as const;

export type Recording = (typeof recordings)[number];

/** Gravações, o piano feito no app e a mistura de camadas. */
export const natureSounds = [...recordings, "piano", "mistura"] as const;

export type NatureSound = (typeof natureSounds)[number];

export const NATURE_LABELS: Record<NatureSound, string> = {
    "chuva-janela": "Chuva",
    "chuva-trovao": "Trovão longe",
    degelo: "Degelo",
    mistura: "Minha mistura",
    passaros: "Passarinhos",
    piano: "Piano suave",
};

export function recordingUrl(sound: Recording) {
    return `/sounds/foco/${sound}.mp3`;
}

export type RecordingCredit = {
    author: string;
    license: string;
    licenseUrl: string | null;
    /** Página do arquivo original no Wikimedia Commons. */
    source: string;
};

/** O trecho foi cortado e teve o volume ajustado; a licença segue a do original. */
export const RECORDING_CREDITS: Record<Recording, RecordingCredit> = {
    "chuva-janela": {
        author: "cori",
        license: "Domínio público",
        licenseUrl: null,
        source: "https://commons.wikimedia.org/wiki/File:Rain_against_the_window.ogg",
    },
    "chuva-trovao": {
        author: "kvgarlic (Freesound)",
        license: "CC0",
        licenseUrl: "https://creativecommons.org/publicdomain/zero/1.0/deed.pt_BR",
        source: "https://commons.wikimedia.org/wiki/File:Light_Rain_Distant_Thunder_July_5th_2016.wav",
    },
    degelo: {
        author: "Extemporalist",
        license: "CC0",
        licenseUrl: "https://creativecommons.org/publicdomain/zero/1.0/deed.pt_BR",
        source: "https://commons.wikimedia.org/wiki/File:Snowmelt_flowing_into_lake_at_Okanagan_Mountain_Provincial_Park.flac",
    },
    passaros: {
        author: "Matutinho",
        license: "CC BY-SA 4.0",
        licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/deed.pt_BR",
        source: "https://commons.wikimedia.org/wiki/File:Birdsong_morning_01.ogg",
    },
};

/** Camadas da mistura: as gravações e o piano, cada uma com seu volume (0 a 100). */
export const mixLayers = [...recordings, "piano"] as const;

export type MixLayer = (typeof mixLayers)[number];

export type MixLevels = Record<MixLayer, number>;

export const DEFAULT_MIX: MixLevels = {
    "chuva-janela": 60,
    "chuva-trovao": 0,
    degelo: 0,
    passaros: 25,
    piano: 40,
};

export function isMixSilent(mix: MixLevels) {
    return mixLayers.every((layer) => mix[layer] <= 0);
}

/** O que está tocando nesta aba. */
export type SoundChoice = { kind: "lofi"; id: string } | { kind: "nature"; id: NatureSound };

export function choiceLabel(choice: SoundChoice) {
    return choice.kind === "lofi"
        ? (findStation(choice.id)?.label ?? "Lofi")
        : NATURE_LABELS[choice.id];
}

/** Preferências que ficam no aparelho: a aba de som, o volume e a mistura. */
export type SoundPrefs = { kind: SoundKind; mix: MixLevels; volume: number };

export const DEFAULT_SOUND_PREFS: SoundPrefs = { kind: "lofi", mix: DEFAULT_MIX, volume: 60 };

export function clampSoundVolume(value: number, fallback = DEFAULT_SOUND_PREFS.volume) {
    if (!Number.isFinite(value)) {
        return fallback;
    }

    return Math.min(100, Math.max(0, Math.round(value)));
}

/** Sem mistura salva, vale a padrão; camada que faltar fica em silêncio. */
function parseMix(value: unknown): MixLevels {
    if (!value || typeof value !== "object") {
        return DEFAULT_MIX;
    }

    const saved = value as Record<string, unknown>;

    return Object.fromEntries(
        mixLayers.map((layer) => {
            const level = saved[layer];

            return [layer, typeof level === "number" ? clampSoundVolume(level, 0) : 0];
        }),
    ) as MixLevels;
}

/** Lê o que estiver salvo sem confiar no formato: o que não servir volta ao padrão. */
export function parseSoundPrefs(raw: string | null): SoundPrefs {
    if (!raw) {
        return DEFAULT_SOUND_PREFS;
    }

    let data: unknown;

    try {
        data = JSON.parse(raw);
    } catch {
        return DEFAULT_SOUND_PREFS;
    }

    if (!data || typeof data !== "object") {
        return DEFAULT_SOUND_PREFS;
    }

    const value = data as Record<string, unknown>;

    return {
        kind: value.kind === "lofi" || value.kind === "nature" ? value.kind : DEFAULT_SOUND_PREFS.kind,
        mix: parseMix(value.mix),
        volume:
            typeof value.volume === "number"
                ? clampSoundVolume(value.volume)
                : DEFAULT_SOUND_PREFS.volume,
    };
}
