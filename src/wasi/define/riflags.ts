import type * as ty from "@/wasi/ty/mod.ts";

export const recv_peek = 1 << 1 as ty.riflags; // bool Returns the message without removing it from the socket's receive queue.
export const recv_waitall = 1 << 1 as ty.riflags; // bool On byte-stream sockets, block until the full amount of data can be returned.
