export type MascotNotification = {
  title: string;
  body: string;
};

export const mascotNotifications: MascotNotification[] = [
  {
    title: "Uma coisa de cada vez",
    body: "Que tal escolher um passo pequeno para continuar seu dia?",
  },
  {
    title: "Seu ritmo também conta",
    body: "Respira fundo. A próxima tarefa pode começar sem pressa.",
  },
  {
    title: "Um lembrete gentil",
    body: "Sua lista está por perto quando você quiser retomar.",
  },
  {
    title: "Passo curto, progresso real",
    body: "Alguns minutos de atenção já podem deixar o dia mais leve.",
  },
  {
    title: "Hora de olhar o próximo passo",
    body: "Escolha uma tarefa possível e siga com calma.",
  },
  {
    title: "O Slothdule passou para lembrar",
    body: "Você não precisa resolver tudo agora. Só o próximo passo.",
  },
  {
    title: "Pausa breve, foco gentil",
    body: "Quando estiver pronto, há uma tarefa esperando por você.",
  },
  {
    title: "Seu dia ainda cabe em pequenos passos",
    body: "Que tal revisar o que merece atenção primeiro?",
  },
  {
    title: "Vamos reorganizar com calma?",
    body: "Uma olhada rápida na agenda pode aliviar a cabeça.",
  },
  {
    title: "Um pouco de foco por vez",
    body: "Continue no seu ritmo. Progresso não precisa fazer barulho.",
  },
  {
    title: "A próxima tarefa está por aqui",
    body: "Comece pelo que parece mais simples ou mais importante agora.",
  },
  {
    title: "Lembrete da preguiça",
    body: "Sem corrida. Só um convite para retomar quando fizer sentido.",
  },
];

export function pickMascotNotification(
  random = Math.random,
): MascotNotification {
  const index = Math.floor(random() * mascotNotifications.length);

  return mascotNotifications[
    Math.min(Math.max(index, 0), mascotNotifications.length - 1)
  ];
}
