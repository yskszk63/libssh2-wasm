import * as wasi from "@/wasi/mod.ts";
import * as filetype from "@/wasi/define/filetype.ts";
import * as rights from "@/wasi/define/rights.ts";

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

type InitializeInstance = WebAssembly.Instance & {
  exports: {
    memory: WebAssembly.Memory;
    _initialize: () => void;
  };
};

function notImplemented(name: string, ...args: unknown[]): never {
  throw new Error(`Not implemented: ${name} ${args}`);
}

export interface connect {
  (
    hostname: string,
    port: number,
    signal: AbortSignal,
  ): Promise<[ReadableStream<Uint8Array>, WritableStream<Uint8Array>]>;
}

export class Wasi {
  #memory: WebAssembly.Memory | undefined;
  #connect: connect;
  fds: Record<number, wasi.FileDescriptor> = {
    3: {
      type: "dir",
      name: new TextEncoder().encode("/dev"),
      stat: {
        fs_filetype: filetype.directory,
        fs_flags: 0 as wasi.fdflags,
        fs_rights_base: rights.fd_readdir,
        fs_rights_inheriting: 0n as wasi.rights,
      },
    },
  };
  nextfd = 4;

  readables: Record<number, ReadableStream> = {};
  writables: Record<number, WritableStream> = {};

  constructor(connect: connect) {
    this.#connect = connect;
  }

  get memory(): WebAssembly.Memory {
    if (typeof this.#memory === "undefined") {
      throw new Error("Not initialized yet.");
    }
    return this.#memory;
  }

  get exports(): WebAssembly.Imports {
    return {
      wasi_snapshot_preview1: {
        environ_get: notImplemented.bind(null, "environ_get"),
        environ_sizes_get: notImplemented.bind(null, "environ_sizes_get"),

        clock_time_get: wasi.clock_time_get.bind(null, this),

        fd_close: wasi.fd_close.bind(null, this),
        fd_fdstat_get: wasi.fd_fdstat_get.bind(null, this),
        fd_fdstat_set_flags: wasi.fd_fdstat_set_flags.bind(null, this),
        fd_filestat_get: wasi.fd_filestat_get.bind(null, this),
        fd_prestat_get: wasi.fd_prestat_get.bind(null, this),
        fd_prestat_dir_name: wasi.fd_prestat_dir_name.bind(null, this),
        fd_read: wasi.fd_read.bind(null, this),
        fd_readdir: notImplemented.bind(null, "fd_readdir"),
        fd_seek: notImplemented.bind(null, "fd_seek"),
        fd_write: notImplemented.bind(null, "fd_write"),

        path_filestat_get: notImplemented.bind(null, "path_filestat_get"),
        path_open: wasi.path_open.bind(null, this),

        poll_oneoff: notImplemented.bind(null, "poll_oneoff"),

        proc_exit: wasi.proc_exit.bind(null, this),
        random_get: wasi.random_get.bind(null, this),

        sock_recv: wasi.sock_recv.bind(null, this),
        sock_send: wasi.sock_send.bind(null, this),
      },
    };
  }

  initialize(instance: InitializeInstance) {
    this.#memory = instance.exports.memory;
    instance.exports._initialize();
  }

  async connect(fd: number, hostname: string, port: number): Promise<void> {
    let fdi = this.fds[fd];
    if (
      typeof fdi === "undefined" || fdi.type !== "sock" ||
      fdi.state !== "opened"
    ) {
      throw new Error("Bad file descriptor.");
    }

    this.fds[fd] = {
      ...fdi,
      state: "connecting",
    };

    const [readable, writable] = await this.#connect(
      hostname,
      port,
      fdi.abort.signal,
    );

    fdi = this.fds[fd];
    if (
      typeof fdi === "undefined" || fdi.type !== "sock" ||
      fdi.state !== "connecting"
    ) {
      throw new Error("Bad file descriptor.");
    }

    const { type, stat, abort, recvbuf, sendbuf } = fdi;
    this.fds[fd] = {
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
    fdi.abort.signal.addEventListener("abort", () => {
      delete this.readables[fd];
      delete this.writables[fd];
    });
    this.readables[fd] = readable;
    this.writables[fd] = writable;
  }

  async poll(fd: number) {
    using stack = new DisposableStack();

    const fdi = this.fds[fd];
    if (typeof fdi === "undefined" || fdi.type !== "sock") {
      throw new Error(`Invalid ${fdi?.type}`);
    }

    if (fdi.state !== "connected") {
      return;
    }

    if (fdi.send.state === "idle" && fdi.send.buf.byteOffset > 0) {
      const writable = this.writables[fd];
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

    const readable = this.readables[fd];
    if (typeof readable === "undefined") {
      throw new Error(`No readable: ${fd}`);
    }
    const reader = readable.getReader({ mode: "byob" });
    stack.defer(() => reader.releaseLock());

    const { done, value } = await reader.read(
      new Uint8Array(fdi.recv.buf.buffer, fdi.recv.buf.byteOffset),
    );
    fdi.recv.state = "idle";
    if (done) {
      // TODO
      return;
    }
    fdi.recv.buf = new Uint8Array(
      value.buffer,
      0,
      value.byteOffset + value.byteLength,
    );
  }
}
