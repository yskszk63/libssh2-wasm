import { spawn } from "child_process";
import { fileURLToPath } from "url";
import { readFile } from "fs/promises";
import { ReadableStream, WritableStream } from "stream/web";
import { webcrypto } from "crypto";

import Wasi from "./wasi.js";

const crypto = webcrypto as unknown as Crypto; // TODO

let mod: WebAssembly.Module | undefined;

beforeAll(async () => {
  if (!import.meta.url) {
    throw new Error("no import.meta.url");
  }
  const dir = new URL("./wasi.test/", import.meta.url);
  const proc = spawn("make", ["-C", fileURLToPath(dir)], { stdio: ["ignore", "ignore", "inherit"] });
  const result = await new Promise<number>((resolve, reject) => {
    proc.on("exit", resolve);
    proc.on("error", reject);
  });
  if (result) {
    throw new Error(`result: ${result}`);
  }

  const bin = await readFile(new URL("libtest.wasm", dir));
  mod = await WebAssembly.compile(bin);
});

interface TestWasmExports {
  memory: WebAssembly.Memory

  malloc(size: number): number
  free(ptr: number): void
  clock_gettime(clk_id: number, res: number): number
  fcntl(fd: number, cmd: number, ...args: number[]): number
  open(pathname: number, flags: number): number
  close(fd: number): number
  fstat(fd: number, buf: number): number
  read(fd: number, buf: number, count: number): number
  recv(fd: number, buf: number, len: number, flags: number): number
  send(fd: number, buf: number, len: number, flags: number): number
  poll(fds: number, nfds: number, timeout: number): number

  sizeof_timespec(): number
  offsetof_timespec_tv_sec(): number
  offsetof_timespec_tv_nsec(): number
  sizeof_stat(): number
  sizeof_pollfd(): number
  get_F_GETFL(): number
  get_O_RDONLY(): number
  get_POLLIN(): number
  get_POLLOUT(): number
}

function isTestWasmExports(exports: WebAssembly.Exports): exports is WebAssembly.Exports & TestWasmExports {
  if (!exports) {
    return false;
  }
  // TODO implement
  return true;
}

function newUint8ArrayReadableStream(buf: Uint8Array): ReadableStream<Uint8Array> {
  buf = buf.slice();

  return new ReadableStream({
    start(controller) {
      if (!buf.byteLength) {
        return controller.close();
      }
    },
    pull(controller) {
      controller.enqueue(buf.slice());
      buf = buf.slice(buf.byteLength);
      if (!buf.byteLength) {
        return controller.close();
      }
    },
    type: "bytes",
  });
}

function newUint8ArrayWritableStream(dest: Uint8Array[]): WritableStream<Uint8Array> {
  return new WritableStream({
    write(chunk) {
      dest.push(chunk.slice());
    },
  });
}

describe("initialize", () => {
  const netFactory = () => Promise.reject("stub");

  test("success", async () => {
    if (!mod) {
      throw new Error();
    }

    const wasi = new Wasi({
      netFactory,
      crypto,
    });
    const instance = await WebAssembly.instantiate(mod, {
      wasi_snapshot_preview1: wasi.exports,
    });
    wasi.initialize(instance);
  });

  test("no memory", async () => {
    const mod = await WebAssembly.compile(new Uint8Array([
      // https://developer.mozilla.org/en-US/docs/WebAssembly/Understanding_the_text_format#the_simplest_module
      0x00, 0x61, 0x73, 0x6d, // WASM_BINARY_MAGIC
      0x01, 0x00, 0x00, 0x00, // WASM_BINARY_VERSION
    ]));

    const wasi = new Wasi({
      netFactory,
      crypto,
    });
    const instance = await WebAssembly.instantiate(mod, {
      wasi_snapshot_preview1: wasi.exports,
    });
    expect(() => wasi.initialize(instance)).toThrow("!undefined instanceof WebAssembly.Memory");
  });

  test("no _initialize", async () => {
    /*
     * (module
     *  (memory $0 1)
     *  (export "memory" (memory $0))
     * )
     */
    const mod = await WebAssembly.compile(new Uint8Array([
      0x00, 0x61, 0x73, 0x6d, // WASM_BINARY_MAGIC
      0x01, 0x00, 0x00, 0x00, // WASM_BINARY_VERSION
      0x05, 0x83, 0x80, 0x80,
      0x80, 0x00, 0x01, 0x00,
      0x01, 0x06, 0x81, 0x80,
      0x80, 0x80, 0x00, 0x00,
      0x07, 0x8a, 0x80, 0x80,
      0x80, 0x00, 0x01, 0x06,
      0x6d, 0x65, 0x6d, 0x6f,
      0x72, 0x79, 0x02, 0x00,
    ]));

    const wasi = new Wasi({
      netFactory: () => Promise.reject("stub"),
      crypto,
    });
    const instance = await WebAssembly.instantiate(mod, {
      wasi_snapshot_preview1: wasi.exports,
    });
    expect(() => wasi.initialize(instance)).toThrow("no _initialize found.");
  });
});

