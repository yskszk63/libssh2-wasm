import { spawn } from "child_process";
import { fileURLToPath } from "url";
import fs from "fs/promises";
import net from "net";
import { ReadableStream, WritableStream } from "stream/web";
import { webcrypto } from "crypto";
import path from "path";

import { newLibssh2 } from "./libssh2.js";

let container: undefined | {
  id: string
  ipaddr: string
};

beforeAll(async () => {
  const dir = fileURLToPath(new URL("./libssh2.test/", import.meta.url));
  {
    const proc = spawn("docker", ["buildx", "build", dir, "-t", "libssh2-test-sshd"], { stdio: ["ignore", "inherit", "inherit"] });
    const result = await new Promise<number>((resolve, reject) => {
      proc.on("exit", resolve);
      proc.on("error", reject);
    });
    if (result) {
      throw new Error(`result: ${result}`);
    }
  }

  let name = "";
  {
    const proc = spawn("docker", ["run", "--rm", "-d", "libssh2-test-sshd"], { stdio: ["ignore", "pipe", "inherit"] });
    proc.stdout.on("data", (chunk: Buffer) => name += chunk.toString("utf8"));
    const result = await new Promise<number>((resolve, reject) => {
      proc.on("exit", resolve);
      proc.on("error", reject);
    });
    if (result) {
      throw new Error(`result: ${result}`);
    }
    name = name.trimEnd();
  }

  let ipaddr = "";
  {
    const proc = spawn("docker", ["inspect", "-f", "{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}", name], { stdio: ["ignore", "pipe", "inherit"] });
    proc.stdout.on("data", (chunk: Buffer) => ipaddr += chunk.toString("utf8"));
    const result = await new Promise<number>((resolve, reject) => {
      proc.on("exit", resolve);
      proc.on("error", reject);
    });
    if (result) {
      throw new Error(`result: ${result}`);
    }
    ipaddr = ipaddr.trimEnd();
  }

  container = {
    id: name,
    ipaddr,
  }
}, 60 * 1000);

afterAll(async () => {
  if (typeof container === "undefined") {
    return;
  }

  {
    const proc = spawn("docker", ["kill", container.id], { stdio: ["ignore", "inherit", "inherit"] });
    const result = await new Promise<number>((resolve, reject) => {
      proc.on("exit", resolve);
      proc.on("error", reject);
    });
    if (result) {
      throw new Error(`result: ${result}`);
    }
  }
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

async function netFactory(host: string, port: number): Promise<[ReadableStream<Uint8Array>, WritableStream<Uint8Array>]> {
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
}

describe("newLibssh2", () => {
  test("success", async () => {
    await newLibssh2({
      fetcher,
      netFactory,
      crypto: webcrypto as any,
      ReadableStream,
      WritableStream: WritableStream as any,
    });
  });

  test("missing exports", async () => {
    const t = newLibssh2({
      fetcher: () => cc("/*empty*/"),
      netFactory,
      crypto: webcrypto as any,
      ReadableStream,
      WritableStream: WritableStream as any,
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
      crypto: webcrypto as any,
      ReadableStream,
      WritableStream: WritableStream as any,
    });
    const session = await lib.connect({
      host: container.ipaddr,
      knownhost: `${container.ipaddr} ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAINN5qBcVhQt0gPmGxgsxgt9429S74QH/LWGuHjVBPZ9p`,
      username: "root",
      privatekey: () => fs.readFile(new URL("./libssh2.test/id_ed25519", import.meta.url)),
    });
    try {
    } finally {
      await session.disconnect();
      session.close(); // TODO
      session.free(); // TODO
    }
  });
});
