"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { apiFetch } from "@/lib/api/server";

function getRequiredField(formData: FormData, field: string) {
  const value = formData.get(field);

  return typeof value === "string" ? value.trim() : "";
}

async function readErrorDetail(response: Response) {
  const body = await response.json().catch(() => null);
  const detail = typeof body?.detail === "string" ? body.detail : null;

  return detail;
}

export async function login(formData: FormData) {
  const email = getRequiredField(formData, "email");
  const password = getRequiredField(formData, "password");

  if (!email || !password) {
    redirect("/login?error=Preencha%20seu%20e-mail%20e%20sua%20senha.");
  }

  const response = await apiFetch("/auth/login", {
    body: JSON.stringify({ email, password }),
    method: "POST",
  });

  if (!response.ok) {
    const detail = await readErrorDetail(response);
    const message =
      detail ||
      "Não foi possível entrar agora. Respire e tente novamente em instantes.";
    redirect(`/login?error=${encodeURIComponent(message)}`);
  }

  revalidatePath("/", "layout");
  redirect("/today");
}

export async function logout() {
  await apiFetch("/auth/logout", { method: "POST" });
  revalidatePath("/", "layout");
  redirect("/login");
}

export async function signUp(formData: FormData) {
  const email = getRequiredField(formData, "email");
  const password = getRequiredField(formData, "password");

  if (!email || !password) {
    redirect("/login?error=Preencha%20seu%20e-mail%20e%20sua%20senha.");
  }

  const response = await apiFetch("/auth/signup", {
    body: JSON.stringify({ email, password }),
    method: "POST",
  });

  if (!response.ok) {
    const detail = await readErrorDetail(response);
    redirect(
      `/login?error=${encodeURIComponent(detail || "Não foi possível criar a conta.")}`,
    );
  }

  redirect("/login?message=Conta%20criada!%20Agora%20você%20pode%20entrar%20com%20calma.");
}
