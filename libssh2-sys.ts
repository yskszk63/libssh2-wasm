import fs from "fs/promises";
import net from "net";
import { ReadableStream, WritableStream } from "stream/web";

import Wasi from "./src/wasi";
import * as sys from "./src/sys";
import CEnv from "./src/cenv";

async function instatiate(): Promise<[Wasi, WebAssembly.Instance]> {
  const wasi = new Wasi({
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

if (!sys.isWasiExports(instance.exports) || !sys.isCExports(instance.exports) || !sys.isLibssh2Exports(instance.exports)) {
  throw new Error();
}

const {
  memory,
  malloc,
  free,
  open,
  libssh2_init,
  libssh2_session_init_ex,
  libssh2_session_free,
  libssh2_session_set_blocking,
  libssh2_session_handshake,
  libssh2_session_last_error,
  libssh2_session_last_errno,
  libssh2_userauth_authenticated,
  libssh2_userauth_publickey_frommemory,
  libssh2_channel_open_ex,
  libssh2_channel_close,
  libssh2_channel_wait_closed,
  libssh2_channel_process_startup,
  libssh2_channel_send_eof,
  libssh2_channel_eof,
  libssh2_channel_read_ex,
} = instance.exports;

const cenv = new CEnv(instance.exports);

if (libssh2_init(0)) {
  throw new Error();
}

const session = libssh2_session_init_ex(0, 0, 0, 0);
if (!session) {
  throw new Error();
}
try {
  libssh2_session_set_blocking(session, 0);

  /*
  0x0400_0000 O_RDONLY
  0x1000_0000 O_WRONLY
  */
  const fd = await cenv.with(["/dev/tcp/127.0.0.1:2222"], async ([path]) => {
    return cenv.ccall(open, path.ptr, 0x0400_0000);
  });

  while (true) {
    const ret = libssh2_session_handshake(session, fd);
    if (ret === 0) {
      break;
    }
    if (ret !== -37/*LIBSSH2_ERROR_EAGAIN*/) {
      cenv.with([cenv.malloc(4), cenv.malloc(4)], ([ptr, len]) => {
        libssh2_session_last_error(session, ptr.ptr, len.ptr, 0);
        const buf = cenv.ref(cenv.u32(ptr), cenv.u32(len));
        throw new Error(cenv.str(buf));
      });
    }
    await wasi.poll([fd]);
  }

  const privatekeydata = await fs.readFile(new URL("./test_id_ed25519", import.meta.url));
  await cenv.with(["yskszk63", cenv.copy(privatekeydata)], async ([username, privatekeydata]) => {
    while (!libssh2_userauth_authenticated(session)) {
      while (true) {
        const ret = libssh2_userauth_publickey_frommemory(
          session,
          (username.ptr ?? 0),
          (username.len ?? 0) - 1,
          0,
          0,
          privatekeydata.ptr,
          privatekeydata.len ?? 0,
          0,
        );
        if (ret === 0) {
          break;
        }
        if (ret !== -37/*LIBSSH2_ERROR_EAGAIN*/) {
          cenv.with([cenv.malloc(4), cenv.malloc(4)], ([ptr, len]) => {
            libssh2_session_last_error(session, ptr.ptr, len.ptr, 0);
            const buf = cenv.ref(cenv.u32(ptr), cenv.u32(len));
            throw new Error(cenv.str(buf));
          });
        }
        await wasi.poll([fd]);
      }
    }
  });

  const channel = await cenv.with(["session"], async ([channeltype]) => {
    while (true) {
      const ret = libssh2_channel_open_ex(
        session,
        channeltype.ptr,
        (channeltype.len ?? 0) - 1,
        (2*1024*1024), // LIBSSH2_CHANNEL_WINDOW_DEFAULT
        32768, // LIBSSH2_CHANNEL_PACKET_DEFAULT
        0,
        0,
      );
      if (ret > 0) {
        return ret;
      }
      if (libssh2_session_last_errno(session) !== -37/*LIBSSH2_ERROR_EAGAIN*/) {
        cenv.with([cenv.malloc(4), cenv.malloc(4)], ([ptr, len]) => {
          libssh2_session_last_error(session, ptr.ptr, len.ptr, 0);
          const buf = cenv.ref(cenv.u32(ptr), cenv.u32(len));
          throw new Error(cenv.str(buf));
        });
      }
      await wasi.poll([fd]);
    }
  });

  try {
    const request = new TextEncoder().encode("exec");
    const prequest = malloc(request.byteLength);
    new Uint8Array(memory.buffer, prequest, request.byteLength).set(request);

    const message = new TextEncoder().encode("whoami");
    const pmessage = malloc(message.byteLength);
    new Uint8Array(memory.buffer, pmessage, message.byteLength).set(message);

    while (true) {
      const ret = libssh2_channel_process_startup(channel, 
                                                  prequest, request.byteLength,
                                                  pmessage, message.byteLength);
      if (!ret) {
        break;
      }
      if (ret !== -37/*LIBSSH2_ERROR_EAGAIN*/) {
        const ptr = malloc(4);
        const len = malloc(4);
        libssh2_session_last_error(session, ptr, len, 0);
        const v = new DataView(memory.buffer);
        const c = v.getUint32(ptr, true);
        const l = v.getUint32(len, true);
        const err = new TextDecoder().decode(new Uint8Array(v.buffer, c, l));
        free(ptr);
        free(len);
        throw new Error(`${ret} ${err}`);
      }
      await wasi.poll([fd]);
      //await next();
    }

    while (true) {
      const ret = libssh2_channel_send_eof(channel);
      if (!ret) {
        break;
      }
      if (ret !== -37/*LIBSSH2_ERROR_EAGAIN*/) {
        const ptr = malloc(4);
        const len = malloc(4);
        libssh2_session_last_error(session, ptr, len, 0);
        const v = new DataView(memory.buffer);
        const c = v.getUint32(ptr, true);
        const l = v.getUint32(len, true);
        const err = new TextDecoder().decode(new Uint8Array(v.buffer, c, l));
        free(ptr);
        free(len);
        throw new Error(`${ret} ${err}`);
      }
      await wasi.poll([fd]);
      //await next();
    }

    const buflen = 8192;
    const buf = malloc(buflen);
    while (libssh2_channel_eof(channel) === 0) {
      {
        const ret = libssh2_channel_read_ex(channel, 0, buf, buflen);
        if (ret >= 0) {
          process.stdout.write(new Uint8Array(memory.buffer, buf, ret));
        }
        if (libssh2_session_last_errno(session) !== -37/*LIBSSH2_ERROR_EAGAIN*/) {
          const ptr = malloc(4);
          const len = malloc(4);
          libssh2_session_last_error(session, ptr, len, 0);
          const v = new DataView(memory.buffer);
          const c = v.getUint32(ptr, true);
          const l = v.getUint32(len, true);
          const err = new TextDecoder().decode(new Uint8Array(v.buffer, c, l));
          free(ptr);
          free(len);
          throw new Error(`${ret} ${err}`);
        }
      }

      {
        const ret = libssh2_channel_read_ex(channel, 1/*SSH_EXTENDED_DATA_STDERR*/, buf, buflen);
        if (ret >= 0) {
          process.stderr.write(new Uint8Array(memory.buffer, buf, ret));
        }
        if (libssh2_session_last_errno(session) !== -37/*LIBSSH2_ERROR_EAGAIN*/) {
          const ptr = malloc(4);
          const len = malloc(4);
          libssh2_session_last_error(session, ptr, len, 0);
          const v = new DataView(memory.buffer);
          const c = v.getUint32(ptr, true);
          const l = v.getUint32(len, true);
          const err = new TextDecoder().decode(new Uint8Array(v.buffer, c, l));
          free(ptr);
          free(len);
          throw new Error(`${ret} ${err}`);
        }
      }
      await wasi.poll([fd]);
      //await next();
    }

  } finally {
    let ok = false;
    while (true) {
      const ret = libssh2_channel_close(channel);
      if (!ret) {
        ok = true;
        break;
      }
      if (ret !== -37/*LIBSSH2_ERROR_EAGAIN*/) {
        const ptr = malloc(4);
        const len = malloc(4);
        libssh2_session_last_error(session, ptr, len, 0);
        const v = new DataView(memory.buffer);
        const c = v.getUint32(ptr, true);
        const l = v.getUint32(len, true);
        const err = new TextDecoder().decode(new Uint8Array(v.buffer, c, l));
        free(ptr);
        free(len);
        console.log(`${ret} ${err}`); // TODO
        break;
      }
      await wasi.poll([fd]);
      //await next();
    }

    while (ok) {
      const ret = libssh2_channel_wait_closed(channel);
      if (!ret) {
        break;
      }
      if (ret !== -37/*LIBSSH2_ERROR_EAGAIN*/) {
        const ptr = malloc(4);
        const len = malloc(4);
        libssh2_session_last_error(session, ptr, len, 0);
        const v = new DataView(memory.buffer);
        const c = v.getUint32(ptr, true);
        const l = v.getUint32(len, true);
        const err = new TextDecoder().decode(new Uint8Array(v.buffer, c, l));
        free(ptr);
        free(len);
        console.error(`${ret} ${err}`);
        break;
      }
      await wasi.poll([fd]);
      //await next();
    }
  }

} finally {
  libssh2_session_free(session);
}
