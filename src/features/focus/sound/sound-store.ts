"use client";

import { useSyncExternalStore } from "react";

import {
    pauseAmbient,
    resumeAmbient,
    setAmbientLevels,
    setAmbientVolume,
    startAmbient,
    stopAmbient,
} from "./ambient-audio";
import { DEFAULT_SOUND_PREFS, clampSoundVolume, isMixSilent, mixLayers, parseSoundPrefs } from "./catalog";
import type { MixLayer, MixLevels, SoundChoice, SoundKind, SoundPrefs } from "./catalog";
import { pauseNature, resumeNature, setNatureVolume, startNature, stopNature } from "./nature-audio";

/**
 * O som do Modo foco tem duas partes:
 * - preferências (aba de som e volume), que ficam no aparelho;
 * - o que toca agora, que vale só para esta aba. Duas abas não tocam juntas
 *   por acidente, e recarregar a página para o som (o navegador exige um
 *   clique para voltar a tocar).
 */
export const SOUND_PREFS_STORAGE_KEY = "slothdule:focus-sound";

export type SoundState = {
    prefs: SoundPrefs;
    current: SoundChoice | null;
    /** O que o player diz de fato: tocando ou parado. */
    playing: boolean;
    problem: string | null;
    /** Cada escolha conta como nova tentativa: a live recomeça do zero. */
    attempt: number;
};

/** Cada player (lofi, natureza) se registra para receber os comandos. */
export type SoundController = {
    play: () => void;
    pause: () => void;
    setVolume: (volume: number) => void;
};

const SERVER_STATE: SoundState = {
    attempt: 0,
    current: null,
    playing: false,
    prefs: DEFAULT_SOUND_PREFS,
    problem: null,
};

const listeners = new Set<() => void>();
let cachedRaw: string | null | undefined;
let prefs: SoundPrefs = DEFAULT_SOUND_PREFS;
let runtime: Omit<SoundState, "prefs"> = {
    attempt: 0,
    current: null,
    playing: false,
    problem: null,
};
let snapshot: SoundState = SERVER_STATE;
let controller: SoundController | null = null;

function readRaw() {
    try {
        return window.localStorage.getItem(SOUND_PREFS_STORAGE_KEY);
    } catch {
        return null;
    }
}

/** Estado atual. Mesmo objeto enquanto nada mudar (pede o useSyncExternalStore). */
export function getSoundState(): SoundState {
    if (typeof window === "undefined") {
        return SERVER_STATE;
    }

    const raw = readRaw();

    if (raw !== cachedRaw) {
        cachedRaw = raw;
        prefs = parseSoundPrefs(raw);
        snapshot = { ...runtime, prefs };
    } else if (snapshot.prefs !== prefs || snapshot === SERVER_STATE) {
        snapshot = { ...runtime, prefs };
    }

    return snapshot;
}

function emit() {
    snapshot = { ...runtime, prefs };
    listeners.forEach((listener) => listener());
}

function setRuntime(patch: Partial<typeof runtime>) {
    runtime = { ...runtime, ...patch };
    emit();
}

function setPrefs(patch: Partial<SoundPrefs>) {
    prefs = { ...getSoundState().prefs, ...patch };
    const raw = JSON.stringify(prefs);

    try {
        window.localStorage.setItem(SOUND_PREFS_STORAGE_KEY, raw);
        cachedRaw = raw;
    } catch {
        // Sem armazenamento, a preferência vale até recarregar.
    }

    emit();
}

function subscribe(listener: () => void) {
    listeners.add(listener);

    function handleStorage(event: StorageEvent) {
        if (event.key === SOUND_PREFS_STORAGE_KEY) {
            listener();
        }
    }

    window.addEventListener("storage", handleStorage);

    return () => {
        listeners.delete(listener);
        window.removeEventListener("storage", handleStorage);
    };
}

export function useSoundState() {
    return useSyncExternalStore(subscribe, getSoundState, () => SERVER_STATE);
}

/* Do lado dos players */

