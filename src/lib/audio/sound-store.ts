"use client";

import { useSyncExternalStore } from "react";

import {
    DEFAULT_SOUND_SETTINGS,
    SOUND_SETTINGS_STORAGE_KEY,
    parseSoundSettings,
} from "./sound-settings";
import type { SoundSettings } from "./sound-settings";

const listeners = new Set<() => void>();
let cachedRaw: string | null | undefined;
let cachedSettings: SoundSettings = DEFAULT_SOUND_SETTINGS;

function readRaw() {
    try {
        return window.localStorage.getItem(SOUND_SETTINGS_STORAGE_KEY);
    } catch {
        // Aba anônima ou armazenamento bloqueado: segue com o padrão.
        return null;
    }
}

/** Preferências atuais deste aparelho. Mesmo objeto enquanto nada mudar. */
export function getSoundSettings(): SoundSettings {
    if (typeof window === "undefined") {
        return DEFAULT_SOUND_SETTINGS;
    }

    const raw = readRaw();

    if (raw !== cachedRaw) {
        cachedRaw = raw;
        cachedSettings = parseSoundSettings(raw);
    }

    return cachedSettings;
}

export function updateSoundSettings(patch: Partial<SoundSettings>) {
    const next = { ...getSoundSettings(), ...patch };
    const raw = JSON.stringify(next);

    try {
        window.localStorage.setItem(SOUND_SETTINGS_STORAGE_KEY, raw);
        cachedRaw = raw;
    } catch {
        // Sem armazenamento, a mudança vale só até recarregar a página.
        cachedRaw = undefined;
    }

    cachedSettings = next;
    listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
    listeners.add(listener);

    // Outra aba mudou as preferências: esta acompanha.
    function handleStorage(event: StorageEvent) {
        if (event.key === SOUND_SETTINGS_STORAGE_KEY) {
            listener();
        }
    }

    window.addEventListener("storage", handleStorage);

    return () => {
        listeners.delete(listener);
        window.removeEventListener("storage", handleStorage);
    };
}

export function useSoundSettings() {
    return useSyncExternalStore(
        subscribe,
        getSoundSettings,
        () => DEFAULT_SOUND_SETTINGS,
    );
}
