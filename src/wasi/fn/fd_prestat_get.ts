import type { FdsContext } from "@/wasi/context.ts";
import type * as ty from "@/wasi/ty/mod.ts";
import * as errno from "@/wasi/define/errno.ts";

export function fd_prestat_get(
  cx: FdsContext,
  fd: ty.fd,
  result: ty.PointerU8,
): ty.errno {
  const fdi = cx.fds[fd];
  if (typeof fdi === "undefined" || fdi.type !== "dir") {
    return errno.badf;
  }

  const view = new DataView(cx.memory.buffer);
  view.setUint8(result + 0, 0); // prestat tag: dir
  view.setUint32(result + 4, fdi.name.byteLength, true);
  return errno.success;
}
