"use client";

import { useEffect, useRef } from "react";

import type { FocusTone } from "../focus-tones";
import { NATURE_LABELS, findStation } from "./catalog";
import {
    getSoundState,
    registerSoundController,
    reportSoundPlaying,
    reportSoundProblem,
    stopSound,
    toggleSoundPlayback,
    useSoundState,
} from "./sound-store";
import { YT_ENDED, YT_PAUSED, YT_PLAYING, loadYouTubeApi } from "./youtube-api";
import type { YouTubePlayer } from "./youtube-api";

export function NoteIcon({ className = "size-4" }: { className?: string }) {
    return (
        <svg
            aria-hidden="true"
            className={`${className} shrink-0`}
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
            viewBox="0 0 24 24"
        >
            <path d="M9 18V5l11-2v13" />
            <circle cx="6.5" cy="18" r="2.5" />
            <circle cx="17.5" cy="16" r="2.5" />
        </svg>
    );
}

function PlaybackIcon({ playing }: { playing: boolean }) {
    return (
        <svg aria-hidden="true" className="size-3" fill="currentColor" viewBox="0 0 12 12">
            {playing ? (
                <path d="M2.5 1.5h2.5v9H2.5zM7 1.5h2.5v9H7z" />
            ) : (
                <path d="M3 1.3v9.4a.5.5 0 0 0 .76.43l7.3-4.7a.5.5 0 0 0 0-.86l-7.3-4.7A.5.5 0 0 0 3 1.3z" />
            )}
        </svg>
    );
}

const CARD_TONES: Record<FocusTone, { frame: string; detail: string; button: string }> = {
    dark: {
        button: "text-white/80 hover:bg-white/15 hover:text-white",
        detail: "text-white/70",
        frame: "border-sloth-forest bg-sloth-forest text-white",
    },
    light: {
        button: "text-sloth-muted hover:bg-sloth-beige hover:text-sloth-forest",
        detail: "text-sloth-muted",
        frame: "border-sloth-border bg-sloth-card text-sloth-ink",
    },
};

const LIVE_UNAVAILABLE =
    "Essa live não abre aqui agora. Ela pode ter saído do ar: escolha outra no Modo foco.";
const API_UNAVAILABLE =
    "Não deu para abrir o player do YouTube. Confira a conexão e escolha a live de novo.";

/**
 * O player do YouTube. Cada escolha monta um player novo; ao desmontar, ele é
 * destruído e o som para.
 */
function YouTubeLive({ videoId }: { videoId: string }) {
    const mountRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const mount = mountRef.current;

        if (!mount) {
            return;
        }

        // A API troca este elemento pelo iframe; o React não cuida dele.
        const target = document.createElement("div");
        mount.appendChild(target);
        let cancelled = false;
        let player: YouTubePlayer | null = null;
        let unregister: (() => void) | null = null;

        loadYouTubeApi()
            .then((YT) => {
                if (cancelled) {
                    return;
                }

                player = new YT.Player(target, {
                    events: {
                        onError: () => reportSoundProblem("lofi", LIVE_UNAVAILABLE),
                        onReady: ({ target: ready }) => {
                            if (cancelled) {
                                return;
                            }

                            ready.setVolume(getSoundState().prefs.volume);
                            ready.playVideo();
                            unregister = registerSoundController({
                                pause: () => ready.pauseVideo(),
                                play: () => ready.playVideo(),
                                setVolume: (volume) => ready.setVolume(volume),
                            });
                        },
                        onStateChange: ({ data }) => {
                            if (data === YT_PLAYING) {
                                reportSoundPlaying("lofi", true);
                            } else if (data === YT_PAUSED || data === YT_ENDED) {
                                reportSoundPlaying("lofi", false);
                            }
                        },
                    },
                    height: "100%",
                    // Sem cookies de rastreio até a pessoa interagir com o vídeo.
                    host: "https://www.youtube-nocookie.com",
                    playerVars: {
                        autoplay: 1,
                        origin: window.location.origin,
                        playsinline: 1,
                        rel: 0,
                    },
                    videoId,
                    width: "100%",
                });
            })
            .catch(() => {
                if (!cancelled) {
                    reportSoundProblem("lofi", API_UNAVAILABLE);
                }
            });

        return () => {
            cancelled = true;
            unregister?.();
            player?.destroy();
            mount.replaceChildren();
        };
    }, [videoId]);

    return <div className="absolute inset-0 [&>iframe]:size-full" ref={mountRef} />;
}

