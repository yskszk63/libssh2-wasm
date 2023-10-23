import * as assert from "std/assert/mod.ts";
import { describe, it } from "std/testing/bdd.ts";

import { Mutex } from "@/mutex.ts";

describe("Mutex", () => {
  it("is happy", async () => {
    const mutex = new Mutex();

    const ticks: number[] = [];
    const tasks = Array(64).fill(async () => {
      using lock = await mutex.acquire();

      ticks.push(performance.now());
      await new Promise((resolve) => setTimeout(resolve, 1));
      ticks.push(performance.now());

      queueMicrotask(() => lock.release());
    });

    await Promise.all(tasks.map((v) => v()));

    assert.assertEquals(ticks, ticks.toSorted((l, r) => l - r));
  });

  it("abort", async () => {
    const abort = new AbortController();

    const mutex = new Mutex();
    mutex.acquire(abort.signal);

    queueMicrotask(() => abort.abort());

    using _ = await mutex.acquire();
  });
});
