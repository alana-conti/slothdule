import { describe, expect, it } from "vitest";

import {
    DEFAULT_SOUND_SETTINGS,
    MAX_GAIN,
    clampVolume,
    getSoundGain,
    parseSoundSettings,
} from "./sound-settings";

describe("parseSoundSettings", () => {
    it("usa o padrão quando não há nada salvo", () => {
        expect(parseSoundSettings(null)).toEqual(DEFAULT_SOUND_SETTINGS);
        expect(parseSoundSettings("")).toEqual(DEFAULT_SOUND_SETTINGS);
    });

    it("usa o padrão quando o conteúdo não é JSON de objeto", () => {
        expect(parseSoundSettings("{quebrado")).toEqual(DEFAULT_SOUND_SETTINGS);
        expect(parseSoundSettings("42")).toEqual(DEFAULT_SOUND_SETTINGS);
        expect(parseSoundSettings("null")).toEqual(DEFAULT_SOUND_SETTINGS);
    });

    it("lê preferências válidas", () => {
        const raw = JSON.stringify({
            completionSound: "sino-de-vento",
            enabled: false,
            volume: 25,
        });

        expect(parseSoundSettings(raw)).toEqual({
            completionSound: "sino-de-vento",
            enabled: false,
            volume: 25,
        });
    });

    it("troca só o campo inválido pelo padrão", () => {
        const raw = JSON.stringify({
            completionSound: "trombone",
            enabled: "sim",
            volume: 30,
        });

        expect(parseSoundSettings(raw)).toEqual({
            completionSound: DEFAULT_SOUND_SETTINGS.completionSound,
            enabled: DEFAULT_SOUND_SETTINGS.enabled,
            volume: 30,
        });
    });

    it("não aceita o som de dia completo como som de conclusão", () => {
        const raw = JSON.stringify({ completionSound: "dia-completo" });

        expect(parseSoundSettings(raw).completionSound).toBe(
            DEFAULT_SOUND_SETTINGS.completionSound,
        );
    });

    it("limita o volume entre 0 e 100", () => {
        expect(parseSoundSettings(JSON.stringify({ volume: 180 })).volume).toBe(100);
        expect(parseSoundSettings(JSON.stringify({ volume: -5 })).volume).toBe(0);
    });
});

describe("clampVolume", () => {
    it("arredonda e volta ao padrão com números inválidos", () => {
        expect(clampVolume(42.6)).toBe(43);
        expect(clampVolume(Number.NaN)).toBe(DEFAULT_SOUND_SETTINGS.volume);
    });
});

describe("getSoundGain", () => {
    it("é zero com os sons desligados, mesmo com volume alto", () => {
        expect(
            getSoundGain({ ...DEFAULT_SOUND_SETTINGS, enabled: false, volume: 100 }),
        ).toBe(0);
    });

    it("escala o volume até o ganho máximo", () => {
        expect(getSoundGain({ ...DEFAULT_SOUND_SETTINGS, volume: 100 })).toBe(MAX_GAIN);
        expect(getSoundGain({ ...DEFAULT_SOUND_SETTINGS, volume: 50 })).toBeCloseTo(
            MAX_GAIN / 2,
        );
        expect(getSoundGain({ ...DEFAULT_SOUND_SETTINGS, volume: 0 })).toBe(0);
    });
});
