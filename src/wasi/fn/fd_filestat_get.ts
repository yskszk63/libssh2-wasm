import type { FdsContext } from "@/wasi/context.ts";
import type * as ty from "@/wasi/ty/mod.ts";
import * as errno from "@/wasi/define/errno.ts";

function encodeFilestat(view: DataView, value: ty.filestat) {
  view.setBigUint64(0, value.dev, true);
  view.setBigUint64(8, value.ino, true);
  view.setUint8(16, value.filetype);
  view.setBigUint64(24, value.nlink, true);
  view.setBigUint64(32, value.size, true);
  view.setBigUint64(40, value.atime, true);
  view.setBigUint64(48, value.mtime, true);
  view.setBigUint64(56, value.ctime, true);
}

export function fd_filestat_get(
  cx: FdsContext,
  fd: ty.fd,
  result: number,
): ty.errno {
  const fdi = cx.fds[fd];
  if (typeof fdi === "undefined") {
    return errno.noent;
  }

  const view = new DataView(cx.memory.buffer, result);
  encodeFilestat(view, {
    dev: 1n as ty.device, // TODO
    ino: 1n as ty.inode, // TODO
    filetype: fdi.stat.fs_filetype,
    nlink: 1n as ty.linkcount,
    size: 0n as ty.filesize, // TODO
    atime: 0n as ty.timestamp,
    mtime: 0n as ty.timestamp,
    ctime: 0n as ty.timestamp,
  });
  return errno.success;
}