describe("poll", () => {
  const netFactory = () => Promise.reject("stub");

  test("invalid fd", async () => {
    if (!mod) {
      throw new Error();
    }

    const wasi = new Wasi({
      netFactory,
      crypto,
    });

    const instance = await WebAssembly.instantiate(mod, {
      wasi_snapshot_preview1: wasi.exports,
    });
    wasi.initialize(instance);

    await expect(wasi.poll([-1])).rejects.toThrow("invalid fd.");
  });
});

describe("clock_gettime", () => {
  const netFactory = () => Promise.reject("stub");

  test("success", async () => {
    if (!mod) {
      throw new Error();
    }

    const wasi = new Wasi({
      netFactory,
      crypto,
    });

    const instance = await WebAssembly.instantiate(mod, {
      wasi_snapshot_preview1: wasi.exports,
    });
    wasi.initialize(instance);

    if (!isTestWasmExports(instance.exports)) {
      throw new Error();
    }
    const { clock_gettime, malloc, memory, sizeof_timespec, offsetof_timespec_tv_sec, offsetof_timespec_tv_nsec } = instance.exports;

    const tp = malloc(sizeof_timespec());
    expect(tp).not.toBe(-1);
    const r = clock_gettime(0, tp);
    expect(r).toBe(0);
    const tv_sec = new DataView(memory.buffer).getBigUint64(tp + offsetof_timespec_tv_sec(), true);
    expect(tv_sec).toBeGreaterThan(0);
    const tv_nsec = new DataView(memory.buffer).getInt32(tp + offsetof_timespec_tv_nsec(), true);
    expect(tv_nsec).toBeGreaterThanOrEqual(0);
    expect(tv_nsec).toBeLessThan(1000_000_000n);
  });
});

describe("fd_fdstat_get", () => {
  const netFactory = () => Promise.reject("stub");

  const wasi = new Wasi({
    netFactory,
    crypto,
  });

  test("success", async () => {
    if (!mod) {
      throw new Error();
    }
    const instance = await WebAssembly.instantiate(mod, {
      wasi_snapshot_preview1: wasi.exports,
    });
    wasi.initialize(instance);

    if (!isTestWasmExports(instance.exports)) {
      throw new Error();
    }
    const { fcntl, memory, malloc, open, get_F_GETFL, get_O_RDONLY } = instance.exports;

    const fname = new TextEncoder().encode("/dev/urandom\0");
    const pfname = malloc(fname.byteLength);
    if (!pfname) {
      throw new Error();
    }
    new Uint8Array(memory.buffer, pfname, fname.byteLength).set(fname);
    const fd = open(pfname, get_O_RDONLY());
    const r = fcntl(fd, get_F_GETFL());
    expect(r).toBe(get_O_RDONLY());
  });

  test("invalid", async () => {
    if (!mod) {
      throw new Error();
    }
    const instance = await WebAssembly.instantiate(mod, {
      wasi_snapshot_preview1: wasi.exports,
    });
    wasi.initialize(instance);

    if (!isTestWasmExports(instance.exports)) {
      throw new Error();
    }
    const { fcntl, get_F_GETFL } = instance.exports;
    const r = fcntl(0, get_F_GETFL());
    expect(r).toBe(-1);
  });
});