/** A live registra o seu controle quando fica pronta; devolve como desfazer. */
export function registerSoundController(next: SoundController) {
    controller = next;

    return () => {
        if (controller === next) {
            controller = null;
        }
    };
}

/** Avisos de um player que já não é o atual (trocou de lofi para natureza) são ignorados. */
export function reportSoundPlaying(kind: SoundKind, playing: boolean) {
    if (runtime.current?.kind !== kind) {
        return;
    }

    if (runtime.playing !== playing || (playing && runtime.problem)) {
        setRuntime({ playing, problem: playing ? null : runtime.problem });
    }
}

export function reportSoundProblem(kind: SoundKind, problem: string) {
    if (runtime.current?.kind === kind) {
        setRuntime({ playing: false, problem });
    }
}

const natureController: SoundController = {
    pause: pauseNature,
    play: resumeNature,
    setVolume: setNatureVolume,
};

const ambientController: SoundController = {
    pause: pauseAmbient,
    play: resumeAmbient,
    setVolume: setAmbientVolume,
};

/** O piano sozinho é uma mistura com uma camada só. */
const PIANO_ONLY = Object.fromEntries(
    mixLayers.map((layer) => [layer, layer === "piano" ? 100 : 0]),
) as MixLevels;

const SILENT_MIX = "Sua mistura está em silêncio. Suba uma camada em Editar camadas.";

function isLocalController(value: SoundController | null) {
    return value === natureController || value === ambientController;
}

/* Do lado da interface */

export function chooseSoundKind(kind: SoundKind) {
    setPrefs({ kind });
}

/**
 * Toca uma live ou um som da natureza. Chamado direto do clique: o navegador
 * só deixa começar áudio a partir de um gesto da pessoa.
 */
export function playSoundChoice(choice: SoundChoice) {
    if (prefs.kind !== choice.kind) {
        setPrefs({ kind: choice.kind });
    }

    setRuntime({ attempt: runtime.attempt + 1, current: choice, playing: false, problem: null });

    const handlers = {
        onPlaying: (playing: boolean) => reportSoundPlaying("nature", playing),
        onProblem: (message: string) => reportSoundProblem("nature", message),
        onStop: stopSound,
    };

    if (choice.kind === "lofi") {
        // A live assume quando o player do YouTube ficar pronto; de uma live
        // para outra, o mesmo player só troca o vídeo.
        stopNature();
        stopAmbient();
        if (isLocalController(controller)) {
            controller = null;
        }
    } else if (choice.id === "piano" || choice.id === "mistura") {
        stopNature();
        stopAmbient();
        controller = null;

        if (choice.id === "mistura" && isMixSilent(prefs.mix)) {
            reportSoundProblem("nature", SILENT_MIX);
            return;
        }

        controller = ambientController;
        startAmbient(choice.id === "piano" ? PIANO_ONLY : prefs.mix, prefs.volume, handlers);
    } else {
        stopAmbient();
        controller = natureController;
        startNature(choice.id, prefs.volume, handlers);
    }
}

/**
 * Volume de uma camada da mistura (nas configurações). Se a mistura estiver
 * tocando, muda na hora; se estava em silêncio, o mesmo gesto já a liga.
 */
export function setMixLevel(layer: MixLayer, level: number) {
    const mix = { ...getSoundState().prefs.mix, [layer]: clampSoundVolume(level, 0) };
    setPrefs({ mix });

    if (runtime.current?.kind !== "nature" || runtime.current.id !== "mistura") {
        return;
    }

    if (controller === ambientController) {
        setAmbientLevels(mix);
    } else if (!isMixSilent(mix)) {
        playSoundChoice(runtime.current);
    }
}

export function toggleSoundPlayback() {
    if (!controller) {
        return;
    }

    if (runtime.playing) {
        controller.pause();
    } else {
        controller.play();
    }
}

export function setSoundVolume(volume: number) {
    const next = clampSoundVolume(volume);
    setPrefs({ volume: next });
    controller?.setVolume(next);
}

export function stopSound() {
    stopNature();
    stopAmbient();
    controller = null;
    setRuntime({ current: null, playing: false, problem: null });
}
