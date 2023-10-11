import type { Context } from "@/wasi/context.ts";
import type * as ty from "@/wasi/ty/mod.ts";
import * as errno from "@/wasi/define/errno.ts";

export function random_get(
  cx: Context,
  buf: ty.PointerU8,
  buf_len: ty.size,
): ty.errno {
  crypto.getRandomValues(new Uint8Array(cx.memory.buffer, buf, buf_len));
  return errno.success;
}
