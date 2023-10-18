import type {
  FdsContext,
  FileDescriptor,
  SockFd,
  SockFdConnecting,
  SockFdOpened,
} from "@/wasi/context.ts";
import type { ConnectFn } from "@/wasi.ts";

type This = Pick<FdsContext, "fds"> & {
  readables: Record<number, ReadableStream>;
  writables: Record<number, WritableStream>;
  connectfn: ConnectFn;
};

function assertFdState(
  value: FileDescriptor | undefined,
  expectedState: "opened",
): asserts value is SockFdOpened;
function assertFdState(
  value: FileDescriptor | undefined,
  expectedState: "connecting",
): asserts value is SockFdConnecting;
function assertFdState(
  value: FileDescriptor | undefined,
  expectedState: string,
): asserts value is SockFd {
  if (typeof value === "undefined") {
    throw new Error("Missing file descriptor");
  }
  if (value.type !== "sock") {
    throw new Error(`Unexpected type: ${value.type}`);
  }
  if (value.state !== expectedState) {
    throw new Error(`Unexpected state: ${value.state}`);
  }
}

export async function connect(
  cx: This,
  fd: number,
  hostname: string,
  port: number,
): Promise<void> {
  let fdi = cx.fds[fd];
  assertFdState(fdi, "opened");

  cx.fds[fd] = {
    ...fdi,
    state: "connecting",
  };

  const [readable, writable] = await cx.connectfn(
    hostname,
    port,
    fdi.abort.signal,
  );

  fdi = cx.fds[fd];
  assertFdState(fdi, "connecting");

  const { type, stat, abort, recvbuf, sendbuf } = fdi;
  cx.fds[fd] = {
    type,
    stat,
    abort,
    state: "connected",
    recv: {
      state: "idle",
      buf: new Uint8Array(recvbuf, 0, 0),
    },
    send: {
      state: "idle",
      buf: new Uint8Array(sendbuf),
    },
  };

  const signal = fdi.abort.signal;
  signal.addEventListener("abort", () => {
    if (cx.readables[fd] === readable) {
      cx.readables[fd].cancel(signal.reason);
      delete cx.readables[fd];
    }

    if (cx.writables[fd] === writable) {
      cx.writables[fd].abort(signal.reason);
      delete cx.writables[fd];
    }
  });
  cx.readables[fd] = readable;
  cx.writables[fd] = writable;
}
