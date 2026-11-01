// Small read-only JSON client with a timeout and a limited number of retries.

export class UpstreamHttpError extends Error {
  constructor(
    message: string,
    readonly status: number | null,
    readonly retryable: boolean,
  ) {
    super(message);
  }
}

export interface GetJsonOptions {
  timeoutMs: number;
  maxRetries: number;
  headers?: Record<string, string>;
  backoffMs?: number;
  fetchImpl?: typeof fetch;
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function attempt(url: string, options: GetJsonOptions): Promise<unknown> {
  const fetchImpl = options.fetchImpl ?? fetch;
  let response: Response;

  try {
    response = await fetchImpl(url, {
      method: "GET",
      headers: { Accept: "application/json", ...options.headers },
      signal: AbortSignal.timeout(options.timeoutMs),
      redirect: "error",
    });
  } catch (error) {
    const reason = error instanceof Error && error.name === "TimeoutError" ? "timed out" : "network error";
    throw new UpstreamHttpError(`Upstream request ${reason}`, null, true);
  }

  if (!response.ok) {
    const retryable = response.status >= 500 || response.status === 429;
    throw new UpstreamHttpError(`Upstream responded with ${response.status}`, response.status, retryable);
  }

  try {
    return (await response.json()) as unknown;
  } catch {
    throw new UpstreamHttpError("Upstream returned invalid JSON", response.status, false);
  }
}

export async function getJsonWithRetry(url: string, options: GetJsonOptions): Promise<unknown> {
  const backoffMs = options.backoffMs ?? 250;

  for (let attemptNumber = 0; ; attemptNumber++) {
    try {
      return await attempt(url, options);
    } catch (error) {
      const canRetry =
        error instanceof UpstreamHttpError && error.retryable && attemptNumber < options.maxRetries;
      if (!canRetry) throw error;
      await wait(backoffMs * 2 ** attemptNumber);
    }
  }
}
