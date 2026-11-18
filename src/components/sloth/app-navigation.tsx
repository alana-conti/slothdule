"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { getUserInitial } from "@/features/settings/profile";
import type { SettingsUser } from "@/features/settings/profile";
import { SettingsDialog } from "@/features/settings/settings-dialog";
import { openNewTaskDialog, preloadNewTaskDialog } from "@/features/tasks/new-task-events";

type NavItem = {
    /** Prefixos de rota que deixam o item ativo (a tarefa aberta pertence a Hoje). */
    activeFor: string[];
    /** Rotas que ativam o item só quando batem exatamente (sem subrotas). */
    activeExact?: string[];
    href: string;
    icon: ReactNode;
    label: string;
    /** Rótulo curto para a barra inferior do celular. */
    shortLabel?: string;
};

type NavGroup = {
    items: NavItem[];
    label: string;
};

function Icon({ children }: { children: ReactNode }) {
    return (
        <svg
            aria-hidden="true"
            className="size-5 shrink-0"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.7"
            viewBox="0 0 24 24"
        >
            {children}
        </svg>
    );
}

const icons = {
    calendar: (
        <Icon>
            <rect height="16" rx="3" width="16" x="4" y="5" />
            <path d="M8 3v4M16 3v4M4 10h16" />
        </Icon>
    ),
    leaf: (
        <Icon>
            <path d="M5 19c0-9 5-14 14-14 0 9-5 14-14 14Z" />
            <path d="M5 19c3-5 6-7 9-9" />
        </Icon>
    ),
    more: (
        <Icon>
            <circle cx="6" cy="12" r="1" />
            <circle cx="12" cy="12" r="1" />
            <circle cx="18" cy="12" r="1" />
        </Icon>
    ),
    settings: (
        <Icon>
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
        </Icon>
    ),
    plus: (
        <Icon>
            <path d="M12 5v14M5 12h14" />
        </Icon>
    ),
    sprout: (
        <Icon>
            <path d="M12 20v-7" />
            <path d="M12 13c-3.5 0-5.5-2-5.5-5 3.5 0 5.5 2 5.5 5Z" />
            <path d="M12 15c0-3 2-4.5 5-4.5 0 3-2 4.5-5 4.5Z" />
            <path d="M7 20h10" />
        </Icon>
    ),
    sun: (
        <Icon>
            <circle cx="12" cy="12" r="4" />
            <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4" />
        </Icon>
    ),
    tree: (
        <Icon>
            <circle cx="12" cy="8.5" r="5.5" />
            <path d="M12 14v6M9 20h6M12 16.5l-2.5-2.5M12 15.5l2-2" />
        </Icon>
    ),
    timeline: (
        <Icon>
            <path d="M4 7h9M4 12h14M4 17h7" />
            <circle cx="17" cy="7" r="1.5" />
            <circle cx="14" cy="17" r="1.5" />
        </Icon>
    ),
};

const today: NavItem = {
    activeFor: ["/today", "/tasks"],
    href: "/today",
    icon: icons.sun,
    label: "Hoje",
};
const timeline: NavItem = {
    activeFor: ["/timeline"],
    href: "/timeline",
    icon: icons.timeline,
    label: "Linha do tempo",
    shortLabel: "Tempo",
};
const calendar: NavItem = {
    activeFor: ["/calendar"],
    href: "/calendar",
    icon: icons.calendar,
    label: "Calendário",
    shortLabel: "Agenda",
};
const routineOverview: NavItem = {
    activeExact: ["/routine"],
    activeFor: [],
    href: "/routine",
    icon: icons.sprout,
    label: "Visão geral",
};
const routineGarden: NavItem = {
    activeFor: ["/routine/garden", "/routine/habits"],
    href: "/routine/garden",
    icon: icons.tree,
    label: "Jardim",
};
const rewards: NavItem = {
    activeFor: ["/rewards"],
    href: "/rewards",
    icon: icons.leaf,
    label: "Recompensas",
};

// Novas telas entram em um grupo: o menu cresce sem mudar de layout.
const groups: NavGroup[] = [
    { items: [today, timeline, calendar], label: "Seu dia" },
    { items: [routineOverview, routineGarden], label: "Rotina" },
    { items: [rewards], label: "Cantinho" },
];

