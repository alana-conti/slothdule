import { describe, expect, it } from "vitest";

import { formatMemberSince, getUserInitial } from "./profile";

describe("getUserInitial", () => {
    it("usa a primeira letra do nome", () => {
        expect(getUserInitial({ displayName: "ana", email: "z@x.com" })).toBe("A");
    });

    it("cai para o e-mail sem nome ou com nome em branco", () => {
        expect(getUserInitial({ displayName: null, email: "gui@x.com" })).toBe("G");
        expect(getUserInitial({ displayName: "   ", email: "gui@x.com" })).toBe("G");
    });
});

describe("formatMemberSince", () => {
    it("mostra mês e ano no fuso de São Paulo", () => {
        expect(formatMemberSince("2026-05-10T12:00:00Z")).toBe("maio de 2026");
        // 1º de junho, 1h UTC, ainda é 31 de maio em São Paulo.
        expect(formatMemberSince("2026-06-01T01:00:00Z")).toBe("maio de 2026");
    });

    it("não mostra nada sem data ou com data inválida", () => {
        expect(formatMemberSince(null)).toBeNull();
        expect(formatMemberSince("ontem")).toBeNull();
    });
});
