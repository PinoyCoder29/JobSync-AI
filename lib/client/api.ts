export type Paged<T> = { data: T; pagination?: { nextCursor: string | null; hasMore: boolean } };

/** Calls our JSON API and returns `data` (+ pagination). Throws an Error whose message is safe to show to the user. */
export async function api<T>(url: string, init?: RequestInit): Promise<Paged<T>> {
  let res: Response;
  try {
    res = await fetch(url, { ...init, headers: init?.body && !(init.body instanceof FormData) ? { "Content-Type": "application/json", ...init.headers } : init?.headers });
  } catch {
    throw new Error("You appear to be offline. Check your connection and try again.");
  }
  let body: { success?: boolean; data?: T; pagination?: Paged<T>["pagination"]; error?: { message?: string } } | null = null;
  try {
    body = await res.json();
  } catch {
    /* non-JSON response */
  }
  if (!res.ok || !body?.success) throw new Error(body?.error?.message ?? "Something went wrong. Please try again.");
  return { data: body.data as T, pagination: body.pagination };
}

export const postJson = <T,>(url: string, body?: unknown) => api<T>(url, { method: "POST", body: body === undefined ? undefined : JSON.stringify(body) });
export const del = <T,>(url: string) => api<T>(url, { method: "DELETE" });
