import { AppNavigation } from "@/components/sloth/app-navigation";
import { ToastProvider } from "@/components/sloth/toast";
import { NewTaskDialog } from "@/features/tasks/new-task-dialog";
import { getUserLeafBalance } from "@/features/tasks/data";
import { getCurrentUser } from "@/lib/api/server";

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getCurrentUser();
  // Sem sessão cada página redireciona para o login; aqui só não montamos o menu.
  const balance = user ? await getUserLeafBalance() : 0;

  return (
    <ToastProvider>
      {user ? (
        <AppNavigation balance={balance} email={user.email || "sua conta"} />
      ) : null}
      <div className={user ? "pb-28 lg:pb-0 lg:pl-64" : undefined}>
        {children}
      </div>
      <NewTaskDialog />
    </ToastProvider>
  );
}
