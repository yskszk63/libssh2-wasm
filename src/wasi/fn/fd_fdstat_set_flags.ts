import type { FdsContext } from "@/wasi/context.ts";
import type * as ty from "@/wasi/ty/mod.ts";
import * as errno from "@/wasi/define/errno.ts";

export function fd_fdstat_set_flags(
  cx: FdsContext,
  fd: ty.fd,
  flags: ty.fdflags,
): ty.errno {
  const fdi = cx.fds[fd];
  if (typeof fdi === "undefined") {
    return errno.noent;
  }

  fdi.stat.fs_flags = flags;
  return errno.success;
}
