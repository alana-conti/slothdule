"use client";

import { useId } from "react";

import { openSettings } from "@/features/settings/open-settings";

import type { Tone } from "../focus-tones";
import { LOFI_STATIONS, NATURE_LABELS, natureSounds } from "./catalog";
import type { SoundChoice, SoundKind } from "./catalog";
import {
    chooseSoundKind,
    playSoundChoice,
    setSoundVolume,
    stopSound,
    toggleSoundPlayback,
    useSoundState,
} from "./sound-store";

const KIND_LABELS: Record<SoundKind, string> = { lofi: "Lofi ao vivo", nature: "Ambiente" };

const KIND_NOTES: Record<SoundKind, string> = {
    lofi: "O vídeo da live fica à vista enquanto toca, como pede o YouTube.",
    nature: "Gravações reais da natureza, um piano calmo e a sua mistura.",
};

function optionsFor(kind: SoundKind): { choice: SoundChoice; label: string }[] {
    return kind === "lofi"
        ? LOFI_STATIONS.map((station) => ({
              choice: { id: station.id, kind: "lofi" },
              label: station.label,
          }))
        : natureSounds.map((sound) => ({
              choice: { id: sound, kind: "nature" },
              label: NATURE_LABELS[sound],
          }));
}

/** Escolha do som no painel do Modo foco: um clique escolhe e já toca. */
export function SoundPicker({ tone }: { tone: Tone }) {
    const { current, playing, prefs, problem } = useSoundState();
    const groupName = useId();
    const kind = prefs.kind;

    return (
        <section aria-label="Som" className={`grid gap-2.5 border-t pt-3 ${tone.divider}`}>
            <div className="flex items-center justify-between gap-2">
                <p className={`text-xs font-semibold tracking-[0.14em] uppercase ${tone.eyebrow}`}>
                    Som
                </p>
                {current ? (
                    <button
                        aria-label="Desligar som"
                        className={`cursor-pointer rounded-md text-xs underline-offset-2 hover:underline ${tone.muted}`}
                        onClick={stopSound}
                        type="button"
                    >
                        Desligar
                    </button>
                ) : null}
            </div>

            <div className={`grid grid-cols-2 gap-0.5 rounded-xl p-0.5 ${tone.segment}`} role="group" aria-label="Tipo de som">
                {(["lofi", "nature"] as const).map((value) => (
                    <button
                        aria-pressed={kind === value}
                        className={`min-h-9 cursor-pointer rounded-[10px] px-2 text-sm transition ${
                            kind === value ? tone.segmentOn : tone.segmentOff
                        }`}
                        key={value}
                        onClick={() => chooseSoundKind(value)}
                        type="button"
                    >
                        {KIND_LABELS[value]}
                    </button>
                ))}
            </div>

            <fieldset>
                <legend className="sr-only">
                    {kind === "lofi" ? "Live de lofi" : "Som ambiente"}
                </legend>
                <div className="grid grid-cols-2 gap-1.5">
                    {optionsFor(kind).map(({ choice, label }) => {
                        const selected =
                            current?.kind === choice.kind && current.id === choice.id;

                        return (
                            <label
                                className={`flex min-h-9 cursor-pointer items-center gap-2 rounded-xl border px-2.5 py-1.5 text-sm transition has-focus-visible:outline-2 has-focus-visible:outline-offset-2 ${tone.rhythmOutline} ${
                                    selected ? `${tone.rhythmOn} font-semibold` : tone.rhythmOff
                                }`}
                                key={choice.id}
                            >
                                <input
                                    checked={selected}
                                    className="sr-only"
                                    name={groupName}
                                    // Clique, não change: escolher de novo a mesma
                                    // opção tenta de novo (live que não abriu).
                                    onClick={() => playSoundChoice(choice)}
                                    readOnly
                                    type="radio"
                                    value={choice.id}
                                />
                                <span
                                    aria-hidden="true"
                                    className={`inline-flex size-3.5 shrink-0 items-center justify-center rounded-full border-2 ${
                                        selected ? tone.radioOn : tone.radioOff
                                    }`}
                                >
                                    {selected ? (
                                        <span className={`size-1.5 rounded-full ${tone.radioDot}`} />
                                    ) : null}
                                </span>
                                <span className="min-w-0 truncate">{label}</span>
                            </label>
                        );
                    })}
                </div>
            </fieldset>

            {kind === "nature" ? (
                <button
                    className={`cursor-pointer justify-self-end rounded-md text-xs underline-offset-2 hover:underline ${tone.muted}`}
                    onClick={() => openSettings("mistura")}
                    type="button"
                >
                    Editar camadas
                </button>
            ) : null}

            {current ? (
                <div className="flex items-center gap-3">
                    <button
                        className={`${tone.secondary} min-w-24`}
                        onClick={toggleSoundPlayback}
                        type="button"
                    >
                        {playing ? "Pausar som" : "Tocar som"}
                    </button>
                    <label className="flex min-w-0 flex-1 items-center">
                        <span className="sr-only">Volume do som</span>
                        <input
                            className={`w-full cursor-pointer ${tone.range}`}
                            max={100}
                            min={0}
                            onChange={(event) => setSoundVolume(Number(event.target.value))}
                            type="range"
                            value={prefs.volume}
                        />
                    </label>
                </div>
            ) : null}

            {problem ? (
                <p className={`rounded-xl px-3 py-2 text-sm ${tone.problem}`} role="status">
                    {problem}
                </p>
            ) : (
                <p className={`text-xs ${tone.muted}`}>{KIND_NOTES[kind]}</p>
            )}
        </section>
    );
}
