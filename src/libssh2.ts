import Wasi from "./wasi";
import * as sys from "./sys";
import CEnv, { CPtr } from "./cenv";

type ArgumentTypes<F extends Function> = F extends (...args: infer A) => number ? A : never;

type NewLibssh2Opts = {
  fetcher: () => Promise<Response | Uint8Array>,
  netFactory: (host: string, port: number) => Promise<[ReadableStream<Uint8Array>, WritableStream<Uint8Array>]>,
  crypto: Crypto,
  ReadableStream: typeof ReadableStream
  WritableStream: typeof WritableStream
}

export type ConnectOpts = {
  host: string
  port?: number
  knownhosts: string[]
  username: string
  privatekey: () => Promise<Uint8Array>
}

async function instantiate(fetcher: Promise<Response | Uint8Array>, imports: WebAssembly.Imports): Promise<WebAssembly.Instance> {
  const source = await fetcher;
  if (!(source instanceof Uint8Array)) {
    const { instance } = await WebAssembly.instantiateStreaming(source, imports);
    return instance;
  }

  const { instance } = await WebAssembly.instantiate(source, imports);
  return instance;
}

export async function newLibssh2({ fetcher, netFactory, crypto, ReadableStream, WritableStream }: NewLibssh2Opts): Promise<Libssh2> {
  const wasi = new Wasi({ netFactory, crypto });
  const instance = await instantiate(fetcher(), {
    "env": {
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
    },
    "wasi_snapshot_preview1": wasi.exports,
  });
  wasi.initialize(instance);

  return new Libssh2(instance.exports, wasi, ReadableStream, WritableStream);
}

class Libssh2 {
  #exports: sys.WasiExports & sys.CExports & sys.Libssh2Exports
  #wasi: Wasi
  #cenv: CEnv
  #ReadableStream: typeof ReadableStream
  #WritableStream: typeof WritableStream

  constructor(exports: WebAssembly.Exports, wasi: Wasi, _ReadableStream: typeof ReadableStream, _WritableStream: typeof WritableStream) {
    if (!sys.isWasiExports(exports) || !sys.isCExports(exports) || !sys.isLibssh2Exports(exports)) {
      throw new TypeError();
    }
    this.#exports = exports;
    this.#wasi = wasi;
    this.#cenv = new CEnv(exports);
    this.#ReadableStream = _ReadableStream;
    this.#WritableStream = _WritableStream;

    const r = this.#exports.libssh2_init(0);
    if (r) {
      throw new Error(`failed to call libssh2_init: ${r}`);
    }
  }

  get exports(): sys.Libssh2Exports {
    return this.#exports;
  }

  get cenv(): CEnv {
    return this.#cenv;
  }

  get ReadableStream(): typeof ReadableStream {
    return this.#ReadableStream;
  }

  get WritableStream(): typeof WritableStream {
    return this.#WritableStream;
  }

  async poll(fds: number[]): Promise<void> {
    return this.#wasi.poll(fds);
  }

  async connect({ host, port=22, knownhosts, username, privatekey }: ConnectOpts): Promise<Session> {
    const fd = this.#cenv.with([`/dev/tcp/${host}:${port}`], ([path]) => {
      // TODO flags
      return this.#cenv.ccall(this.#exports.open, path.ptr, 0x0400_0000);
    });
    try {
      const session = this.#exports.libssh2_session_init_ex(0, 0, 0, 0);
      if (!session) {
        throw new Error(`failed to libssh2_session_init_ex`);
      }
      this.#exports.libssh2_session_set_blocking(session, 0);

      const result = new Session(this, session, fd);
      const hostkey = await result.handshake();

      const hosts = result.newKnownhost();
      try {
        for (const line of knownhosts) {
          hosts.readline(line);
        }
        hosts.checkp(host, port, hostkey);

      } finally {
        hosts.free();
      }

      while (!result.userauthAuthenticated()) {
        await result.userauthPublickeyFrommemory(username, privatekey);
      }
      return result;

    } catch (e) {
      this.#cenv.ccall(this.#exports.close, fd);
      throw e;
    }
  }

  close_fd(fd: number) {
    this.#cenv.ccall(this.#exports.close, fd);
  }
}

