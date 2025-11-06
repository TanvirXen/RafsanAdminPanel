// always send credentials to your API (cookie-based auth)
export async function apiFetch<T = any>(
  url: string,
  init: RequestInit = {}
): Promise<T> {
  const res = await fetch(url, {
    credentials: "include",                // <- IMPORTANT
    headers: { "Content-Type": "application/json", ...(init.headers || {}) },
    ...init,
  });

  // bubble up any API error messages
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const data = await res.json();
      if (data?.message) msg = data.message;
    } catch {}
    throw new Error(msg);
  }
  return (await res.json()) as T;
}
