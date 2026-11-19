import { NewHabitDialog } from "@/features/habits/new-habit-dialog";
import { RoutineDialog } from "@/features/habits/routine-dialog";

export default function RoutineLayout({ children }: { children: React.ReactNode }) {
    return (
        <>
            {children}
            <NewHabitDialog />
            <RoutineDialog />
        </>
    );
}