class Session {
  #libssh2: Libssh2
  #_session: number | null
  #_fd: number | null

  constructor(libssh2: Libssh2, session: number, fd: number) {
    this.#libssh2 = libssh2;
    this.#_session = session;
    this.#_fd = fd;
  }

  get #exports(): sys.Libssh2Exports {
    return this.#libssh2.exports;
  }

  get #cenv(): CEnv {
    return this.#libssh2.cenv;
  }

  async #poll(): Promise<void> {
    return this.#libssh2.poll([this.#fd]);
  }

  get #session(): number {
    if (this.#_session === null) {
      throw new Error("already freed.");
    }
    return this.#_session;
  }

  get #fd(): number {
    if (this.#_fd === null) {
      throw new Error("already closed.");
    }
    return this.#_fd;
  }

  async nbcall<F extends (...args: any[]) => number>(fn: F, ...args: ArgumentTypes<F>): Promise<number> {
    while (true) {
      const ret = fn(...args);
      if (ret === 0) {
        return ret;
      }
      if (ret !== -37/*LIBSSH2_ERROR_EAGAIN*/) {
        this.#cenv.with([this.#cenv.malloc(4), this.#cenv.malloc(4)], ([ptr, len]) => {
          this.#exports.libssh2_session_last_error(this.#session, ptr.ptr, len.ptr, 0);
          const buf = this.#cenv.ref(this.#cenv.u32(ptr), this.#cenv.u32(len));
          throw new Error(`${ret}: ${this.#cenv.str(buf)}`);
        });
      }
      await this.#poll();
    }
  }

  async nbcallio<F extends (...args: any[]) => number>(fn: F, ...args: ArgumentTypes<F>): Promise<number> {
    while (true) {
      const ret = fn(...args);
      if (ret >= 0) {
        return ret;
      }
      if (ret !== -37/*LIBSSH2_ERROR_EAGAIN*/) {
        this.#cenv.with([this.#cenv.malloc(4), this.#cenv.malloc(4)], ([ptr, len]) => {
          this.#exports.libssh2_session_last_error(this.#session, ptr.ptr, len.ptr, 0);
          const buf = this.#cenv.ref(this.#cenv.u32(ptr), this.#cenv.u32(len));
          throw new Error(`${ret}: ${this.#cenv.str(buf)}`);
        });
      }
      await this.#poll();
    }
  }

  newKnownhost(): Knownhost {
    const hosts = this.#exports.libssh2_knownhost_init(this.#session);
    if (hosts === 0) {
      throw new Error("failed to libssh2_knownhost_init");
    }
    return new Knownhost(this.#libssh2, hosts);
  }

  async handshake(): Promise<CPtr> {
    await this.nbcall(this.#exports.libssh2_session_handshake, this.#session, this.#fd);
    return this.#cenv.with([this.#cenv.malloc(4)], ([len]) => {
      const r = this.#exports.libssh2_session_hostkey(this.#session, len.ptr, 0);
      if (r === 0) {
        throw new Error("failed to get hostkey");
      }
      return this.#cenv.ref(r, this.#cenv.u32(len));
    });
  }

  userauthAuthenticated(): boolean {
    return this.#exports.libssh2_userauth_authenticated(this.#session) !== 0;
  }

  async userauthPublickeyFrommemory(username: string, privatekey: () => Promise<Uint8Array>): Promise<void> {
    const it = this;

    const key = await privatekey();
    return this.#cenv.with([username, this.#cenv.copy(key)], async ([username, key]) => {
      if (username.len === null || key.len === null) {
        throw new Error();
      }
      await it.nbcall(
        it.#exports.libssh2_userauth_publickey_frommemory,
        it.#session,
        username.ptr,
        username.len - 1,
        0,
        0,
        key.ptr,
        key.len,
        0);
    });
  }

  async newChannel(type: "session"): Promise<SessionChannel> {
    const it = this;
    return this.#cenv.with([type], async ([channeltype]) => {
      if (channeltype.len === null) {
        throw new Error();
      }
      while (true) {
        const ret = it.#exports.libssh2_channel_open_ex(
          it.#session,
          channeltype.ptr,
          channeltype.len - 1,
          (2*1024*1024), // LIBSSH2_CHANNEL_WINDOW_DEFAULT
          32768, // LIBSSH2_CHANNEL_PACKET_DEFAULT
          0,
          0,
        );
        if (ret > 0) {
          return new SessionChannel(this.#libssh2, this, ret);
        }
        if (it.#exports.libssh2_session_last_errno(it.#session) !== -37/*LIBSSH2_ERROR_EAGAIN*/) {
          it.#cenv.with([it.#cenv.malloc(4), it.#cenv.malloc(4)], ([ptr, len]) => {
            it.#exports.libssh2_session_last_error(it.#session, ptr.ptr, len.ptr, 0);
            const buf = it.#cenv.ref(it.#cenv.u32(ptr), it.#cenv.u32(len));
            throw new Error(it.#cenv.str(buf));
          });
        }
        await it.#poll();
      }
    });
  }

  async exec(command: string): Promise<SessionChannel> {
    const channel = await this.newChannel("session");
    await channel.processStartup("exec", command);
    return channel;
  }

  async disconnect(description: string = "", lang: string = "C") {
    await this.#cenv.with([description, lang], async ([description, lang]) => {
      await this.nbcall(
        this.#exports.libssh2_session_disconnect_ex,
        this.#session,
        11, //SSH_DISCONNECT_BY_APPLICATION
        description.ptr,
        lang.ptr,
      );
    });
  }

  close() {
    this.#libssh2.close_fd(this.#fd);
    this.#_fd = null;
  }

  free() {
    this.#exports.libssh2_session_free(this.#session);
    this.#_session = null;
  }
}

