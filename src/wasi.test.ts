import { spawn } from "child_process";
import { fileURLToPath } from "url";
import { readFile } from "fs/promises";
import { ReadableStream, WritableStream } from "stream/web";
import { webcrypto } from "crypto";

import Wasi from "./wasi.js";

let mod: WebAssembly.Module | undefined;

beforeAll(async () => {
  if (!import.meta.url) {
    throw new Error("no import.meta.url");
  }
  const dir = new URL("./wasi.test/", import.meta.url);
  const proc = spawn("make", ["-C", fileURLToPath(dir)], { stdio: "ignore" });
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

test("test initialize", async () => {
  if (!mod) {
    throw new Error();
  }

  const wasi = new Wasi({
    netFactory: () => Promise.reject("stub"),
    crypto: webcrypto as unknown as Crypto,
  });
  const instance = await WebAssembly.instantiate(mod, {
    wasi_snapshot_preview1: wasi.exports,
  });
  wasi.initialize(instance);
});

test("test initialize no mem", async () => {
  const mod = await WebAssembly.compile(new Uint8Array([
    // https://developer.mozilla.org/en-US/docs/WebAssembly/Understanding_the_text_format#the_simplest_module
    0x00, 0x61, 0x73, 0x6d, // WASM_BINARY_MAGIC
    0x01, 0x00, 0x00, 0x00, // WASM_BINARY_VERSION
  ]));

  const wasi = new Wasi({
    netFactory: () => Promise.reject("stub"),
    crypto: webcrypto as unknown as Crypto,
  });
  const instance = await WebAssembly.instantiate(mod, {
    wasi_snapshot_preview1: wasi.exports,
  });
  expect(() => wasi.initialize(instance)).toThrow("!undefined instanceof WebAssembly.Memory");
});

test("test initialize no _init", async () => {
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
    crypto: webcrypto as unknown as Crypto,
  });
  const instance = await WebAssembly.instantiate(mod, {
    wasi_snapshot_preview1: wasi.exports,
  });
  expect(() => wasi.initialize(instance)).toThrow("no _initialize found.");
});

test("invalid poll fd.", async () => {
  if (!mod) {
    throw new Error();
  }

  const wasi = new Wasi({
    netFactory: () => Promise.reject("stub"),
    crypto: webcrypto as unknown as Crypto,
  });

  const instance = await WebAssembly.instantiate(mod, {
    wasi_snapshot_preview1: wasi.exports,
  });
  wasi.initialize(instance);

  await expect(wasi.poll([-1])).rejects.toThrow("invalid fd.");
});

test("clock_time_get", async () => {
  if (!mod) {
    throw new Error();
  }

  const wasi = new Wasi({
    netFactory: () => Promise.reject("stub"),
    crypto: webcrypto as unknown as Crypto,
  });

  const instance = await WebAssembly.instantiate(mod, {
    wasi_snapshot_preview1: wasi.exports,
  });
  wasi.initialize(instance);

  const { clock_gettime, malloc, free, memory } = instance.exports;
  if (typeof clock_gettime !== "function") {
    throw new Error();
  }
  if (typeof malloc !== "function") {
    throw new Error();
  }
  if (typeof free !== "function") {
    throw new Error();
  }
  if (!(memory instanceof WebAssembly.Memory)) {
    throw new Error();
  }

  const tp = malloc(16);
  if (!tp) {
    throw new Error();
  }
  try {
    const r = clock_gettime(0, tp);
    expect(r).toBe(0);
    const tv_sec = new DataView(memory.buffer).getBigUint64(tp + 0, true);
    expect(tv_sec).toBeGreaterThan(0);
    const tv_nsec = new DataView(memory.buffer).getInt32(tp + 8, true);
    expect(tv_nsec).toBeGreaterThanOrEqual(0);
    expect(tv_nsec).toBeLessThan(1000_000_000n);
  } finally {
    free(tp);
  }
});

