import * as assert from "std/assert/mod.ts";
import { describe, it } from "std/testing/bdd.ts";

import { proc_exit, ProcExit } from "@/wasi/fn/mod.ts";
import * as ty from "@/wasi/ty/mod.ts";

describe("proc_exit", () => {
  it("happy", () => {
    const cx = {
      memory: new WebAssembly.Memory({ initial: 32 }),
    };
    assert.assertThrows(
      () => proc_exit(cx, 1 as ty.exitcode),
      ProcExit,
      "Exit: 1",
    );
  });
});
