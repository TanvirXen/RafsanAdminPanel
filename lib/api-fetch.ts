// /lib/api-fetch.ts
export function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("admin_token");
}

export async function apiFetch<T = any>(
  input: RequestInfo | URL,
  init: RequestInit = {}
): Promise<T> {
  const token = getToken();

  // build headers safely
  const headers: Record<string, string> = {
    ...(init.headers as Record<string, string>),
    Authorization: token ? `Bearer ${token}` : "",
  };
  // only set JSON content-type if body is plain object/string (not FormData)
  const hasBody = !!init.body;
  if (hasBody && !(init.body instanceof FormData)) {
    headers["Content-Type"] = headers["Content-Type"] || "application/json";
  }

  const res = await fetch(input, { ...init, headers });

  const contentType = res.headers.get("content-type") || "";
  const contentLen = res.headers.get("content-length");
  const isNoContent =
    res.status === 204 ||
    res.status === 205 ||
    contentLen === "0" ||
    (!contentLen && !contentType); // many APIs omit both on 204

  // handle non-OK first (try to extract a useful message if possible)
  if (!res.ok) {
    let message = `${res.status} ${res.statusText}`;
    try {
      if (!isNoContent && contentType.includes("application/json")) {
        const errJson = await res.json();
        message = errJson?.message || errJson?.error || message;
      } else {
        const text = await res.text();
        if (text) message = text;
      }
    } catch {
      /* ignore parse issues in error path */
    }
    throw new Error(message);
  }

  // OK responses with no body → return undefined
  if (isNoContent) {
    return undefined as unknown as T;
  }

  if (contentType.includes("application/json")) {
    return (await res.json()) as T;
  }

  // Fallback for non-JSON bodies
  const text = await res.text();
  return text as T;
}
