"use client";

import type { ReactNode } from "react";

import { openRoutineDialog, type OpenRoutineDialogDetail } from "@/features/habits/routine-events";

type RoutineButtonProps = OpenRoutineDialogDetail & {
    "aria-label"?: string;
    children: ReactNode;
    className: string;
};

/** Abre o pop-up de rotina: nova, ou editar quando `routine` vem junto. */
export function RoutineButton({
    "aria-label": ariaLabel,
    children,
    className,
    habits,
    routine,
    routines,
}: RoutineButtonProps) {
    return (
        <button
            aria-controls="rotina-dialogo"
            aria-haspopup="dialog"
            aria-label={ariaLabel}
            className={`cursor-pointer ${className}`}
            onClick={() => openRoutineDialog({ habits, routine, routines })}
            type="button"
        >
            {children}
        </button>
    );
}
