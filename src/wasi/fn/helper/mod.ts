import type * as ty from "@/wasi/ty/mod.ts";

export function* decodeIovecArray(
  view: DataView,
  ptr: number,
  size: number,
): Generator<ty.iovec> {
  for (let i = 0; i < size; i++) {
    const h = ptr + (i * 8);
    yield {
      buf: view.getUint32(h + 0, true) as ty.PointerU8,
      buf_len: view.getUint32(h + 4, true) as ty.size,
    };
  }
}