describe("fd_fdstat_get", () => {
  const netFactory = () => Promise.reject("stub");

  const wasi = new Wasi({
    netFactory,
    crypto,
  });

  test("success", async () => {
    if (!mod) {
      throw new Error();
    }
    const instance = await WebAssembly.instantiate(mod, {
      wasi_snapshot_preview1: wasi.exports,
    });
    wasi.initialize(instance);

    if (!isTestWasmExports(instance.exports)) {
      throw new Error();
    }
    const { memory, malloc, open, fstat, sizeof_stat, get_O_RDONLY } = instance.exports;

    const fname = new TextEncoder().encode("/dev/urandom\0");
    const pfname = malloc(fname.byteLength);
    if (!pfname) {
      throw new Error();
    }
    new Uint8Array(memory.buffer, pfname, fname.byteLength).set(fname);
    const fd = open(pfname, get_O_RDONLY());
    const stat = malloc(sizeof_stat());
    const r = fstat(fd, stat);
    expect(r).toBe(0);
  });

  test("invalid", async () => {
    if (!mod) {
      throw new Error();
    }
    const instance = await WebAssembly.instantiate(mod, {
      wasi_snapshot_preview1: wasi.exports,
    });
    wasi.initialize(instance);

    if (!isTestWasmExports(instance.exports)) {
      throw new Error();
    }
    const { malloc, fstat, sizeof_stat } = instance.exports;

    const stat = malloc(sizeof_stat());
    const r = fstat(-1, stat);
    expect(r).toBe(-1);
  });
});

describe("fd_read", () => {
  const netFactory = () => Promise.reject("stub");

  const wasi = new Wasi({
    netFactory,
    crypto,
  });

  test("success", async () => {
    if (!mod) {
      throw new Error();
    }
    const instance = await WebAssembly.instantiate(mod, {
      wasi_snapshot_preview1: wasi.exports,
    });
    wasi.initialize(instance);

    if (!isTestWasmExports(instance.exports)) {
      throw new Error();
    }
    const { memory, malloc, open, read, get_O_RDONLY } = instance.exports;

    const fname = new TextEncoder().encode("/dev/urandom\0");
    const pfname = malloc(fname.byteLength);
    if (!pfname) {
      throw new Error();
    }
    new Uint8Array(memory.buffer, pfname, fname.byteLength).set(fname);
    const fd = open(pfname, get_O_RDONLY());
    const buf = malloc(8 * 1024);
    for (const b of new Uint8Array(memory.buffer, buf, 8 * 1024)) {
      expect(b).toBe(0);
    }
    const r = read(fd, buf, 8 * 1024);
    expect(new Uint8Array(memory.buffer, buf, 8 * 1024).every(v => v === 0)).toBe(false);
    expect(r).toBe(8 * 1024);
  });

  test("invalid", async () => {
    if (!mod) {
      throw new Error();
    }
    const instance = await WebAssembly.instantiate(mod, {
      wasi_snapshot_preview1: wasi.exports,
    });
    wasi.initialize(instance);

    if (!isTestWasmExports(instance.exports)) {
      throw new Error();
    }
    const { read } = instance.exports;

    const r = read(-1, 0, 0);
    expect(r).toBe(-1);
  });
});

