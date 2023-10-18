import type { FdsContext } from "@/wasi/context.ts";

class DisposableStack {
  #callbacks: (() => void)[] = [];

  defer(fn: () => void) {
    this.#callbacks.push(fn);
  }

  [Symbol.dispose]() {
    for (const fn of this.#callbacks) {
      fn(); // TODO catch
    }
  }
}

type This = Pick<FdsContext, "fds"> & {
  readables: Record<number, ReadableStream>;
  writables: Record<number, WritableStream>;
};

export async function poll(cx: This, fd: number) {
  using stack = new DisposableStack();

  const fdi = cx.fds[fd];
  if (typeof fdi === "undefined" || fdi.type !== "sock") {
    throw new Error(`Invalid ${fdi?.type}`);
  }

  if (fdi.state !== "connected") {
    return;
  }
  if (fdi.send.state === "idle" && fdi.send.buf.byteOffset > 0) {
    const writable = cx.writables[fd];
    if (typeof writable === "undefined") {
      throw new Error(`No writable: ${fd}`);
    }

    // using writer = stack.adopt(writable.getWriter(), v => v.releaseLock());
    const writer = writable.getWriter();
    stack.defer(() => writer.releaseLock());

    await writer.write(
      new Uint8Array(fdi.send.buf.buffer, 0, fdi.send.buf.byteOffset),
    );
    fdi.send.buf = new Uint8Array(fdi.send.buf.buffer);
    return;
  }

  if (fdi.recv.state !== "insufficient") {
    return;
  }

  const readable = cx.readables[fd];
  if (typeof readable === "undefined") {
    throw new Error(`No readable: ${fd}`);
  }
  const reader = readable.getReader({ mode: "byob" });
  stack.defer(() => reader.releaseLock());

  const { done, value } = await reader.read(
    new Uint8Array(fdi.recv.buf.buffer),
  );
  if (done) {
    fdi.recv = {
      state: "eof",
      buf: value,
    };
    return;
  }
  fdi.recv.state = "idle";
  fdi.recv.buf = value;
}
