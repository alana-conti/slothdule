/**
 * Abre as configurações de qualquer lugar do app (a navegação é quem monta a
 * modal). Por enquanto só a mistura do Modo foco precisa disso.
 */
export type SettingsSection = "mistura";

export const OPEN_SETTINGS_EVENT = "slothdule:open-settings";

export function openSettings(section: SettingsSection) {
    window.dispatchEvent(new CustomEvent<SettingsSection>(OPEN_SETTINGS_EVENT, { detail: section }));
}
