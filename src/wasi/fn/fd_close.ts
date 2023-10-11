import type { FdsContext } from "@/wasi/context.ts";
import type * as ty from "@/wasi/ty/mod.ts";
import * as errno from "@/wasi/define/errno.ts";

export function fd_close(cx: FdsContext, fd: ty.fd): ty.errno {
  const fdi = cx.fds[fd];
  if (typeof fdi === "undefined") {
    return errno.noent;
  }

  switch (fdi.type) {
    case "dir": {
      delete cx.fds[fd];
      return errno.success;
    }

    case "sock": {
      delete cx.fds[fd];
      fdi.abort.abort();
      return errno.success;
    }
  }
  // return errno.badf;
}
