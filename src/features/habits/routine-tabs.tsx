import Link from "next/link";

type RoutineTabsProps = {
    active: "overview" | "garden";
};

/** No celular, o menu Rotina vira duas abas no topo das telas. */
export function RoutineTabs({ active }: RoutineTabsProps) {
    const tab = (key: RoutineTabsProps["active"], href: string, label: string) => (
        <Link
            aria-current={active === key ? "page" : undefined}
            className={`flex min-h-11 flex-1 items-center justify-center rounded-xl text-sm transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sloth-forest ${
                active === key
                    ? "bg-sloth-card font-semibold text-sloth-forest shadow-sm"
                    : "text-sloth-muted hover:text-sloth-forest"
            }`}
            href={href}
        >
            {label}
        </Link>
    );

    return (
        <nav
            aria-label="Rotina"
            className="mb-5 flex gap-1 rounded-2xl border border-sloth-border bg-sloth-beige/60 p-1 lg:hidden"
        >
            {tab("overview", "/routine", "Visão geral")}
            {tab("garden", "/routine/garden", "Jardim")}
        </nav>
    );
}
