/**
 * O pop-up de nova tarefa vive no layout e é aberto por qualquer botão (menu
 * lateral, barra do celular) ou pela tecla N. Os botões não conhecem o pop-up:
 * só avisam por eventos da janela.
 */
export const OPEN_NEW_TASK_EVENT = "slothdule:open-new-task";
export const PRELOAD_NEW_TASK_EVENT = "slothdule:preload-new-task";

export function openNewTaskDialog() {
    window.dispatchEvent(new Event(OPEN_NEW_TASK_EVENT));
}

/** Aquece as categorias quando a pessoa chega perto do botão. */
export function preloadNewTaskDialog() {
    window.dispatchEvent(new Event(PRELOAD_NEW_TASK_EVENT));
}
