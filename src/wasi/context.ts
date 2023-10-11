import * as ty from "@/wasi/ty/mod.ts";

export type Context = {
  readonly memory: WebAssembly.Memory;
};

type DirFd = {
  type: "dir";
  name: Uint8Array;
  stat: ty.fdstat;
};

type SockFdRecvState =
  & {
    buf: Uint8Array;
  }
  & ({
    state: "idle" | "insufficient" | "busy"; // interest??
  } | {
    state: "err";
    error: unknown;
  });

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

type SockFd =
  & {
    type: "sock";
    stat: ty.fdstat;
    abort: AbortController;
  }
  & ({
    state: "opened" | "connecting";
    recvbuf: ArrayBuffer;
    sendbuf: ArrayBuffer;
  } | {
    state: "connected";
    recv: SockFdRecvState;
    send: SockFdSendState;
  });

export type FileDescriptor = DirFd | SockFd;

export type FdsContext = Context & {
  readonly fds: Record<number, FileDescriptor>;
  nextfd: number;
};
