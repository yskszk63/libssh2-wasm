import * as assert from "std/assert/mod.ts";
import { describe, it } from "std/testing/bdd.ts";

import { fd_filestat_get } from "@/wasi/fn/mod.ts";
import * as ty from "@/wasi/ty/mod.ts";
import * as errno from "@/wasi/define/errno.ts";
import * as filetype from "@/wasi/define/filetype.ts";
import * as rights from "@/wasi/define/rights.ts";
import * as fdflags from "@/wasi/define/fdflags.ts";

describe("fd_filestat_get", () => {
  it("happy", () => {
    const cx = {
      memory: new WebAssembly.Memory({ initial: 32 }),
      fds: {
        0: {
          type: "random" as const,
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
    assert.assertEquals(fd_filestat_get(cx, 0 as ty.fd, 8), errno.success);

    const view = new DataView(cx.memory.buffer, 8);
    assert.assertEquals(view.getBigUint64(0, true), 1n);
    assert.assertEquals(view.getBigUint64(8, true), 1n);
    assert.assertEquals(view.getUint8(16), filetype.character_device);
    assert.assertEquals(view.getBigUint64(24, true), 1n);
    assert.assertEquals(view.getBigUint64(32, true), 0n);
    assert.assertEquals(view.getBigUint64(40, true), 0n);
    assert.assertEquals(view.getBigUint64(48, true), 0n);
    assert.assertEquals(view.getBigUint64(56, true), 0n);
  });

  it("noent", () => {
    const cx = {
      memory: new WebAssembly.Memory({ initial: 32 }),
      fds: {},
      nextfd: 0,
    };
    assert.assertEquals(
      fd_filestat_get(cx, 0 as ty.fd, fdflags.append),
      errno.noent,
    );
  });
});