test("fd_fdstat_get", async () => {
  if (!mod) {
    throw new Error();
  }

  const wasi = new Wasi({
    netFactory: () => Promise.reject("stub"),
    crypto: webcrypto as unknown as Crypto,
  });
  const instance = await WebAssembly.instantiate(mod, {
    wasi_snapshot_preview1: wasi.exports,
  });
  wasi.initialize(instance);

  const { fcntl, memory, malloc, free, open, close } = instance.exports;
  if (typeof fcntl !== "function") {
    throw new Error();
  }
  if (typeof malloc !== "function") {
    throw new Error();
  }
  if (typeof free !== "function") {
    throw new Error();
  }
  if (typeof open !== "function") {
    throw new Error();
  }
  if (typeof close !== "function") {
    throw new Error();
  }
  if (!(memory instanceof WebAssembly.Memory)) {
    throw new Error();
  }

  {
    const r = fcntl(0, 3/*F_GETFL*/);
    expect(r).toBe(-1);
  }

  const fname = new TextEncoder().encode("/dev/urandom\0");
  const pfname = malloc(fname.byteLength);
  if (!pfname) {
    throw new Error();
  }
  new Uint8Array(memory.buffer, pfname, fname.byteLength).set(fname);
  const fd = open(pfname, 0x0400_0000);
  const r = fcntl(fd, 3/*F_GETFL*/);
  expect(r).toBe(0x0400_0000 /*O_RDONLY*/);
  close(fd);
});

test("fd_filestat_get", async () => {
  if (!mod) {
    throw new Error();
  }

  const wasi = new Wasi({
    netFactory: () => Promise.reject("stub"),
    crypto: webcrypto as unknown as Crypto,
  });
  const instance = await WebAssembly.instantiate(mod, {
    wasi_snapshot_preview1: wasi.exports,
  });
  wasi.initialize(instance);

  const { fcntl, memory, malloc, free, open, close, fstat } = instance.exports;
  if (typeof fcntl !== "function") {
    throw new Error();
  }
  if (typeof malloc !== "function") {
    throw new Error();
  }
  if (typeof free !== "function") {
    throw new Error();
  }
  if (typeof open !== "function") {
    throw new Error();
  }
  if (typeof close !== "function") {
    throw new Error();
  }
  if (typeof fstat !== "function") {
    throw new Error();
  }
  if (!(memory instanceof WebAssembly.Memory)) {
    throw new Error();
  }

  const fname = new TextEncoder().encode("/dev/urandom\0");
  const pfname = malloc(fname.byteLength);
  if (!pfname) {
    throw new Error();
  }
  new Uint8Array(memory.buffer, pfname, fname.byteLength).set(fname);
  const fd = open(pfname, 0x0400_0000);
  const stat = malloc(144);
  const r = fstat(fd, stat);
  expect(r).toBe(0);
  close(fd);
});

test("fd_filestat_get fail", async () => {
  if (!mod) {
    throw new Error();
  }

  const wasi = new Wasi({
    netFactory: () => Promise.reject("stub"),
    crypto: webcrypto as unknown as Crypto,
  });
  const instance = await WebAssembly.instantiate(mod, {
    wasi_snapshot_preview1: wasi.exports,
  });
  wasi.initialize(instance);

  const { fcntl, memory, malloc, free, open, close, fstat } = instance.exports;
  if (typeof fcntl !== "function") {
    throw new Error();
  }
  if (typeof malloc !== "function") {
    throw new Error();
  }
  if (typeof free !== "function") {
    throw new Error();
  }
  if (typeof open !== "function") {
    throw new Error();
  }
  if (typeof close !== "function") {
    throw new Error();
  }
  if (typeof fstat !== "function") {
    throw new Error();
  }
  if (!(memory instanceof WebAssembly.Memory)) {
    throw new Error();
  }

  const r = fstat(-1, 0);
  expect(r).toBe(-1);
});

