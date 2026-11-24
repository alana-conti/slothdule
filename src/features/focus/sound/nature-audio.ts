"use client";

import { NATURE_LABELS, recordingUrl } from "./catalog";
import type { Recording } from "./catalog";

/**
 * Toca as gravações avulsas num <audio> comum, em loop. Diferente da Web
 * Audio, ele segue tocando com a tela bloqueada e aparece nos controles de
 * mídia do celular e do computador.
 */

export type NatureAudioHandlers = {
    onPlaying: (playing: boolean) => void;
    onProblem: (message: string) => void;
    onStop: () => void;
};

let audio: HTMLAudioElement | null = null;
let handlers: NatureAudioHandlers | null = null;
let loaded: Recording | null = null;

function getAudio() {
    if (audio) {
        return audio;
    }

    audio = new Audio();
    audio.loop = true;
    audio.preload = "auto";
    audio.addEventListener("playing", () => handlers?.onPlaying(true));
    audio.addEventListener("pause", () => handlers?.onPlaying(false));
    audio.addEventListener("error", () =>
        handlers?.onProblem("Não deu para tocar esse som agora. Tente outro."),
    );

    return audio;
}

function setMediaSession(sound: Recording) {
    if (!("mediaSession" in navigator)) {
        return;
    }

    try {
        navigator.mediaSession.metadata = new MediaMetadata({
            artist: "Slothdule · Modo foco",
            artwork: [{ sizes: "512x512", src: "/images/sloth-mascot.png", type: "image/png" }],
            title: NATURE_LABELS[sound],
        });
        navigator.mediaSession.setActionHandler("play", () => void audio?.play());
        navigator.mediaSession.setActionHandler("pause", () => audio?.pause());
        navigator.mediaSession.setActionHandler("stop", () => handlers?.onStop());
    } catch {
        // Controles de mídia são um extra.
    }
}

function clearMediaSession() {
    if (!("mediaSession" in navigator)) {
        return;
    }

    try {
        navigator.mediaSession.metadata = null;
        for (const action of ["play", "pause", "stop"] as const) {
            navigator.mediaSession.setActionHandler(action, null);
        }
    } catch {
        // Idem.
    }
}

function play(element: HTMLAudioElement) {
    element.play().catch((error: unknown) => {
        // Sem gesto da pessoa o navegador bloqueia: fica parado, esperando "Tocar".
        if (error instanceof DOMException && error.name === "NotAllowedError") {
            handlers?.onPlaying(false);
            return;
        }

        if (error instanceof DOMException && error.name === "AbortError") {
            return;
        }

        handlers?.onProblem("Não deu para tocar esse som agora. Tente outro.");
    });
}

/** Começa (ou troca) o som. Precisa ser chamado direto de um clique. */
export function startNature(sound: Recording, volume: number, next: NatureAudioHandlers) {
    handlers = next;
    const element = getAudio();

    if (loaded !== sound) {
        element.src = recordingUrl(sound);
        loaded = sound;
    }

    element.volume = volume / 100;
    setMediaSession(sound);
    play(element);
}

export function resumeNature() {
    if (audio && loaded) {
        play(audio);
    }
}

export function pauseNature() {
    audio?.pause();
}

export function setNatureVolume(volume: number) {
    if (audio) {
        audio.volume = volume / 100;
    }
}

export function stopNature() {
    if (!audio) {
        return;
    }

    audio.pause();
    audio.currentTime = 0;
    clearMediaSession();
}
