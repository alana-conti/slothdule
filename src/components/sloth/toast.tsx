"use client";

import Image from "next/image";
import Link from "next/link";
import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";

type ToastTone = "success" | "error";

type ToastInput = {
    title: string;
    description?: string;
    tone?: ToastTone;
    action?: { href: string; label: string };
    /** Tempo na tela, em ms. Padrão: 5s (8s para erros). */
    duration?: number;
};

type ToastItem = ToastInput & { id: number };

type ToastContextValue = {
    toast: (input: ToastInput) => void;
};

const MAX_VISIBLE = 3;
const LEAVE_MS = 220;

const toneClasses: Record<ToastTone, { card: string; avatar: string }> = {
    success: {
        card: "border-sloth-leaf/40",
        avatar: "border-sloth-leaf/50",
    },
    error: {
        card: "border-sloth-terracotta/40",
        avatar: "border-sloth-terracotta/50",
    },
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
    const context = useContext(ToastContext);

    if (!context) {
        throw new Error("useToast precisa estar dentro de <ToastProvider>.");
    }

    return context;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [items, setItems] = useState<ToastItem[]>([]);
    const nextId = useRef(0);

    const remove = useCallback((id: number) => {
        setItems((current) => current.filter((item) => item.id !== id));
    }, []);

    const toast = useCallback((input: ToastInput) => {
        nextId.current += 1;
        const item = { ...input, id: nextId.current };

        setItems((current) => [...current, item].slice(-MAX_VISIBLE));
    }, []);

    const value = useMemo(() => ({ toast }), [toast]);

    return (
        <ToastContext.Provider value={value}>
            {children}

            {/* Sem role aqui: cada aviso declara o seu (status/alert). */}
            <div
                aria-live="polite"
                className="pointer-events-none fixed inset-x-4 bottom-24 z-50 flex flex-col items-center gap-3 sm:bottom-8"
            >
                {items.map((item) => (
                    <ToastCard item={item} key={item.id} onRemove={remove} />
                ))}
            </div>
        </ToastContext.Provider>
    );
}

type ToastCardProps = {
    item: ToastItem;
    onRemove: (id: number) => void;
};

function ToastCard({ item, onRemove }: ToastCardProps) {
    const tone = item.tone ?? "success";
    const duration = item.duration ?? (tone === "error" ? 8000 : 5000);
    const [paused, setPaused] = useState(false);
    const [leaving, setLeaving] = useState(false);
    const remaining = useRef(duration);

    const dismiss = useCallback(() => {
        setLeaving(true);
        setTimeout(() => onRemove(item.id), LEAVE_MS);
    }, [item.id, onRemove]);

    // O tempo para de correr enquanto o mouse/foco estiver no aviso, para dar
    // tempo de ler e de clicar no link sem pressa.
    useEffect(() => {
        if (paused || leaving) {
            return;
        }

        const startedAt = Date.now();
        const timer = setTimeout(dismiss, remaining.current);

        return () => {
            clearTimeout(timer);
            remaining.current -= Date.now() - startedAt;
        };
    }, [dismiss, leaving, paused]);

    return (
        <div
            className={`pointer-events-auto relative w-full max-w-md overflow-hidden rounded-2xl border bg-sloth-card shadow-soft motion-reduce:animate-none ${
                toneClasses[tone].card
            } ${leaving ? "animate-toast-out" : "animate-toast-in"}`}
            onBlur={() => setPaused(false)}
            onFocus={() => setPaused(true)}
            onPointerEnter={() => setPaused(true)}
            onPointerLeave={() => setPaused(false)}
            role={tone === "error" ? "alert" : "status"}
        >
            <div className="flex items-start gap-3 p-4 pr-12">
                <div
                    aria-hidden="true"
                    className={`size-10 shrink-0 overflow-hidden rounded-full border bg-sloth-beige p-1 ${toneClasses[tone].avatar}`}
                >
                    {/* A imagem já é só a cabeça: mostrar inteira, sem zoom. */}
                    <Image
                        alt=""
                        className="size-full object-contain"
                        height={877}
                        src="/images/sloth-mascot.png"
                        width={900}
                    />
                </div>

                <div className="min-w-0">
                    <p className="text-sm font-semibold text-sloth-ink">
                        {item.title}
                    </p>
                    {item.description ? (
                        <p className="mt-0.5 text-sm leading-snug break-words text-sloth-muted">
                            {item.description}
                        </p>
                    ) : null}
                    {item.action ? (
                        <Link
                            className="mt-2 inline-flex min-h-8 items-center text-xs font-semibold text-sloth-forest underline-offset-2 hover:underline"
                            href={item.action.href}
                            onClick={dismiss}
                        >
                            {item.action.label}
                        </Link>
                    ) : null}
                </div>
            </div>

            <button
                aria-label="Fechar aviso"
                className="absolute top-2 right-2 inline-flex size-8 cursor-pointer items-center justify-center rounded-lg text-lg text-sloth-muted transition hover:bg-sloth-beige"
                onClick={dismiss}
                type="button"
            >
                <span aria-hidden="true">×</span>
            </button>

            {/* Folhinha de tempo: um fio que se recolhe com calma. */}
            <span
                aria-hidden="true"
                className="animate-toast-progress absolute inset-x-0 bottom-0 h-1 origin-left bg-sloth-leaf/40 motion-reduce:hidden"
                style={{
                    animationDuration: `${duration}ms`,
                    animationPlayState: paused ? "paused" : "running",
                }}
            />
        </div>
    );
}