test("fd_read", async () => {
  if (!mod) {
    throw new Error();
  }

  const wasi = new Wasi({
    netFactory: () => Promise.reject("stub"),
    crypto: webcrypto as unknown as Crypto,
  });
  const instance = await WebAssembly.instantiate(mod, {
    wasi_snapshot_preview1: wasi.exports,
  });
  wasi.initialize(instance);

  const { fcntl, memory, malloc, free, open, close, read } = instance.exports;
  if (typeof fcntl !== "function") {
    throw new Error();
  }
  if (typeof malloc !== "function") {
    throw new Error();
  }
  if (typeof free !== "function") {
    throw new Error();
  }
  if (typeof open !== "function") {
    throw new Error();
  }
  if (typeof close !== "function") {
    throw new Error();
  }
  if (typeof read !== "function") {
    throw new Error();
  }
  if (!(memory instanceof WebAssembly.Memory)) {
    throw new Error();
  }

  const fname = new TextEncoder().encode("/dev/urandom\0");
  const pfname = malloc(fname.byteLength);
  if (!pfname) {
    throw new Error();
  }
  new Uint8Array(memory.buffer, pfname, fname.byteLength).set(fname);
  const fd = open(pfname, 0x0400_0000);
  const buf = malloc(8 * 1024);
  for (const b of new Uint8Array(memory.buffer, buf, 8 * 1024)) {
    expect(b).toBe(0);
  }
  const r = read(fd, buf, 8 * 1024);
  expect(new Uint8Array(memory.buffer, buf, 8 * 1024).every(v => v === 0)).toBe(false);
  expect(r).toBe(8 * 1024);
  close(fd);
});

test("path_open", async () => {
  if (!mod) {
    throw new Error();
  }

  const wasi = new Wasi({
    netFactory: () => Promise.reject("stub"),
    crypto: webcrypto as unknown as Crypto,
  });
  const instance = await WebAssembly.instantiate(mod, {
    wasi_snapshot_preview1: wasi.exports,
  });
  wasi.initialize(instance);

  const { fcntl, memory, malloc, free, open, close, read } = instance.exports;
  if (typeof fcntl !== "function") {
    throw new Error();
  }
  if (typeof malloc !== "function") {
    throw new Error();
  }
  if (typeof free !== "function") {
    throw new Error();
  }
  if (typeof open !== "function") {
    throw new Error();
  }
  if (typeof close !== "function") {
    throw new Error();
  }
  if (typeof read !== "function") {
    throw new Error();
  }
  if (!(memory instanceof WebAssembly.Memory)) {
    throw new Error();
  }

  const fname = new TextEncoder().encode("/dev/urandom\0");
  const pfname = malloc(fname.byteLength);
  if (!pfname) {
    throw new Error();
  }
  new Uint8Array(memory.buffer, pfname, fname.byteLength).set(fname);
  const fd = open(pfname, 0x0400_0000);
  expect(fd).not.toBe(-1);
  close(fd);
});

test("path_open fail", async () => {
  if (!mod) {
    throw new Error();
  }

  const wasi = new Wasi({
    netFactory: () => Promise.reject("stub"),
    crypto: webcrypto as unknown as Crypto,
  });
  const instance = await WebAssembly.instantiate(mod, {
    wasi_snapshot_preview1: wasi.exports,
  });
  wasi.initialize(instance);

  const { fcntl, memory, malloc, free, open, close, read } = instance.exports;
  if (typeof fcntl !== "function") {
    throw new Error();
  }
  if (typeof malloc !== "function") {
    throw new Error();
  }
  if (typeof free !== "function") {
    throw new Error();
  }
  if (typeof open !== "function") {
    throw new Error();
  }
  if (typeof close !== "function") {
    throw new Error();
  }
  if (typeof read !== "function") {
    throw new Error();
  }
  if (!(memory instanceof WebAssembly.Memory)) {
    throw new Error();
  }

  const fname = new TextEncoder().encode("/dev/cpuinfo\0");
  const pfname = malloc(fname.byteLength);
  if (!pfname) {
    throw new Error();
  }
  new Uint8Array(memory.buffer, pfname, fname.byteLength).set(fname);
  const fd = open(pfname, 0x0400_0000);
  expect(fd).toBe(-1);
  close(fd);
});

