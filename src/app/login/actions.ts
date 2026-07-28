"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

function getRequiredField(formData: FormData, field: string) {
  const value = formData.get(field);

  return typeof value === "string" ? value.trim() : "";
}

function getLoginErrorMessage(code?: string) {
  if (code === "invalid_credentials") {
    return "E-mail ou senha incorretos. Confira os dados e tente novamente.";
  }

  if (code === "email_not_confirmed") {
    return "Confirme seu e-mail antes de entrar.";
  }

  return "Não foi possível entrar agora. Respire e tente novamente em instantes.";
}

export async function login(formData: FormData) {
  const email = getRequiredField(formData, "email");
  const password = getRequiredField(formData, "password");

  if (!email || !password) {
    redirect("/login?error=Preencha%20seu%20e-mail%20e%20sua%20senha.");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    const message = getLoginErrorMessage(error.code);
    redirect(`/login?error=${encodeURIComponent(message)}`);
  }

  revalidatePath("/", "layout");
  redirect("/today");
}

export async function logout() {
  const supabase = await createClient();

  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}

export async function signUp(formData: FormData) {
  const email = getRequiredField(formData, "email");
  const password = getRequiredField(formData, "password");

  if (!email || !password) {
    redirect("/login?error=Preencha%20seu%20e-mail%20e%20sua%20senha.");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/login?message=Conta%20criada!%20Agora%20você%20pode%20entrar%20com%20calma.");
}