class Knownhost {
  #libssh2: Libssh2
  #_hosts: number | null

  constructor(libssh2: Libssh2, hosts: number) {
    this.#libssh2 = libssh2;
    this.#_hosts = hosts;
  }

  get #exports(): sys.Libssh2Exports {
    return this.#libssh2.exports;
  }

  get #cenv(): CEnv {
    return this.#libssh2.cenv;
  }

  get #hosts(): number {
    if (this.#_hosts === null) {
      throw new Error("already freed.");
    }
    return this.#_hosts;
  }

  readline(line: string) {
    this.#cenv.with([line], ([line]) => {
      const r = this.#exports.libssh2_knownhost_readline(this.#hosts, line.ptr, line.len ?? 0, 1/*LIBSSH2_KNOWNHOST_FILE_OPENSSH*/);
      if (r) {
        throw new Error();
      }
    });
  }

  checkp(host: string, port: number, key: CPtr) {
    this.#cenv.with([host], ([host]) => {
      const typemask =
        1 /*LIBSSH2_KNOWNHOST_TYPE_PLAIN*/
      | (1<<16)/*LIBSSH2_KNOWNHOST_KEYENC_RAW*/
      if (key.len === null) {
        throw new TypeError();
      }
      const r = this.#exports.libssh2_knownhost_checkp(this.#hosts, host.ptr, port, key.ptr, key.len, typemask, 0);
      switch (r) {
      // LIBSSH2_KNOWNHOST_CHECK_FAILURE 3
        case 3: throw new Error("Knownhost key check failure");
      // LIBSSH2_KNOWNHOST_CHECK_NOTFOUND 2
        case 2: throw new Error("Knownhost key check notfound");
      // LIBSSH2_KNOWNHOST_CHECK_MATCH 0
        case 0: return;
      // LIBSSH2_KNOWNHOST_CHECK_MISMATCH 1
        case 1: throw new Error("Knownhost key check mismatch");
      }
    });
  }

  free() {
    this.#exports.libssh2_knownhost_free(this.#hosts);
    this.#_hosts = null;
  }
}

class SessionChannel {
  #libssh2: Libssh2
  #session: Session
  #_channel: number | null
  #stdin: WritableStream<Uint8Array>
  #stdout: ReadableStream<Uint8Array>
  #stderr: ReadableStream<Uint8Array>