/**
 * Cartão da live de lofi, acima do Modo foco. O YouTube pede que o player
 * fique à vista enquanto toca, com pelo menos 200×200: por isso ele não se
 * esconde, só desliga.
 */
export function LofiCard({ tone }: { tone: FocusTone }) {
    const { attempt, current, playing, problem } = useSoundState();

    if (current?.kind !== "lofi") {
        return null;
    }

    const station = findStation(current.id);
    const classes = CARD_TONES[tone];

    return (
        <section
            aria-label="Lofi ao vivo"
            // 356×200 por dentro: 16:9 com a altura mínima de 200 que o YouTube pede.
            className={`w-[370px] max-w-full shrink-0 rounded-2xl border p-1.5 shadow-soft ${classes.frame}`}
        >
            <div className="flex items-center gap-1 pb-1.5 pl-2 text-xs">
                <NoteIcon className="size-3.5" />
                <p className="min-w-0 flex-1 truncate">
                    <span className="font-semibold">{station?.label ?? "Lofi"}</span>
                    {station ? <span className={classes.detail}> · {station.channel}</span> : null}
                </p>
                <button
                    aria-label={playing ? "Pausar som" : "Tocar som"}
                    className={`inline-flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-full transition ${classes.button}`}
                    onClick={toggleSoundPlayback}
                    type="button"
                >
                    <PlaybackIcon playing={playing} />
                </button>
                <button
                    aria-label="Desligar som"
                    className={`inline-flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-full text-xs transition ${classes.button}`}
                    onClick={stopSound}
                    type="button"
                >
                    ✕
                </button>
            </div>
            <div className="relative h-[200px] overflow-hidden rounded-xl bg-black">
                {station ? <YouTubeLive key={attempt} videoId={station.videoId} /> : null}
                {problem || !station ? (
                    <p
                        className="absolute inset-0 flex items-center justify-center bg-black/85 p-5 text-center text-sm text-white"
                        role="status"
                    >
                        {problem ?? LIVE_UNAVAILABLE}
                    </p>
                ) : null}
            </div>
        </section>
    );
}

const CHIP_TONES: Record<FocusTone, { frame: string; label: string; toggle: string }> = {
    dark: {
        frame: "border-sloth-forest bg-sloth-forest text-white",
        label: "focus-visible:outline-sloth-cream",
        toggle: "bg-white/15 text-white hover:bg-white/25",
    },
    light: {
        frame: "border-sloth-moss/30 bg-sloth-card/95 text-sloth-ink backdrop-blur-sm",
        label: "focus-visible:outline-sloth-forest",
        toggle: "bg-sloth-moss/10 text-sloth-forest hover:bg-sloth-moss/20",
    },
};

/** Som da natureza tocando: nome e pausar/tocar, ao lado do Modo foco. */
export function SoundChip({ onOpen, tone }: { onOpen: () => void; tone: FocusTone }) {
    const { current, playing } = useSoundState();

    if (current?.kind !== "nature") {
        return null;
    }

    const classes = CHIP_TONES[tone];
    const label = NATURE_LABELS[current.id];

    return (
        <div
            className={`flex w-fit shrink-0 items-center gap-1 rounded-full border p-1 shadow-soft ${classes.frame}`}
        >
            <button
                aria-label={`Som: ${label}. Abrir modo foco`}
                className={`flex min-h-10 cursor-pointer items-center gap-1.5 rounded-full pr-1 pl-3 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 ${classes.label}`}
                onClick={onOpen}
                type="button"
            >
                <NoteIcon />
                {label}
            </button>
            <button
                aria-label={playing ? "Pausar som" : "Tocar som"}
                className={`inline-flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full transition ${classes.toggle}`}
                onClick={toggleSoundPlayback}
                type="button"
            >
                <PlaybackIcon playing={playing} />
            </button>
        </div>
    );
}
