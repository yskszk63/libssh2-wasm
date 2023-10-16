import * as assert from "std/assert/mod.ts";
import { describe, it } from "std/testing/bdd.ts";

import { fd_close } from "@/wasi/fn/mod.ts";
import * as ty from "@/wasi/ty/mod.ts";
import * as errno from "@/wasi/define/errno.ts";
import * as filetype from "@/wasi/define/filetype.ts";
import * as rights from "@/wasi/define/rights.ts";

describe("fd_close", () => {
  it("noent", () => {
    const cx = {
      memory: new WebAssembly.Memory({ initial: 32 }),
      fds: {},
      nextfd: 0,
    };
    assert.assertEquals(fd_close(cx, 0 as ty.fd), errno.badf);
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
    assert.assertEquals(fd_close(cx, 0 as ty.fd), errno.success);
    assert.assertEquals(cx.fds[0], void 0);
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
    };
    assert.assertEquals(fd_close(cx, 0 as ty.fd), errno.success);
    assert.assertEquals(cx.fds[0], void 0);
  });

  it("socket", () => {
    const abort = new AbortController();
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
          abort,
          state: "opened" as const,
          recvbuf: new ArrayBuffer(0),
          sendbuf: new ArrayBuffer(0),
        },
      },
      nextfd: 0,
    };
    assert.assertEquals(abort.signal.aborted, false);
    assert.assertEquals(fd_close(cx, 0 as ty.fd), errno.success);
    assert.assertEquals(cx.fds[0], void 0);
    assert.assertEquals(abort.signal.aborted, true);
  });
});
