import { spawn } from "child_process";
import { fileURLToPath } from "url";
import fs from "fs/promises";
import net from "net";
import { ReadableStream, WritableStream } from "stream/web";
import { webcrypto } from "crypto";
import path from "path";

import { newLibssh2 } from "./libssh2.js";

const crypto = webcrypto as unknown as Crypto;

let container: undefined | {
  id: string
  ipaddr: string
};

async function docker(args: string[], capture: true): Promise<string>
async function docker(args: string[], capture: false): Promise<void>
async function docker(args: string[]): Promise<void>
async function docker(args: string[], capture: boolean | undefined = false): Promise<string | void> {
  const proc = spawn("docker", args, {
    stdio: capture ? ["ignore", "pipe", "inherit"]: "ignore",
  });

  const buf: string[] = [];
  if (capture) {
    if (!proc.stdout) {
      throw new Error(); // unreachable
    }
    const decoder = new TextDecoder();
    proc.stdout.on("data", (chunk) => {
      buf.push(decoder.decode(chunk, { stream: true }));
    });
  }

  const result = await new Promise<number>((resolve, reject) => {
    proc.on("exit", resolve);
    proc.on("error", reject);
  });
  if (result) {
    throw new Error(`failed ${result}: docker ${args.join(" ")}`);
  }

  if (!capture) {
    return;
  }
  return buf.join("").trimEnd();
}

beforeAll(async () => {
  const dir = fileURLToPath(new URL("./libssh2.test/", import.meta.url));
  await docker(["buildx", "build", dir, "-t", "libssh2-test-sshd"]);
  const name = await docker(["run", "--rm", "-d", "libssh2-test-sshd"], true);
  const ipaddr = await docker(["inspect", "-f", "{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}", name], true);

  container = {
    id: name,
    ipaddr,
  }
}, 60 * 1000);

afterAll(async () => {
  if (typeof container === "undefined") {
    return;
  }
  await docker(["kill", container.id]);
});

async function cc(src: string): Promise<Uint8Array> {
  const cc = path.join(process.env["WASI_SDK_ROOT"] ?? "/opt/wasi-sdk", "/bin/clang");
  const tmpdir = await fs.mkdtemp("");
  try {
    const c = path.join(tmpdir, "c.c");
    const exe = path.join(tmpdir, "a.out");
    await fs.writeFile(c, src);

    const proc = spawn(cc, [ "-mexec-model=reactor", "-o", exe, c ], { stdio: ["ignore", "inherit", "inherit"] });
    const result = await new Promise((resolve, reject) => {
      proc.on("exit", resolve);
      proc.on("error", reject);
    });
    if (result !== 0) {
      throw new Error();
    }
    return await fs.readFile(exe);
  } finally {
    await fs.rm(tmpdir, { recursive: true });
  }
}

function fetcher(){
  return fs.readFile(new URL("../libssh2.wasm", import.meta.url));
}

