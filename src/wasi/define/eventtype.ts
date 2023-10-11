import type * as ty from "@/wasi/ty/mod.ts";

export const clock = 0x00 as ty.eventtype; // The time value of clock subscription_clock::id has reached timestamp subscription_clock::timeout.
export const fd_read = 0x01 as ty.eventtype; // File descriptor subscription_fd_readwrite::file_descriptor has data available for reading. This event always triggers for regular files.
export const fd_write = 0x02 as ty.eventtype; // File descriptor subscription_fd_readwrite::file_descriptor has capacity available for writing. This event always triggers for regular files.
