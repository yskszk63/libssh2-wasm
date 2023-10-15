import type { FdsContext } from "@/wasi/context.ts";
import type * as ty from "@/wasi/ty/mod.ts";
import * as errno from "@/wasi/define/errno.ts";
import * as filetype from "@/wasi/define/filetype.ts";

const socketPattern = new URLPattern({
  pathname: "/dev/socket",
});

function decodePath(parent: Uint8Array, name: Uint8Array): string {
  const path = new Uint8Array(parent.byteLength + name.byteLength + 1);
  path.set(parent);
  path.set([0x2F], parent.byteLength); // slash
  path.set(name, parent.byteLength + 1);
  return new TextDecoder().decode(path);
}

function path_open_socket(
  cx: FdsContext,
  fs_rights_base: ty.rights,
  fs_rights_inheriting: ty.rights,
  fdflags: ty.fdflags,
  result: number,
): ty.errno {
  const nextfd = cx.nextfd++;
  cx.fds[nextfd] = {
    state: "opened",
    stat: {
      fs_filetype: filetype.socket_stream,
      fs_flags: fdflags,
      fs_rights_base,
      fs_rights_inheriting,
    },
    abort: new AbortController(),
    type: "sock",
    recvbuf: new ArrayBuffer(85 * 1024),
    sendbuf: new ArrayBuffer(85 * 1024),
  };
  const view = new DataView(cx.memory.buffer);
  view.setUint32(result, nextfd, true);
  return errno.success;
}

export function path_open(
  cx: FdsContext,
  fd: ty.fd,
  _dirflags: ty.lookupflags,
  path: ty.PointerU8,
  path_len: ty.size,
  _oflags: ty.oflags,
  fs_rights_base: ty.rights,
  fs_rights_inheriting: ty.rights,
  fdflags: ty.fdflags,
  result: number,
): ty.errno {
  const parent = cx.fds[fd];
  if (typeof parent === "undefined") {
    return errno.noent;
  }
  if (parent.type !== "dir") {
    return errno.badf;
  }

  const name = new Uint8Array(cx.memory.buffer, path, path_len);
  const pathname = decodePath(parent.name, name);
  console.log(pathname);

  let _m: URLPatternResult | null;
  if ((_m = socketPattern.exec({ pathname })) !== null) {
    return path_open_socket(
      cx,
      fs_rights_base,
      fs_rights_inheriting,
      fdflags,
      result,
    );
  }

  return errno.noent;
}
