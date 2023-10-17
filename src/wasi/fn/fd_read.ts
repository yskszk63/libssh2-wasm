import type { FdsContext, RandomContext } from "@/wasi/context.ts";
import type * as ty from "@/wasi/ty/mod.ts";
import * as errno from "@/wasi/define/errno.ts";

import { decodeIovecArray } from "@/wasi/fn/helper/mod.ts";
import { random_get } from "@/wasi/fn/random_get.ts";
import { sock_recv } from "@/wasi/fn/sock_recv.ts";

export function fd_read(
  cx: FdsContext & RandomContext,
  fd: ty.fd,
  iovs: ty.PointerU8,
  iovs_len: ty.size,
  result: number,
): ty.errno {
  const fdi = cx.fds[fd];
  if (typeof fdi === "undefined") {
    return errno.badf;
  }

  switch (fdi.type) {
    case "dir": {
      return errno.badf;
    }

    case "sock": {
      return sock_recv(cx, fd, iovs, iovs_len, 0 as ty.riflags, result);
    }

    case "random": {
      const view = new DataView(cx.memory.buffer);
      let n = 0;
      for (const iovec of decodeIovecArray(view, iovs, iovs_len)) {
        random_get(cx, iovec.buf, iovec.buf_len);
        n += iovec.buf_len;
      }

      view.setUint32(result, n, true);
      return errno.success;
    }
  }
}
