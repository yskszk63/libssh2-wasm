import type { FdsContext } from "@/wasi/context.ts";
import type * as ty from "@/wasi/ty/mod.ts";
import * as errno from "@/wasi/define/errno.ts";

function* decodeIovecArray(
  view: DataView,
  ptr: number,
  size: number,
): Generator<ty.iovec> {
  for (let i = 0; i < size; i++) {
    const h = ptr + (i * 8);
    yield {
      buf: view.getUint32(h + 0, true) as ty.PointerU8,
      buf_len: view.getUint32(h + 4, true) as ty.size,
    };
  }
}

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
    return errno.inval;
  }

  const fdi = cx.fds[fd];
  if (
    typeof fdi === "undefined" || fdi.type !== "sock" ||
    fdi.state !== "connected"
  ) {
    return errno.badf;
  }

  const { recv } = fdi;
  if (recv.state !== "idle" || recv.buf.byteLength < 1) {
    fdi.recv.state = "insufficient";
    return errno.again;
  }

  const view = new DataView(cx.memory.buffer);

  let n = 0;
  const src = recv.buf;
  for (const iovec of decodeIovecArray(view, ri_data, ri_data_len)) {
    if (n > src.byteLength) {
      break;
    }

    const len = Math.min(iovec.buf_len, src.byteLength);
    new Uint8Array(cx.memory.buffer, iovec.buf, len).set(
      src.subarray(n, len),
    );
    n += len;

    recv.buf = new Uint8Array(
      src.buffer,
      src.byteOffset + n,
      src.byteLength - n,
    );
  }

  view.setUint32(result, n, true);
  return errno.success;
}
