"use client";

import type { ReactNode } from "react";

import { openNewHabitDialog } from "@/features/habits/new-habit-events";

type NewHabitButtonProps = {
    children: ReactNode;
    className: string;
    inFormation: number;
};

export function NewHabitButton({ children, className, inFormation }: NewHabitButtonProps) {
    return (
        <button
            aria-controls="novo-habito"
            aria-haspopup="dialog"
            className={`cursor-pointer ${className}`}
            onClick={() => openNewHabitDialog({ inFormation })}
            type="button"
        >
            {children}
        </button>
    );
}
