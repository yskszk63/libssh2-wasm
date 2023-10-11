import type { FdsContext } from "@/wasi/context.ts";
import type * as ty from "@/wasi/ty/mod.ts";
import * as errno from "@/wasi/define/errno.ts";

export function fd_prestat_dir_name(
  cx: FdsContext,
  fd: ty.fd,
  path: ty.PointerU8,
  path_len: ty.size,
): ty.errno {
  const fdi = cx.fds[fd];
  if (typeof fdi === "undefined" || fdi.type !== "dir") {
    return errno.badf;
  }

  if (path_len < fdi.name.byteLength) {
    return errno.inval;
  }

  const view = new Uint8Array(cx.memory.buffer, path, path_len);
  view.set(fdi.name);
  return errno.success;
}
