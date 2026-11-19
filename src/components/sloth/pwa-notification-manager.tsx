"use client";

import { useEffect, useState } from "react";

import { enablePush, pushResultMessages, syncPush } from "@/features/notifications/push-client";
import { pickMascotNotification } from "@/lib/mascot-notifications";

export function PwaNotificationManager() {
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const checkNotificationSupportAndState = async () => {
      if (!("Notification" in window) || !("serviceWorker" in navigator)) {
        setPermission("unsupported");
        return;
      }

      setPermission(Notification.permission);

      if (Notification.permission === "granted") {
        // Mantém a inscrição deste aparelho registrada no backend (lembretes).
        await syncPush();
      }
    };

    // Defer state update using setTimeout to avoid synchronous setState inside render/effect cycles
    const timer = setTimeout(() => {
      checkNotificationSupportAndState();
    }, 0);

    return () => clearTimeout(timer);
  }, []);

  const requestPermission = async () => {
    if (permission === "unsupported") return;

    setIsSubscribing(true);
    const result = await enablePush();
    setIsSubscribing(false);
    setPermission(Notification.permission);
    setMessage(
      result === "enabled"
        ? "Que bom! Notificações ativadas com calma. 🍃"
        : pushResultMessages[result],
    );
    setTimeout(() => setMessage(null), 6000);
  };

  const sendTestNotification = () => {
    if (permission !== "granted") return;

    navigator.serviceWorker.ready.then((registration) => {
      const notification = pickMascotNotification();

      registration.showNotification(`${notification.title} 🦥`, {
        body: notification.body,
        icon: "/images/sloth-mascot.png",
        badge: "/images/sloth-mascot.png",
        tag: "sloth-test-reminder",
      });
    });
  };

  if (permission === "unsupported") {
    return null;
  }

  return (
    <div className="rounded-card border border-sloth-border bg-sloth-card p-6 shadow-soft transition hover:shadow-md">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3.5">
          <span className="text-3xl shrink-0 select-none" aria-hidden="true">
            {permission === "granted" ? "🍃" : permission === "denied" ? "🔕" : "🦥"}
          </span>
          <div>
            <h3 className="text-base font-semibold text-sloth-ink">
              {permission === "granted"
                ? "Lembretes gentis ativos"
                : permission === "denied"
                  ? "Notificações desativadas"
                  : "Avisos gentis no seu ritmo"}
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-sloth-muted">
              {permission === "granted"
                ? "As notificações estão configuradas. Você receberá avisos sutis para acompanhar seu dia."
                : permission === "denied"
                  ? "As notificações foram bloqueadas no navegador. Para receber lembretes, reative-as nas configurações do site."
                  : "Deseja receber notificações sutis das tarefas direto no seu dispositivo? Sem pressa e no seu tempo."}
            </p>
            {message && (
              <p className="mt-2 text-xs font-semibold text-sloth-forest animate-fade-in">
                {message}
              </p>
            )}
          </div>
        </div>

        <div className="shrink-0">
          {permission === "default" && (
            <button
              onClick={requestPermission}
              disabled={isSubscribing}
              className="inline-flex min-h-10 items-center justify-center rounded-xl bg-sloth-moss px-5 text-xs font-semibold text-white transition hover:bg-sloth-forest cursor-pointer"
            >
              Ativar Notificações
            </button>
          )}

          {permission === "granted" && (
            <button
              onClick={sendTestNotification}
              className="inline-flex min-h-10 items-center justify-center rounded-xl border border-sloth-border bg-sloth-card px-5 text-xs font-semibold text-sloth-forest transition hover:bg-sloth-beige/40 cursor-pointer"
            >
              Enviar Teste
            </button>
          )}
          
          {permission === "denied" && (
            <span className="inline-flex min-h-10 items-center justify-center rounded-xl border border-dashed border-sloth-border bg-sloth-cream/20 px-5 text-xs font-medium text-sloth-muted">
              Desativado no navegador
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