describe("path_open", () => {
  const netFactory = () => Promise.resolve([
    newUint8ArrayReadableStream(new Uint8Array()),
    newUint8ArrayWritableStream([]),
  ] as [ReadableStream<Uint8Array>, WritableStream<Uint8Array>]);

  const wasi = new Wasi({
    netFactory,
    crypto,
  });

  test("success", async () => {
    if (!mod) {
      throw new Error();
    }
    const instance = await WebAssembly.instantiate(mod, {
      wasi_snapshot_preview1: wasi.exports,
    });
    wasi.initialize(instance);

    if (!isTestWasmExports(instance.exports)) {
      throw new Error();
    }
    const { memory, malloc, open, get_O_RDONLY } = instance.exports;

    const fname = new TextEncoder().encode("/dev/urandom\0");
    const pfname = malloc(fname.byteLength);
    expect(pfname).not.toBe(0);
    new Uint8Array(memory.buffer, pfname, fname.byteLength).set(fname);
    const fd = open(pfname, get_O_RDONLY());
    expect(fd).not.toBe(-1);
  });

  test("noent", async () => {
    if (!mod) {
      throw new Error();
    }
    const instance = await WebAssembly.instantiate(mod, {
      wasi_snapshot_preview1: wasi.exports,
    });
    wasi.initialize(instance);

    if (!isTestWasmExports(instance.exports)) {
      throw new Error();
    }
    const { memory, malloc, open, get_O_RDONLY } = instance.exports;

    const fname = new TextEncoder().encode("/dev/cpuinfo\0");
    const pfname = malloc(fname.byteLength);
    expect(pfname).not.toBe(0);
    new Uint8Array(memory.buffer, pfname, fname.byteLength).set(fname);
    const fd = open(pfname, get_O_RDONLY());
    expect(fd).toBe(-1);
  });

  test("noent2", async () => {
    if (!mod) {
      throw new Error();
    }
    const instance = await WebAssembly.instantiate(mod, {
      wasi_snapshot_preview1: wasi.exports,
    });
    wasi.initialize(instance);

    if (!isTestWasmExports(instance.exports)) {
      throw new Error();
    }
    const { memory, malloc, open, get_O_RDONLY } = instance.exports;

    const fname = new TextEncoder().encode("/dev/shm/xxx\0");
    const pfname = malloc(fname.byteLength);
    expect(pfname).not.toBe(0);
    new Uint8Array(memory.buffer, pfname, fname.byteLength).set(fname);
    const fd = open(pfname, get_O_RDONLY());
    expect(fd).toBe(-1);
  });

  test("invalid tcp name", async () => {
    if (!mod) {
      throw new Error();
    }
    const instance = await WebAssembly.instantiate(mod, {
      wasi_snapshot_preview1: wasi.exports,
    });
    wasi.initialize(instance);

    if (!isTestWasmExports(instance.exports)) {
      throw new Error();
    }
    const { memory, malloc, open, get_O_RDONLY } = instance.exports;

    const fname = new TextEncoder().encode("/dev/tcp/x\0");
    const pfname = malloc(fname.byteLength);
    expect(pfname).not.toBe(0);
    new Uint8Array(memory.buffer, pfname, fname.byteLength).set(fname);
    const fd = open(pfname, get_O_RDONLY());
    expect(fd).toBe(-1);
  });

  test("invalid tcp name2", async () => {
    if (!mod) {
      throw new Error();
    }
    const instance = await WebAssembly.instantiate(mod, {
      wasi_snapshot_preview1: wasi.exports,
    });
    wasi.initialize(instance);

    if (!isTestWasmExports(instance.exports)) {
      throw new Error();
    }
    const { memory, malloc, open, get_O_RDONLY } = instance.exports;

    const fname = new TextEncoder().encode("/dev/tcp/x:x\0");
    const pfname = malloc(fname.byteLength);
    expect(pfname).not.toBe(0);
    new Uint8Array(memory.buffer, pfname, fname.byteLength).set(fname);
    const fd = open(pfname, get_O_RDONLY());
    expect(fd).toBe(-1);
  });
});

