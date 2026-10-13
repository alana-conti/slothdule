import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  const backendUrl =
    process.env.BACKEND_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:8000";

  const response = NextResponse.next({ request });

  try {
    const apiResponse = await fetch(`${backendUrl}/auth/me`, {
      headers: {
        Cookie: request.headers.get("cookie") || "",
      },
    });

    // Propaga rotação de cookies vinda do backend, se houver.
    const setCookies =
      typeof (
        apiResponse.headers as Headers & { getSetCookie?: () => string[] }
      ).getSetCookie === "function"
        ? (
            apiResponse.headers as Headers & { getSetCookie: () => string[] }
          ).getSetCookie()
        : [];

    for (const setCookie of setCookies) {
      response.headers.append("Set-Cookie", setCookie);
    }

    if (!apiResponse.ok) {
      throw new Error("unauthenticated");
    }

    return response;
  } catch {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = "";

    const redirectResponse = NextResponse.redirect(loginUrl);

    response.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie);
    });

    return redirectResponse;
  }
}
