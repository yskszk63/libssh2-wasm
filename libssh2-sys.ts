import fs from "fs/promises";
import net from "net";
import { ReadableStream, WritableStream } from "stream/web";

import Wasi, * as w from "./src/wasi";

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

const {
  memory,
  malloc,
  free,
  open,
  libssh2_version,
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

if (!(memory instanceof WebAssembly.Memory)) {
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
if (typeof libssh2_session_last_errno !== "function") {
  throw new Error();
}
if (typeof libssh2_userauth_authenticated !== "function") {
  throw new Error();
}
if (typeof libssh2_userauth_publickey_frommemory !== "function") {
  throw new Error();
}
if (typeof libssh2_channel_open_ex !== "function") {
  throw new Error();
}
if (typeof libssh2_channel_close !== "function") {
  throw new Error();
}
if (typeof libssh2_channel_wait_closed !== "function") {
  throw new Error();
}
if (typeof libssh2_channel_process_startup !== "function") {
  throw new Error();
}
if (typeof libssh2_channel_send_eof !== "function") {
  throw new Error();
}
if (typeof libssh2_channel_eof !== "function") {
  throw new Error();
}
if (typeof libssh2_channel_read_ex !== "function") {
  throw new Error();
}

if (libssh2_init(0)) {
  throw new Error();
}

const session = libssh2_session_init_ex(null, null, null, null);
if (!session) {
  throw new Error();
}
try {
  libssh2_session_set_blocking(session, 0);


  /*
  0x0400_0000 O_RDONLY
  0x1000_0000 O_WRONLY
  */
  const path = new TextEncoder().encode("/dev/tcp/127.0.0.1:2222\0");
  const ppath = malloc(path.byteLength);
  new Uint8Array(memory.buffer, ppath, path.byteLength).set(path);
  const fd: number = open(ppath, 0x0400_0000);
  if (fd < 0) {
    throw new Error();
  }

  while (true) {
    const ret = libssh2_session_handshake(session, fd);
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
    await wasi.poll([fd]);
  }

  const username = new TextEncoder().encode("yskszk63");
  const pusername = malloc(username.byteLength);
  new Uint8Array(memory.buffer, pusername, username.byteLength).set(username);

  const privatekeydata = await fs.readFile(new URL("./test_id_ed25519", import.meta.url));
  //const publickeydata = await fs.readFile(new URL("./test_id_ed25519.pub", import.meta.url));
  const pprivatekey = malloc(privatekeydata.byteLength);
  new Uint8Array(memory.buffer, pprivatekey, privatekeydata.byteLength).set(privatekeydata);

  while (!libssh2_userauth_authenticated(session)) {
    const ret = libssh2_userauth_publickey_frommemory(
      session,
      pusername, username.byteLength,
      //publickeydata, publickeydata.byteLength,
      0, 0,
      pprivatekey, privatekeydata.byteLength,
      null);
    if (!ret) {
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
    await wasi.poll([fd]);
    //await next();
  }

  let channel = 0;
  while (channel === 0) {
    const channeltype = new TextEncoder().encode("session");
    const pchanneltype = malloc(session.byteLength);
    new Uint8Array(memory.buffer, pchanneltype, session.byteLength).set(channeltype);

    const ret = libssh2_channel_open_ex(session, pchanneltype, channeltype.byteLength,
                                        (2*1024*1024), // LIBSSH2_CHANNEL_WINDOW_DEFAULT
                                        32768, // LIBSSH2_CHANNEL_PACKET_DEFAULT
                                        0, 0);
    if (ret) {
      channel = ret;
      break;
    }
    if (libssh2_session_last_errno(session) !== -37/*LIBSSH2_ERROR_EAGAIN*/) {
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
    await wasi.poll([fd]);
    //await next();
  }

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
        libssh2_session_last_error(session, ptr, len, null);
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
        libssh2_session_last_error(session, ptr, len, null);
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
          libssh2_session_last_error(session, ptr, len, null);
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
          libssh2_session_last_error(session, ptr, len, null);
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
        libssh2_session_last_error(session, ptr, len, null);
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
        libssh2_session_last_error(session, ptr, len, null);
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
