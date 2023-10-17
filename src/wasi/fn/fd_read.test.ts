import * as assert from "std/assert/mod.ts";
import { describe, it } from "std/testing/bdd.ts";

import { fd_read } from "@/wasi/fn/mod.ts";
import * as ty from "@/wasi/ty/mod.ts";
import * as errno from "@/wasi/define/errno.ts";
import * as filetype from "@/wasi/define/filetype.ts";
import * as rights from "@/wasi/define/rights.ts";

describe("fd_read", () => {
  it("noent", () => {
    const cx = {
      memory: new WebAssembly.Memory({ initial: 32 }),
      fds: {},
      nextfd: 0,
    };
    assert.assertEquals(
      fd_read(cx, 0 as ty.fd, 0 as ty.PointerU8, 0 as ty.size, 0),
      errno.badf,
    );
  });

  it("dir", () => {
    const cx = {
      memory: new WebAssembly.Memory({ initial: 32 }),
      fds: {
        0: {
          type: "dir" as const,
          name: new TextEncoder().encode("/dev"),
          stat: {
            fs_filetype: filetype.directory,
            fs_flags: 0 as ty.fdflags,
            fs_rights_base: rights.fd_readdir,
            fs_rights_inheriting: 0n as ty.rights,
          },
        },
      },
      nextfd: 0,
    };
    assert.assertEquals(
      fd_read(cx, 0 as ty.fd, 0 as ty.PointerU8, 0 as ty.size, 0),
      errno.badf,
    );
  });

  it("random", () => {
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
      crypto: {
        getRandomValues<T extends ArrayBufferView>(buf: T): T {
          new Uint8Array(buf.buffer).fill(0xFF);
          return buf;
        },
      },
    };
    const view = new DataView(cx.memory.buffer);
    view.setUint32(0, 8, true);
    view.setUint32(4, 16, true);
    assert.assertEquals(
      fd_read(cx, 0 as ty.fd, 0 as ty.PointerU8, 1 as ty.size, 24),
      errno.success,
    );
    assert.assertEquals(
      new Uint8Array(cx.memory.buffer, 8, 16),
      new Uint8Array(16).fill(0xFF),
    );
  });

  it("random - default", () => {
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
    const view = new DataView(cx.memory.buffer);
    view.setUint32(0, 8, true);
    view.setUint32(4, 16, true);
    assert.assertEquals(
      fd_read(cx, 0 as ty.fd, 0 as ty.PointerU8, 1 as ty.size, 24),
      errno.success,
    );
  });

  it("socket", () => {
    const cx = {
      memory: new WebAssembly.Memory({ initial: 32 }),
      fds: {
        0: {
          type: "sock" as const,
          stat: {
            fs_filetype: filetype.socket_stream,
            fs_flags: 0 as ty.fdflags,
            fs_rights_base: rights.fd_read,
            fs_rights_inheriting: 0n as ty.rights,
          },
          abort: new AbortController(),
          state: "connected" as const,
          recv: {
            state: "idle" as const,
            buf: new Uint8Array(17).fill(0xFF),
          },
          send: {
            state: "idle" as const,
            buf: Uint8Array.from([]),
          },
        },
      },
      nextfd: 0,
    };
    const view = new DataView(cx.memory.buffer);
    view.setUint32(0, 8, true);
    view.setUint32(4, 16, true);
    assert.assertEquals(
      fd_read(cx, 0 as ty.fd, 0 as ty.PointerU8, 1 as ty.size, 24),
      errno.success,
    );
    assert.assertEquals(
      new Uint8Array(cx.memory.buffer, 8, 16),
      new Uint8Array(16).fill(0xFF),
    );
  });
});
