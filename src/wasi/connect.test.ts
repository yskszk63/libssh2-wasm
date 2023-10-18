import * as assert from "std/assert/mod.ts";
import { describe, it } from "std/testing/bdd.ts";

import { connect } from "@/wasi/connect.ts";
import * as ty from "@/wasi/ty/mod.ts";
import * as filetype from "@/wasi/define/filetype.ts";
import * as rights from "@/wasi/define/rights.ts";

describe("connect", () => {
  it("badf", async () => {
    const cx = {
      fds: {},
      readables: {},
      writables: {},
      connectfn(): never {
        throw new Error();
      },
    };
    const err = await assert.assertRejects(() =>
      connect(cx, 0, "example.com", 80)
    );
    assert.assertIsError(err, Error, "Missing file descriptor");
  });

  it("badf2", async () => {
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
      connectfn(): never {
        throw new Error();
      },
    };
    const err = await assert.assertRejects(() =>
      connect(cx, 0, "example.com", 80)
    );
    assert.assertIsError(err, Error, "Unexpected type: dir");
  });

  it("connected", async () => {
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
      connectfn(): never {
        throw new Error();
      },
    };
    const err = await assert.assertRejects(() =>
      connect(cx, 0, "example.com", 80)
    );
    assert.assertIsError(err, Error, "Unexpected state: connected");
  });

  it("connect", async () => {
    let rreason;
    let wreason;

    const abort = new AbortController();
    const readable = new ReadableStream<Uint8Array>({
      cancel(r) {
        rreason = r;
      },
    });
    const writable = new WritableStream<Uint8Array>({
      abort(r) {
        wreason = r;
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
          abort,
          state: "opened" as const,
          sendbuf: new ArrayBuffer(4),
          recvbuf: new ArrayBuffer(4),
        },
      },
      readables: {},
      writables: {},
      connectfn(): Promise<
        [ReadableStream<Uint8Array>, WritableStream<Uint8Array>]
      > {
        return Promise.resolve([readable, writable]);
      },
    };

    await connect(cx, 0, "example.com", 80);

    assert.assertEquals(cx.fds[0].state, "connected");
    // deno-lint-ignore no-explicit-any
    assert.assertEquals((cx.fds[0] as any).recv, {
      state: "idle",
      buf: new Uint8Array(0),
    });
    // deno-lint-ignore no-explicit-any
    assert.assertEquals((cx.fds[0] as any).recv.buf.byteOffset, 0);
    // deno-lint-ignore no-explicit-any
    assert.assertEquals((cx.fds[0] as any).recv.buf.byteLength, 0);

    // deno-lint-ignore no-explicit-any
    assert.assertEquals((cx.fds[0] as any).send, {
      state: "idle",
      buf: new Uint8Array(4),
    });
    // deno-lint-ignore no-explicit-any
    assert.assertEquals((cx.fds[0] as any).send.buf.byteOffset, 0);
    // deno-lint-ignore no-explicit-any
    assert.assertEquals((cx.fds[0] as any).send.buf.byteLength, 4);

    // deno-lint-ignore no-explicit-any
    assert.assertEquals((cx.readables as any)[0], readable);
    assert.assertEquals(rreason, void 0);
    // deno-lint-ignore no-explicit-any
    assert.assertEquals((cx.writables as any)[0], writable);
    assert.assertEquals(wreason, void 0);

    abort.abort();

    // deno-lint-ignore no-explicit-any
    assert.assertEquals((cx.readables as any)[0], void 0);
    assert.assertIsError(rreason, DOMException, "The signal has been aborted");
    // deno-lint-ignore no-explicit-any
    assert.assertEquals((cx.writables as any)[0], void 0);
    assert.assertIsError(wreason, DOMException, "The signal has been aborted");
  });
});
