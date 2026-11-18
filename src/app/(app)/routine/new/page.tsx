import Link from "next/link";
import { redirect } from "next/navigation";

import { listHabits } from "@/features/habits/data";
import { NewHabitForm } from "@/features/habits/new-habit-form";
import { PageNotice } from "@/features/habits/page-notice";
import { isInFormation } from "@/lib/habits";
import { getCurrentUser } from "@/lib/api/server";

type NewHabitPageProps = {
    searchParams: Promise<{ error?: string }>;
};

export default async function NewHabitPage({ searchParams }: NewHabitPageProps) {
    const user = await getCurrentUser();

    if (!user) {
        redirect("/login");
    }

    const [{ error }, habits] = await Promise.all([searchParams, listHabits()]);
    const inFormation = habits.filter((habit) => isInFormation(habit.stage)).length;

    return (
        <main className="min-h-screen px-5 py-8 sm:px-8 sm:py-12">
            <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
                <Link
                    className="inline-flex min-h-9 w-fit items-center gap-1.5 text-sm font-semibold text-sloth-forest hover:text-sloth-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sloth-forest"
                    href="/routine"
                >
                    <svg aria-hidden="true" className="size-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
                        <path d="m15 18-6-6 6-6" />
                    </svg>
                    Rotina
                </Link>

                <header>
                    <p className="text-xs font-semibold tracking-[0.2em] text-sloth-moss uppercase">
                        Novo hábito
                    </p>
                    <h1 className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-sloth-ink">
                        Plantar um hábito
                    </h1>
                    <p className="mt-2 text-sm leading-relaxed text-sloth-muted">
                        Todo hábito começa como broto e cresce com os dias cuidados.
                    </p>
                </header>

                <PageNotice error={error} />

                <div className="rounded-card border border-sloth-border bg-sloth-card p-6 shadow-soft sm:p-8">
                    <NewHabitForm inFormation={inFormation} />
                </div>
            </div>
        </main>
    );
}