function netFactory(host: string, port: number): Promise<[ReadableStream<Uint8Array>, WritableStream<Uint8Array>]> {
  const sock = net.createConnection(port, host);
  sock.pause();

  let release: (() => void) | undefined;
  const reader = new ReadableStream({
    start(controller) {
      sock.on("data", ondata);
      sock.on("error", onerror);
      sock.on("close", onclose);

      release = () => {
        sock.off("data", ondata);
        sock.off("error", onerror);
        sock.off("close", onclose);
      }

      function ondata(data: Uint8Array) {
        controller.enqueue(data);
        sock.pause();
      }
      function onerror(err: unknown) {
        controller.error(err);
      }
      function onclose() {
        controller.close();
      }
    },
    pull() {
      sock.resume();
    },
    cancel() {
      if (release) {
        release();
      }
      release = void 0;
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

  return Promise.resolve([reader, writer]);
}

describe("newLibssh2", () => {
  test("success", async () => {
    await newLibssh2({
      fetcher,
      netFactory,
      crypto,
      ReadableStream,
      WritableStream: WritableStream as unknown as typeof globalThis.WritableStream, // TODO
    });
  });

  test("missing exports", async () => {
    const t = newLibssh2({
      fetcher: () => cc("/*empty*/"),
      netFactory,
      crypto,
      ReadableStream,
      WritableStream: WritableStream as unknown as typeof globalThis.WritableStream, // TODO
    });
    await expect(t).rejects.toThrowError("Missing exported function");
  });
});

describe("Session.connect", () => {
  test("success", async () => {
    if (!container) {
      throw new Error();
    }

    const lib = await newLibssh2({
      fetcher,
      netFactory,
      crypto,
      ReadableStream,
      WritableStream: WritableStream as unknown as typeof globalThis.WritableStream, // TODO
    });
    const session = await lib.connect({
      host: container.ipaddr,
      knownhost: `${container.ipaddr} ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAINN5qBcVhQt0gPmGxgsxgt9429S74QH/LWGuHjVBPZ9p`,
      username: "root",
      privatekey: () => fs.readFile(new URL("./libssh2.test/id_ed25519", import.meta.url)),
    });
    await session.disconnect();
    session.close(); // TODO
    session.free(); // TODO
  });

  test("host key mismatch", async () => {
    if (!container) {
      throw new Error();
    }

    const lib = await newLibssh2({
      fetcher,
      netFactory,
      crypto,
      ReadableStream,
      WritableStream: WritableStream as unknown as typeof globalThis.WritableStream, // TODO
    });
    const result = lib.connect({
      host: container.ipaddr,
      knownhost: `${container.ipaddr} ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIFMy8Wg7bxkeS/C56sIuN5KaXPwujbtv1I/R6ZYm27Km`,
      username: "root",
      privatekey: () => fs.readFile(new URL("./libssh2.test/id_ed25519", import.meta.url)),
    });
    await expect(result).rejects.toThrowError("Knownhost key check mismatch");
  });

  test("host key unknown", async () => {
    if (!container) {
      throw new Error();
    }

    const lib = await newLibssh2({
      fetcher,
      netFactory,
      crypto,
      ReadableStream,
      WritableStream: WritableStream as unknown as typeof globalThis.WritableStream, // TODO
    });
    const result = lib.connect({
      host: container.ipaddr,
      knownhost: `0.0.0.0 ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAINN5qBcVhQt0gPmGxgsxgt9429S74QH/LWGuHjVBPZ9p`,
      username: "root",
      privatekey: () => fs.readFile(new URL("./libssh2.test/id_ed25519", import.meta.url)),
    });
    await expect(result).rejects.toThrowError("Knownhost key check notfound");
  });

  test("authenticate failure", async () => {
    if (!container) {
      throw new Error();
    }

    const lib = await newLibssh2({
      fetcher,
      netFactory,
      crypto,
      ReadableStream,
      WritableStream: WritableStream as unknown as typeof globalThis.WritableStream, // TODO
    });
    const result = lib.connect({
      host: container.ipaddr,
      knownhost: `${container.ipaddr} ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAINN5qBcVhQt0gPmGxgsxgt9429S74QH/LWGuHjVBPZ9p`,
      username: "rootx",
      privatekey: () => fs.readFile(new URL("./libssh2.test/id_ed25519", import.meta.url)),
    });
    await expect(result).rejects.toThrow("-18: Username/PublicKey combination invalid");
  });
});

describe("Session.exec", () => {
  test("success", async () => {
    if (!container) {
      throw new Error();
    }

    const lib = await newLibssh2({
      fetcher,
      netFactory,
      crypto,
      ReadableStream,
      WritableStream: WritableStream as unknown as typeof globalThis.WritableStream, // TODO
    });
    const session = await lib.connect({
      host: container.ipaddr,
      knownhost: `${container.ipaddr} ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAINN5qBcVhQt0gPmGxgsxgt9429S74QH/LWGuHjVBPZ9p`,
      username: "root",
      privatekey: () => fs.readFile(new URL("./libssh2.test/id_ed25519", import.meta.url)),
    });
    try {
      const channel = await session.exec("/bin/true");
      try {
        await channel.waitEof();
        expect(channel.status).toBe(0);
      } finally {
        await channel.close();
        channel.free(); // TODO
      }
    } finally {
      await session.disconnect();
      session.close(); // TODO
      session.free(); // TODO
    }
  });

  test("exit ne 0", async () => {
    if (!container) {
      throw new Error();
    }

    const lib = await newLibssh2({
      fetcher,
      netFactory,
      crypto,
      ReadableStream,
      WritableStream: WritableStream as unknown as typeof globalThis.WritableStream, // TODO
    });
    const session = await lib.connect({
      host: container.ipaddr,
      knownhost: `${container.ipaddr} ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAINN5qBcVhQt0gPmGxgsxgt9429S74QH/LWGuHjVBPZ9p`,
      username: "root",
      privatekey: () => fs.readFile(new URL("./libssh2.test/id_ed25519", import.meta.url)),
    });
    try {
      const channel = await session.exec("/bin/false");
      try {
        await channel.waitEof();
        expect(channel.status).toBe(1);
      } finally {
        await channel.close();
        channel.free(); // TODO
      }
    } finally {
      await session.disconnect();
      session.close(); // TODO
      session.free(); // TODO
    }
  });

  test("stdout", async () => {
    if (!container) {
      throw new Error();
    }

    const lib = await newLibssh2({
      fetcher,
      netFactory,
      crypto,
      ReadableStream,
      WritableStream: WritableStream as unknown as typeof globalThis.WritableStream, // TODO
    });
    const session = await lib.connect({
      host: container.ipaddr,
      knownhost: `${container.ipaddr} ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAINN5qBcVhQt0gPmGxgsxgt9429S74QH/LWGuHjVBPZ9p`,
      username: "root",
      privatekey: () => fs.readFile(new URL("./libssh2.test/id_ed25519", import.meta.url)),
    });
    try {
      const channel = await session.exec("/bin/echo -n hello");
      try {
        const { stdout } = channel;
        const chunks = [] as string[];
        const decoder = new TextDecoder();
        await stdout.pipeTo(new WritableStream({
          write(chunk) {
            chunks.push(decoder.decode(chunk, { stream: true }));
          },
          close() {
            chunks.push(decoder.decode(new Uint8Array()));
          },
        }));
        expect(chunks.join("")).toBe("hello");

        await channel.waitEof();
      } finally {
        await channel.close();
        channel.free(); // TODO
      }
    } finally {
      await session.disconnect();
      session.close(); // TODO
      session.free(); // TODO
    }
  });

  test("stderr", async () => {
    if (!container) {
      throw new Error();
    }

    const lib = await newLibssh2({
      fetcher,
      netFactory,
      crypto,
      ReadableStream,
      WritableStream: WritableStream as unknown as typeof globalThis.WritableStream, // TODO
    });
    const session = await lib.connect({
      host: container.ipaddr,
      knownhost: `${container.ipaddr} ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAINN5qBcVhQt0gPmGxgsxgt9429S74QH/LWGuHjVBPZ9p`,
      username: "root",
      privatekey: () => fs.readFile(new URL("./libssh2.test/id_ed25519", import.meta.url)),
    });
    try {
      const channel = await session.exec("/bin/bash -c '/bin/echo -n hello >&2'");
      try {
        const { stderr } = channel;
        const chunks = [] as string[];
        const decoder = new TextDecoder();
        await stderr.pipeTo(new WritableStream({
          write(chunk) {
            chunks.push(decoder.decode(chunk, { stream: true }));
          },
          close() {
            chunks.push(decoder.decode(new Uint8Array()));
          },
        }));
        expect(chunks.join("")).toBe("hello");

        await channel.waitEof();
      } finally {
        await channel.close();
        channel.free(); // TODO
      }
    } finally {
      await session.disconnect();
      session.close(); // TODO
      session.free(); // TODO
    }
  });

  test("stdin", async () => {
    if (!container) {
      throw new Error();
    }

    const lib = await newLibssh2({
      fetcher,
      netFactory,
      crypto,
      ReadableStream,
      WritableStream: WritableStream as unknown as typeof globalThis.WritableStream, // TODO
    });
    const session = await lib.connect({
      host: container.ipaddr,
      knownhost: `${container.ipaddr} ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAINN5qBcVhQt0gPmGxgsxgt9429S74QH/LWGuHjVBPZ9p`,
      username: "root",
      privatekey: () => fs.readFile(new URL("./libssh2.test/id_ed25519", import.meta.url)),
    });
    try {
      const channel = await session.exec("/bin/cat");
      try {
        const { stdin, stdout } = channel;
        const chunks = [] as string[];
        const decoder = new TextDecoder();
        const t1 = stdout.pipeTo(new WritableStream({
          write(chunk) {
            chunks.push(decoder.decode(chunk, { stream: true }));
          },
          close() {
            chunks.push(decoder.decode(new Uint8Array()));
          },
        }));
        const t2 = new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode("hello"));
            controller.close();
          },
          type: "bytes",
        }).pipeTo(stdin);
        await Promise.all([t1, t2]);
        expect(chunks.join("")).toBe("hello");

        await channel.waitEof();
      } finally {
        await channel.close();
        channel.free(); // TODO
      }
    } finally {
      await session.disconnect();
      session.close(); // TODO
      session.free(); // TODO
    }
  });

});
