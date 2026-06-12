"use client";

import { useEffect } from "react";

export function PwaInitializer() {
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          console.log("Service Worker registrado com escopo:", reg.scope);
        })
        .catch((err) => {
          console.error("Erro ao registrar Service Worker:", err);
        });
    }
  }, []);

  return null;
}
