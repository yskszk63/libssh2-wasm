import * as assert from "std/assert/mod.ts";
import { describe, it } from "std/testing/bdd.ts";

import { poll } from "@/wasi/poll.ts";
import * as ty from "@/wasi/ty/mod.ts";
import * as filetype from "@/wasi/define/filetype.ts";
import * as rights from "@/wasi/define/rights.ts";

describe("poll", () => {
  it("badf", async () => {
    const cx = {
      fds: {},
      readables: {},
      writables: {},
    };
    await assert.assertRejects(() => poll(cx, 0));
  });

  it("badf", async () => {
    const cx = {
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
      readables: {},
      writables: {},
    };
    await assert.assertRejects(() => poll(cx, 0));
  });

  it("not connected yet", async () => {
    const cx = {
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
      readables: {},
      writables: {},
    };
    await poll(cx, 0);
  });

  it("no writer", async () => {
    const cx = {
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
            buf: Uint8Array.from([0xFF]).subarray(1),
          },
        },
      },
      readables: {},
      writables: {},
    };
    await assert.assertRejects(() => poll(cx, 0));
  });

  it("no reader", async () => {
    const cx = {
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
            state: "insufficient" as const,
            buf: Uint8Array.from([0xFF]).subarray(1),
          },
          send: {
            state: "idle" as const,
            buf: new Uint8Array(0),
          },
        },
      },
      readables: {},
      writables: {},
    };
    await assert.assertRejects(() => poll(cx, 0));
  });

  it("send", async () => {
    const chunks: Uint8Array[] = [];
    const writable = new WritableStream<Uint8Array>({
      write(chunk) {
        chunks.push(chunk);
      },
    });

    const cx = {
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
            buf: Uint8Array.from([0xFF, 0xFE]).subarray(1),
          },
        },
      },
      readables: {},
      writables: {
        0: writable,
      },
    };
    await poll(cx, 0);
    await writable.close();

    assert.assertEquals(chunks, [Uint8Array.from([0xFF])]);
    assert.assertEquals(cx.fds[0].send.buf.byteOffset, 0);
    assert.assertEquals(cx.fds[0].send.buf.byteLength, 2);
  });

  it("recv", async () => {
    const readable = new Blob([Uint8Array.from([0xFF, 0xFE])]).stream();

    const cx = {
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
            state: "insufficient" as const,
            buf: new Uint8Array(new ArrayBuffer(32), 0, 0),
          },
          send: {
            state: "idle" as const,
            buf: new Uint8Array(0),
          },
        },
      },
      readables: {
        0: readable,
      },
      writables: {},
    };
    await poll(cx, 0);
    await poll(cx, 0); // nop

    assert.assertEquals(cx.fds[0].recv.buf, Uint8Array.from([0xFF, 0xFE]));
    assert.assertEquals(cx.fds[0].recv.state, "idle");

    cx.fds[0].recv.state = "insufficient";
    cx.fds[0].recv.buf = new Uint8Array(cx.fds[0].recv.buf, 0, 0);
    await poll(cx, 0); // EOF
    assert.assertEquals(cx.fds[0].recv.state, "eof");
  });
});