describe("fd_close", () => {
  const netFactory = () => Promise.resolve([
    newUint8ArrayReadableStream(new Uint8Array()),
    newUint8ArrayWritableStream([]),
  ] as [ReadableStream<Uint8Array>, WritableStream<Uint8Array>]);

  const wasi = new Wasi({
    netFactory,
    crypto,
  });

  test("urandom", async () => {
    if (!mod) {
      throw new Error();
    }
    const instance = await WebAssembly.instantiate(mod, {
      wasi_snapshot_preview1: wasi.exports,
    });
    wasi.initialize(instance);

    if (!isTestWasmExports(instance.exports)) {
      throw new Error();
    }
    const { memory, malloc, open, close, get_O_RDONLY } = instance.exports;

    const fname = new TextEncoder().encode("/dev/urandom\0");
    const pfname = malloc(fname.byteLength);
    if (!pfname) {
      throw new Error();
    }
    new Uint8Array(memory.buffer, pfname, fname.byteLength).set(fname);
    const fd = open(pfname, get_O_RDONLY());
    expect(fd).not.toBe(-1);
    const r = close(fd);
    expect(r).not.toBe(-1);
  });

  test("sock connecting", async () => {
    if (!mod) {
      throw new Error();
    }
    const instance = await WebAssembly.instantiate(mod, {
      wasi_snapshot_preview1: wasi.exports,
    });
    wasi.initialize(instance);

    if (!isTestWasmExports(instance.exports)) {
      throw new Error();
    }
    const { memory, malloc, open, close, get_O_RDONLY } = instance.exports;

    const fname = new TextEncoder().encode("/dev/tcp/x:0\0");
    const pfname = malloc(fname.byteLength);
    if (!pfname) {
      throw new Error();
    }
    new Uint8Array(memory.buffer, pfname, fname.byteLength).set(fname);
    const fd = open(pfname, get_O_RDONLY());
    expect(fd).not.toBe(-1);
    const r = close(fd);
    expect(r).not.toBe(-1);
  });

  test("sock idle", async () => {
    if (!mod) {
      throw new Error();
    }
    const instance = await WebAssembly.instantiate(mod, {
      wasi_snapshot_preview1: wasi.exports,
    });
    wasi.initialize(instance);

    if (!isTestWasmExports(instance.exports)) {
      throw new Error();
    }
    const { memory, malloc, open, close, get_O_RDONLY } = instance.exports;

    const fname = new TextEncoder().encode("/dev/tcp/x:0\0");
    const pfname = malloc(fname.byteLength);
    if (!pfname) {
      throw new Error();
    }
    new Uint8Array(memory.buffer, pfname, fname.byteLength).set(fname);
    const fd = open(pfname, get_O_RDONLY());
    expect(fd).not.toBe(-1);
    await wasi.poll([fd]);
    const r = close(fd);
    expect(r).not.toBe(-1);
  });

  test("sock busy", async () => {
    if (!mod) {
      throw new Error();
    }
    const instance = await WebAssembly.instantiate(mod, {
      wasi_snapshot_preview1: wasi.exports,
    });
    wasi.initialize(instance);

    if (!isTestWasmExports(instance.exports)) {
      throw new Error();
    }
    const { memory, malloc, open, close, recv, send, get_O_RDONLY } = instance.exports;

    const fname = new TextEncoder().encode("/dev/tcp/x:0\0");
    const pfname = malloc(fname.byteLength);
    if (!pfname) {
      throw new Error();
    }
    new Uint8Array(memory.buffer, pfname, fname.byteLength).set(fname);
    const fd = open(pfname, get_O_RDONLY());
    expect(fd).not.toBe(-1);
    await wasi.poll([fd]);

    const buf = malloc(1);
    const r1 = recv(fd, buf, 1, 0);
    expect(r1).toBe(-1); // EAGAIN
    const r2 = send(fd, buf, 1, 0);
    expect(r2).toBe(-1); // EAGAIN

    const r = close(fd);
    expect(r).not.toBe(-1);
  });
});

