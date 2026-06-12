import { SlothMascot } from "@/components/sloth/sloth-mascot";

export default function Home() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-5 py-10 sm:px-8 sm:py-14">
      <div
        aria-hidden="true"
        className="absolute top-0 left-0 h-64 w-64 -translate-x-1/3 -translate-y-1/3 rounded-full bg-sloth-moss/10 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="absolute right-0 bottom-0 h-72 w-72 translate-x-1/3 translate-y-1/3 rounded-full bg-sloth-gold/10 blur-3xl"
      />

      <section className="relative w-full max-w-5xl rounded-card border border-sloth-border bg-sloth-card p-7 shadow-soft sm:p-10 lg:p-14">
        <div className="grid items-center gap-10 md:grid-cols-[1.05fr_0.95fr] lg:gap-14">
          <div className="max-w-xl">
            <p className="mb-4 text-xs font-semibold tracking-[0.2em] text-sloth-moss uppercase sm:text-sm">
              Produtividade tranquila
            </p>
            <h1 className="text-5xl font-semibold tracking-[-0.04em] text-sloth-ink sm:text-6xl lg:text-7xl">
              Slothdule
            </h1>
            <p className="mt-5 text-lg leading-8 text-sloth-muted sm:text-xl">
              Uma coisa de cada vez. Organize seu dia com calma, clareza e
              espaço para respirar.
            </p>

            <div className="mt-8 flex flex-wrap gap-3 text-sm">
              <span className="rounded-full bg-sloth-beige px-4 py-2 font-medium text-sloth-forest">
                Calma
              </span>
              <span className="rounded-full border border-sloth-border px-4 py-2 font-medium text-sloth-muted">
                Clareza
              </span>
              <span className="rounded-full border border-sloth-border px-4 py-2 font-medium text-sloth-muted">
                Constância
              </span>
            </div>
          </div>

          <SlothMascot />
        </div>
      </section>
    </main>
  );
}
