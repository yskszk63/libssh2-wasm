import { compile } from "@/libssh2.wasm.js";
import { type connect, Wasi } from "@/wasi.ts";

interface Exports {
  memory: WebAssembly.Memory;
  _initialize: () => void;

  errno: WebAssembly.Global;
  malloc: (size: number) => number;
  free: (ptr: number) => void;
  open: (pathname: number, flags: number) => number;
  close: (fd: number) => number;
  strerror_r: (errnum: number, buf: number, buflen: number) => number;

  libssh2_init: (flags: number) => number;
  libssh2_session_init_ex: (
    myalloc: number,
    myfree: number,
    myrealloc: number,
    abstract: number,
  ) => number;
  libssh2_session_free: (session: number) => number;
  libssh2_session_handshake: (session: number, socket: number) => number;
  libssh2_session_set_blocking: (session: number, blocking: number) => void;
}

type Instance = {
  exports: WebAssembly.Exports & Exports;
};

// deno-lint-ignore ban-types
function assertsFn(name: string, value: unknown): asserts value is Function {
  if (typeof value !== "function") {
    throw new Error(`${name} is not typeof function`);
  }
}

function assertsExports(
  exports: WebAssembly.Exports,
): asserts exports is WebAssembly.Exports & Exports {
  if (!(exports["memory"] instanceof WebAssembly.Memory)) {
    throw new Error("Not found: memory");
  }

  assertsFn("_initialize", exports["_initialize"]);

  if (!(exports["errno"] instanceof WebAssembly.Global)) {
    throw new Error("Not found: errno");
  }

  assertsFn("malloc", exports["malloc"]);
  assertsFn("free", exports["free"]);
  assertsFn("open", exports["open"]);
  assertsFn("close", exports["close"]);
  assertsFn("strerror_r", exports["strerror_r"]);

  assertsFn("libssh2_init", exports["libssh2_init"]);
  assertsFn("libssh2_session_init_ex", exports["libssh2_session_init_ex"]);
  assertsFn("libssh2_session_free", exports["libssh2_session_free"]);
  assertsFn("libssh2_session_handshake", exports["libssh2_session_handshake"]);
  assertsFn(
    "libssh2_session_set_blocking",
    exports["libssh2_session_set_blocking"],
  );
}

function assertsInstance(
  instance: WebAssembly.Instance,
): asserts instance is WebAssembly.Instance & Instance {
  assertsExports(instance.exports);
}

const module = await compile();

export const LIBSSH2_INIT_NO_CRYPTO = 0x0001;

export class Libssh2Sys {
  static async instantiate(connect: connect): Promise<Libssh2Sys> {
    const wasi = new Wasi(connect);

    const instance = await WebAssembly.instantiate(module, {
      ...wasi.exports,
    });
    assertsInstance(instance);

    wasi.initialize(instance);

    return new Libssh2Sys(instance, wasi);
  }

  #instance: WebAssembly.Instance & Instance;
  #wasi: Wasi;

  private constructor(
    instantiate: WebAssembly.Instance & Instance,
    wasi: Wasi,
  ) {
    this.#instance = instantiate;
    this.#wasi = wasi;
  }

  sys_connect(fd: number, hostname: string, port: number): Promise<void> {
    return this.#wasi.connect(fd, hostname, port);
  }

  sys_poll(fd: number): Promise<void> {
    return this.#wasi.poll(fd);
  }

  get memory(): WebAssembly.Memory {
    return this.#instance.exports.memory;
  }

  get errno(): WebAssembly.Global {
    return this.#instance.exports.errno;
  }

  malloc(size: number): number {
    return this.#instance.exports.malloc(size);
  }

  free(ptr: number): void {
    return this.#instance.exports.free(ptr);
  }

  open(pathname: number, flags: number): number {
    return this.#instance.exports.open(pathname, flags);
  }

  close(fd: number): number {
    return this.#instance.exports.close(fd);
  }

  strerror_r(errnum: number, buf: number, buflen: number): number {
    return this.#instance.exports.strerror_r(errnum, buf, buflen);
  }

  libssh2_init(flags: number): number {
    return this.#instance.exports.libssh2_init(flags);
  }

  libssh2_session_init_ex(
    myalloc: number,
    myfree: number,
    myrealloc: number,
    abstract: number,
  ): number {
    return this.#instance.exports.libssh2_session_init_ex(
      myalloc,
      myfree,
      myrealloc,
      abstract,
    );
  }

  libssh2_session_free(session: number): number {
    return this.#instance.exports.libssh2_session_free(session);
  }

  libssh2_session_handshake(session: number, socket: number): number {
    return this.#instance.exports.libssh2_session_handshake(session, socket);
  }

  libssh2_session_set_blocking(session: number, blocking: number): void {
    return this.#instance.exports.libssh2_session_set_blocking(
      session,
      blocking,
    );
  }
}
