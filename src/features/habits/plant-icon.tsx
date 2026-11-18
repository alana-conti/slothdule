import type { HabitStage } from "@/types/habits";

const paths: Record<HabitStage, React.ReactNode> = {
    arbusto: (
        <>
            <path d="M6.5 17a4 4 0 0 1-.1-8 5.5 5.5 0 0 1 10.7-.5 4 4 0 0 1 .6 8.5Z" />
            <path d="M12 17v3M8 20h8M12 14l-2-2M12 13l2-2" />
        </>
    ),
    arvore: (
        <>
            <circle cx="12" cy="8.5" r="5.5" />
            <path d="M12 14v6M9 20h6M12 16.5l-2.5-2.5M12 15.5l2-2" />
        </>
    ),
    broto: (
        <>
            <path d="M12 20v-7" />
            <path d="M12 13c-3.5 0-5.5-2-5.5-5 3.5 0 5.5 2 5.5 5Z" />
            <path d="M12 15c0-3 2-4.5 5-4.5 0 3-2 4.5-5 4.5Z" />
            <path d="M7 20h10" />
        </>
    ),
    muda: (
        <>
            <path d="M12 20V6" />
            <path d="M12 10C9 10 7 8 7 5c3 0 5 2 5 5Z" />
            <path d="M12 9c0-3 2-5 5-5 0 3-2 5-5 5Z" />
            <path d="M12 16c-2.5 0-4.5-1.5-4.5-4 2.5 0 4.5 1.5 4.5 4Z" />
            <path d="M12 15c0-2.5 2-4 4.5-4 0 2.5-2 4-4.5 4Z" />
            <path d="M7 20h10" />
        </>
    ),
};

/** Fundo e cor de cada estágio: verde claro no broto, dourado na árvore. */
export const stageTone: Record<HabitStage, string> = {
    arbusto: "bg-sloth-moss/18 text-sloth-forest",
    arvore: "bg-sloth-gold/18 text-sloth-forest",
    broto: "bg-sloth-leaf/12 text-sloth-leaf",
    muda: "bg-sloth-leaf/20 text-[#557f53]",
};

type PlantIconProps = {
    className?: string;
    stage: HabitStage;
    strokeWidth?: number;
};

export function PlantIcon({ className = "size-6", stage, strokeWidth = 1.7 }: PlantIconProps) {
    return (
        <svg
            aria-hidden="true"
            className={className}
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={strokeWidth}
            viewBox="0 0 24 24"
        >
            {paths[stage]}
        </svg>
    );
}

type PlantBadgeProps = {
    size?: "sm" | "md" | "lg";
    stage: HabitStage;
};

const badgeSizes = {
    lg: { box: "size-24 rounded-[1.75rem]", icon: "size-14", stroke: 1.3 },
    md: { box: "size-13 rounded-2xl", icon: "size-8", stroke: 1.5 },
    sm: { box: "size-10 rounded-xl", icon: "size-6", stroke: 1.7 },
};

export function PlantBadge({ size = "sm", stage }: PlantBadgeProps) {
    const { box, icon, stroke } = badgeSizes[size];

    return (
        <span
            aria-hidden="true"
            className={`inline-flex shrink-0 items-center justify-center ${box} ${stageTone[stage]}`}
        >
            <PlantIcon className={icon} stage={stage} strokeWidth={stroke} />
        </span>
    );
}

export function LeafGlyph({ className = "size-3" }: { className?: string }) {
    return (
        <svg
            aria-hidden="true"
            className={className}
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
        >
            <path d="M5 19c0-9 5-14 14-14 0 9-5 14-14 14Z" />
            <path d="M5 19c3-5 6-7 9-9" />
        </svg>
    );
}