describe("sock_recv", () => {
  const netFactory = () => Promise.resolve([
    newUint8ArrayReadableStream(new Uint8Array(new TextEncoder().encode("Hello"))),
    newUint8ArrayWritableStream([]),
  ] as [ReadableStream<Uint8Array>, WritableStream<Uint8Array>]);

  const wasi = new Wasi({
    netFactory,
    crypto,
  });

  test("success", async () => {
    if (!mod) {
      throw new Error();
    }
    const instance = await WebAssembly.instantiate(mod, {
      wasi_snapshot_preview1: wasi.exports,
    });
    wasi.initialize(instance);

    if (!isTestWasmExports(instance.exports)) {
      throw new Error();
    }
    const { memory, malloc, open, recv, get_O_RDONLY } = instance.exports;

    const fname = new TextEncoder().encode("/dev/tcp/x:0\0");
    const pfname = malloc(fname.byteLength);
    if (!pfname) {
      throw new Error();
    }
    new Uint8Array(memory.buffer, pfname, fname.byteLength).set(fname);
    const fd = open(pfname, get_O_RDONLY());
    expect(fd).not.toBe(-1);
    const buf = malloc(5);

    expect(recv(fd, buf, 5, 0)).toBe(-1); // connecting EAGAIN
    await wasi.poll([fd]);
    expect(recv(fd, buf, 5, 0)).toBe(-1); // idle -> reading EAGAIN
    await wasi.poll([fd]);
    expect(recv(fd, buf, 5, 0)).toBe("Hello".length); // idle -> reading
    await wasi.poll([fd]);
    expect(recv(fd, buf, 5, 0)).toBe(-1); // idle -> reading EAGAIN
    await wasi.poll([fd]);
    expect(recv(fd, buf, 5, 0)).toBe(0); // eof
  });

  test("error", async () => {
    if (!mod) {
      throw new Error();
    }
    const rs = new ReadableStream({
      start(controller) {
        controller.error("err");
      },
      type: "bytes",
    });
    const ws = newUint8ArrayWritableStream([]);
    const wasi = new Wasi({
      netFactory: () => Promise.resolve([rs, ws]),
      crypto,
      logger() {}, // TODO assert
    });
    const instance = await WebAssembly.instantiate(mod, {
      wasi_snapshot_preview1: wasi.exports,
    });
    wasi.initialize(instance);

    if (!isTestWasmExports(instance.exports)) {
      throw new Error();
    }
    const { memory, malloc, open, recv, get_O_RDONLY } = instance.exports;

    const fname = new TextEncoder().encode("/dev/tcp/x:0\0");
    const pfname = malloc(fname.byteLength);
    if (!pfname) {
      throw new Error();
    }
    new Uint8Array(memory.buffer, pfname, fname.byteLength).set(fname);
    const fd = open(pfname, get_O_RDONLY());
    expect(fd).not.toBe(-1);
    const buf = malloc(5);

    expect(recv(fd, buf, 5, 0)).toBe(-1); // connecting EAGAIN
    await wasi.poll([fd]);
    expect(recv(fd, buf, 5, 0)).toBe(-1); // idle -> reading EAGAIN
    await wasi.poll([fd]);
    expect(recv(fd, buf, 5, 0)).toBe(-1); // idle -> reading
  });

  test("invalid1", async () => {
    if (!mod) {
      throw new Error();
    }
    const instance = await WebAssembly.instantiate(mod, {
      wasi_snapshot_preview1: wasi.exports,
    });
    wasi.initialize(instance);

    if (!isTestWasmExports(instance.exports)) {
      throw new Error();
    }
    const { memory, malloc, open, recv, get_O_RDONLY } = instance.exports;

    const fname = new TextEncoder().encode("/dev/urandom\0");
    const pfname = malloc(fname.byteLength);
    if (!pfname) {
      throw new Error();
    }
    new Uint8Array(memory.buffer, pfname, fname.byteLength).set(fname);
    const fd = open(pfname, get_O_RDONLY());
    expect(fd).not.toBe(-1);
    const buf = malloc(5);

    expect(recv(fd, buf, 5, 0)).toBe(-1); // EINVAL
  });

  test("invalid2", async () => {
    if (!mod) {
      throw new Error();
    }
    const instance = await WebAssembly.instantiate(mod, {
      wasi_snapshot_preview1: wasi.exports,
    });
    wasi.initialize(instance);

    if (!isTestWasmExports(instance.exports)) {
      throw new Error();
    }
    const { malloc, recv } = instance.exports;

    const buf = malloc(5);
    expect(recv(-1, buf, 5, 0)).toBe(-1); // EINVAL
  });
});

