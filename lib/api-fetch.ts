// /lib/api-fetch.ts
export function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("admin_token");
}

function buildAuthHeaders(init: RequestInit = {}) {
  const token = getToken();
  const headers: Record<string, string> = {
    ...(init.headers as Record<string, string>),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const hasBody = !!init.body;
  if (hasBody && !(init.body instanceof FormData)) {
    headers["Content-Type"] = headers["Content-Type"] || "application/json";
  }

  return headers;
}

async function getErrorMessage(res: Response, isNoContent: boolean) {
  const contentType = res.headers.get("content-type") || "";
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
    // ignore parse issues in error path
  }

  return message;
}

function parseFilename(contentDisposition: string | null, fallback: string) {
  if (!contentDisposition) return fallback;

  const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1]);
    } catch {
      return utf8Match[1];
    }
  }

  const basicMatch = contentDisposition.match(/filename="?([^"]+)"?/i);
  if (basicMatch?.[1]) {
    return basicMatch[1];
  }

  return fallback;
}

export async function apiFetch<T = any>(
  input: RequestInfo | URL,
  init: RequestInit = {}
): Promise<T> {
  const headers = buildAuthHeaders(init);
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
    throw new Error(await getErrorMessage(res, isNoContent));
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

export async function downloadFile(
  input: RequestInfo | URL,
  init: RequestInit = {},
  options: { fallbackFilename?: string } = {}
) {
  if (typeof window === "undefined") {
    throw new Error("File downloads are only supported in the browser");
  }

  const res = await fetch(input, {
    ...init,
    headers: buildAuthHeaders(init),
  });

  const contentType = res.headers.get("content-type") || "";
  const contentLen = res.headers.get("content-length");
  const isNoContent =
    res.status === 204 ||
    res.status === 205 ||
    contentLen === "0" ||
    (!contentLen && !contentType);

  if (!res.ok) {
    throw new Error(await getErrorMessage(res, isNoContent));
  }

  const blob = await res.blob();
  const filename = parseFilename(
    res.headers.get("content-disposition"),
    options.fallbackFilename || "download.csv"
  );

  const objectUrl = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(objectUrl);
}
