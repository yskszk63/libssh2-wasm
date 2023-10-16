import type { ClockContext } from "@/wasi/context.ts";
import type * as ty from "@/wasi/ty/mod.ts";
import * as errno from "@/wasi/define/errno.ts";
import * as clockid from "@/wasi/define/clockid.ts";

export function clock_time_get(
  cx: ClockContext,
  id: ty.clockid,
  _precision: ty.timestamp,
  result: number,
): ty.errno {
  if (id !== clockid.realtime) {
    return errno.nosys; // Not implemented.
  }

  const time = BigInt(cx.now?.() ?? Date.now()) * 1000_000n;
  new DataView(cx.memory.buffer).setBigUint64(result, time, true);
  return errno.success;
}
