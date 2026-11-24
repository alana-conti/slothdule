"use client";

import { mixLayers, recordingUrl } from "./catalog";
import type { MixLayer, MixLevels, Recording } from "./catalog";

/**
 * Piano e mistura de camadas, na Web Audio: cada camada tem o seu volume e as
 * gravações emendam o loop sem falha. Diferente do <audio> das gravações
 * avulsas, pode parar quando o celular bloqueia a tela.
 */

export type AmbientHandlers = {
    onPlaying: (playing: boolean) => void;
    onProblem: (message: string) => void;
};

type Layer = { gain: GainNode; stop: () => void };

let context: AudioContext | null = null;
let master: GainNode | null = null;
let handlers: AmbientHandlers | null = null;
let session: { bus: GainNode; layers: Map<MixLayer, Layer> } | null = null;
const buffers = new Map<Recording, Promise<AudioBuffer>>();

const LAYER_PROBLEM =
    "Parte da mistura não carregou. Confira a conexão e escolha a mistura de novo.";

function getContext() {
    if (!context) {
        context = new AudioContext();
        master = context.createGain();
        master.connect(context.destination);
        // Pausar, voltar e interrupções do sistema (uma ligação no celular).
        context.addEventListener("statechange", () =>
            handlers?.onPlaying(context?.state === "running"),
        );
    }

    return context;
}

function loadBuffer(audio: AudioContext, sound: Recording) {
    let buffer = buffers.get(sound);

    if (!buffer) {
        buffer = fetch(recordingUrl(sound))
            .then((response) => {
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }

                return response.arrayBuffer();
            })
            .then((data) => audio.decodeAudioData(data));
        buffers.set(sound, buffer);
        buffer.catch(() => buffers.delete(sound));
    }

    return buffer;
}

function startRecording(audio: AudioContext, sound: Recording, out: AudioNode) {
    let source: AudioBufferSourceNode | null = null;
    let stopped = false;

    loadBuffer(audio, sound)
        .then((buffer) => {
            if (stopped) {
                return;
            }

            source = audio.createBufferSource();
            source.buffer = buffer;
            source.loop = true;
            source.connect(out);
            // Cada camada começa num ponto diferente: as emendas não coincidem.
            source.start(0, Math.random() * buffer.duration);
        })
        .catch(() => {
            if (!stopped) {
                handlers?.onProblem(LAYER_PROBLEM);
            }
        });

    return () => {
        stopped = true;
        source?.stop();
    };
}

function roomReverb(audio: AudioContext, seconds: number, decay: number) {
    const length = Math.round(audio.sampleRate * seconds);
    const impulse = audio.createBuffer(2, length, audio.sampleRate);

    for (let channel = 0; channel < 2; channel += 1) {
        const data = impulse.getChannelData(channel);

        for (let i = 0; i < length; i += 1) {
            data[i] = (Math.random() * 2 - 1) * (1 - i / length) ** decay;
        }
    }

    const reverb = audio.createConvolver();
    reverb.buffer = impulse;

    return reverb;
}

const midiToHz = (note: number) => 440 * 2 ** ((note - 69) / 12);

