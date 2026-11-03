"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { KeyboardEvent, ReactNode } from "react";

export type ChipSelectOption<T extends string> = {
    /** Detalhe antes do rótulo (ex.: o ponto colorido da prioridade). */
    leading?: ReactNode;
    label: string;
    value: T;
};

type ChipSelectProps<T extends string> = {
    /** Nome do campo, lido por leitores de tela ("Prioridade: Média"). */
    label: string;
    /** Classes do contêiner (ex.: margens para alinhar com a linha). */
    className?: string;
    disabled?: boolean;
    onChange: (value: T) => void;
    options: ChipSelectOption<T>[];
    /** Classes do botão-chip; o visual do menu é sempre o mesmo. */
    triggerClassName?: string;
    value: T;
};

const MENU_ROW_HEIGHT = 40;

/**
 * Seleção compacta no estilo do Slothdule: um chip que abre um menu em card
 * logo abaixo (ou acima, se faltar espaço). Segue o padrão listbox: setas,
 * Home/End, Enter/Espaço, Esc, Tab e digitar a inicial para pular até a opção.
 */
export function ChipSelect<T extends string>({
    className = "",
    disabled = false,
    label,
    onChange,
    options,
    triggerClassName = "",
    value,
}: ChipSelectProps<T>) {
    const listId = useId();
    const rootRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const listRef = useRef<HTMLDivElement>(null);
    const [open, setOpen] = useState(false);
    const [placement, setPlacement] = useState<"bottom" | "top">("bottom");
    const [activeIndex, setActiveIndex] = useState(0);

    const selectedIndex = Math.max(
        0,
        options.findIndex((option) => option.value === value),
    );
    const selected = options[selectedIndex];

    function openMenu(startAt = selectedIndex) {
        const rect = triggerRef.current?.getBoundingClientRect();

        if (rect) {
            const menuHeight = options.length * MENU_ROW_HEIGHT + 16;
            const roomBelow = window.innerHeight - rect.bottom;

            setPlacement(
                roomBelow < menuHeight + 12 && rect.top > roomBelow
                    ? "top"
                    : "bottom",
            );
        }

        setActiveIndex(startAt);
        setOpen(true);
    }

    function closeMenu(returnFocus = true) {
        setOpen(false);

        if (returnFocus) {
            triggerRef.current?.focus();
        }
    }

    function choose(index: number) {
        const option = options[index];

        closeMenu();

        if (option && option.value !== value) {
            onChange(option.value);
        }
    }

    // Foco na lista ao abrir, para o teclado funcionar de imediato.
    useEffect(() => {
        if (open) {
            listRef.current?.focus();
        }
    }, [open]);

    // Clicar fora fecha o menu.
    useEffect(() => {
        if (!open) {
            return;
        }

        function handlePointerDown(event: PointerEvent) {
            if (!rootRef.current?.contains(event.target as Node)) {
                setOpen(false);
            }
        }

        document.addEventListener("pointerdown", handlePointerDown);

        return () =>
            document.removeEventListener("pointerdown", handlePointerDown);
    }, [open]);

    // Mantém a opção ativa visível quando a lista rola.
    useEffect(() => {
        if (open) {
            document
                .getElementById(`${listId}-${activeIndex}`)
                ?.scrollIntoView({ block: "nearest" });
        }
    }, [activeIndex, listId, open]);

    function handleTriggerKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            openMenu();
        }
    }

    function handleListKeyDown(event: KeyboardEvent<HTMLDivElement>) {
        const last = options.length - 1;

        switch (event.key) {
            case "ArrowDown":
                event.preventDefault();
                setActiveIndex((current) => Math.min(current + 1, last));
                return;
            case "ArrowUp":
                event.preventDefault();
                setActiveIndex((current) => Math.max(current - 1, 0));
                return;
            case "Home":
                event.preventDefault();
                setActiveIndex(0);
                return;
            case "End":
                event.preventDefault();
                setActiveIndex(last);
                return;
            case "Enter":
            case " ":
                event.preventDefault();
                choose(activeIndex);
                return;
            case "Escape":
                event.preventDefault();
                event.stopPropagation();
                closeMenu();
                return;
            case "Tab":
                closeMenu(false);
                return;
        }

        if (event.key.length === 1 && !event.metaKey && !event.ctrlKey) {
            const typed = event.key.toLocaleLowerCase("pt-BR");
            const ordered = [
                ...options.slice(activeIndex + 1),
                ...options.slice(0, activeIndex + 1),
            ];
            const match = ordered.find((option) =>
                option.label.toLocaleLowerCase("pt-BR").startsWith(typed),
            );

            if (match) {
                setActiveIndex(options.indexOf(match));
            }
        }
    }

    return (
        <div
            className={`relative inline-flex ${className}`}
            // O menu fica dentro de cards clicáveis: o clique não deve subir.
            onClick={(event) => event.stopPropagation()}
            ref={rootRef}
        >
            <button
                aria-controls={open ? listId : undefined}
                aria-expanded={open}
                aria-haspopup="listbox"
                aria-label={`${label}: ${selected?.label ?? ""}`}
                className={`inline-flex min-h-6 cursor-pointer items-center gap-1.5 rounded-full px-1.5 py-0.5 transition hover:bg-sloth-moss/25 hover:text-sloth-forest hover:ring-1 hover:ring-sloth-moss/60 aria-expanded:bg-sloth-moss/25 aria-expanded:ring-1 aria-expanded:ring-sloth-moss/60 focus-visible:ring-3 focus-visible:ring-sloth-moss/15 focus-visible:outline-none disabled:cursor-wait disabled:opacity-60 ${triggerClassName}`}
                disabled={disabled}
                onClick={() => (open ? closeMenu(false) : openMenu())}
                onKeyDown={handleTriggerKeyDown}
                ref={triggerRef}
                type="button"
            >
                {selected?.leading}
                {selected?.label}
            </button>

            {open ? (
                <div
                    aria-activedescendant={`${listId}-${activeIndex}`}
                    aria-label={label}
                    className={`animate-menu-in absolute left-0 z-30 max-h-64 min-w-44 overflow-y-auto rounded-2xl border border-sloth-border bg-sloth-card p-1.5 text-sm text-sloth-ink shadow-soft outline-none motion-reduce:animate-none ${
                        placement === "top"
                            ? "bottom-full mb-1.5 origin-bottom-left"
                            : "top-full mt-1.5 origin-top-left"
                    }`}
                    id={listId}
                    onKeyDown={handleListKeyDown}
                    ref={listRef}
                    role="listbox"
                    tabIndex={-1}
                >
                    {options.map((option, index) => {
                        const isSelected = option.value === value;

                        return (
                            <div
                                aria-selected={isSelected}
                                className={`flex min-h-10 cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2 transition-colors ${
                                    isSelected
                                        ? "font-semibold text-sloth-forest"
                                        : ""
                                } ${
                                    index === activeIndex
                                        ? "bg-sloth-beige/70"
                                        : ""
                                } ${isSelected && index !== activeIndex ? "bg-sloth-moss/10" : ""}`}
                                id={`${listId}-${index}`}
                                key={option.value}
                                onClick={() => choose(index)}
                                onMouseMove={() => setActiveIndex(index)}
                                role="option"
                            >
                                {option.leading}
                                <span className="flex-1">{option.label}</span>
                                {isSelected ? (
                                    <span
                                        aria-hidden="true"
                                        className="text-sloth-moss"
                                    >
                                        ✓
                                    </span>
                                ) : null}
                            </div>
                        );
                    })}
                </div>
            ) : null}
        </div>
    );
}
