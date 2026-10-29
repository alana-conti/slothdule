import Link from "next/link";

import { logout } from "@/app/login/actions";

type NavigationPage = "today" | "timeline" | "calendar" | "rewards";

type TopNavigationProps = {
  current: NavigationPage;
};

const links: Array<{
  href: string;
  label: string;
  page: NavigationPage;
}> = [
  { href: "/today", label: "Hoje", page: "today" },
  { href: "/timeline", label: "Linha do Tempo", page: "timeline" },
  { href: "/calendar", label: "Calendário", page: "calendar" },
  { href: "/rewards", label: "Recompensas", page: "rewards" },
];

const navigationButtonClass =
  "inline-flex min-h-10 shrink-0 items-center whitespace-nowrap rounded-xl border border-sloth-border bg-sloth-card px-3 text-xs font-semibold text-sloth-forest transition hover:bg-sloth-beige";

export function TopNavigation({ current }: TopNavigationProps) {
  return (
    <nav
      aria-label="Navegação principal"
      className="-mx-1 flex w-full flex-nowrap items-center gap-px overflow-x-auto px-1 pb-1 xl:mx-0 xl:w-auto xl:px-0"
    >
      {links.map((link) => (
        <Link
          aria-current={current === link.page ? "page" : undefined}
          className={`${navigationButtonClass} ${
            current === link.page ? "bg-sloth-beige" : ""
          }`}
          href={link.href}
          key={link.page}
        >
          {link.label}
        </Link>
      ))}

      <form action={logout} className="shrink-0">
        <button className={navigationButtonClass} type="submit">
          Sair
        </button>
      </form>
    </nav>
  );
}
