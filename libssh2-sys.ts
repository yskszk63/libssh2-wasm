import fs from "fs/promises";
import net from "net";

import Wasi, * as w from "./src/wasi";

async function instatiate(): Promise<[Wasi, WebAssembly.Instance]> {
  const wasi = new Wasi();
  const env = {
    getpid() {
    },
    getuid() {
    },
    geteuid() {
    },
    getgid() {
    },
    getegid() {
    },
  };

  const buf = await fs.readFile(new URL("./libssh2.wasm", import.meta.url));
  const { instance, /*module*/ } = await WebAssembly.instantiate(buf, {
    "env": env,
    "wasi_snapshot_preview1": wasi.exports,
  });
  //WebAssembly.Module.exports(module).forEach(({name}) => console.log(name))
  wasi.initialize(instance);
  return [wasi, instance]
}

const [wasi, instance] = await instatiate();

const {
  memory,
  malloc,
  free,
  libssh2_version,
  libssh2_init,
  libssh2_session_init_ex,
  libssh2_session_free,
  libssh2_session_set_blocking,
  libssh2_session_handshake,
  libssh2_session_last_error,
} = instance.exports;
if (!(memory instanceof WebAssembly.Memory)) {
  throw new Error();
}
if (typeof malloc !== "function") {
  throw new Error();
}
if (typeof free !== "function") {
  throw new Error();
}
if (typeof libssh2_version !== "function") {
  throw new Error();
}
if (typeof libssh2_init !== "function") {
  throw new Error();
}
if (typeof libssh2_session_init_ex !== "function") {
  throw new Error();
}
if (typeof libssh2_session_free !== "function") {
  throw new Error();
}
if (typeof libssh2_session_set_blocking !== "function") {
  throw new Error();
}
if (typeof libssh2_session_handshake !== "function") {
  throw new Error();
}
if (typeof libssh2_session_last_error !== "function") {
  throw new Error();
}

if (libssh2_init(0)) {
  throw new Error();
}

const ver = libssh2_version(0);
const view = new Uint8Array(memory.buffer).slice(ver);
for (let i = 0;; i++) {
  if (view[i] === 0) {
    const text = new TextDecoder().decode(view.slice(0, i));
    console.log(text);
    break;
  }
}

const session = libssh2_session_init_ex(null, null, null, null);
if (!session) {
  throw new Error();
}
try {
  libssh2_session_set_blocking(session, 0);

  const sock = net.connect(2222, "localhost");
  //const sock = net.connect(22, "localhost");
  const [fd, next] = wasi.addFd({
    filetype: w.FILETYPE_SOCKET_STREAM,
    flags: [w.FDFLAGS_NONBLOCK],
    rights: [w.RIGHT_FD_READ, w.RIGHT_FD_WRITE],
    writer: (buf) => {
      console.log(buf, new TextDecoder().decode(buf));
      return new Promise((resolve, reject) => {
        sock.write(buf, (err) => {
          if (err) {
            reject(err);
            return;
          }
          resolve(buf.length);
        });
      });
    },
    reader: (buf) => {
      return new Promise((resolve, reject) => {
        sock.once("data", data => {
          console.log(data, data.toString());
          buf.set(data);
          resolve(data.length);
        });
        sock.once("end", () => resolve(0));
        sock.once("error", reject);
      });
    },
  });

  while (true) {
    const ret = libssh2_session_handshake(session, fd);
    console.log(ret);
    if (ret === 0) {
      break;
    }
    if (ret !== -37/*LIBSSH2_ERROR_EAGAIN*/) {
      const ptr = malloc(4);
      const len = malloc(4);
      libssh2_session_last_error(session, ptr, len, null);
      const v = new DataView(memory.buffer);
      const c = v.getUint32(ptr, true);
      const l = v.getUint32(len, true);
      const err = new TextDecoder().decode(new Uint8Array(v.buffer, c, l));
      free(ptr);
      free(len);
      throw new Error(`${ret} ${err}`);
    }
    await next();
  }
} finally {
  libssh2_session_free(session);
}