test("path_open invalid tcp name", async () => {
  if (!mod) {
    throw new Error();
  }

  const wasi = new Wasi({
    netFactory: () => Promise.reject("stub"),
    crypto: webcrypto as unknown as Crypto,
  });
  const instance = await WebAssembly.instantiate(mod, {
    wasi_snapshot_preview1: wasi.exports,
  });
  wasi.initialize(instance);

  const { fcntl, memory, malloc, free, open, close, read } = instance.exports;
  if (typeof fcntl !== "function") {
    throw new Error();
  }
  if (typeof malloc !== "function") {
    throw new Error();
  }
  if (typeof free !== "function") {
    throw new Error();
  }
  if (typeof open !== "function") {
    throw new Error();
  }
  if (typeof close !== "function") {
    throw new Error();
  }
  if (typeof read !== "function") {
    throw new Error();
  }
  if (!(memory instanceof WebAssembly.Memory)) {
    throw new Error();
  }

  const fname = new TextEncoder().encode("/dev/tcp/x\0");
  const pfname = malloc(fname.byteLength);
  if (!pfname) {
    throw new Error();
  }
  new Uint8Array(memory.buffer, pfname, fname.byteLength).set(fname);
  const fd = open(pfname, 0x0400_0000);
  expect(fd).toBe(-1);
  close(fd);
});

test("path_open invalid tcp name2", async () => {
  if (!mod) {
    throw new Error();
  }

  const wasi = new Wasi({
    netFactory: () => Promise.reject("stub"),
    crypto: webcrypto as unknown as Crypto,
  });
  const instance = await WebAssembly.instantiate(mod, {
    wasi_snapshot_preview1: wasi.exports,
  });
  wasi.initialize(instance);

  const { fcntl, memory, malloc, free, open, close, read } = instance.exports;
  if (typeof fcntl !== "function") {
    throw new Error();
  }
  if (typeof malloc !== "function") {
    throw new Error();
  }
  if (typeof free !== "function") {
    throw new Error();
  }
  if (typeof open !== "function") {
    throw new Error();
  }
  if (typeof close !== "function") {
    throw new Error();
  }
  if (typeof read !== "function") {
    throw new Error();
  }
  if (!(memory instanceof WebAssembly.Memory)) {
    throw new Error();
  }

  const fname = new TextEncoder().encode("/dev/tcp/x:x\0");
  const pfname = malloc(fname.byteLength);
  if (!pfname) {
    throw new Error();
  }
  new Uint8Array(memory.buffer, pfname, fname.byteLength).set(fname);
  const fd = open(pfname, 0x0400_0000);
  expect(fd).toBe(-1);
  close(fd);
});

test("fd_read fail", async () => {
  if (!mod) {
    throw new Error();
  }

  const wasi = new Wasi({
    netFactory: () => Promise.reject("stub"),
    crypto: webcrypto as unknown as Crypto,
  });
  const instance = await WebAssembly.instantiate(mod, {
    wasi_snapshot_preview1: wasi.exports,
  });
  wasi.initialize(instance);

  const { fcntl, memory, malloc, free, open, close, read } = instance.exports;
  if (typeof fcntl !== "function") {
    throw new Error();
  }
  if (typeof malloc !== "function") {
    throw new Error();
  }
  if (typeof free !== "function") {
    throw new Error();
  }
  if (typeof open !== "function") {
    throw new Error();
  }
  if (typeof close !== "function") {
    throw new Error();
  }
  if (typeof read !== "function") {
    throw new Error();
  }
  if (!(memory instanceof WebAssembly.Memory)) {
    throw new Error();
  }

  const r = read(-1, 0, 0);
  expect(r).toBe(-1);
});

test("fd_close urandom", async () => {
  if (!mod) {
    throw new Error();
  }

  const wasi = new Wasi({
    netFactory: () => Promise.reject("stub"),
    crypto: webcrypto as unknown as Crypto,
  });
  const instance = await WebAssembly.instantiate(mod, {
    wasi_snapshot_preview1: wasi.exports,
  });
  wasi.initialize(instance);

  const { fcntl, memory, malloc, free, open, close, read } = instance.exports;
  if (typeof fcntl !== "function") {
    throw new Error();
  }
  if (typeof malloc !== "function") {
    throw new Error();
  }
  if (typeof free !== "function") {
    throw new Error();
  }
  if (typeof open !== "function") {
    throw new Error();
  }
  if (typeof close !== "function") {
    throw new Error();
  }
  if (typeof read !== "function") {
    throw new Error();
  }
  if (!(memory instanceof WebAssembly.Memory)) {
    throw new Error();
  }

  const fname = new TextEncoder().encode("/dev/urandom\0");
  const pfname = malloc(fname.byteLength);
  if (!pfname) {
    throw new Error();
  }
  new Uint8Array(memory.buffer, pfname, fname.byteLength).set(fname);
  const fd = open(pfname, 0x0400_0000);
  expect(fd).not.toBe(-1);
  const r = close(fd);
  expect(r).not.toBe(-1);
});

