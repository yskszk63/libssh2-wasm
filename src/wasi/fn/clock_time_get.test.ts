import * as assert from "std/assert/mod.ts";
import { describe, it } from "std/testing/bdd.ts";

import { clock_time_get } from "@/wasi/fn/mod.ts";
import * as ty from "@/wasi/ty/mod.ts";
import * as errno from "@/wasi/define/errno.ts";
import * as clockid from "@/wasi/define/clockid.ts";

describe("clock_time_get", () => {
  it("happy", () => {
    const cx = {
      memory: new WebAssembly.Memory({ initial: 32 }),
      now: () => 1, // unix epoch + 1ms
    };
    assert.assertEquals(
      clock_time_get(cx, clockid.realtime, 0n as ty.timestamp, 8),
      errno.success,
    );
    const actual = new DataView(cx.memory.buffer).getBigUint64(8, true);
    assert.assertEquals(actual, 1n * 1000n * 1000n);
  });

  it("default now", () => {
    const cx = {
      memory: new WebAssembly.Memory({ initial: 32 }),
    };
    assert.assertEquals(
      clock_time_get(cx, clockid.realtime, 0n as ty.timestamp, 8),
      errno.success,
    );
  });

  it("supports realtime only.", () => {
    const cx = {
      memory: new WebAssembly.Memory({ initial: 32 }),
    };
    assert.assertEquals(
      clock_time_get(cx, clockid.monotonic, 0n as ty.timestamp, 8),
      errno.nosys,
    );
  });
});
