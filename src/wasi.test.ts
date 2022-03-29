import { spawn } from "child_process";
import { fileURLToPath } from "url";
import { readFile } from "fs/promises";
//import { ReadableStream, WritableStream } from "stream/web";
import { webcrypto } from "crypto";

import Wasi from "./wasi";

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

/*
function newUint8ArrayReadableStream(buf: Uint8Array): ReadableStream<Uint8Array> {
  buf = buf.slice();

  return new ReadableStream({
  });
}

function newUint8ArrayWritableStream(buf: Uint8Array): WritableStream<Uint8Array> {
  buf = buf.slice();

  return new WritableStream({
  });
}
*/

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

test("poll_oneoff", async () => {
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

  const { poll, memory, malloc, free } = instance.exports;
  if (typeof poll !== "function") {
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

  const r = poll(null, 0, -1);
  expect(r).toBe(0);
});
