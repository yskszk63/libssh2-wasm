import * as assert from "std/assert/mod.ts";
import { describe, it } from "std/testing/bdd.ts";

import { fd_prestat_get } from "@/wasi/fn/mod.ts";
import * as ty from "@/wasi/ty/mod.ts";
import * as errno from "@/wasi/define/errno.ts";
import * as filetype from "@/wasi/define/filetype.ts";
import * as rights from "@/wasi/define/rights.ts";

describe("fd_prestat_get", () => {
  it("happy", () => {
    const cx = {
      memory: new WebAssembly.Memory({ initial: 32 }),
      fds: {
        0: {
          type: "dir" as const,
          name: new TextEncoder().encode("/dev"),
          stat: {
            fs_filetype: filetype.character_device,
            fs_flags: 0 as ty.fdflags,
            fs_rights_base: rights.fd_read,
            fs_rights_inheriting: 0n as ty.rights,
          },
        },
      },
      nextfd: 0,
    };
    assert.assertEquals(
      fd_prestat_get(cx, 0 as ty.fd, 8 as ty.PointerU8),
      errno.success,
    );

    const view = new DataView(cx.memory.buffer, 8);
    assert.assertEquals(view.getUint8(0), 0);
    assert.assertEquals(view.getUint32(4, true), 4);
  });

  it("noent", () => {
    const cx = {
      memory: new WebAssembly.Memory({ initial: 32 }),
      fds: {},
      nextfd: 0,
    };
    assert.assertEquals(
      fd_prestat_get(cx, 0 as ty.fd, 8 as ty.PointerU8),
      errno.badf,
    );
  });
});