test("fd_close sock connecting", async () => {
  if (!mod) {
    throw new Error();
  }

  const rs = newUint8ArrayReadableStream(new Uint8Array());
  const ws = newUint8ArrayWritableStream([]);
  const wasi = new Wasi({
    netFactory: () => Promise.resolve([rs, ws]),
    crypto: webcrypto as unknown as Crypto,
  });
  const instance = await WebAssembly.instantiate(mod, {
    wasi_snapshot_preview1: wasi.exports,
  });
  wasi.initialize(instance);

  const { fcntl, memory, malloc, free, open, close, read } = instance.exports;
  if (typeof fcntl !== "function") {
    throw new Error();
  }
  if (typeof malloc !== "function") {
    throw new Error();
  }
  if (typeof free !== "function") {
    throw new Error();
  }
  if (typeof open !== "function") {
    throw new Error();
  }
  if (typeof close !== "function") {
    throw new Error();
  }
  if (typeof read !== "function") {
    throw new Error();
  }
  if (!(memory instanceof WebAssembly.Memory)) {
    throw new Error();
  }

  const fname = new TextEncoder().encode("/dev/tcp/x:0\0");
  const pfname = malloc(fname.byteLength);
  if (!pfname) {
    throw new Error();
  }
  new Uint8Array(memory.buffer, pfname, fname.byteLength).set(fname);
  const fd = open(pfname, 0x0400_0000);
  expect(fd).not.toBe(-1);
  const r = close(fd);
  expect(r).not.toBe(-1);
});

test("fd_close sock idle", async () => {
  if (!mod) {
    throw new Error();
  }

  const rs = newUint8ArrayReadableStream(new Uint8Array());
  const ws = newUint8ArrayWritableStream([]);
  const wasi = new Wasi({
    netFactory: () => Promise.resolve([rs, ws]),
    crypto: webcrypto as unknown as Crypto,
  });
  const instance = await WebAssembly.instantiate(mod, {
    wasi_snapshot_preview1: wasi.exports,
  });
  wasi.initialize(instance);

  const { fcntl, memory, malloc, free, open, close, read } = instance.exports;
  if (typeof fcntl !== "function") {
    throw new Error();
  }
  if (typeof malloc !== "function") {
    throw new Error();
  }
  if (typeof free !== "function") {
    throw new Error();
  }
  if (typeof open !== "function") {
    throw new Error();
  }
  if (typeof close !== "function") {
    throw new Error();
  }
  if (typeof read !== "function") {
    throw new Error();
  }
  if (!(memory instanceof WebAssembly.Memory)) {
    throw new Error();
  }

  const fname = new TextEncoder().encode("/dev/tcp/x:0\0");
  const pfname = malloc(fname.byteLength);
  if (!pfname) {
    throw new Error();
  }
  new Uint8Array(memory.buffer, pfname, fname.byteLength).set(fname);
  const fd = open(pfname, 0x0400_0000);
  expect(fd).not.toBe(-1);
  await wasi.poll([fd]);
  const r = close(fd);
  expect(r).not.toBe(-1);
});