describe("sock_send", () => {
  const netFactory = () => Promise.resolve([
    newUint8ArrayReadableStream(new Uint8Array()),
    newUint8ArrayWritableStream([]),
  ] as [ReadableStream<Uint8Array>, WritableStream<Uint8Array>]);

  const wasi = new Wasi({
    netFactory,
    crypto,
  });

  test("success", async () => {
    if (!mod) {
      throw new Error();
    }
    const instance = await WebAssembly.instantiate(mod, {
      wasi_snapshot_preview1: wasi.exports,
    });
    wasi.initialize(instance);

    if (!isTestWasmExports(instance.exports)) {
      throw new Error();
    }
    const { memory, malloc, open, send, get_O_RDONLY } = instance.exports;

    const fname = new TextEncoder().encode("/dev/tcp/x:0\0");
    const pfname = malloc(fname.byteLength);
    if (!pfname) {
      throw new Error();
    }
    new Uint8Array(memory.buffer, pfname, fname.byteLength).set(fname);
    const fd = open(pfname, get_O_RDONLY());
    expect(fd).not.toBe(-1);
    const buf = malloc(1024 * 8 * 2);

    expect(send(fd, buf, 1024 * 8 * 2, 0)).toBe(-1); // connecting EAGAIN
    await wasi.poll([fd]);
    expect(send(fd, buf, 1024 * 8 * 2, 0)).toBe(-1); // idle -> writing EAGAIN
    await wasi.poll([fd]);
    expect(send(fd, buf, 1024 * 8 * 2, 0)).toBe(1024 * 8); // idle
  });

  test("error", async () => {
    if (!mod) {
      throw new Error();
    }
    const rs = newUint8ArrayReadableStream(new Uint8Array());
    const ws = new WritableStream({
      start(controller) {
        controller.error("err");
      },
    });
    const wasi = new Wasi({
      netFactory: () => Promise.resolve([rs, ws]),
      crypto,
      logger() {}, // TODO assert
    });
    const instance = await WebAssembly.instantiate(mod, {
      wasi_snapshot_preview1: wasi.exports,
    });
    wasi.initialize(instance);

    if (!isTestWasmExports(instance.exports)) {
      throw new Error();
    }
    const { memory, malloc, open, send, get_O_RDONLY } = instance.exports;

    const fname = new TextEncoder().encode("/dev/tcp/x:0\0");
    const pfname = malloc(fname.byteLength);
    if (!pfname) {
      throw new Error();
    }
    new Uint8Array(memory.buffer, pfname, fname.byteLength).set(fname);
    const fd = open(pfname, get_O_RDONLY());
    expect(fd).not.toBe(-1);
    const buf = malloc(1024 * 8 * 2);

    expect(send(fd, buf, 1024 * 8 * 2, 0)).toBe(-1); // connecting EAGAIN
    await wasi.poll([fd]);
    expect(send(fd, buf, 1024 * 8 * 2, 0)).toBe(-1); // idle -> writing EAGAIN
    await wasi.poll([fd]);
    expect(send(fd, buf, 1024 * 8 * 2, 0)).toBe(-1); // error
  });

  test("invalid1", async () => {
    if (!mod) {
      throw new Error();
    }
    const instance = await WebAssembly.instantiate(mod, {
      wasi_snapshot_preview1: wasi.exports,
    });
    wasi.initialize(instance);

    if (!isTestWasmExports(instance.exports)) {
      throw new Error();
    }
    const { memory, malloc, open, send, get_O_RDONLY } = instance.exports;

    const fname = new TextEncoder().encode("/dev/urandom\0");
    const pfname = malloc(fname.byteLength);
    if (!pfname) {
      throw new Error();
    }
    new Uint8Array(memory.buffer, pfname, fname.byteLength).set(fname);
    const fd = open(pfname, get_O_RDONLY());
    expect(fd).not.toBe(-1);
    const buf = malloc(1024 * 8 * 2);

    expect(send(fd, buf, 1024 * 8 * 2, 0)).toBe(-1);
  });

  test("invalid2", async () => {
    if (!mod) {
      throw new Error();
    }
    const instance = await WebAssembly.instantiate(mod, {
      wasi_snapshot_preview1: wasi.exports,
    });
    wasi.initialize(instance);

    if (!isTestWasmExports(instance.exports)) {
      throw new Error();
    }
    const { malloc, send } = instance.exports;

    const buf = malloc(1024 * 8 * 2);

    expect(send(-1, buf, 1024 * 8 * 2, 0)).toBe(-1);
  });
});

