/** Campo onde a pessoa está digitando: atalhos de uma letra não valem ali. */
export function isTypingTarget(target: EventTarget | null) {
    if (!(target instanceof HTMLElement)) {
        return false;
    }

    return (
        target.isContentEditable ||
        ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)
    );
}

/**
 * Atalho de uma letra (N, F): só a tecla, sem modificadores, fora de campos de
 * texto e sem pop-up aberto por cima.
 */
export function isLetterShortcut(event: KeyboardEvent, letter: string) {
    return (
        event.key.toLowerCase() === letter &&
        !event.repeat &&
        !event.defaultPrevented &&
        !event.metaKey &&
        !event.ctrlKey &&
        !event.altKey &&
        !isTypingTarget(event.target) &&
        !document.querySelector("dialog[open]")
    );
}
