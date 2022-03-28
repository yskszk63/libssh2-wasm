import net from "net";
import fs from "fs/promises";
import { ReadableStream, WritableStream } from "stream/web";
import { webcrypto } from "crypto";

import { newLibssh2 } from "./libssh2";
import type {
  ConnectOpts,
} from "./libssh2";

export type {
  ConnectOpts,
} from "./libssh2";

const libssh2 = await newLibssh2({
  async fetcher() {
    return fs.readFile(new URL("../libssh2.wasm", import.meta.url));
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

export function connect(opts: ConnectOpts) {
  return libssh2.connect(opts);
}
