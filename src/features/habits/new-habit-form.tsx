"use client";

import Image from "next/image";
import { useState, type FormEvent } from "react";

import { formatWeekdays, getStageThresholds, periodLabels } from "@/lib/habits";
import { habitPeriods, type HabitKind, type HabitPeriod } from "@/types/habits";

const weekdayChips = [
    { day: 1, label: "Seg" },
    { day: 2, label: "Ter" },
    { day: 3, label: "Qua" },
    { day: 4, label: "Qui" },
    { day: 5, label: "Sex" },
    { day: 6, label: "Sáb" },
    { day: 7, label: "Dom" },
];

type When = "any" | "period" | "time";

const inputClass =
    "mt-2 w-full rounded-2xl border border-sloth-border bg-white/70 px-4 py-3 text-sm text-sloth-ink outline-none transition focus:border-sloth-moss focus:ring-2 focus:ring-sloth-moss/15";

function segmentClass(active: boolean) {
    return `flex min-h-11 flex-1 cursor-pointer items-center justify-center rounded-xl px-2 text-[13px] whitespace-nowrap transition sm:px-3 sm:text-sm has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-sloth-forest ${
        active
            ? "bg-sloth-moss font-semibold text-white"
            : "text-sloth-muted hover:bg-sloth-beige hover:text-sloth-forest"
    }`;
}

function SubmitButton({ pending }: { pending: boolean }) {
    return (
        <button
            className="flex min-h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-sloth-moss px-5 text-base font-semibold text-white transition hover:bg-sloth-forest focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sloth-forest disabled:opacity-60 sm:w-auto"
            disabled={pending}
            type="submit"
        >
            {pending ? "Plantando…" : "Plantar hábito"}
        </button>
    );
}

type NewHabitFormProps = {
    /** Hábitos em broto ou muda: a partir de 2, um aviso gentil aparece. */
    inFormation: number;
    onSubmit: (event: FormEvent<HTMLFormElement>) => void;
    pending: boolean;
};

