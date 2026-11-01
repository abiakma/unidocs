import { describe, expect, it } from "vitest";
import { getJsonWithRetry, UpstreamHttpError } from "./http-client.js";

function fakeFetch(responses: (() => Promise<Response>)[]): { fetchImpl: typeof fetch; calls: () => number } {
  let calls = 0;
  const fetchImpl: typeof fetch = async () => {
    const next = responses[Math.min(calls, responses.length - 1)]!;
    calls++;
    return next();
  };
  return { fetchImpl, calls: () => calls };
}

const ok = () => Promise.resolve(new Response(JSON.stringify({ ok: true }), { status: 200 }));
const serverError = () => Promise.resolve(new Response("", { status: 503 }));
const notFound = () => Promise.resolve(new Response("", { status: 404 }));
const networkError = () => Promise.reject(new TypeError("fetch failed"));

describe("getJsonWithRetry", () => {
  it("retries server errors up to the limit", async () => {
    const fake = fakeFetch([serverError, serverError, ok]);
    await expect(getJsonWithRetry("https://x", { timeoutMs: 100, maxRetries: 2, backoffMs: 1, fetchImpl: fake.fetchImpl })).resolves.toEqual({
      ok: true,
    });
    expect(fake.calls()).toBe(3);
  });

  it("gives up after maxRetries", async () => {
    const fake = fakeFetch([networkError]);
    await expect(
      getJsonWithRetry("https://x", { timeoutMs: 100, maxRetries: 2, backoffMs: 1, fetchImpl: fake.fetchImpl }),
    ).rejects.toBeInstanceOf(UpstreamHttpError);
    expect(fake.calls()).toBe(3);
  });

  it("does not retry client errors", async () => {
    const fake = fakeFetch([notFound]);
    await expect(
      getJsonWithRetry("https://x", { timeoutMs: 100, maxRetries: 3, backoffMs: 1, fetchImpl: fake.fetchImpl }),
    ).rejects.toMatchObject({ status: 404 });
    expect(fake.calls()).toBe(1);
  });

  it("times out slow responses", async () => {
    const slow: typeof fetch = (_url, init) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(Object.assign(new Error("t"), { name: "TimeoutError" })));
      });
    await expect(getJsonWithRetry("https://x", { timeoutMs: 20, maxRetries: 0, fetchImpl: slow })).rejects.toThrow("timed out");
  });
});
