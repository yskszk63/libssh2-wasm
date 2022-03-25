import fs from "fs/promises";
import { ReadableStream, WritableStream } from "stream/web";
import Wasi, * as w from "./src/wasi";

const wasi = new Wasi({
  async netFactory(_host, _port) {
    let pulled = false;
    const r = new ReadableStream({
      pull(controller) {
        if (pulled) {
          return void controller.close();
        }
        pulled = true;
        const req = controller.byobRequest as any;
        if (!req) {
          return;
        }
        req.view.set(new TextEncoder().encode("OK"));
        req.respond(2);
      },
      type: "bytes",
    });
    const w = new WritableStream({
      write(chunk) {
        console.log(new TextDecoder().decode(chunk));
      }
    });
    return [r, w];
  }
});
const env = {
  getpid() {
    return 1;
  },
  getuid() {
    return 0;
  },
  geteuid() {
    return 0;
  },
  getgid() {
    return 0;
  },
  getegid() {
    return 0;
  },
};

const bin = await fs.readFile(new URL("./libssh2.wasm", import.meta.url));
const { instance } = await WebAssembly.instantiate(bin, {
  "env": env,
  "wasi_snapshot_preview1": wasi.exports,
});
wasi.initialize(instance);

const {
  memory,
  errno,
  malloc,
  open,
  send,
  recv,
} = instance.exports;

class C {
  #instance: WebAssembly.Instance;
  constructor(instance: WebAssembly.Instance) {
    this.#instance = instance;
  }

  get memoryView(): DataView {
    const {
      memory,
    } = this.#instance.exports;

    if (!(memory instanceof WebAssembly.Memory)) {
      throw new Error();
    }
    return new DataView(memory.buffer);
  }

  get errno(): number {
    const {
      errno,
    } = this.#instance.exports;
    if (!(errno instanceof WebAssembly.Global)) {
      throw new Error();
    }
    return this.memoryView.getInt16(errno.value, true);
  }
}

if (!(memory instanceof WebAssembly.Memory)) {
  throw new Error();
}
if (!(errno instanceof WebAssembly.Global)) {
  throw new Error();
}
if (typeof malloc !== "function") {
  throw new Error();
}
if (typeof open !== "function") {
  throw new Error();
}
if (typeof send !== "function") {
  throw new Error();
}
if (typeof recv !== "function") {
  throw new Error();
}

const c = new C(instance);

const path = new TextEncoder().encode("/dev/tcp/127.0.0.1:2222");
const ppath = malloc(path.byteLength);
new Uint8Array(memory.buffer, ppath, path.byteLength).set(path);
/*
0x0400_0000 O_RDONLY
0x1000_0000 O_WRONLY
 */
const fd = open(ppath, 0x0400_0000);
if (fd < 0) {
  throw new Error();
}

const buf = malloc(16);
while (true) {
  const r = recv(fd, buf, 16);
  if (r >= 0) {
    console.log(r, new TextDecoder().decode(new Uint8Array(memory.buffer, buf, r)));
    break;
  }
  if (c.errno !== 6/*EAGAIN*/) {
    throw new Error();
  }
  await wasi.poll([fd]);
}

while (true) {
  const r = send(fd, buf, 2);
  if (r >= 0) {
    console.log(r);
    break;
  }
  if (c.errno !== 6/*EAGAIN*/) {
    throw new Error();
  }
  await wasi.poll([fd]);
}