/** Notas soltas em Ré maior pentatônico, com eco de sala. Nunca repete. */
function startPiano(audio: AudioContext, out: AudioNode) {
    const soften = audio.createBiquadFilter();
    soften.type = "lowpass";
    soften.frequency.value = 2600;
    const dry = audio.createGain();
    dry.gain.value = 0.5;
    const wet = audio.createGain();
    wet.gain.value = 0.45;
    soften.connect(dry).connect(out);
    soften.connect(roomReverb(audio, 4.5, 2.6)).connect(wet).connect(out);

    // Nenhuma nota "puxa" tensão; o baixo só aparece de vez em quando.
    const melody = [62, 64, 66, 69, 71, 74, 76, 78, 81];
    const bass = [38, 43, 45, 47];
    let lastNote = 69;
    let timer = 0;

    function note(midi: number, when: number, velocity: number, length: number) {
        const envelope = audio.createGain();
        envelope.gain.setValueAtTime(0, when);
        envelope.gain.linearRampToValueAtTime(velocity, when + 0.008);
        envelope.gain.exponentialRampToValueAtTime(velocity * 0.35, when + 0.5);
        envelope.gain.exponentialRampToValueAtTime(0.0001, when + length);
        envelope.connect(soften);

        // Harmônicos baixos dão o corpo de piano sem soar eletrônico.
        for (const [multiple, amplitude] of [
            [1, 1],
            [2, 0.32],
            [3, 0.12],
            [4.02, 0.05],
        ]) {
            const oscillator = audio.createOscillator();
            oscillator.frequency.value = midiToHz(midi) * multiple;
            const level = audio.createGain();
            level.gain.value = amplitude;
            oscillator.connect(level).connect(envelope);
            oscillator.start(when);
            oscillator.stop(when + length + 0.05);
        }
    }

    function step() {
        // Pausado, o relógio da Web Audio para: não acumula notas para depois.
        if (audio.state === "running") {
            const now = audio.currentTime + 0.05;
            const index = melody.indexOf(lastNote);
            const move = [-2, -1, -1, 1, 1, 2][Math.floor(Math.random() * 6)];
            lastNote = melody[Math.max(0, Math.min(melody.length - 1, index + move))];
            note(lastNote, now, 0.12 + Math.random() * 0.1, 3.5 + Math.random() * 2);

            if (Math.random() < 0.25) {
                note(lastNote - (Math.random() < 0.5 ? 5 : 8), now + 0.02, 0.08, 4);
            }

            if (Math.random() < 0.18) {
                note(bass[Math.floor(Math.random() * bass.length)], now, 0.16, 6);
            }
        }

        timer = window.setTimeout(step, 700 + Math.random() * 2300);
    }

    step();

    return () => window.clearTimeout(timer);
}

/** Liga as camadas que subiram de 0 e ajusta o volume de todas. */
export function setAmbientLevels(levels: MixLevels) {
    if (!session || !context) {
        return;
    }

    for (const layer of mixLayers) {
        const level = levels[layer] / 100;
        let node = session.layers.get(layer);

        if (!node && level > 0) {
            const gain = context.createGain();
            gain.gain.value = 0;
            gain.connect(session.bus);
            node = {
                gain,
                stop:
                    layer === "piano"
                        ? startPiano(context, gain)
                        : startRecording(context, layer, gain),
            };
            session.layers.set(layer, node);
        }

        // Ao quadrado: o controle anda por igual para o ouvido.
        node?.gain.gain.setTargetAtTime(level * level, context.currentTime, 0.08);
    }
}

export function setAmbientVolume(volume: number) {
    if (master) {
        master.gain.value = volume / 100;
    }
}

export function resumeAmbient() {
    if (!context || !session) {
        return;
    }

    context.resume().then(
        () => handlers?.onPlaying(true),
        () => handlers?.onProblem("Não deu para tocar esse som agora. Tente outro."),
    );
}

export function pauseAmbient() {
    void context?.suspend();
}

/** Começa o piano ou a mistura. Precisa ser chamado direto de um clique. */
export function startAmbient(levels: MixLevels, volume: number, next: AmbientHandlers) {
    stopAmbient();
    const audio = getContext();
    handlers = next;
    setAmbientVolume(volume);

    const bus = audio.createGain();
    bus.gain.setValueAtTime(0, audio.currentTime);
    bus.gain.linearRampToValueAtTime(1, audio.currentTime + 0.8);
    bus.connect(master!);
    session = { bus, layers: new Map() };
    setAmbientLevels(levels);
    resumeAmbient();
}

export function stopAmbient() {
    if (!session || !context) {
        return;
    }

    const { bus, layers } = session;
    const now = context.currentTime;
    // Quem toca agora é outro player: avisos daqui não valem mais.
    handlers = null;
    session = null;
    bus.gain.cancelScheduledValues(now);
    bus.gain.setValueAtTime(bus.gain.value, now);
    bus.gain.linearRampToValueAtTime(0, now + 0.4);
    window.setTimeout(() => {
        layers.forEach((layer) => layer.stop());
        bus.disconnect();
    }, 460);
}
