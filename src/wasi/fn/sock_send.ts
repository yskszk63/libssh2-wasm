import type { FdsContext } from "@/wasi/context.ts";
import type * as ty from "@/wasi/ty/mod.ts";
import * as errno from "@/wasi/define/errno.ts";

function* decodeCiovecArray(
  view: DataView,
  ptr: number,
  size: number,
): Generator<ty.ciovec> {
  for (let i = 0; i < size; i++) {
    const h = ptr + (i * 8);
    yield {
      buf: view.getUint32(h + 0, true) as ty.PointerU8,
      buf_len: view.getUint32(h + 4, true) as ty.size,
    };
  }
}

export function sock_send(
  cx: FdsContext,
  fd: ty.fd,
  si_data: ty.PointerU8,
  si_data_len: ty.size,
  _si_flags: ty.siflags,
  result: number,
): ty.errno {
  const fdi = cx.fds[fd];
  if (
    typeof fdi === "undefined" || fdi.type !== "sock" ||
    fdi.state !== "connected"
  ) {
    return errno.badf;
  }

  const { send } = fdi;
  if (send.state !== "idle" || send.buf.byteLength < 1) {
    return errno.again;
  }

  const view = new DataView(cx.memory.buffer);

  let n = 0;
  const dest = send.buf;
  for (const ciovec of decodeCiovecArray(view, si_data, si_data_len)) {
    if (n > dest.byteLength) {
      break;
    }

    const len = Math.min(ciovec.buf_len, dest.byteLength);
    dest.set(new Uint8Array(cx.memory.buffer, ciovec.buf, len), n);
    n += len;
  }
  send.buf = new Uint8Array(
    dest.buffer,
    dest.byteOffset + n,
    dest.byteLength - n,
  );

  view.setUint32(result, n, true);
  return errno.success;
}
