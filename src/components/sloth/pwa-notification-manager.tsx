"use client";

import { useEffect, useState } from "react";

import { pickMascotNotification } from "@/lib/mascot-notifications";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

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
        try {
          const registration = await navigator.serviceWorker.ready;
          const sub = await registration.pushManager.getSubscription();
          if (sub) {
            console.log("Inscrição Push ativa:", sub.endpoint);
          }
        } catch (err) {
          console.warn("Erro ao buscar inscrição push:", err);
        }
      }
    };

    // Defer state update using setTimeout to avoid synchronous setState inside render/effect cycles
    const timer = setTimeout(() => {
      checkNotificationSupportAndState();
    }, 0);

    return () => clearTimeout(timer);
  }, []);

  const subscribeToPush = async () => {
    try {
      setIsSubscribing(true);
      const registration = await navigator.serviceWorker.ready;
      
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (vapidKey) {
        const sub = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey),
        });
        console.log("Inscrição Push ativa:", sub);
      } else {
        console.log("Inscrição Push simulada localmente (sem VAPID key).");
      }
    } catch (err) {
      console.warn("Falha ao registrar inscrição push real:", err);
    } finally {
      setIsSubscribing(false);
    }
  };

  const requestPermission = () => {
    if (permission === "unsupported") return;

    Notification.requestPermission().then((perm) => {
      setPermission(perm);
      if (perm === "granted") {
        subscribeToPush();
        setMessage("Que bom! Notificações ativadas com calma. 🍃");
        setTimeout(() => setMessage(null), 5000);
      }
    });
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
