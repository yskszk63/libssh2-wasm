import type * as ty from "@/wasi/ty/mod.ts";

export const append = 1 << 0 as ty.fdflags; // bool Append mode: Data written to the file is always appended to the file's end.
export const dsync = 1 << 1 as ty.fdflags; // bool Write according to synchronized I/O data integrity completion. Only the data stored in the file is synchronized.
export const nonblock = 1 << 2 as ty.fdflags; // bool Non-blocking mode.
export const rsync = 1 << 3 as ty.fdflags; // bool Synchronized read I/O operations.
export const sync = 1 << 4 as ty.fdflags; // bool Write according to synchronized I/O file integrity completion. In addition to synchronizing the data stored in the file, the implementation may also synchronously update the file's metadata.
