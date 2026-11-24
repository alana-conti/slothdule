/**
 * - `light`: a folha do celular, no creme do app.
 * - `dark`: o cartão fixo do desktop, em verde-floresta, para se destacar da tela.
 */
export type FocusTone = "light" | "dark";

const buttonBase =
    "inline-flex min-h-10 cursor-pointer items-center justify-center rounded-xl px-3 text-sm transition focus-visible:outline-2 focus-visible:outline-offset-2";

export const TONES = {
    dark: {
        breakBar: "bg-sloth-gold",
        clock: "text-white",
        divider: "border-white/15",
        dotDone: "bg-sloth-cream",
        dotTodo: "bg-white/25",
        eyebrow: "text-white/75",
        focusBar: "bg-sloth-cream",
        muted: "text-white/75",
        primary: `${buttonBase} bg-sloth-cream font-semibold text-sloth-forest hover:bg-white focus-visible:outline-sloth-cream`,
        problem: "bg-white/10 text-white",
        radioOff: "border-white/40",
        radioOn: "border-sloth-cream",
        radioDot: "bg-sloth-cream",
        rhythmOff: "border-white/15 text-white hover:bg-white/10",
        rhythmOn: "border-white/50 bg-white/15 text-white",
        range: "accent-sloth-cream",
        rhythmOutline: "has-focus-visible:outline-sloth-cream",
        secondary: `${buttonBase} border border-white/25 font-medium text-white hover:bg-white/10 focus-visible:outline-sloth-cream`,
        segment: "bg-white/10",
        segmentOff: "text-white/80 hover:text-white",
        segmentOn: "bg-sloth-cream font-semibold text-sloth-forest",
        strong: "text-white",
        taskBox: "bg-white/10 text-white",
        taskClear: "text-white/70 hover:bg-white/15 hover:text-white",
        track: "bg-white/15",
    },
    light: {
        breakBar: "bg-sloth-gold",
        clock: "text-sloth-ink",
        divider: "border-sloth-border",
        dotDone: "bg-sloth-moss",
        dotTodo: "bg-sloth-border",
        eyebrow: "text-sloth-moss",
        focusBar: "bg-sloth-moss",
        muted: "text-sloth-muted",
        primary: `${buttonBase} bg-sloth-moss font-semibold text-white hover:bg-sloth-forest focus-visible:outline-sloth-forest`,
        problem: "bg-sloth-beige/70 text-sloth-ink",
        radioOff: "border-sloth-border",
        radioOn: "border-sloth-moss",
        radioDot: "bg-sloth-moss",
        rhythmOff: "border-sloth-border bg-sloth-card text-sloth-ink hover:bg-sloth-beige",
        rhythmOn: "border-sloth-moss/50 bg-sloth-moss/10 text-sloth-forest",
        range: "accent-sloth-moss",
        rhythmOutline: "has-focus-visible:outline-sloth-forest",
        secondary: `${buttonBase} border border-sloth-border bg-sloth-card font-medium text-sloth-forest hover:bg-sloth-beige focus-visible:outline-sloth-forest`,
        segment: "bg-sloth-beige/70",
        segmentOff: "text-sloth-muted hover:text-sloth-forest",
        segmentOn: "bg-sloth-card font-semibold text-sloth-forest shadow-sm",
        strong: "text-sloth-forest",
        taskBox: "bg-sloth-beige/60 text-sloth-ink",
        taskClear: "text-sloth-muted hover:bg-sloth-card hover:text-sloth-forest",
        track: "bg-sloth-beige",
    },
} satisfies Record<FocusTone, Record<string, string>>;

export type Tone = (typeof TONES)[FocusTone];
