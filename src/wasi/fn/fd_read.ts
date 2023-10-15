import type { FdsContext } from "@/wasi/context.ts";
import type * as ty from "@/wasi/ty/mod.ts";
import * as errno from "@/wasi/define/errno.ts";

// TODO sock_recv
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

export function fd_read(
  cx: FdsContext,
  fd: ty.fd,
  iovs: ty.PointerU8,
  iovs_len: ty.size,
  result: number,
): ty.errno {
  const fdi = cx.fds[fd];
  if (
    typeof fdi === "undefined" || fdi.type !== "random"
  ) {
    return errno.badf;
  }

  const view = new DataView(cx.memory.buffer);

  let n = 0;
  for (const iovec of decodeIovecArray(view, iovs, iovs_len)) {
    crypto.getRandomValues(
      new Uint8Array(cx.memory.buffer, iovec.buf, iovec.buf_len),
    );
    n += iovec.buf_len;
  }

  view.setUint32(result, n, true);
  return errno.success;
}
