// Server-side fetches must not hairpin out to the public API hostname: the frontend
// container sits next to the backend, so INTERNAL_API_URL keeps the call on the
// Docker network. NEXT_PUBLIC_API_URL is the browser-facing fallback.
export function serverApiUrl(): string {
  return (
    process.env.INTERNAL_API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    'http://localhost:8080/api'
  );
}

export async function serverGet<T>(
  path: string,
  opts: { timeoutMs?: number; revalidate?: number } = {},
): Promise<T | null> {
  const { timeoutMs = 5000, revalidate } = opts;
  try {
    const res = await fetch(`${serverApiUrl()}${path}`, {
      // Omitting revalidate means no-store, which opts the caller into dynamic rendering.
      ...(revalidate === undefined ? { cache: 'no-store' as const } : { next: { revalidate } }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}
