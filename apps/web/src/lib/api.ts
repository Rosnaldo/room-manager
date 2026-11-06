import 'server-only';

const API_URL = process.env.API_URL ?? 'http://localhost:4000';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type Query = Record<string, string | number | boolean | undefined>;

function buildUrl(path: string, query?: Query): string {
  const url = new URL(path, API_URL);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }
  return url.toString();
}

export async function api<T>(
  path: string,
  init: Omit<RequestInit, 'body'> & { query?: Query; body?: unknown } = {},
): Promise<T> {
  const { query, body, headers, ...rest } = init;

  const res = await fetch(buildUrl(path, query), {
    cache: 'no-store',
    ...rest,
    headers: {
      ...(body !== undefined && { 'Content-Type': 'application/json' }),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (!res.ok) {
    const payload = (await res.json().catch(() => ({}))) as { message?: string; details?: unknown };
    throw new ApiError(res.status, payload.message ?? res.statusText, payload.details);
  }

  return (res.status === 204 ? undefined : await res.json()) as T;
}