test("fd_close sock busy", async () => {
  if (!mod) {
    throw new Error();
  }

  const rs = newUint8ArrayReadableStream(new Uint8Array());
  const ws = newUint8ArrayWritableStream([]);
  const wasi = new Wasi({
    netFactory: () => Promise.resolve([rs, ws]),
    crypto: webcrypto as unknown as Crypto,
  });
  const instance = await WebAssembly.instantiate(mod, {
    wasi_snapshot_preview1: wasi.exports,
  });
  wasi.initialize(instance);

  const { fcntl, memory, malloc, free, open, close, recv, send } = instance.exports;
  if (typeof fcntl !== "function") {
    throw new Error();
  }
  if (typeof malloc !== "function") {
    throw new Error();
  }
  if (typeof free !== "function") {
    throw new Error();
  }
  if (typeof open !== "function") {
    throw new Error();
  }
  if (typeof close !== "function") {
    throw new Error();
  }
  if (typeof recv !== "function") {
    throw new Error();
  }
  if (typeof send !== "function") {
    throw new Error();
  }
  if (!(memory instanceof WebAssembly.Memory)) {
    throw new Error();
  }

  const fname = new TextEncoder().encode("/dev/tcp/x:0\0");
  const pfname = malloc(fname.byteLength);
  if (!pfname) {
    throw new Error();
  }
  new Uint8Array(memory.buffer, pfname, fname.byteLength).set(fname);
  const fd = open(pfname, 0x0400_0000);
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

test("sock_recv", async () => {
  if (!mod) {
    throw new Error();
  }

  const rs = newUint8ArrayReadableStream(new Uint8Array(new TextEncoder().encode("Hello")));
  const ws = newUint8ArrayWritableStream([]);
  const wasi = new Wasi({
    netFactory: () => Promise.resolve([rs, ws]),
    crypto: webcrypto as unknown as Crypto,
  });
  const instance = await WebAssembly.instantiate(mod, {
    wasi_snapshot_preview1: wasi.exports,
  });
  wasi.initialize(instance);

  const { fcntl, memory, malloc, free, open, close, recv, send, errno } = instance.exports;
  if (typeof fcntl !== "function") {
    throw new Error();
  }
  if (typeof malloc !== "function") {
    throw new Error();
  }
  if (typeof free !== "function") {
    throw new Error();
  }
  if (typeof open !== "function") {
    throw new Error();
  }
  if (typeof close !== "function") {
    throw new Error();
  }
  if (typeof recv !== "function") {
    throw new Error();
  }
  if (typeof send !== "function") {
    throw new Error();
  }
  if (!(memory instanceof WebAssembly.Memory)) {
    throw new Error();
  }
  if (!(errno instanceof WebAssembly.Global)) {
    throw new Error();
  }

  const fname = new TextEncoder().encode("/dev/tcp/x:0\0");
  const pfname = malloc(fname.byteLength);
  if (!pfname) {
    throw new Error();
  }
  new Uint8Array(memory.buffer, pfname, fname.byteLength).set(fname);
  const fd = open(pfname, 0x0400_0000);
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

test("sock_recv error", async () => {
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
    crypto: webcrypto as unknown as Crypto,
  });
  const instance = await WebAssembly.instantiate(mod, {
    wasi_snapshot_preview1: wasi.exports,
  });
  wasi.initialize(instance);

  const { fcntl, memory, malloc, free, open, close, recv, send, errno } = instance.exports;
  if (typeof fcntl !== "function") {
    throw new Error();
  }
  if (typeof malloc !== "function") {
    throw new Error();
  }
  if (typeof free !== "function") {
    throw new Error();
  }
  if (typeof open !== "function") {
    throw new Error();
  }
  if (typeof close !== "function") {
    throw new Error();
  }
  if (typeof recv !== "function") {
    throw new Error();
  }
  if (typeof send !== "function") {
    throw new Error();
  }
  if (!(memory instanceof WebAssembly.Memory)) {
    throw new Error();
  }
  if (!(errno instanceof WebAssembly.Global)) {
    throw new Error();
  }

  const fname = new TextEncoder().encode("/dev/tcp/x:0\0");
  const pfname = malloc(fname.byteLength);
  if (!pfname) {
    throw new Error();
  }
  new Uint8Array(memory.buffer, pfname, fname.byteLength).set(fname);
  const fd = open(pfname, 0x0400_0000);
  expect(fd).not.toBe(-1);
  const buf = malloc(5);

  expect(recv(fd, buf, 5, 0)).toBe(-1); // connecting EAGAIN
  await wasi.poll([fd]);
  expect(recv(fd, buf, 5, 0)).toBe(-1); // idle -> reading EAGAIN
  await wasi.poll([fd]);
  expect(recv(fd, buf, 5, 0)).toBe(-1); // idle -> reading
});

test("sock_recv invalid", async () => {
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
    crypto: webcrypto as unknown as Crypto,
  });
  const instance = await WebAssembly.instantiate(mod, {
    wasi_snapshot_preview1: wasi.exports,
  });
  wasi.initialize(instance);

  const { fcntl, memory, malloc, free, open, close, recv, send, errno } = instance.exports;
  if (typeof fcntl !== "function") {
    throw new Error();
  }
  if (typeof malloc !== "function") {
    throw new Error();
  }
  if (typeof free !== "function") {
    throw new Error();
  }
  if (typeof open !== "function") {
    throw new Error();
  }
  if (typeof close !== "function") {
    throw new Error();
  }
  if (typeof recv !== "function") {
    throw new Error();
  }
  if (typeof send !== "function") {
    throw new Error();
  }
  if (!(memory instanceof WebAssembly.Memory)) {
    throw new Error();
  }
  if (!(errno instanceof WebAssembly.Global)) {
    throw new Error();
  }

  const fname = new TextEncoder().encode("/dev/urandom\0");
  const pfname = malloc(fname.byteLength);
  if (!pfname) {
    throw new Error();
  }
  new Uint8Array(memory.buffer, pfname, fname.byteLength).set(fname);
  const fd = open(pfname, 0x0400_0000);
  expect(fd).not.toBe(-1);
  const buf = malloc(5);

  expect(recv(-1, buf, 5, 0)).toBe(-1); // EINVAL
  expect(recv(fd, buf, 5, 0)).toBe(-1); // EINVAL
});

