/** Same-origin fetch that always sends session cookies. */
export function apiFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  return fetch(input, { credentials: 'include', ...init });
}

export async function parseJsonResponse<T = unknown>(res: Response): Promise<T> {
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) {
    throw new Error(data.error || `Error HTTP ${res.status}`);
  }
  return data;
}

/** Normalize legacy /uploads/ paths to authenticated API routes. */
export function resolveMediaUrl(url: string | null | undefined): string {
  if (!url) return '';
  if (url.startsWith('/api/files/')) return url;
  if (url.startsWith('/uploads/')) {
    const filename = url.slice('/uploads/'.length);
    return `/api/files/videos/${filename}`;
  }
  return url;
}

export function resolveProofUrl(url: string | null | undefined): string {
  if (!url) return '';
  if (url.startsWith('/api/files/proofs/')) return url;
  if (url.startsWith('/uploads/')) {
    const filename = url.slice('/uploads/'.length);
    return `/api/files/proofs/${filename}`;
  }
  return url;
}
