"use client";

import { getSoundGain } from "./sound-settings";
import type { SoundName } from "./sound-settings";
import { getSoundSettings } from "./sound-store";

/**
 * Sons sintetizados na hora pela Web Audio: sem arquivos para baixar e sem
 * dependências. Cada som é curto e suave, um sinal gentil e não uma festa.
 */

type AudioContextConstructor = typeof AudioContext;

let context: AudioContext | null = null;
/** Quando o último som começou, para o "dia completo" não atropelar a conclusão. */
let lastStartedAt = 0;

/** Espaço entre o som da conclusão e o arpejo do dia completo. */
const DAY_COMPLETE_GAP_SECONDS = 0.55;

const windChimeNotes = [783.99, 880, 1046.5, 1174.66, 1318.5, 1568, 1760];

function getContext() {
    if (context) {
        return context;
    }

    const AudioContextClass =
        window.AudioContext ??
        (window as Window & { webkitAudioContext?: AudioContextConstructor })
            .webkitAudioContext;

    if (!AudioContextClass) {
        return null;
    }

    context = new AudioContextClass();

    return context;
}

type ToneOptions = {
    attack?: number;
    detune?: number;
    type?: OscillatorType;
};

function tone(
    ctx: AudioContext,
    output: AudioNode,
    frequency: number,
    start: number,
    duration: number,
    volume: number,
    { attack = 0.005, detune = 0, type = "sine" }: ToneOptions = {},
) {
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    oscillator.detune.value = detune;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain);
    gain.connect(output);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.05);
}

/** Sino: fundamental com dois parciais mais curtos por cima. */
function bell(
    ctx: AudioContext,
    output: AudioNode,
    frequency: number,
    start: number,
    duration: number,
    volume: number,
) {
    tone(ctx, output, frequency, start, duration, volume);
    tone(ctx, output, frequency * 2, start, duration * 0.5, volume * 0.25);
    tone(ctx, output, frequency * 3.01, start, duration * 0.25, volume * 0.08);
}

/** Farfalhar de folha: ruído filtrado subindo. */
function rustle(ctx: AudioContext, output: AudioNode, start: number, duration: number) {
    const length = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let index = 0; index < length; index += 1) {
        data[index] = Math.random() * 2 - 1;
    }

    const source = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    source.buffer = buffer;
    filter.type = "bandpass";
    filter.Q.value = 1.2;
    filter.frequency.setValueAtTime(1800, start);
    filter.frequency.exponentialRampToValueAtTime(5000, start + duration);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.12, start + duration * 0.4);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(output);
    source.start(start);
    source.stop(start + duration);
}

function schedule(ctx: AudioContext, output: AudioNode, name: SoundName, start: number) {
    switch (name) {
        case "folhinha":
            rustle(ctx, output, start, 0.28);
            bell(ctx, output, 1760, start + 0.2, 0.6, 0.18);
            break;
        case "ding-ding":
            bell(ctx, output, 1318.5, start, 0.45, 0.2);
            bell(ctx, output, 1975.5, start + 0.11, 0.7, 0.2);
            break;
        case "sino-de-vento": {
            let time = start;

            for (let index = 0; index < 4; index += 1) {
                const note =
                    windChimeNotes[Math.floor(Math.random() * windChimeNotes.length)];

                bell(ctx, output, note, time, 1.4, 0.12);
                time += 0.08 + Math.random() * 0.14;
            }
            break;
        }
        case "dia-completo":
            [1046.5, 1318.5, 1568, 2093].forEach((note, index) =>
                bell(ctx, output, note, start + index * 0.07, index === 3 ? 0.9 : 0.35, 0.17),
            );
            break;
    }
}

/**
 * Toca um som com o volume das preferências. Não faz nada com os sons
 * desligados ou sem Web Audio, e nunca lança erro: som é enfeite.
 */
export function playSound(name: SoundName, { minDelay = 0 } = {}) {
    const gainValue = getSoundGain(getSoundSettings());

    if (gainValue <= 0 || typeof window === "undefined") {
        return;
    }

    try {
        const ctx = getContext();

        if (!ctx) {
            return;
        }

        if (ctx.state === "suspended") {
            void ctx.resume();
        }

        const output = ctx.createGain();

        output.gain.value = gainValue;
        output.connect(ctx.destination);

        const start = Math.max(ctx.currentTime + 0.01, lastStartedAt + minDelay);

        lastStartedAt = start;
        schedule(ctx, output, name, start);
    } catch {
        // Navegador sem suporte ou áudio bloqueado: segue em silêncio.
    }
}

/** Som escolhido pela pessoa para quando conclui uma tarefa. */
export function playCompletionSound() {
    playSound(getSoundSettings().completionSound);
}

/** Arpejo de quando a última tarefa do dia termina, logo depois da conclusão. */
export function playDayCompleteSound() {
    playSound("dia-completo", { minDelay: DAY_COMPLETE_GAP_SECONDS });
}
