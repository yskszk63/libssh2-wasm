import type { FdsContext } from "@/wasi/context.ts";
import type * as ty from "@/wasi/ty/mod.ts";
import * as errno from "@/wasi/define/errno.ts";

export function fd_fdstat_get(
  cx: FdsContext,
  fd: ty.fd,
  result: number,
): ty.errno {
  const { stat } = cx.fds[fd] ?? {};
  if (typeof stat === "undefined") {
    return errno.badf;
  }

  const view = new DataView(cx.memory.buffer);
  view.setUint8(result + 0, stat.fs_filetype);
  view.setUint16(result + 2, stat.fs_flags, true);
  view.setBigUint64(result + 8, stat.fs_rights_base, true);
  view.setBigUint64(result + 16, stat.fs_rights_inheriting, true);
  return errno.success;
}