export function NewHabitForm({ inFormation, onSubmit, pending }: NewHabitFormProps) {
    const [kind, setKind] = useState<HabitKind>("do");
    const [weekdays, setWeekdays] = useState<number[]>([1, 2, 3, 4, 5, 6, 7]);
    const [when, setWhen] = useState<When>("any");
    const [period, setPeriod] = useState<HabitPeriod>("morning");
    const limits = getStageThresholds(weekdays.length || 1);

    function toggleDay(day: number) {
        setWeekdays((current) =>
            current.includes(day)
                ? current.filter((value) => value !== day)
                : [...current, day].sort((a, b) => a - b),
        );
    }

    return (
        <form className="grid gap-6" onSubmit={onSubmit}>
            <label className="block text-sm font-medium text-sloth-ink">
                {kind === "avoid" ? "O que você quer evitar?" : "Que hábito você quer cultivar?"}
                <input
                    autoComplete="off"
                    autoFocus
                    className={inputClass}
                    maxLength={120}
                    name="title"
                    placeholder={kind === "avoid" ? "Ex.: pedir delivery" : "Ex.: beber um copo d’água"}
                    required
                />
            </label>

            <fieldset>
                <legend className="text-sm font-medium text-sloth-ink">Tipo</legend>
                <div className="mt-2 flex gap-1 rounded-2xl border border-sloth-border bg-sloth-card p-1">
                    {(
                        [
                            ["do", "Fazer"],
                            ["avoid", "Evitar"],
                        ] as const
                    ).map(([value, label]) => (
                        <label className={segmentClass(kind === value)} key={value}>
                            <input
                                checked={kind === value}
                                className="sr-only"
                                name="kind"
                                onChange={() => setKind(value)}
                                type="radio"
                                value={value}
                            />
                            {label}
                        </label>
                    ))}
                </div>
                <p className="mt-2 text-[13px] leading-relaxed text-sloth-muted">
                    {kind === "avoid"
                        ? "Você marca os dias em que conseguiu evitar. Nada é marcado como falha sozinho."
                        : "Você marca os dias em que fez. Fez em outro horário? Conta igual."}
                </p>
            </fieldset>

            <fieldset>
                <legend className="text-sm font-medium text-sloth-ink">Dias da semana</legend>
                <div className="mt-2 grid grid-cols-7 gap-1.5">
                    {weekdayChips.map(({ day, label }) => {
                        const on = weekdays.includes(day);

                        return (
                            <label
                                className={`flex min-h-11 cursor-pointer items-center justify-center rounded-xl border text-sm transition has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-sloth-forest ${
                                    on
                                        ? "border-sloth-moss bg-sloth-moss font-semibold text-white"
                                        : "border-sloth-border bg-sloth-card text-sloth-muted hover:bg-sloth-beige"
                                }`}
                                key={day}
                            >
                                <input
                                    checked={on}
                                    className="sr-only"
                                    name="weekdays"
                                    onChange={() => toggleDay(day)}
                                    type="checkbox"
                                    value={day}
                                />
                                {label}
                            </label>
                        );
                    })}
                </div>
                <p aria-live="polite" className="mt-2 text-[13px] leading-relaxed text-sloth-muted">
                    {weekdays.length === 0
                        ? "Escolha pelo menos um dia."
                        : `${formatWeekdays(weekdays)[0].toUpperCase()}${formatWeekdays(weekdays).slice(1)}: vira muda com ${limits.muda} cuidados, arbusto com ${limits.arbusto} e árvore com ${limits.arvore}.`}
                </p>
            </fieldset>

            <fieldset>
                <legend className="text-sm font-medium text-sloth-ink">Quando</legend>
                <div className="mt-2 flex gap-1 rounded-2xl border border-sloth-border bg-sloth-card p-1">
                    {(
                        [
                            ["time", "Horário"],
                            ["period", "Período"],
                            ["any", "Qualquer hora"],
                        ] as const
                    ).map(([value, label]) => (
                        <label className={segmentClass(when === value)} key={value}>
                            <input
                                checked={when === value}
                                className="sr-only"
                                name="when"
                                onChange={() => setWhen(value)}
                                type="radio"
                                value={value}
                            />
                            {label}
                        </label>
                    ))}
                </div>

                {when === "time" ? (
                    <label className="mt-3 block text-sm text-sloth-ink">
                        Horário
                        <input className={`${inputClass} max-w-40`} name="timeOfDay" required type="time" />
                    </label>
                ) : null}

                {when === "period" ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                        {habitPeriods.map((value) => (
                            <label
                                className={`flex min-h-10 cursor-pointer items-center rounded-full border px-4 text-sm transition has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-sloth-forest ${
                                    period === value
                                        ? "border-sloth-moss bg-sloth-moss/10 font-semibold text-sloth-forest"
                                        : "border-sloth-border bg-sloth-card text-sloth-muted hover:bg-sloth-beige"
                                }`}
                                key={value}
                            >
                                <input
                                    checked={period === value}
                                    className="sr-only"
                                    name="period"
                                    onChange={() => setPeriod(value)}
                                    type="radio"
                                    value={value}
                                />
                                {periodLabels[value]}
                            </label>
                        ))}
                    </div>
                ) : null}

                <p className="mt-2 text-[13px] leading-relaxed text-sloth-muted">
                    Fazer em qualquer momento do dia conta. O horário só ajuda a organizar.
                </p>
            </fieldset>

            <div className="flex items-start gap-3 rounded-2xl border border-sloth-leaf/30 bg-sloth-leaf/10 p-4">
                <Image
                    alt=""
                    className="h-auto w-14 shrink-0"
                    height={877}
                    sizes="56px"
                    src="/images/sloth-mascot.png"
                    width={900}
                />
                <p className="text-sm leading-relaxed text-sloth-forest">
                    <span className="font-semibold">Comece pequeno.</span> Dois minutos que você
                    faz todo dia valem mais que uma hora que fica para amanhã. Quando a planta
                    firmar, dá para subir a régua.
                </p>
            </div>

            {inFormation >= 2 ? (
                <p className="rounded-2xl border border-sloth-amber/40 bg-sloth-amber/10 p-4 text-sm leading-relaxed text-sloth-ink">
                    Você já tem {inFormation} hábitos em formação (broto ou muda). Dá para plantar
                    mais, mas costuma ficar mais leve deixar esses firmarem primeiro.
                </p>
            ) : null}

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <SubmitButton pending={pending} />
            </div>
        </form>
    );
}
