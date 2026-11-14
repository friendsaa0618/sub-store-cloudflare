import type { AppSettings } from "../../types";
import { numberSetting } from "./utils";

export function getRequestTimeout(settings?: AppSettings) {
  return numberSetting(settings?.defaultTimeout, 30000, 1000, 120000);
}

export function getRequestConcurrency(settings?: AppSettings) {
  return numberSetting(settings?.backendRequestConcurrency, 3, 1, 12);
}

export function getRequestConcurrencyWait(settings?: AppSettings) {
  return numberSetting(settings?.backendRequestConcurrencyWaitTime, 0, 0, 5000);
}

export async function runWithConcurrency<T>(tasks: Array<() => Promise<T>>, concurrency: number, waitMs = 0) {
  const results = new Array<T>(tasks.length);
  let cursor = 0;

  async function worker() {
    while (cursor < tasks.length) {
      const index = cursor;
      cursor += 1;
      if (waitMs > 0 && index > 0) await delay(waitMs);
      results[index] = await tasks[index]();
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, tasks.length) }, worker));
  return results;
}

export async function runSettledWithConcurrency<T>(tasks: Array<() => Promise<T>>, concurrency: number, waitMs = 0) {
  const results = new Array<PromiseSettledResult<T>>(tasks.length);
  const wrapped = tasks.map((task, index) => async () => {
    try {
      results[index] = { status: "fulfilled", value: await task() };
    } catch (reason) {
      results[index] = { status: "rejected", reason };
    }
  });
  await runWithConcurrency(wrapped, concurrency, waitMs);
  return results;
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
