import net from "net";
import fs from "fs/promises";
import { ReadableStream, WritableStream } from "stream/web";
import { webcrypto } from "crypto";

import { newLibssh2 } from "./src/libssh2";

const libssh2 = await newLibssh2({
  async fetcher() {
    return fs.readFile(new URL("./libssh2.wasm", import.meta.url));
  },
  async netFactory(host, port) {
    const sock = net.createConnection(port, host);
    sock.pause();

    const reader = new ReadableStream({
      start(controller) {
        sock.on("data", data => {
          controller.enqueue(data);
          sock.pause();
        });
        sock.on("error", err => {
          controller.error(err);
        });
        sock.on("close", () => {
          controller.close();
        });
      },
      pull() {
        sock.resume();
      },
      type: "bytes",
    });

    const writer = new WritableStream({
      write(chunk) {
        return new Promise((resolve, reject) => {
          sock.write(chunk, (err) => {
            if (err) {
              return reject(err);
            }
            resolve();
          });
        });
      },

      close() {
        return new Promise(resolve => {
          sock.end(resolve);
        });
      },
    });

    return [reader, writer];
  },
  crypto: webcrypto as any as Crypto, // TODO
  ReadableStream: ReadableStream,
  WritableStream: WritableStream as any, // TODO not compatible
});

const session = await libssh2.connect({
  host: "localhost",
  port: 2222,
  knownhosts: [
    "[localhost]:2222 ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIMdYZGgT+jpoNO4HLbRPzAgDzApC1ASA8MI9qV4Mn9Z6",
  ],
  username: "yskszk63",
  privatekey: () => fs.readFile(new URL("./test_id_ed25519", import.meta.url)),
});
try {
  //const channel = await session.exec("false");
  const channel = await session.exec("cat");
  try {
    const { stdin, stdout, stderr } = channel;

    const t1 = stdout.pipeTo(new WritableStream<Uint8Array>({
      write(chunk) {
        return new Promise((resolve, reject) => {
          process.stdout.write(chunk, (err) => {
            if (err) {
              reject(err);
            }
            resolve();
          });
        });
      },
    }));

    const t2 = stderr.pipeTo(new WritableStream<Uint8Array>({
      write(chunk) {
        return new Promise((resolve, reject) => {
          process.stderr.write(chunk, (err) => {
            if (err) {
              reject(err);
            }
            resolve();
          });
        });
      },
    }));

    if (process.stdin.unref) {
      process.stdin.unref();
    }
    new ReadableStream<Uint8Array>({
      start(controller) {
        process.stdin.pause();
        process.stdin.on("data", (data) => {
          controller.enqueue(data);
          process.stdin.pause();
        });
        process.stdin.on("end", () => {
          controller.close();
        });
        process.stdin.on("error", (err) => {
          controller.error(err);
        });
      },

      pull() {
        process.stdin.resume();
      },
    }).pipeTo(stdin);

    await Promise.all([t1, t2, channel.waitEof()]);
    console.log(channel.status);

  } finally {
    await channel.close();
    channel.free();
  }

} finally {
  await session.disconnect();
  session.close();
  session.free();
}