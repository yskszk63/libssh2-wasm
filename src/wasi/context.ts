import * as ty from "@/wasi/ty/mod.ts";

export type Context = {
  readonly memory: WebAssembly.Memory;
};

export type DirFd = {
  type: "dir";
  name: Uint8Array;
  stat: ty.fdstat;
};

type SockFdRecvState = {
  state: "idle" | "insufficient" | "busy"; // interest??
  buf: Uint8Array;
} | {
  state: "eof";
  buf?: Uint8Array | undefined;
} | {
  state: "err";
  error: unknown;
};

type SockFdSendState =
  & {
    buf: Uint8Array;
  }
  & ({
    state: "idle" | "busy";
  } | {
    state: "err";
    error: unknown;
  });

type SockFdBase = {
  type: "sock";
  stat: ty.fdstat;
  abort: AbortController;
};

export type SockFdOpened = SockFdBase & {
  state: "opened";
  recvbuf: ArrayBuffer;
  sendbuf: ArrayBuffer;
};

export type SockFdConnecting = SockFdBase & {
  state: "connecting";
  recvbuf: ArrayBuffer;
  sendbuf: ArrayBuffer;
};

export type SockFdConnected = SockFdBase & {
  state: "connected";
  recv: SockFdRecvState;
  send: SockFdSendState;
};

export type SockFd = SockFdOpened | SockFdConnecting | SockFdConnected;

export type RandomFd = {
  type: "random";
  stat: ty.fdstat;
};

export type FileDescriptor = DirFd | SockFd | RandomFd;

export type FdsContext = Context & {
  readonly fds: Record<number, FileDescriptor>;
  nextfd: number;
};

export type ClockContext = Context & {
  now?: () => number | undefined;
};

export type RandomContext = Context & {
  crypto?: Pick<Crypto, "getRandomValues"> | undefined;
};
