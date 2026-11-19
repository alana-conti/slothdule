import type { HabitStage, Routine } from "@/types/habits";

/**
 * O pop-up de rotina (nova ou editar) vive no layout da Rotina e é aberto
 * por evento da janela, como o de novo hábito. Quem abre manda os hábitos
 * disponíveis, porque o layout não carrega dados.
 */
export const OPEN_ROUTINE_DIALOG_EVENT = "slothdule:open-routine-dialog";

export type RoutineHabitOption = {
    id: string;
    title: string;
    stage: HabitStage;
    routineId: string | null;
};

export type OpenRoutineDialogDetail = {
    habits: RoutineHabitOption[];
    routines: Routine[];
    /** Presente ao editar; ausente para criar. */
    routine?: Routine;
};

export function openRoutineDialog(detail: OpenRoutineDialogDetail) {
    window.dispatchEvent(
        new CustomEvent<OpenRoutineDialogDetail>(OPEN_ROUTINE_DIALOG_EVENT, { detail }),
    );
}