test("sock_send", async () => {
  if (!mod) {
    throw new Error();
  }

  const rs = newUint8ArrayReadableStream(new Uint8Array());
  const ws = newUint8ArrayWritableStream([]);
  const wasi = new Wasi({
    netFactory: () => Promise.resolve([rs, ws]),
    crypto: webcrypto as unknown as Crypto,
  });
  const instance = await WebAssembly.instantiate(mod, {
    wasi_snapshot_preview1: wasi.exports,
  });
  wasi.initialize(instance);

  const { fcntl, memory, malloc, free, open, close, recv, send, errno } = instance.exports;
  if (typeof fcntl !== "function") {
    throw new Error();
  }
  if (typeof malloc !== "function") {
    throw new Error();
  }
  if (typeof free !== "function") {
    throw new Error();
  }
  if (typeof open !== "function") {
    throw new Error();
  }
  if (typeof close !== "function") {
    throw new Error();
  }
  if (typeof recv !== "function") {
    throw new Error();
  }
  if (typeof send !== "function") {
    throw new Error();
  }
  if (!(memory instanceof WebAssembly.Memory)) {
    throw new Error();
  }
  if (!(errno instanceof WebAssembly.Global)) {
    throw new Error();
  }

  const fname = new TextEncoder().encode("/dev/tcp/x:0\0");
  const pfname = malloc(fname.byteLength);
  if (!pfname) {
    throw new Error();
  }
  new Uint8Array(memory.buffer, pfname, fname.byteLength).set(fname);
  const fd = open(pfname, 0x0400_0000);
  expect(fd).not.toBe(-1);
  const buf = malloc(1024 * 8 * 2);

  expect(send(fd, buf, 1024 * 8 * 2, 0)).toBe(-1); // connecting EAGAIN
  await wasi.poll([fd]);
  expect(send(fd, buf, 1024 * 8 * 2, 0)).toBe(-1); // idle -> writing EAGAIN
  await wasi.poll([fd]);
  expect(send(fd, buf, 1024 * 8 * 2, 0)).toBe(1024 * 8); // idle
});