describe("poll_oneoff", () => {
  const reader = newUint8ArrayReadableStream(new Uint8Array());
  const writer = newUint8ArrayWritableStream([]);
  const wasi = new Wasi({
    netFactory: (host, port) => {
      expect(host).toStrictEqual("dummy");
      expect(port).toStrictEqual(0);
      return Promise.resolve([reader, writer]);
    },
    crypto,
  });

  test("success", async () => {
    if (!mod) {
      throw new Error();
    }
    const instance = await WebAssembly.instantiate(mod, {
      wasi_snapshot_preview1: wasi.exports,
    });
    wasi.initialize(instance);

    if (!isTestWasmExports(instance.exports)) {
      throw new Error();
    }
    const { memory, malloc, open, poll, recv, sizeof_pollfd, get_O_RDONLY, get_POLLIN, get_POLLOUT } = instance.exports;

    const path = new TextEncoder().encode("/dev/tcp/dummy:0");
    const ppath = malloc(path.byteLength);
    new Uint8Array(memory.buffer, ppath, path.byteLength).set(path);
    const fd = open(ppath, get_O_RDONLY());
    if (fd < 0) {
      throw new Error(`err ${fd}`);
    }
    const fds = malloc(sizeof_pollfd());
    ((v: DataView) => {
      v.setInt32(0, fd, true); // fd
      v.setInt16(4, get_POLLIN() | get_POLLOUT(), true); // events
      v.setInt16(6, 0, true); // revents
    })(new DataView(memory.buffer, fds, 8));
    {
      const r = poll(fds, 1, -1);
      expect(r).toBe(0);
    }

    await wasi.poll([fd]);
    {
      // idle
      const r = poll(fds, 1, -1);
      expect(r).toBe(1);
    }

    const buf = malloc(1);
    expect(buf).not.toBe(0);

    {
      expect(recv(fd, buf, 1, 0)).toBe(-1);
      await wasi.poll([fd]);
      expect(recv(fd, buf, 1, 0)).toBe(0);
    }

    await wasi.poll([fd]);
    {
      // eof
      const r = poll(fds, 1, -1);
      expect(r).toBe(1);
    }
  });

  test("invalid1", async () => {
    if (!mod) {
      throw new Error();
    }
    const instance = await WebAssembly.instantiate(mod, {
      wasi_snapshot_preview1: wasi.exports,
    });
    wasi.initialize(instance);

    if (!isTestWasmExports(instance.exports)) {
      throw new Error();
    }
    const { memory, malloc, poll, sizeof_pollfd, get_POLLIN } = instance.exports;

    const fds = malloc(sizeof_pollfd());
    ((v: DataView) => {
      v.setInt32(0, 0, true); // fd
      v.setInt16(4, get_POLLIN(), true); // events
      v.setInt16(6, 0, true); // revents
    })(new DataView(memory.buffer, fds, 8));
    const r = poll(fds, 1, -1);
    expect(r).toBe(-1);
  });

  test("invalid2", async () => {
    if (!mod) {
      throw new Error();
    }
    const instance = await WebAssembly.instantiate(mod, {
      wasi_snapshot_preview1: wasi.exports,
    });
    wasi.initialize(instance);

    if (!isTestWasmExports(instance.exports)) {
      throw new Error();
    }
    const { memory, malloc, poll, sizeof_pollfd, get_POLLOUT } = instance.exports;

    const fds = malloc(sizeof_pollfd());
    ((v: DataView) => {
      v.setInt32(0, 0, true); // fd
      v.setInt16(4, get_POLLOUT(), true); // events
      v.setInt16(6, 0, true); // revents
    })(new DataView(memory.buffer, fds, 8));
    const r = poll(fds, 1, -1);
    expect(r).toBe(-1);
  });
});
