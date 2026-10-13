import "server-only";

import { cookies } from "next/headers";

import { getApiConfig } from "./config";

export type ApiUser = {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
};

async function forwardCookieHeader(): Promise<string> {
  const cookieStore = await cookies();
  return cookieStore
    .getAll()
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join("; ");
}

async function propagateCookies(response: Response) {
  const setCookies: string[] =
    typeof (response.headers as Headers & { getSetCookie?: () => string[] })
      .getSetCookie === "function"
      ? (
          response.headers as Headers & { getSetCookie: () => string[] }
        ).getSetCookie()
      : [];

  if (setCookies.length === 0) {
    return;
  }

  const cookieStore = await cookies();

  for (const setCookie of setCookies) {
    const pair = setCookie.split(";")[0];
    const separator = pair.indexOf("=");

    if (separator === -1) {
      continue;
    }

    const name = pair.slice(0, separator).trim();
    const value = pair.slice(separator + 1).trim();
    const lower = setCookie.toLowerCase();
    const maxAgeMatch = lower.match(/max-age=(\d+)/);

    try {
      if (maxAgeMatch?.[1] === "0" || value === "") {
        cookieStore.delete(name);
      } else {
        cookieStore.set(name, value, {
          httpOnly: lower.includes("httponly"),
          maxAge: maxAgeMatch ? Number(maxAgeMatch[1]) : undefined,
          path: "/",
          sameSite: "lax",
          secure: lower.includes("secure"),
        });
      }
    } catch {
      // Componentes de servidor não podem gravar cookies; o refresh
      // acontece nas Server Actions e no proxy.
    }
  }
}

export async function apiFetch(path: string, init: RequestInit = {}) {
  const { backendUrl } = getApiConfig();
  const cookieHeader = await forwardCookieHeader();

  const response = await fetch(`${backendUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers as Record<string, string> | undefined),
      ...(cookieHeader ? { Cookie: cookieHeader } : {}),
    },
  });

  await propagateCookies(response);

  return response;
}

export async function apiJson<T>(path: string, init: RequestInit = {}) {
  const response = await apiFetch(path, init);
  const body = await response.json().catch(() => null);

  if (!response.ok) {
    const detail =
      typeof body?.detail === "string"
        ? body.detail
        : Array.isArray(body?.detail)
          ? body.detail.map((item: { msg?: string }) => item.msg).join("; ")
          : null;
    throw new Error(detail || `A API respondeu com status ${response.status}.`);
  }

  return body as T;
}

export async function getCurrentUser(): Promise<ApiUser | null> {
  try {
    return await apiJson<ApiUser>("/auth/me");
  } catch {
    return null;
  }
}
