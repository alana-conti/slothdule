"use client";

import { useEffect, useId, useRef, useState, useSyncExternalStore, useTransition } from "react";
import type { FormEvent, KeyboardEvent, ReactNode } from "react";
import { useFormStatus } from "react-dom";

import { logout } from "@/app/login/actions";
import {
    disablePush,
    enablePush,
    getPushState,
    pushResultMessages,
    sendTestNotification,
} from "@/features/notifications/push-client";
import type { PushState } from "@/features/notifications/push-client";

import { FocusMixEditor } from "@/features/focus/sound/mix-editor";
import { completionSounds } from "@/lib/audio/sound-settings";
import type { CompletionSound, SoundName } from "@/lib/audio/sound-settings";
import { updateSoundSettings, useSoundSettings } from "@/lib/audio/sound-store";
import { playSound } from "@/lib/audio/sounds";

import { updateProfileAction } from "./actions";
import type { SettingsSection } from "./open-settings";
import {
    DISPLAY_NAME_MAX_LENGTH,
    formatMemberSince,
    getUserInitial,
} from "./profile";
import type { SettingsUser } from "./profile";

export type SettingsTab = "perfil" | "notificacoes" | "sons";

type SettingsDialogProps = {
    user: SettingsUser;
    onClose: () => void;
    /** Abre já no ponto certo (o "Editar camadas" do Modo foco). */
    section?: SettingsSection | null;
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

const tabs: Array<{ icon: ReactNode; id: SettingsTab; label: string }> = [
    {
        icon: (
            <Icon>
                <circle cx="12" cy="8" r="4" />
                <path d="M5 20c1.5-3.5 4-5 7-5s5.5 1.5 7 5" />
            </Icon>
        ),
        id: "perfil",
        label: "Perfil",
    },
    {
        icon: (
            <Icon>
                <path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15L6 16Z" />
                <path d="M10 20.5a2.2 2.2 0 0 0 4 0" />
            </Icon>
        ),
        id: "notificacoes",
        label: "Notificações",
    },
    {
        icon: (
            <Icon>
                <path d="M4 10v4h4l5 4V6L8 10H4Z" />
                <path d="M16.5 9a4 4 0 0 1 0 6M19 6.5a7.5 7.5 0 0 1 0 11" />
            </Icon>
        ),
        id: "sons",
        label: "Sons",
    },
];

const soundOptions: Record<CompletionSound, { description: string; label: string }> = {
    "ding-ding": { description: "Duas notas subindo", label: "Ding-ding" },
    folhinha: { description: "Farfalhar e um plim", label: "Folhinha" },
    "sino-de-vento": { description: "Notas soltas, bem zen", label: "Sino de vento" },
};

/**
 * Configurações da conta, em abas. Montada só quando aberta, como os outros
 * pop-ups do app; Esc, clique fora ou o X fecham.
 */
export function SettingsDialog({ user, onClose, section = null }: SettingsDialogProps) {
    const dialogRef = useRef<HTMLDialogElement>(null);
    const tabRefs = useRef<Partial<Record<SettingsTab, HTMLButtonElement | null>>>({});
    const baseId = useId();
    const [tab, setTab] = useState<SettingsTab>(section === "mistura" ? "sons" : "perfil");

    useEffect(() => {
        const dialog = dialogRef.current;

        if (dialog && !dialog.open) {
            dialog.showModal();
        }
    }, []);

    function handleTabKeyDown(event: KeyboardEvent<HTMLDivElement>) {
        const keys = ["ArrowDown", "ArrowRight", "ArrowUp", "ArrowLeft"];

        if (!keys.includes(event.key)) {
            return;
        }

        event.preventDefault();

        const step = event.key === "ArrowDown" || event.key === "ArrowRight" ? 1 : -1;
        const index = tabs.findIndex((item) => item.id === tab);
        const next = tabs[(index + step + tabs.length) % tabs.length].id;

        setTab(next);
        tabRefs.current[next]?.focus();
    }

    return (
        <dialog
            aria-labelledby={`${baseId}-title`}
            className="m-auto w-[min(42rem,calc(100vw-2rem))] overflow-hidden rounded-card border border-sloth-border bg-sloth-card p-0 text-sloth-ink shadow-soft backdrop:bg-sloth-ink/40"
            onCancel={(event) => {
                event.preventDefault();
                onClose();
            }}
            onClick={(event) => {
                if (event.target === event.currentTarget) {
                    onClose();
                }
            }}
            ref={dialogRef}
        >
            {/* Altura fixa no desktop: trocar de aba não faz a modal pular. */}
            <div className="flex max-h-[calc(100dvh-2rem)] flex-col sm:min-h-[37rem] sm:flex-row">
                <div className="border-b border-sloth-border bg-sloth-cream px-4 pt-5 pb-3 sm:w-48 sm:shrink-0 sm:border-r sm:border-b-0 sm:py-6">
                    <h2
                        className="px-3 pb-3 text-xs font-semibold tracking-[0.14em] text-sloth-moss uppercase"
                        id={`${baseId}-title`}
                    >
                        Configurações
                    </h2>
                    <div
                        aria-label="Seções das configurações"
                        aria-orientation="vertical"
                        className="flex gap-1 sm:flex-col"
                        onKeyDown={handleTabKeyDown}
                        role="tablist"
                    >
                        {tabs.map((item) => {
                            const selected = item.id === tab;

                            return (
                                <button
                                    aria-controls={`${baseId}-${item.id}-panel`}
                                    aria-selected={selected}
                                    className={`flex min-h-10 flex-1 cursor-pointer items-center gap-3 rounded-xl border px-3 text-sm transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sloth-forest sm:flex-none ${
                                        selected
                                            ? "border-sloth-border bg-sloth-card font-semibold text-sloth-forest"
                                            : "border-transparent text-sloth-muted hover:bg-sloth-beige hover:text-sloth-forest"
                                    }`}
                                    id={`${baseId}-${item.id}-tab`}
                                    key={item.id}
                                    onClick={() => setTab(item.id)}
                                    ref={(node) => {
                                        tabRefs.current[item.id] = node;
                                    }}
                                    role="tab"
                                    tabIndex={selected ? 0 : -1}
                                    type="button"
                                >
                                    <span className={selected ? "text-sloth-moss" : ""}>
                                        {item.icon}
                                    </span>
                                    {item.label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div
                    aria-labelledby={`${baseId}-${tab}-tab`}
                    className="relative min-h-0 min-w-0 flex-1 overflow-y-auto p-6"
                    id={`${baseId}-${tab}-panel`}
                    role="tabpanel"
                >
                    <button
                        aria-label="Fechar configurações"
                        className="absolute top-4 right-4 inline-flex size-9 cursor-pointer items-center justify-center rounded-full text-sloth-muted transition hover:bg-sloth-beige hover:text-sloth-forest focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sloth-forest"
                        onClick={onClose}
                        type="button"
                    >
                        <Icon>
                            <path d="M6 6l12 12M18 6 6 18" />
                        </Icon>
                    </button>

                    {tab === "perfil" ? <ProfilePanel user={user} /> : null}
                    {tab === "notificacoes" ? <NotificationsPanel /> : null}
                    {tab === "sons" ? <SoundsPanel showMix={section === "mistura"} /> : null}
                </div>
            </div>
        </dialog>
    );
}

function PanelHeader({ description, title }: { description: string; title: string }) {
    return (
        <div className="pr-10">
            <h3 className="text-xl font-semibold text-sloth-ink">{title}</h3>
            <p className="mt-1 text-sm text-sloth-muted">{description}</p>
        </div>
    );
}

function Avatar({ user }: { user: SettingsUser }) {
    const [failed, setFailed] = useState(false);

    if (user.avatarUrl && !failed) {
        return (
            // Foto do Google, de domínio externo: <img> simples evita
            // configurar domínios no next/image só para isso.
            // eslint-disable-next-line @next/next/no-img-element
            <img
                alt=""
                className="size-14 shrink-0 rounded-full border border-sloth-border object-cover"
                onError={() => setFailed(true)}
                referrerPolicy="no-referrer"
                src={user.avatarUrl}
            />
        );
    }

    return (
        <span
            aria-hidden="true"
            className="inline-flex size-14 shrink-0 items-center justify-center rounded-full bg-sloth-gold text-xl font-semibold text-white"
        >
            {getUserInitial(user)}
        </span>
    );
}

function ProfilePanel({ user }: { user: SettingsUser }) {
    const nameId = useId();
    const errorId = useId();
    const [savedName, setSavedName] = useState(user.displayName ?? "");
    const [name, setName] = useState(savedName);
    const [error, setError] = useState<string | null>(null);
    const [saved, setSaved] = useState(false);
    const [pending, startTransition] = useTransition();
    const memberSince = formatMemberSince(user.createdAt);
    const shownName = savedName.trim();

    function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (pending) {
            return;
        }

        startTransition(async () => {
            const result = await updateProfileAction(name);

            if (!result.ok) {
                setError(result.error);
                return;
            }

            const next = result.displayName ?? "";

            setSavedName(next);
            setName(next);
            setError(null);
            // Aviso aqui mesmo: o toast ficaria atrás da modal.
            setSaved(true);
        });
    }

    return (
        <div>
            <form onSubmit={handleSubmit}>
                <PanelHeader description="Como o Slothdule chama você." title="Perfil" />

                <div className="mt-6 flex items-center gap-4">
                    <Avatar user={{ ...user, displayName: shownName || null }} />
                    <div className="min-w-0">
                        <p className="truncate font-semibold text-sloth-ink">
                            {shownName || "Sem nome por enquanto"}
                        </p>
                        <p className="text-xs text-sloth-muted">
                            {user.avatarUrl ? "Foto da sua conta Google" : "Sua inicial no lugar da foto"}
                        </p>
                    </div>
                </div>

                <label className="mt-6 mb-2 block text-sm font-medium" htmlFor={nameId}>
                    Nome
                </label>
                <input
                    aria-describedby={error ? errorId : undefined}
                    aria-invalid={error ? true : undefined}
                    autoComplete="name"
                    className="min-h-11 w-full rounded-2xl border border-sloth-border bg-sloth-card px-4 outline-none focus:border-sloth-moss focus:ring-3 focus:ring-sloth-moss/15"
                    id={nameId}
                    maxLength={DISPLAY_NAME_MAX_LENGTH}
                    onChange={(event) => {
                        setName(event.target.value);
                        setError(null);
                        setSaved(false);
                    }}
                    placeholder="Seu nome"
                    type="text"
                    value={name}
                />
                {error ? (
                    <p className="mt-2 text-xs text-sloth-terracotta" id={errorId} role="alert">
                        {error}
                    </p>
                ) : null}

                <p className="mt-5 mb-2 text-sm font-medium">E-mail</p>
                <p className="flex min-h-11 items-center truncate rounded-2xl border border-sloth-border bg-sloth-cream px-4 text-sm text-sloth-muted">
                    {user.email}
                </p>
                <p className="mt-2 text-xs text-sloth-muted">
                    {user.googleLinked
                        ? "Você entra com o Google, então o e-mail vem de lá."
                        : "É o e-mail que você usa para entrar."}
                </p>

                <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
                    <p className="text-xs text-sloth-muted">
                        {memberSince ? `No Slothdule desde ${memberSince}` : null}
                    </p>
                    <span className="ml-auto text-xs text-sloth-forest" role="status">
                        {saved ? "Perfil salvo" : ""}
                    </span>
                    <button
                        className="min-h-10 cursor-pointer rounded-xl bg-sloth-moss px-5 text-sm font-semibold text-white transition hover:bg-sloth-forest focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sloth-forest disabled:cursor-wait disabled:opacity-70"
                        disabled={pending}
                        type="submit"
                    >
                        {pending ? "Salvando…" : "Salvar"}
                    </button>
                </div>
            </form>

            {/* Fora do form do perfil: formulários não podem ficar aninhados. */}
            <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-sloth-border/70 pt-5">
                <div className="min-w-0">
                    <p className="text-sm font-medium">Sair da conta</p>
                    <p className="text-xs text-sloth-muted">
                        Suas tarefas ficam guardadas até você voltar.
                    </p>
                </div>
                <form action={logout}>
                    <LogoutButton />
                </form>
            </div>
        </div>
    );
}

function LogoutButton() {
    const { pending } = useFormStatus();

    return (
        <button
            className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-xl border border-sloth-border bg-sloth-card px-4 text-sm font-medium text-sloth-ink transition hover:bg-sloth-beige focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sloth-forest disabled:cursor-wait disabled:opacity-70"
            disabled={pending}
            type="submit"
        >
            <svg
                aria-hidden="true"
                className="size-4 shrink-0"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.7"
                viewBox="0 0 24 24"
            >
                <path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4M10 8l-4 4 4 4M6 12h10" />
            </svg>
            {pending ? "Saindo…" : "Sair"}
        </button>
    );
}

function PreviewButton({ label, sound }: { label: string; sound: SoundName }) {
    return (
        <button
            aria-label={`Ouvir ${label}`}
            className="inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full border border-sloth-border bg-sloth-card text-sloth-forest transition hover:bg-sloth-beige focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sloth-forest"
            onClick={(event) => {
                // Dentro do <label> do som: ouvir não troca a escolha.
                event.preventDefault();
                playSound(sound);
            }}
            type="button"
        >
            <svg aria-hidden="true" className="size-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5Z" />
            </svg>
        </button>
    );
}

const noopSubscribe = () => () => {};

function NotificationsPanel() {
    const baseId = useId();
    // Lido do navegador só no cliente; no servidor vale "default".
    const initialState = useSyncExternalStore<PushState>(
        noopSubscribe,
        getPushState,
        () => "default",
    );
    const [pushState, setPushState] = useState<PushState | null>(null);
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const state = pushState ?? initialState;
    const enabled = state === "granted";
    const unavailable = state === "unsupported" || state === "denied";

    async function toggle() {
        if (busy || unavailable) {
            return;
        }

        setBusy(true);
        setMessage(null);

        if (enabled) {
            await disablePush();
            setMessage("Notificações desligadas neste aparelho.");
        } else {
            const result = await enablePush();

            setMessage(
                result === "enabled"
                    ? "Pronto. Este aparelho vai receber os lembretes. 🍃"
                    : pushResultMessages[result],
            );
        }

        setPushState(getPushState());
        setBusy(false);
    }

    async function test() {
        const sent = await sendTestNotification();

        setMessage(
            sent
                ? "Teste enviado. Deve aparecer em instantes."
                : "Não deu para mostrar o teste agora. Tente de novo daqui a pouco.",
        );
    }

    return (
        <div>
            <PanelHeader
                description="Lembretes gentis de tarefas e hábitos, no seu ritmo."
                title="Notificações"
            />

            <div className="mt-6 flex items-center gap-4 rounded-2xl border border-sloth-border bg-sloth-cream px-4 py-3">
                <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold" id={`${baseId}-enabled`}>
                        Receber notificações
                    </p>
                    <p className="text-xs text-sloth-muted">
                        {state === "denied"
                            ? pushResultMessages.denied
                            : state === "unsupported"
                              ? pushResultMessages.unsupported
                              : "Vale só para este aparelho."}
                    </p>
                </div>
                <button
                    aria-checked={enabled}
                    aria-labelledby={`${baseId}-enabled`}
                    className={`relative h-6 w-11 shrink-0 cursor-pointer rounded-full transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sloth-forest disabled:cursor-not-allowed disabled:opacity-50 ${
                        enabled ? "bg-sloth-moss" : "bg-sloth-border"
                    } ${busy ? "cursor-wait" : ""}`}
                    disabled={unavailable}
                    onClick={toggle}
                    role="switch"
                    type="button"
                >
                    <span
                        aria-hidden="true"
                        className={`absolute top-1 left-1 size-4 rounded-full bg-white transition-transform ${
                            enabled ? "translate-x-5" : ""
                        }`}
                    />
                </button>
            </div>

            <div
                className={`mt-6 flex flex-wrap items-center gap-3 rounded-2xl border border-sloth-border px-4 py-3 transition-opacity ${
                    enabled ? "" : "opacity-50"
                }`}
            >
                <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">Testar notificação</p>
                    <p className="text-xs text-sloth-muted">
                        Um aviso de exemplo, para ver como chega por aqui.
                    </p>
                </div>
                <button
                    className="min-h-10 cursor-pointer rounded-xl border border-sloth-border bg-sloth-card px-4 text-sm font-semibold text-sloth-forest transition hover:bg-sloth-beige focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sloth-forest disabled:cursor-not-allowed"
                    disabled={!enabled}
                    onClick={test}
                    type="button"
                >
                    Enviar teste
                </button>
            </div>

            <p aria-live="polite" className="mt-4 min-h-5 text-xs font-medium text-sloth-forest">
                {message}
            </p>
        </div>
    );
}

function SoundsPanel({ showMix }: { showMix: boolean }) {
    const settings = useSoundSettings();
    const baseId = useId();
    const mixRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (showMix) {
            mixRef.current?.scrollIntoView({ block: "start" });
        }
    }, [showMix]);

    return (
        <div>
            <PanelHeader
                description="Um sinal gentil quando algo fica pronto."
                title="Sons"
            />

            <div className="mt-6 flex items-center gap-4 rounded-2xl border border-sloth-border bg-sloth-cream px-4 py-3">
                <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold" id={`${baseId}-enabled`}>
                        Tocar sons
                    </p>
                    <p className="text-xs text-sloth-muted">
                        Desligue para um Slothdule silencioso. Vale só para este aparelho.
                    </p>
                </div>
                <button
                    aria-checked={settings.enabled}
                    aria-labelledby={`${baseId}-enabled`}
                    className={`relative h-6 w-11 shrink-0 cursor-pointer rounded-full transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sloth-forest ${
                        settings.enabled ? "bg-sloth-moss" : "bg-sloth-border"
                    }`}
                    onClick={() => updateSoundSettings({ enabled: !settings.enabled })}
                    role="switch"
                    type="button"
                >
                    <span
                        aria-hidden="true"
                        className={`absolute top-1 left-1 size-4 rounded-full bg-white transition-transform ${
                            settings.enabled ? "translate-x-5" : ""
                        }`}
                    />
                </button>
            </div>

            <fieldset
                className={`mt-6 transition-opacity ${settings.enabled ? "" : "opacity-50"}`}
                disabled={!settings.enabled}
            >
                <legend className="sr-only">Opções de som</legend>

                <label className="mb-2 block text-sm font-medium" htmlFor={`${baseId}-volume`}>
                    Volume
                </label>
                <div className="flex items-center gap-3">
                    <input
                        className="flex-1 accent-sloth-moss"
                        id={`${baseId}-volume`}
                        max={100}
                        min={0}
                        onChange={(event) =>
                            updateSoundSettings({ volume: Number(event.target.value) })
                        }
                        // Ao soltar o controle, um exemplo no volume novo.
                        onKeyUp={() => playSound(settings.completionSound)}
                        onPointerUp={() => playSound(settings.completionSound)}
                        step={5}
                        type="range"
                        value={settings.volume}
                    />
                    <span className="w-10 text-right text-xs text-sloth-muted tabular-nums">
                        {settings.volume}%
                    </span>
                </div>

                <p className="mt-6 mb-2 text-sm font-medium" id={`${baseId}-sound`}>
                    Ao concluir uma tarefa
                </p>
                <div aria-labelledby={`${baseId}-sound`} className="grid gap-2" role="radiogroup">
                    {completionSounds.map((sound) => {
                        const option = soundOptions[sound];
                        const selected = settings.completionSound === sound;

                        return (
                            <label
                                className={`flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-2.5 transition has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-sloth-forest ${
                                    selected
                                        ? "border-sloth-moss bg-sloth-moss/5"
                                        : "border-sloth-border bg-sloth-card hover:bg-sloth-beige/50"
                                }`}
                                key={sound}
                            >
                                <input
                                    checked={selected}
                                    className="size-4 shrink-0 accent-sloth-moss"
                                    name={`${baseId}-completion-sound`}
                                    onChange={() => {
                                        updateSoundSettings({ completionSound: sound });
                                        playSound(sound);
                                    }}
                                    type="radio"
                                    value={sound}
                                />
                                <span className="min-w-0 flex-1">
                                    <span className="block text-sm font-semibold">
                                        {option.label}
                                    </span>
                                    <span className="block text-xs text-sloth-muted">
                                        {option.description}
                                    </span>
                                </span>
                                <PreviewButton label={option.label} sound={sound} />
                            </label>
                        );
                    })}
                </div>

                <div className="mt-4 flex items-center gap-3 rounded-2xl border border-dashed border-sloth-border px-4 py-2.5">
                    <span aria-hidden="true" className="text-sloth-gold">
                        <Icon>
                            <path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8L12 3Z" />
                            <path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15Z" />
                        </Icon>
                    </span>
                    <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold">Dia completo</span>
                        <span className="block text-xs text-sloth-muted">
                            Um arpejo quando a última tarefa de hoje termina
                        </span>
                    </span>
                    <PreviewButton label="som de dia completo" sound="dia-completo" />
                </div>
            </fieldset>

            <div className="mt-8 scroll-mt-6 border-t border-sloth-border pt-6" ref={mixRef}>
                <FocusMixEditor />
            </div>
        </div>
    );
}
