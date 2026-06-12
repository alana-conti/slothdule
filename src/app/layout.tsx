import type { Metadata } from "next";

import "./globals.css";
import { PwaInitializer } from "@/components/sloth/pwa-initializer";

export const metadata: Metadata = {
  title: "Slothdule",
  description: "Organize suas tarefas com calma, clareza e uma coisa de cada vez.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>
        <PwaInitializer />
        {children}
      </body>
    </html>
  );
}
