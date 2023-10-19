import type { FdsContext } from "@/wasi/context.ts";
import type * as ty from "@/wasi/ty/mod.ts";
import * as errno from "@/wasi/define/errno.ts";

import { decodeIovecArray } from "@/wasi/fn/helper/mod.ts";

export function sock_recv(
  cx: FdsContext,
  fd: ty.fd,
  ri_data: ty.PointerU8,
  ri_data_len: ty.size,
  ri_flags: ty.riflags,
  result: number,
): ty.errno {
  if (ri_flags !== 0) {
    // TODO: NOT IMPLEMENTED
    return errno.nosys;
  }

  const fdi = cx.fds[fd];
  if (
    typeof fdi === "undefined" || fdi.type !== "sock" ||
    fdi.state !== "connected"
  ) {
    return errno.badf;
  }

  const { recv } = fdi;
  const view = new DataView(cx.memory.buffer);

  switch (recv.state) {
    case "idle":
      if (recv.buf.byteLength < 1) {
        fdi.recv.state = "insufficient";
        return errno.again;
      }
      break;

    case "insufficient":
      return errno.again;

    case "busy":
      return errno.busy;

    case "eof":
      if (typeof recv.buf === "undefined" || recv.buf.byteLength < 1) {
        view.setUint32(result, 0, true);
        return errno.success;
      }
      break;

    case "err":
      return errno.badf;
  }

  let n = 0;
  const src = recv.buf!; // It should not be undefined.
  for (const iovec of decodeIovecArray(view, ri_data, ri_data_len)) {
    if (n >= src.byteLength) {
      break;
    }

    const len = Math.min(iovec.buf_len, src.byteLength - n);
    new Uint8Array(cx.memory.buffer, iovec.buf, len).set(
      new Uint8Array(src.buffer, src.byteOffset + n, len),
    );
    n += len;
  }
  recv.buf = new Uint8Array(
    src.buffer,
    src.byteOffset + n,
    src.byteLength - n,
  );

  view.setUint32(result, n, true);
  return errno.success;
}
