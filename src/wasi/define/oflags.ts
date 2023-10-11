import type * as ty from "@/wasi/ty/mod.ts";

export const creat = 1 << 1 as ty.oflags; // bool Create file if it does not exist.
export const directory = 1 << 2 as ty.oflags; // bool Fail if not a directory.
export const excl = 1 << 3 as ty.oflags; // bool Fail if file already exists.
export const trunc = 1 << 4 as ty.oflags; // bool Truncate file to size 0.