  constructor(libssh2: Libssh2, session: Session, channel: number) {
    this.#libssh2 = libssh2;
    this.#session = session;
    this.#_channel = channel;

    const it = this;
    const stdoutbuf = it.#cenv.malloc(8 * 1024);
    const stderrbuf = it.#cenv.malloc(8 * 1024);
    const stdinbuf = it.#cenv.malloc(8 * 1024);

    this.#stdout = new libssh2.ReadableStream({
      async pull(controller) {
        if (stdoutbuf.len === null) {
          throw new Error();
        }

        const len = await it.#session.nbcallio(
          it.#exports.libssh2_channel_read_ex,
          it.#channel,
          0,
          stdoutbuf.ptr,
          stdoutbuf.len,
        );
        if (len === 0) {
          it.#cenv.free(stderrbuf);
          return controller.close();
        }
        controller.enqueue(it.#cenv.buf(stdoutbuf).subarray(0, len));
      },
    });

    this.#stderr = new libssh2.ReadableStream({
      async pull(controller) {
        if (stderrbuf.len === null) {
          throw new Error();
        }

        const len = await it.#session.nbcallio(
          it.#exports.libssh2_channel_read_ex,
          it.#channel,
          1, // SSH_EXTENDED_DATA_STDERR
          stderrbuf.ptr,
          stderrbuf.len,
        );
        if (len === 0) {
          it.#cenv.free(stderrbuf);
          return controller.close();
        }
        controller.enqueue(it.#cenv.buf(stderrbuf).subarray(0, len));
      },
    });

    this.#stdin = new libssh2.WritableStream({
      async write(chunk) {
        if (stdinbuf.len === null) {
          throw new Error();
        }

        while (chunk.byteLength) {
          const len = Math.min(chunk.byteLength, stdinbuf.len);
          it.#cenv.set(stdinbuf, chunk.subarray(0, len));
          chunk = chunk.subarray(len);

          let remaining = len;
          while (remaining) {
            remaining -= await it.#session.nbcallio(
              it.#exports.libssh2_channel_write_ex,
              it.#channel,
              0,
              stdinbuf.ptr + (len - remaining),
              remaining,
            );
          }
        }
        await it.#session.nbcall(
          it.#exports.libssh2_channel_flush_ex,
          it.#channel,
          0,
        );
      },

      async close(): Promise<void> {
        it.#cenv.free(stdinbuf);
        await it.#session.nbcall(
          it.#exports.libssh2_channel_send_eof,
          it.#channel,
        );
      },
    });
  }

  get #exports(): sys.Libssh2Exports {
    return this.#libssh2.exports;
  }

  get #cenv(): CEnv {
    return this.#libssh2.cenv;
  }

  get #channel(): number {
    if (this.#_channel === null) {
      throw new Error("already freed.");
    }
    return this.#_channel;
  }

  get stdin(): WritableStream {
    return this.#stdin;
  }

  get stdout(): ReadableStream {
    return this.#stdout;
  }

  get stderr(): ReadableStream {
    return this.#stderr;
  }

  async processStartup(request: string, message: string): Promise<void> {
    await this.#cenv.with([request, message], async ([request, message]) => {
      if (request.len === null || message.len === null) {
        throw new Error();
      }
      await this.#session.nbcall(
        this.#exports.libssh2_channel_process_startup,
        this.#channel,
        request.ptr, request.len - 1,
        message.ptr, message.len - 1,
      );
    })
  }

  get status(): number {
    // TODO exit?
    return this.#exports.libssh2_channel_get_exit_status(this.#channel);
  }

  async waitEof(): Promise<void> {
    await this.#session.nbcall(
      this.#exports.libssh2_channel_wait_eof,
      this.#channel,
    );
  }

  async close() {
    await this.#session.nbcall(
      this.#exports.libssh2_channel_close,
      this.#channel,
    );
  }

  free() {
    this.#exports.libssh2_channel_free(this.#channel);
    this.#_channel = null;
  }
}
