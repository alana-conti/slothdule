export function getApiConfig() {
  const backendUrl = process.env.BACKEND_URL;
  const publicApiUrl = process.env.NEXT_PUBLIC_API_URL;

  return {
    // Usado no servidor (RSC, Server Actions, proxy). Em compose, http://api:8000.
    backendUrl: backendUrl || publicApiUrl || "http://localhost:8000",
    // Usado no navegador (uploaders, player de áudio).
    publicApiUrl: publicApiUrl || "http://localhost:8000",
  };
}

/** Resolve URLs relativas de arquivo (/files/...) para absolutas no navegador. */
export function resolveFileUrl(url: string) {
  if (url.startsWith("/files/")) {
    const { publicApiUrl } = getApiConfig();
    return `${publicApiUrl}${url}`;
  }

  return url;
}