test("sock_send error", async () => {
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
    crypto: webcrypto as unknown as Crypto,
  });
  const instance = await WebAssembly.instantiate(mod, {
    wasi_snapshot_preview1: wasi.exports,
  });
  wasi.initialize(instance);

  const { fcntl, memory, malloc, free, open, close, recv, send, errno } = instance.exports;
  if (typeof fcntl !== "function") {
    throw new Error();
  }
  if (typeof malloc !== "function") {
    throw new Error();
  }
  if (typeof free !== "function") {
    throw new Error();
  }
  if (typeof open !== "function") {
    throw new Error();
  }
  if (typeof close !== "function") {
    throw new Error();
  }
  if (typeof recv !== "function") {
    throw new Error();
  }
  if (typeof send !== "function") {
    throw new Error();
  }
  if (!(memory instanceof WebAssembly.Memory)) {
    throw new Error();
  }
  if (!(errno instanceof WebAssembly.Global)) {
    throw new Error();
  }

  const fname = new TextEncoder().encode("/dev/tcp/x:0\0");
  const pfname = malloc(fname.byteLength);
  if (!pfname) {
    throw new Error();
  }
  new Uint8Array(memory.buffer, pfname, fname.byteLength).set(fname);
  const fd = open(pfname, 0x0400_0000);
  expect(fd).not.toBe(-1);
  const buf = malloc(1024 * 8 * 2);

  expect(send(fd, buf, 1024 * 8 * 2, 0)).toBe(-1); // connecting EAGAIN
  await wasi.poll([fd]);
  expect(send(fd, buf, 1024 * 8 * 2, 0)).toBe(-1); // idle -> writing EAGAIN
  await wasi.poll([fd]);
  expect(send(fd, buf, 1024 * 8 * 2, 0)).toBe(-1); // error
});

test("sock_send invalid", async () => {
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
    crypto: webcrypto as unknown as Crypto,
  });
  const instance = await WebAssembly.instantiate(mod, {
    wasi_snapshot_preview1: wasi.exports,
  });
  wasi.initialize(instance);

  const { fcntl, memory, malloc, free, open, close, recv, send, errno } = instance.exports;
  if (typeof fcntl !== "function") {
    throw new Error();
  }
  if (typeof malloc !== "function") {
    throw new Error();
  }
  if (typeof free !== "function") {
    throw new Error();
  }
  if (typeof open !== "function") {
    throw new Error();
  }
  if (typeof close !== "function") {
    throw new Error();
  }
  if (typeof recv !== "function") {
    throw new Error();
  }
  if (typeof send !== "function") {
    throw new Error();
  }
  if (!(memory instanceof WebAssembly.Memory)) {
    throw new Error();
  }
  if (!(errno instanceof WebAssembly.Global)) {
    throw new Error();
  }

  const fname = new TextEncoder().encode("/dev/urandom\0");
  const pfname = malloc(fname.byteLength);
  if (!pfname) {
    throw new Error();
  }
  new Uint8Array(memory.buffer, pfname, fname.byteLength).set(fname);
  const fd = open(pfname, 0x0400_0000);
  expect(fd).not.toBe(-1);
  const buf = malloc(1024 * 8 * 2);

  expect(send(fd, buf, 1024 * 8 * 2, 0)).toBe(-1);
  expect(send(-1, buf, 1024 * 8 * 2, 0)).toBe(-1);
});

test("poll_oneoff", async () => {
  if (!mod) {
    throw new Error();
  }

  const reader = newUint8ArrayReadableStream(new Uint8Array());
  const writer = newUint8ArrayWritableStream([]);
  const wasi = new Wasi({
    netFactory: async (host, port) => {
      expect(host).toStrictEqual("dummy");
      expect(port).toStrictEqual(0);
      return [reader, writer];
    },
    crypto: webcrypto as unknown as Crypto,
  });
  const instance = await WebAssembly.instantiate(mod, {
    wasi_snapshot_preview1: wasi.exports,
  });
  wasi.initialize(instance);

  const { poll, memory, malloc, free, open, recv } = instance.exports;
  if (typeof poll !== "function") {
    throw new Error();
  }
  if (typeof malloc !== "function") {
    throw new Error();
  }
  if (typeof free !== "function") {
    throw new Error();
  }
  if (typeof open !== "function") {
    throw new Error();
  }
  if (typeof recv !== "function") {
    throw new Error();
  }
  if (!(memory instanceof WebAssembly.Memory)) {
    throw new Error();
  }

  const path = new TextEncoder().encode("/dev/tcp/dummy:0");
  const ppath = malloc(path.byteLength);
  new Uint8Array(memory.buffer, ppath, path.byteLength).set(path);
  const fd = open(ppath, 0x0400_0000);
  if (fd < 0) {
    throw new Error(`err ${fd}`);
  }
  const fds = malloc(8);
  ((v: DataView) => {
    v.setInt32(0, fd, true); // fd
    v.setInt16(4, 0x001 | 0x002, true); // events POLLIN | POLLOUT
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
  if (!buf) {
    throw new Error();
  }

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
