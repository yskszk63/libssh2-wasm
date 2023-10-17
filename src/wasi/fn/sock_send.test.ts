import * as assert from "std/assert/mod.ts";
import { describe, it } from "std/testing/bdd.ts";

import { sock_send } from "@/wasi/fn/mod.ts";
import * as ty from "@/wasi/ty/mod.ts";
import * as errno from "@/wasi/define/errno.ts";
import * as filetype from "@/wasi/define/filetype.ts";
import * as rights from "@/wasi/define/rights.ts";

describe("sock_send", () => {
  it("badf", () => {
    const cx = {
      memory: new WebAssembly.Memory({ initial: 32 }),
      fds: {},
      nextfd: 0,
    };
    assert.assertEquals(
      sock_send(
        cx,
        0 as ty.fd,
        0 as ty.PointerU8,
        0 as ty.size,
        0 as ty.siflags,
        0,
      ),
      errno.badf,
    );
  });

  it("badf", () => {
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
      sock_send(
        cx,
        0 as ty.fd,
        0 as ty.PointerU8,
        0 as ty.size,
        0 as ty.siflags,
        0,
      ),
      errno.badf,
    );
  });

  it("badf2", () => {
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
          state: "opened" as const,
          recvbuf: new ArrayBuffer(0),
          sendbuf: new ArrayBuffer(0),
        },
      },
      nextfd: 0,
    };
    const view = new DataView(cx.memory.buffer);
    view.setUint32(0, 8, true);
    view.setUint32(4, 16, true);
    assert.assertEquals(
      sock_send(
        cx,
        0 as ty.fd,
        0 as ty.PointerU8,
        1 as ty.size,
        0 as ty.siflags,
        24,
      ),
      errno.badf,
    );
  });

  it("again", () => {
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
            buf: new Uint8Array(0),
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
      sock_send(
        cx,
        0 as ty.fd,
        0 as ty.PointerU8,
        1 as ty.size,
        0 as ty.siflags,
        24,
      ),
      errno.again,
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
            buf: Uint8Array.from([]),
          },
          send: {
            state: "idle" as const,
            buf: new Uint8Array(15),
          },
        },
      },
      nextfd: 0,
    };
    const view = new DataView(cx.memory.buffer);

    view.setUint32(0, 24, true);
    view.setUint32(4, 8, true);

    view.setUint32(8, 32, true);
    view.setUint32(12, 8, true);

    view.setUint32(16, 40, true);
    view.setUint32(20, 8, true);

    new Uint8Array(cx.memory.buffer, 24, 24).set(new Uint8Array(24).fill(0xFF));
    assert.assertEquals(
      sock_send(
        cx,
        0 as ty.fd,
        0 as ty.PointerU8,
        3 as ty.size,
        0 as ty.siflags,
        48,
      ),
      errno.success,
    );
    assert.assertEquals(cx.fds[0].send.buf.byteOffset, 15);
    assert.assertEquals(cx.fds[0].send.buf.byteLength, 0);
    assert.assertEquals(
      new Uint8Array(cx.fds[0].send.buf.buffer),
      new Uint8Array(15).fill(0xFF),
    );
    assert.assertEquals(view.getUint32(48, true), 15);
  });
});
