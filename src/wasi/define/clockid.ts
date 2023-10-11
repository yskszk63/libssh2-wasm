import * as ty from "@/wasi/ty/mod.ts";

export const realtime = 0x00 as ty.clockid; // The clock measuring real time. Time value zero corresponds with 1970-01-01T00:00:00Z.
export const monotonic = 0x01 as ty.clockid; // The store-wide monotonic clock, which is defined as a clock measuring real time, whose value cannot be adjusted and which cannot have negative clock jumps. The epoch of this clock is undefined. The absolute time value of this clock therefore has no meaning.
export const process_cputime_id = 0x02 as ty.clockid; // The CPU-time clock associated with the current process.
export const thread_cputime_id = 0x03 as ty.clockid; // The CPU-time clock associated with the current thread.
