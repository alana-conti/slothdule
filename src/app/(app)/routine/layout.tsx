import { NewHabitDialog } from "@/features/habits/new-habit-dialog";

export default function RoutineLayout({ children }: { children: React.ReactNode }) {
    return (
        <>
            {children}
            <NewHabitDialog />
        </>
    );
}
