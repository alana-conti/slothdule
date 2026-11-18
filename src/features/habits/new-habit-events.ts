/**
 * O pop-up de novo hábito vive no layout da Rotina e é aberto por qualquer
 * botão "Novo hábito" por evento da janela, como o de nova tarefa.
 */
export const OPEN_NEW_HABIT_EVENT = "slothdule:open-new-habit";

export type OpenNewHabitDetail = {
    /** Hábitos em broto ou muda no momento, para o aviso de formação. */
    inFormation: number;
};

export function openNewHabitDialog(detail: OpenNewHabitDetail) {
    window.dispatchEvent(new CustomEvent<OpenNewHabitDetail>(OPEN_NEW_HABIT_EVENT, { detail }));
}
