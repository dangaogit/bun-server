export class ApiError extends Error {
  public constructor(message: string, public readonly status: number) {
    super(message);
  }
}

async function parseJsonSafe(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const body = await parseJsonSafe(response);
    throw new ApiError(
      `Request failed (${response.status}): ${JSON.stringify(body)}`,
      response.status,
    );
  }

  return response.json() as Promise<T>;
}
