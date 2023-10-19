import * as assert from "std/assert/mod.ts";
import { describe, it } from "std/testing/bdd.ts";

import type * as ty from "@/wasi/ty/mod.ts";
import * as errno from "@/wasi/define/errno.ts";
import { Wasi } from "@/wasi.ts";

function assertFunction(value: unknown): asserts value is CallableFunction {
  assert.assertEquals(typeof value, "function");
}

describe("Wasi", () => {
  it("socket", async () => {
    const wasm = {
      exports: {
        memory: new WebAssembly.Memory({ initial: 1024 * 8 }),
        _initialize() {},
      },
    };

    const LENGTH = 0.5 * 1024 * 1024;
    let rbuf = Uint8Array.from(
      new Array(LENGTH).fill(0).map((_, i) => i & 0xFF),
    );
    let wbuf = new Uint8Array(rbuf.byteLength);

    const wasi = new Wasi(() => {
      return Promise.resolve([
        new ReadableStream({
          type: "bytes",
          pull(controller) {
            const { byobRequest } = controller;
            if (byobRequest === null) {
              controller.error(new Error("!byob"));
              return;
            }

            if (rbuf.byteLength < 1) {
              controller.close();
              byobRequest.respond(0);
              return;
            }

            if (
              byobRequest.view === null ||
              !(byobRequest.view instanceof Uint8Array)
            ) {
              controller.error(new Error("!view"));
              return;
            }

            const max = Math.min(byobRequest.view.byteLength, rbuf.byteLength);
            const len = Math.random() * (max - 1) + 1;
            byobRequest.view.set(rbuf.subarray(0, len));
            rbuf = rbuf.subarray(len);
            byobRequest.respond(len);
          },
        }),
        new WritableStream({
          write(chunk) {
            wbuf.set(chunk);
            wbuf = wbuf.subarray(chunk.byteLength);
          },
        }),
      ]);
    });
    wasi.initialize(wasm);

    let last = 0;
    function malloc(size: number): { ptr: number; size: number } {
      const ptr = last;
      last += size;
      return {
        ptr,
        size,
      };
    }

    function stralloc(text: string): ReturnType<typeof malloc> {
      const b = new TextEncoder().encode(text);
      const result = malloc(b.byteLength);
      new Uint8Array(wasi.memory.buffer, result.ptr, result.size).set(b);
      return result;
    }

    const {
      path_open,
      sock_recv,
      sock_send,
      fd_close,
    } = wasi.exports["wasi_snapshot_preview1"];

    assertFunction(path_open);
    assertFunction(sock_recv);
    assertFunction(sock_send);
    assertFunction(fd_close);

    let ret: number;
    const sockp = stralloc("socket");
    const fdp = malloc(Uint32Array.BYTES_PER_ELEMENT);
    const bufp = malloc(32);
    const iovecp = malloc(8);
    const retp = malloc(Uint32Array.BYTES_PER_ELEMENT);

    ret = path_open(
      3 as ty.fd,
      0 as ty.lookupflags,
      sockp.ptr,
      sockp.size,
      0 as ty.oflags,
      0n as ty.rights,
      0n as ty.rights,
      0 as ty.fdflags,
      fdp.ptr,
    );
    assert.assertEquals(ret, errno.success);
    const fd = new DataView(wasi.memory.buffer).getUint32(fdp.ptr, true);
    await wasi.connect(fd, "example.com", 80); // example.com ... dummy

    let state = 0; // 0: read, 1: write, 2: eof
    loop:
    while (true) {
      await wasi.poll(fd);

      switch (state) {
        case 0: {
          const view = new DataView(wasi.memory.buffer);
          view.setUint32(iovecp.ptr + 0, bufp.ptr, true);
          view.setUint32(iovecp.ptr + 4, bufp.size, true);

          ret = sock_recv(fd, iovecp.ptr, 1, 0 as ty.riflags, retp.ptr);
          if (ret === errno.again) {
            continue;
          }

          assert.assertEquals(ret, errno.success);
          const len = view.getUint32(retp.ptr, true);
          if (len === 0) {
            state = 2;
            continue;
          }

          view.setUint32(iovecp.ptr + 4, len, true);
          state = 1;

          break;
        }

        case 1: {
          const view = new DataView(wasi.memory.buffer);

          ret = sock_send(fd, iovecp.ptr, 1, 0 as ty.riflags, retp.ptr);
          if (ret === errno.again) {
            continue;
          }

          assert.assertEquals(ret, errno.success);

          const len = view.getUint32(retp.ptr, true);
          const nextPtr = view.getUint32(iovecp.ptr + 0, true) + len;
          const nextSize = view.getUint32(iovecp.ptr + 4, true) - len;
          if (nextSize === 0) {
            state = 0;
            continue;
          }

          view.setUint32(iovecp.ptr + 0, nextPtr, true);
          view.setUint32(iovecp.ptr + 4, nextSize, true);
          continue;
        }

        case 2: {
          break loop;
        }

        default:
          throw new Error();
      }
    }

    assert.assertEquals(
      new Uint8Array(rbuf.buffer),
      new Uint8Array(wbuf.buffer),
    );
  });
});
