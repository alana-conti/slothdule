// Slothdule Service Worker for gentle reminders
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

const mascotNotificationBodies = [
  "Que tal escolher um passo pequeno para continuar seu dia?",
  "Respira fundo. A próxima tarefa pode começar sem pressa.",
  "Sua lista está por perto quando você quiser retomar.",
  "Alguns minutos de atenção já podem deixar o dia mais leve.",
  "Escolha uma tarefa possível e siga com calma.",
  "Você não precisa resolver tudo agora. Só o próximo passo.",
  "Quando estiver pronto, há uma tarefa esperando por você.",
  "Uma olhada rápida na agenda pode aliviar a cabeça.",
  "Continue no seu ritmo. Progresso não precisa fazer barulho.",
  "Sem corrida. Só um convite para retomar quando fizer sentido.",
];

function getRandomMascotNotificationBody() {
  const index = Math.floor(Math.random() * mascotNotificationBodies.length);
  return mascotNotificationBodies[index];
}

self.addEventListener("push", (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch {
      data = { body: event.data.text() };
    }
  }

  const title = data.title || "Slothdule";
  const options = {
    body: data.body || getRandomMascotNotificationBody(),
    icon: data.icon || "/images/sloth-mascot.png",
    badge: data.badge || "/images/sloth-mascot.png",
    tag: data.tag || "sloth-reminder",
    data: data.data || {},
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === "/" && "focus" in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow("/today");
      }
    })
  );
});
