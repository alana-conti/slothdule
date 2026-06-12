import Image from "next/image";

export function SlothMascot() {
  return (
    <figure className="relative m-0 flex min-h-72 items-center justify-center overflow-hidden rounded-card border border-sloth-border bg-sloth-beige/55 px-6 pt-7 sm:min-h-80">
      <div
        aria-hidden="true"
        className="absolute -top-16 -right-10 h-48 w-48 rounded-full bg-sloth-gold/15 blur-2xl"
      />
      <div
        aria-hidden="true"
        className="absolute -bottom-20 -left-10 h-52 w-52 rounded-full bg-sloth-moss/15 blur-2xl"
      />

      <div className="relative flex w-full flex-col items-center">
        <Image
          alt="Mascote bicho-preguiça do Slothdule sorrindo"
          className="h-auto w-full max-w-72 drop-shadow-[0_16px_24px_rgba(47,36,29,0.14)]"
          height={877}
          priority
          sizes="(max-width: 768px) 70vw, 320px"
          src="/images/sloth-mascot.png"
          width={900}
        />
        <figcaption className="relative -mt-3 mb-5 rounded-full border border-sloth-border bg-sloth-card/90 px-4 py-2 text-center text-sm font-medium text-sloth-forest shadow-sm backdrop-blur-sm">
          Estou por aqui. Uma coisa de cada vez.
        </figcaption>
      </div>
    </figure>
  );
}
