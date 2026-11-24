"use client";

import { useId } from "react";

import { NATURE_LABELS, RECORDING_CREDITS, mixLayers, recordings } from "./catalog";
import type { SoundChoice } from "./catalog";
import { playSoundChoice, setMixLevel, toggleSoundPlayback, useSoundState } from "./sound-store";

const MIX: SoundChoice = { id: "mistura", kind: "nature" };

/** Camadas da mistura do Modo foco, na aba Sons das configurações. */
export function FocusMixEditor() {
    const { current, playing, prefs } = useSoundState();
    const baseId = useId();
    const mixOn = current?.kind === "nature" && current.id === "mistura";

    return (
        <section aria-labelledby={`${baseId}-title`}>
            <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                    <h3 className="text-base font-semibold text-sloth-forest" id={`${baseId}-title`}>
                        Mistura do Modo foco
                    </h3>
                    <p className="mt-1 text-sm text-sloth-muted">
                        O volume de cada camada. Toca em Modo foco › Ambiente › Minha mistura.
                    </p>
                </div>
                <button
                    className="inline-flex min-h-10 shrink-0 cursor-pointer items-center rounded-xl border border-sloth-border bg-sloth-card px-3 text-sm font-medium text-sloth-forest transition hover:bg-sloth-beige focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sloth-forest"
                    onClick={() => (mixOn ? toggleSoundPlayback() : playSoundChoice(MIX))}
                    type="button"
                >
                    {mixOn && playing ? "Pausar mistura" : "Ouvir mistura"}
                </button>
            </div>

            <div className="mt-4 grid gap-3">
                {mixLayers.map((layer) => {
                    const id = `${baseId}-${layer}`;

                    return (
                        <div className="flex items-center gap-3" key={layer}>
                            <label className="w-28 shrink-0 text-sm sm:w-36" htmlFor={id}>
                                {NATURE_LABELS[layer]}
                            </label>
                            <input
                                className="w-0 flex-1 cursor-pointer accent-sloth-moss"
                                id={id}
                                max={100}
                                min={0}
                                onChange={(event) => setMixLevel(layer, Number(event.target.value))}
                                step={5}
                                type="range"
                                value={prefs.mix[layer]}
                            />
                            <span className="w-10 text-right text-xs text-sloth-muted tabular-nums">
                                {prefs.mix[layer]}%
                            </span>
                        </div>
                    );
                })}
            </div>

            <details className="mt-5 text-xs text-sloth-muted">
                <summary className="cursor-pointer rounded-md font-medium text-sloth-forest focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sloth-forest">
                    Créditos das gravações
                </summary>
                <ul className="mt-2 grid gap-1">
                    {recordings.map((sound) => {
                        const credit = RECORDING_CREDITS[sound];

                        return (
                            <li key={sound}>
                                <a
                                    className="underline underline-offset-2 hover:text-sloth-forest"
                                    href={credit.source}
                                    rel="noreferrer"
                                    target="_blank"
                                >
                                    {NATURE_LABELS[sound]}
                                </a>{" "}
                                · {credit.author} ·{" "}
                                {credit.licenseUrl ? (
                                    <a
                                        className="underline underline-offset-2 hover:text-sloth-forest"
                                        href={credit.licenseUrl}
                                        rel="noreferrer"
                                        target="_blank"
                                    >
                                        {credit.license}
                                    </a>
                                ) : (
                                    credit.license
                                )}
                            </li>
                        );
                    })}
                </ul>
                <p className="mt-2">
                    Trechos em loop, com volume ajustado, do Wikimedia Commons. O piano é feito
                    aqui no app.
                </p>
            </details>
        </section>
    );
}
