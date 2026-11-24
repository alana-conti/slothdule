import { describe, expect, it } from "vitest";

import {
    DEFAULT_MIX,
    DEFAULT_SOUND_PREFS,
    LOFI_STATIONS,
    RECORDING_CREDITS,
    choiceLabel,
    clampSoundVolume,
    isMixSilent,
    parseSoundPrefs,
    recordingUrl,
    recordings,
} from "./catalog";

describe("preferências de som", () => {
    it("sem nada salvo, usa o padrão", () => {
        expect(parseSoundPrefs(null)).toEqual(DEFAULT_SOUND_PREFS);
        expect(parseSoundPrefs("não é json")).toEqual(DEFAULT_SOUND_PREFS);
    });

    it("mantém o que é válido e corrige o resto", () => {
        expect(parseSoundPrefs(JSON.stringify({ kind: "nature", volume: 140 }))).toEqual({
            kind: "nature",
            mix: DEFAULT_MIX,
            volume: 100,
        });
        expect(parseSoundPrefs(JSON.stringify({ kind: "spotify", volume: "alto" }))).toEqual(
            DEFAULT_SOUND_PREFS,
        );
    });

    it("a mistura salva vale; camada que faltar ou vier errada fica em silêncio", () => {
        const saved = { mix: { "chuva-janela": 150, degelo: "alto", piano: 30, sumiu: 80 } };

        expect(parseSoundPrefs(JSON.stringify(saved)).mix).toEqual({
            "chuva-janela": 100,
            "chuva-trovao": 0,
            degelo: 0,
            passaros: 0,
            piano: 30,
        });
    });

    it("sabe quando a mistura está em silêncio", () => {
        expect(isMixSilent(DEFAULT_MIX)).toBe(false);
        expect(isMixSilent({ ...DEFAULT_MIX, "chuva-janela": 0, passaros: 0, piano: 0 })).toBe(true);
    });

    it("volume fica entre 0 e 100", () => {
        expect(clampSoundVolume(-5)).toBe(0);
        expect(clampSoundVolume(33.6)).toBe(34);
        expect(clampSoundVolume(Number.NaN)).toBe(DEFAULT_SOUND_PREFS.volume);
    });
});

describe("catálogo", () => {
    it("as lives têm IDs únicos e vídeo do YouTube", () => {
        const ids = LOFI_STATIONS.map((station) => station.id);

        expect(new Set(ids).size).toBe(ids.length);
        for (const station of LOFI_STATIONS) {
            expect(station.videoId).toMatch(/^[\w-]{11}$/);
        }
    });

    it("dá nome ao que está tocando", () => {
        expect(choiceLabel({ id: "jazz", kind: "lofi" })).toBe("Jazz lofi");
        expect(choiceLabel({ id: "chuva-janela", kind: "nature" })).toBe("Chuva");
        expect(choiceLabel({ id: "mistura", kind: "nature" })).toBe("Minha mistura");
        expect(choiceLabel({ id: "sumiu", kind: "lofi" })).toBe("Lofi");
    });

    it("cada gravação tem arquivo e crédito", () => {
        for (const sound of recordings) {
            expect(recordingUrl(sound)).toBe(`/sounds/foco/${sound}.mp3`);
            expect(RECORDING_CREDITS[sound].source).toMatch(/^https:\/\/commons\.wikimedia\.org\//);
        }
    });
});
