"use client";

/**
 * O mínimo da API de iframe do YouTube que o player de lofi usa. A API oficial
 * cuida do iframe e avisa quando a live toca, pausa ou não abre.
 * https://developers.google.com/youtube/iframe_api_reference
 */

export type YouTubePlayer = {
    destroy: () => void;
    loadVideoById: (videoId: string) => void;
    pauseVideo: () => void;
    playVideo: () => void;
    setVolume: (volume: number) => void;
};

type PlayerEvent = { target: YouTubePlayer };
type StateEvent = PlayerEvent & { data: number };
type ErrorEvent = PlayerEvent & { data: number };

export type YouTubePlayerOptions = {
    host?: string;
    videoId: string;
    width?: number | string;
    height?: number | string;
    playerVars?: Record<string, string | number>;
    events?: {
        onReady?: (event: PlayerEvent) => void;
        onStateChange?: (event: StateEvent) => void;
        onError?: (event: ErrorEvent) => void;
    };
};

type YouTubeNamespace = {
    Player: new (element: HTMLElement, options: YouTubePlayerOptions) => YouTubePlayer;
};

declare global {
    interface Window {
        YT?: YouTubeNamespace;
        onYouTubeIframeAPIReady?: () => void;
    }
}

/** Estados do player (YT.PlayerState). */
export const YT_PLAYING = 1;
export const YT_PAUSED = 2;
export const YT_ENDED = 0;

const API_URL = "https://www.youtube.com/iframe_api";
const LOAD_TIMEOUT_MS = 15_000;

let loading: Promise<YouTubeNamespace> | null = null;

/** Carrega a API uma vez só; quem chega depois espera a mesma carga. */
export function loadYouTubeApi(): Promise<YouTubeNamespace> {
    if (window.YT?.Player) {
        return Promise.resolve(window.YT);
    }

    if (loading) {
        return loading;
    }

    loading = new Promise<YouTubeNamespace>((resolve, reject) => {
        const previous = window.onYouTubeIframeAPIReady;
        const script = document.createElement("script");
        const timer = window.setTimeout(() => fail(), LOAD_TIMEOUT_MS);

        function fail() {
            window.clearTimeout(timer);
            script.remove();
            loading = null;
            reject(new Error("youtube-api"));
        }

        window.onYouTubeIframeAPIReady = () => {
            window.clearTimeout(timer);
            previous?.();

            if (window.YT?.Player) {
                resolve(window.YT);
            } else {
                fail();
            }
        };

        script.async = true;
        script.src = API_URL;
        script.onerror = fail;
        document.head.appendChild(script);
    });

    return loading;
}