function isActive(item: NavItem, pathname: string) {
    if (item.activeExact?.includes(pathname)) {
        return true;
    }

    return item.activeFor.some(
        (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
    );
}

const itemBase =
    "flex min-h-10 items-center gap-3 rounded-xl border px-3 text-sm transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sloth-forest";

function itemClass(active: boolean) {
    return `${itemBase} ${
        active
            ? "border-sloth-border bg-sloth-card font-semibold text-sloth-forest"
            : "border-transparent text-sloth-muted hover:bg-sloth-beige hover:text-sloth-forest"
    }`;
}

type AppNavigationProps = {
    balance: number;
    user: SettingsUser;
};

type NavigationPartProps = AppNavigationProps & {
    onOpenSettings: () => void;
    pathname: string;
};

export function AppNavigation({ balance, user }: AppNavigationProps) {
    const pathname = usePathname();
    const [settingsOpen, setSettingsOpen] = useState(false);
    const openSettings = () => setSettingsOpen(true);

    return (
        <>
            <DesktopSidebar
                balance={balance}
                onOpenSettings={openSettings}
                pathname={pathname}
                user={user}
            />
            <MobileBar
                balance={balance}
                onOpenSettings={openSettings}
                pathname={pathname}
                user={user}
            />
            {settingsOpen ? (
                <SettingsDialog onClose={() => setSettingsOpen(false)} user={user} />
            ) : null}
        </>
    );
}

function Brand() {
    return (
        <Link
            className="flex items-center gap-3 rounded-xl px-2 py-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sloth-forest"
            href="/today"
        >
            <span className="relative size-10 shrink-0 overflow-hidden rounded-full border border-sloth-border bg-sloth-beige">
                <Image
                    alt=""
                    className="object-cover object-top"
                    fill
                    sizes="40px"
                    src="/images/sloth-mascot.png"
                />
            </span>
            <span className="min-w-0">
                <span className="block text-base font-semibold tracking-[-0.02em] text-sloth-forest">
                    Slothdule
                </span>
                <span className="block text-xs text-sloth-muted">
                    uma coisa de cada vez
                </span>
            </span>
        </Link>
    );
}

function LeafBalance({ balance }: { balance: number }) {
    return (
        <p className="flex items-center gap-2 rounded-xl border border-sloth-border bg-sloth-card px-3 py-2 text-sm">
            <span className="text-sloth-leaf">{icons.leaf}</span>
            <span className="font-semibold text-sloth-ink">{balance}</span>
            <span className="text-sloth-muted">Folhinhas</span>
        </p>
    );
}

function DesktopSidebar({
    balance,
    onOpenSettings,
    pathname,
    user,
}: NavigationPartProps) {
    return (
        <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col gap-5 overflow-y-auto border-r border-sloth-border/70 bg-sloth-cream px-4 py-6 lg:flex">
            <Brand />

            <button
                aria-keyshortcuts="N"
                className="flex min-h-11 w-full cursor-pointer items-center gap-2 rounded-xl bg-sloth-moss px-4 text-sm font-semibold text-white transition hover:bg-sloth-forest focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sloth-forest"
                onClick={openNewTaskDialog}
                onFocus={preloadNewTaskDialog}
                onPointerEnter={preloadNewTaskDialog}
                type="button"
            >
                {icons.plus}
                <span className="text-sm">Nova tarefa</span>
                <kbd
                    aria-hidden="true"
                    className="ml-auto rounded-md bg-white/20 px-1.5 py-0.5 font-sans text-xs"
                >
                    N
                </kbd>
            </button>

            <nav
                aria-label="Navegação principal"
                className="flex flex-1 flex-col gap-5"
            >
                {groups.map((group) => (
                    <div className="flex flex-col gap-1" key={group.label}>
                        <p className="px-3 pb-1 text-xs font-semibold tracking-[0.14em] text-sloth-muted/80 uppercase">
                            {group.label}
                        </p>
                        {group.items.map((item) => {
                            const active = isActive(item, pathname);

                            return (
                                <Link
                                    aria-current={active ? "page" : undefined}
                                    className={itemClass(active)}
                                    href={item.href}
                                    key={item.href}
                                >
                                    <span
                                        className={
                                            active
                                                ? "text-sloth-moss"
                                                : "text-sloth-muted"
                                        }
                                    >
                                        {item.icon}
                                    </span>
                                    {item.label}
                                </Link>
                            );
                        })}
                    </div>
                ))}
            </nav>

            <div className="flex flex-col gap-2 border-t border-sloth-border/70 pt-4">
                <LeafBalance balance={balance} />
                <button
                    aria-label="Abrir configurações"
                    className="group flex min-h-11 min-w-0 cursor-pointer items-center gap-2 rounded-xl px-1.5 text-left transition hover:bg-sloth-beige focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sloth-forest"
                    onClick={onOpenSettings}
                    title={user.email}
                    type="button"
                >
                    <span
                        aria-hidden="true"
                        className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-sloth-gold text-xs font-semibold text-white"
                    >
                        {getUserInitial(user)}
                    </span>
                    <span className="min-w-0 flex-1">
                        {user.displayName ? (
                            <span className="block truncate text-xs font-semibold text-sloth-ink">
                                {user.displayName}
                            </span>
                        ) : null}
                        <span className="block truncate text-xs text-sloth-muted">
                            {user.email}
                        </span>
                    </span>
                    <span className="text-sloth-muted transition group-hover:text-sloth-forest">
                        {icons.settings}
                    </span>
                </button>
            </div>
        </aside>
    );
}

function MobileBar({
    balance,
    onOpenSettings,
    pathname,
    user,
}: NavigationPartProps) {
    const [openFor, setOpenFor] = useState<string | null>(null);
    const sheetRef = useRef<HTMLDivElement>(null);
    // A folha fecha sozinha ao trocar de tela, sem efeito para isso.
    const moreOpen = openFor === pathname;
    const moreItems = [routineOverview, routineGarden];
    const moreActive = [...moreItems, rewards].some((item) => isActive(item, pathname));

    useEffect(() => {
        if (!moreOpen) {
            return;
        }

        function handlePointerDown(event: PointerEvent) {
            if (!sheetRef.current?.contains(event.target as Node)) {
                setOpenFor(null);
            }
        }

        function handleKeyDown(event: KeyboardEvent) {
            if (event.key === "Escape") {
                setOpenFor(null);
            }
        }

        document.addEventListener("pointerdown", handlePointerDown);
        document.addEventListener("keydown", handleKeyDown);

        return () => {
            document.removeEventListener("pointerdown", handlePointerDown);
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [moreOpen]);

    const tabClass = (active: boolean) =>
        `flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl text-xs transition focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-sloth-forest ${
            active ? "font-semibold text-sloth-forest" : "text-sloth-muted"
        }`;

    return (
        <div
            className="fixed inset-x-0 bottom-0 z-30 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:hidden"
            ref={sheetRef}
        >
            {moreOpen ? (
                <div
                    className="animate-menu-in mb-2 ml-auto w-64 rounded-2xl border border-sloth-border bg-sloth-card p-2 shadow-soft"
                    id="menu-mais"
                >
                    <p className="px-3 pt-1 pb-1 text-xs font-semibold tracking-[0.14em] text-sloth-muted/80 uppercase">
                        Rotina
                    </p>
                    {moreItems.map((item) => {
                        const active = isActive(item, pathname);

                        return (
                            <Link
                                aria-current={active ? "page" : undefined}
                                className={itemClass(active)}
                                href={item.href}
                                key={item.href}
                            >
                                <span className={active ? "text-sloth-moss" : "text-sloth-muted"}>
                                    {item.icon}
                                </span>
                                {item.label}
                            </Link>
                        );
                    })}
                    <div className="mx-2 my-2 border-t border-sloth-border/70" />
                    <Link
                        aria-current={isActive(rewards, pathname) ? "page" : undefined}
                        className={itemClass(isActive(rewards, pathname))}
                        href={rewards.href}
                    >
                        <span className="text-sloth-leaf">{rewards.icon}</span>
                        {rewards.label}
                        <span className="ml-auto rounded-full bg-sloth-beige px-2 py-0.5 text-xs text-sloth-muted">
                            {balance}
                        </span>
                    </Link>
                    <div className="mx-2 my-2 border-t border-sloth-border/70" />
                    <button
                        className={`${itemClass(false)} w-full cursor-pointer text-left`}
                        onClick={() => {
                            setOpenFor(null);
                            onOpenSettings();
                        }}
                        type="button"
                    >
                        {icons.settings}
                        <span className="min-w-0 flex-1">
                            <span className="block text-sm">Configurações</span>
                            <span className="block truncate text-xs text-sloth-muted">
                                {user.displayName || user.email}
                            </span>
                        </span>
                    </button>
                </div>
            ) : null}

            <div className="relative">
                <nav
                    aria-label="Navegação principal"
                    className="flex items-center rounded-3xl border border-sloth-border bg-sloth-card/95 px-2 py-1 shadow-soft backdrop-blur-sm"
                >
                    {[today, timeline].map((item) => {
                        const active = isActive(item, pathname);

                        return (
                            <Link
                                aria-current={active ? "page" : undefined}
                                className={tabClass(active)}
                                href={item.href}
                                key={item.href}
                            >
                                <span className={active ? "text-sloth-moss" : ""}>
                                    {item.icon}
                                </span>
                                {item.shortLabel ?? item.label}
                            </Link>
                        );
                    })}

                    <span aria-hidden="true" className="w-16 shrink-0" />

                    {(() => {
                        const active = isActive(calendar, pathname);

                        return (
                            <Link
                                aria-current={active ? "page" : undefined}
                                className={tabClass(active)}
                                href={calendar.href}
                            >
                                <span className={active ? "text-sloth-moss" : ""}>
                                    {calendar.icon}
                                </span>
                                {calendar.shortLabel}
                            </Link>
                        );
                    })()}

                    <button
                        aria-controls="menu-mais"
                        aria-expanded={moreOpen}
                        className={`${tabClass(moreActive || moreOpen)} cursor-pointer`}
                        onClick={() => setOpenFor(moreOpen ? null : pathname)}
                        type="button"
                    >
                        {icons.more}
                        <span className="text-xs">Mais</span>
                    </button>
                </nav>

                <button
                    aria-keyshortcuts="N"
                    aria-label="Nova tarefa"
                    className="absolute top-0 left-1/2 flex size-14 -translate-x-1/2 -translate-y-1/3 cursor-pointer items-center justify-center rounded-full border-4 border-sloth-cream bg-sloth-moss text-white shadow-soft transition hover:bg-sloth-forest focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sloth-forest"
                    onClick={openNewTaskDialog}
                    onFocus={preloadNewTaskDialog}
                    onPointerEnter={preloadNewTaskDialog}
                    type="button"
                >
                    <svg
                        aria-hidden="true"
                        className="size-6"
                        fill="none"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                    >
                        <path d="M12 5v14M5 12h14" />
                    </svg>
                </button>
            </div>
        </div>
    );
}
