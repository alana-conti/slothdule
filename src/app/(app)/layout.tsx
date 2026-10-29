import { ToastProvider } from "@/components/sloth/toast";
import { NewTaskDialog } from "@/features/tasks/new-task-dialog";

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ToastProvider>
      {children}
      <NewTaskDialog />
    </ToastProvider>
  );
}
