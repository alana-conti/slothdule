import Link from "next/link";
import { redirect } from "next/navigation";

import { logout } from "../login/actions";
import {
  getUserLeafBalance,
  listActiveRewardItems,
  listRewardRedemptions,
} from "@/features/tasks/data";
import { redeemRewardAction } from "@/features/tasks/actions";
import { createClient } from "@/lib/supabase/server";

type RewardsPageProps = {
  searchParams: Promise<{
    error?: string;
    message?: string;
  }>;
};

export default async function RewardsPage({ searchParams }: RewardsPageProps) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  if (!data?.claims) {
    redirect("/login");
  }

  const [{ error, message }, balance, rewards, redemptions] = await Promise.all([
    searchParams,
    getUserLeafBalance(),
    listActiveRewardItems(),
    listRewardRedemptions(),
  ]);

  const email =
    typeof data.claims.email === "string" ? data.claims.email : "sua conta";

  return (
    <main className="min-h-screen px-5 py-8 sm:px-8 sm:py-12">
      <div className="mx-auto w-full max-w-6xl">
        <header className="flex flex-col gap-5 rounded-card border border-sloth-border bg-sloth-card p-6 shadow-soft sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div>
            <p className="text-xs font-semibold tracking-[0.2em] text-sloth-moss uppercase">
              Loja de Recompensas
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-sloth-ink sm:text-4xl">
              Suas conquistas com afeto.
            </h1>
            <p className="mt-2 text-sm text-sloth-muted">
              {email} · <span className="inline-flex items-center gap-1"><span className="text-sloth-leaf">🍃</span> {balance} Folhinhas</span>
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              className="inline-flex min-h-11 items-center rounded-2xl border border-sloth-border bg-sloth-card px-5 font-medium text-sloth-forest transition hover:bg-sloth-beige"
              href="/today"
            >
              Hoje
            </Link>
            <Link
              className="inline-flex min-h-11 items-center rounded-2xl border border-sloth-border bg-sloth-card px-5 font-medium text-sloth-forest transition hover:bg-sloth-beige"
              href="/timeline"
            >
              Linha do Tempo
            </Link>
            <form action={logout}>
              <button
                className="min-h-11 rounded-2xl border border-sloth-border bg-sloth-card px-5 font-medium text-sloth-forest transition hover:bg-sloth-beige"
                type="submit"
              >
                Sair
              </button>
            </form>
          </div>
        </header>

        {message ? (
          <div
            className="mt-6 flex items-center gap-3 rounded-2xl border border-sloth-leaf/30 bg-sloth-leaf/10 px-5 py-4 text-sm text-sloth-forest shadow-sm"
            role="status"
          >
            <span className="text-2xl shrink-0" aria-label="Mascote bicho-preguiça">🦥</span>
            <p className="font-medium leading-relaxed">{message}</p>
          </div>
        ) : null}

        {error ? (
          <p
            className="mt-6 rounded-2xl border border-sloth-terracotta/30 bg-sloth-terracotta/10 px-5 py-4 text-sm text-sloth-ink"
            role="alert"
          >
            {error}
          </p>
        ) : null}

        {/* Mascote Acolhedor no topo da loja */}
        <section className="mt-8 rounded-card border border-sloth-border bg-sloth-card/55 p-6 sm:p-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <span className="text-4xl shrink-0" aria-hidden="true">🦥</span>
            <div>
              <h2 className="text-lg font-semibold text-sloth-ink">
                Troque suas Folhinhas por momentos especiais
              </h2>
              <p className="text-sm text-sloth-muted mt-1 leading-relaxed">
                Cada tarefa concluída gera Folhinhas. Use-as para resgatar momentos afetivos e de descanso.
                Sem culpa, no seu próprio ritmo.
              </p>
            </div>
          </div>
        </section>

        {/* Recompensas Ativas */}
        <section className="mt-8">
          <h2 className="text-2xl font-semibold text-sloth-ink mb-5">Recompensas Disponíveis</h2>
          {rewards.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {rewards.map((reward) => {
                const canRedeem = balance >= reward.cost;
                return (
                  <article
                    key={reward.id}
                    className="flex flex-col justify-between rounded-card border border-sloth-border bg-sloth-card p-6 shadow-sm transition hover:shadow-md"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-3xl shrink-0" aria-hidden="true">
                          {reward.icon || "🍃"}
                        </span>
                        <span className="rounded-full bg-sloth-beige/60 px-3.5 py-1 text-xs font-semibold text-sloth-forest border border-sloth-border/40">
                          {reward.cost} Folhinhas
                        </span>
                      </div>
                      <h3 className="mt-4 text-lg font-semibold text-sloth-ink">
                        {reward.title}
                      </h3>
                      {reward.description ? (
                        <p className="mt-2 text-sm text-sloth-muted leading-relaxed">
                          {reward.description}
                        </p>
                      ) : null}
                    </div>

                    <div className="mt-6 border-t border-sloth-border/50 pt-4">
                      {canRedeem ? (
                        <form action={redeemRewardAction}>
                          <input type="hidden" name="rewardItemId" value={reward.id} />
                          <button
                            type="submit"
                            className="w-full inline-flex min-h-10 items-center justify-center rounded-xl bg-sloth-moss px-4 text-sm font-semibold text-white transition hover:bg-sloth-forest"
                          >
                            Resgatar Recompensa
                          </button>
                        </form>
                      ) : (
                        <div className="text-center">
                          <button
                            disabled
                            className="w-full inline-flex min-h-10 items-center justify-center rounded-xl bg-sloth-beige/40 text-sloth-muted border border-sloth-border/50 cursor-not-allowed text-sm font-semibold"
                          >
                            Saldo insuficiente
                          </button>
                          <p className="mt-2 text-[11px] text-sloth-muted/80">
                            Faltam {reward.cost - balance} Folhinhas para resgatar.
                          </p>
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <p className="rounded-2xl border border-dashed border-sloth-border bg-sloth-card px-5 py-7 text-center text-sm text-sloth-muted">
              Nenhuma recompensa ativa no momento.
            </p>
          )}
        </section>

        {/* Histórico de Resgates */}
        <section className="mt-12">
          <h2 className="text-2xl font-semibold text-sloth-ink mb-5">Histórico de Resgates</h2>
          {redemptions.length > 0 ? (
            <div className="rounded-card border border-sloth-border bg-sloth-card/45 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-sloth-beige/35 border-b border-sloth-border text-sloth-muted font-medium">
                      <th className="px-6 py-4">Recompensa</th>
                      <th className="px-6 py-4">Custo</th>
                      <th className="px-6 py-4">Data da Solicitação</th>
                      <th className="px-6 py-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-sloth-border/50 text-sloth-ink">
                    {redemptions.map((redemption) => {
                      const statusLabels = {
                        requested: "Solicitado",
                        delivered: "Entregue",
                        cancelled: "Cancelado",
                      };
                      const statusClasses = {
                        requested: "bg-sloth-amber/15 text-sloth-gold border-sloth-amber/30",
                        delivered: "bg-sloth-leaf/15 text-sloth-forest border-sloth-leaf/30",
                        cancelled: "bg-sloth-terracotta/15 text-sloth-terracotta border-sloth-terracotta/30",
                      };

                      return (
                        <tr key={redemption.id} className="hover:bg-sloth-beige/10">
                          <td className="px-6 py-4 flex items-center gap-3">
                            <span className="text-xl" aria-hidden="true">
                              {redemption.rewardItem?.icon || "🎁"}
                            </span>
                            <span className="font-semibold">
                              {redemption.rewardItem?.title || "Recompensa Excluída"}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sloth-muted font-medium">
                            🍃 {redemption.cost} pts
                          </td>
                          <td className="px-6 py-4 text-sloth-muted">
                            {new Intl.DateTimeFormat("pt-BR", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                              timeZone: "America/Sao_Paulo",
                            }).format(new Date(redemption.redeemedAt))}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusClasses[redemption.status]}`}>
                              {statusLabels[redemption.status]}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <p className="rounded-2xl border border-dashed border-sloth-border bg-sloth-card px-5 py-7 text-center text-sm text-sloth-muted">
              Você ainda não realizou nenhum resgate.
            </p>
          )}
        </section>
      </div>
    </main>
  );
}
