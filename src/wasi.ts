// partial typing
// - No type definition in lib.dom.d.ts
// - Intersections in node and dom type definitions
interface ReadableStreamBYOBReader {
  read(view: Uint8Array): Promise<{ value: Uint8Array, done: false } | { value: undefined, done: true }>
  releaseLock(): void;
}

interface ReadableStream<R> {
  getReader(opts: { mode: "byob" }): ReadableStreamBYOBReader
  tee(): [ReadableStream<R>, ReadableStream<R>];
  cancel(reason?: any): Promise<void>;
}

declare global {
  interface Atomics {
    waitAsync(typedArray: Int32Array, index: number, value: number): { async: false, value: "not-equal" | "timed-out"} | { async: true, value: Promise<"ok" | "timed-out"> }
  }
}

const EAGAIN = 6;
const EBADF = 8;
const EINVAL = 28;
const ENOENT = 44;
const ENOSYS = 52;

const FILETYPE_UNKNOWN = 0;
const FILETYPE_BLOCK_DEVICE = 1;
const FILETYPE_CHARACTER_DEVICE = 2;
const FILETYPE_DIRECTORY = 3;
const FILETYPE_REGULAR = 4;
const FILETYPE_SOCKET_DGRAM = 5;
const FILETYPE_SOCKET_STREAM = 6;
const FILETYPE_SYMBOLIC_LINK = 7;

type Filetype =
| typeof FILETYPE_UNKNOWN
| typeof FILETYPE_BLOCK_DEVICE
| typeof FILETYPE_CHARACTER_DEVICE
| typeof FILETYPE_DIRECTORY
| typeof FILETYPE_REGULAR
| typeof FILETYPE_SOCKET_DGRAM
| typeof FILETYPE_SOCKET_STREAM
| typeof FILETYPE_SYMBOLIC_LINK

const FDFLAGS_APPEND = 1 << 0;
const FDFLAGS_DSYNC = 1 << 1;
const FDFLAGS_NONBLOCK = 1 << 2;
const FDFLAGS_RSYNC = 1 << 3;
const FDFLAGS_SYNC = 1 << 4;

type Fdflag =
| typeof FDFLAGS_APPEND
| typeof FDFLAGS_DSYNC
| typeof FDFLAGS_NONBLOCK
| typeof FDFLAGS_RSYNC
| typeof FDFLAGS_SYNC

const RIGHT_FD_DATASYNC = 1n << 0n;
const RIGHT_FD_READ = 1n << 1n;
const RIGHT_FD_SEEK = 1n << 2n;
const RIGHT_FD_FDSTAT_SET_FLAGS = 1n << 3n;
const RIGHT_FD_SYNC = 1n << 4n;
const RIGHT_FD_TELL = 1n << 5n;
const RIGHT_FD_WRITE = 1n << 6n;
const RIGHT_FD_ADVICE = 1n << 7n;
const RIGHT_FD_ALLOCATE = 1n << 8n;
const RIGHT_PATH_CRATE_DIRECTORY = 1n << 9n;
const RIGHT_PATH_CREATE_FILE = 1n << 10n;
const RIGHT_PATH_LINK_SOURCE = 1n << 11n;
const RIGHT_PATH_LINK_TARGET = 1n << 12n;
const RIGHT_PATH_OPEN = 1n << 13n;
const RIGHT_FD_READDIR = 1n << 14n;
const RIGHT_PATH_READLINK = 1n << 15n;
const RIGHT_PATH_RENAME_SOURCE = 1n << 16n;
const RIGHT_PATH_RENAME_TARGET = 1n << 17n;
const RIGHT_PATH_FILESTAT_GET = 1n << 18n;
const RIGHT_PATH_FILESTAT_SET_SIZE = 1n << 19n;
const RIGHT_PATH_FILESTAT_SET_TIMES = 1n << 20n;
const RIGHT_FD_FILESTAT_GET = 1n << 21n;
const RIGHT_FD_FILESTAT_SET_SIZE = 1n << 22n;
const RIGHT_FD_FILESTAT_SET_TIMES = 1n << 23n;
const RIGHT_PATH_LINK = 1n << 24n;
const RIGHT_PATH_REMOVE_DIRECTORY = 1n << 25n;
const RIGHT_PATH_UNLINK_FILE = 1n << 26n;
const RIGHT_FD_READWRITE = 1n << 27n;
const RIGHT_SOCK_SHUTDOWN = 1n << 28n;
const RIGHT_SOCK_ACCEPT = 1n << 29n;

type Right =
| typeof RIGHT_FD_DATASYNC
| typeof RIGHT_FD_READ
| typeof RIGHT_FD_SEEK
| typeof RIGHT_FD_FDSTAT_SET_FLAGS
| typeof RIGHT_FD_SYNC
| typeof RIGHT_FD_TELL
| typeof RIGHT_FD_WRITE
| typeof RIGHT_FD_ADVICE
| typeof RIGHT_FD_ALLOCATE
| typeof RIGHT_PATH_CRATE_DIRECTORY
| typeof RIGHT_PATH_CREATE_FILE
| typeof RIGHT_PATH_LINK_SOURCE
| typeof RIGHT_PATH_LINK_TARGET
| typeof RIGHT_PATH_OPEN
| typeof RIGHT_FD_READDIR
| typeof RIGHT_PATH_READLINK
| typeof RIGHT_PATH_RENAME_SOURCE
| typeof RIGHT_PATH_RENAME_TARGET
| typeof RIGHT_PATH_FILESTAT_GET
| typeof RIGHT_PATH_FILESTAT_SET_SIZE
| typeof RIGHT_PATH_FILESTAT_SET_TIMES
| typeof RIGHT_FD_FILESTAT_GET
| typeof RIGHT_FD_FILESTAT_SET_SIZE
| typeof RIGHT_FD_FILESTAT_SET_TIMES
| typeof RIGHT_PATH_LINK
| typeof RIGHT_PATH_REMOVE_DIRECTORY
| typeof RIGHT_PATH_UNLINK_FILE
| typeof RIGHT_FD_READWRITE
| typeof RIGHT_SOCK_SHUTDOWN
| typeof RIGHT_SOCK_ACCEPT


type Fdstat = {
  fs_filetype: Filetype
  fs_flags: Set<Fdflag>
  fs_rights_base: Set<Right>
  fs_rights_inheriting: Set<Right>
}

type ReadContext = {
  state: "connecting",
} | {
  state: "idle",
  buf: Uint8Array,
  stream: ReadableStream<Uint8Array>,
  reader: ReadableStreamBYOBReader,
} | {
  state: "reading",
  stream: ReadableStream<Uint8Array>,
  reader: ReadableStreamBYOBReader,
} | {
  state: "eof",
  stream: ReadableStream<Uint8Array>,
} | {
  state: "closed",
} | {
  state: "error",
  error: unknown,
}

type WriteContext = {
  state: "connecting",
} | {
  state: "idle",
  buf: Uint8Array
  stream: WritableStream<Uint8Array>,
  writer: WritableStreamDefaultWriter<Uint8Array>
} | {
  state: "writing",
  stream: WritableStream<Uint8Array>,
  writer: WritableStreamDefaultWriter<Uint8Array>
} | {
  state: "wrote",
  len: number,
  buf: Uint8Array
  stream: WritableStream<Uint8Array>,
  writer: WritableStreamDefaultWriter<Uint8Array>
} | {
  state: "closed"
} | {
  state: "error"
  error: unknown,
}

type SockFd = {
  type: "socket"
  stat: Fdstat
  rcx: ReadContext
  wcx: WriteContext
  sig: Int32Array // for Atomics.notify / waitAsync
}

type DirFd = {
  type: "dir"
  name: string
  stat: Fdstat
}

type DevUrandomFd = {
  type: "urandom"
  stat: Fdstat
}

type Filedescriptor = DirFd | DevUrandomFd | SockFd

class SubscriptionClock {
  #view: DataView
  constructor(view: DataView, offset: number) {
    this.#view = new DataView(view.buffer, view.byteOffset + offset);
  }

  get id(): number {
    return this.#view.getUint32(0, true);
  }

  get timeout(): number {
    return this.#view.getUint32(8, true);
  }

  get precision(): number {
    return this.#view.getUint32(16, true);
  }

  get subclockflags(): number {
    return this.#view.getUint32(24, true);
  }
}

class SubscriptionFdReadWrite {
  #view: DataView
  constructor(view: DataView, offset: number) {
    this.#view = new DataView(view.buffer, view.byteOffset + offset);
  }

  get file_descriptor(): number {
    return this.#view.getUint32(0, true);
  }
}

const SUBSCRIPTION_U_TAG_CLOCK = 0;
const SUBSCRIPTION_U_TAG_FD_READ = 1;
const SUBSCRIPTION_U_TAG_FD_WRITE = 2;

class SubscriptionU {
  #view: DataView
  constructor(view: DataView, offset: number) {
    this.#view = new DataView(view.buffer, view.byteOffset + offset);
  }

  get val(): [typeof SUBSCRIPTION_U_TAG_CLOCK, SubscriptionClock] | [typeof SUBSCRIPTION_U_TAG_FD_READ | typeof SUBSCRIPTION_U_TAG_FD_WRITE, SubscriptionFdReadWrite] {
    const t = this.#view.getUint8(0);
    if (t !== SUBSCRIPTION_U_TAG_CLOCK && t !== SUBSCRIPTION_U_TAG_FD_READ && t !== SUBSCRIPTION_U_TAG_FD_WRITE) {
      throw new Error(`${t} not in [SUBSCRIPTION_U_TAG_CLOCK, SUBSCRIPTION_U_TAG_FD_READ, SUBSCRIPTION_U_TAG_FD_WRITE]`);
    }
    switch (t) {
      case SUBSCRIPTION_U_TAG_CLOCK:
        return [t, new SubscriptionClock(this.#view, 8)];
      case SUBSCRIPTION_U_TAG_FD_READ:
        // fallthrough
      case SUBSCRIPTION_U_TAG_FD_WRITE:
        return [t, new SubscriptionFdReadWrite(this.#view, 8)];
    }
  }
}

class Subscription {
  #view: DataView
  constructor(view: DataView, offset: number) {
    this.#view = new DataView(view.buffer, view.byteOffset + offset);
  }

  get userdata(): bigint {
    return this.#view.getBigUint64(0, true);
  }

  get u(): SubscriptionU {
    return new SubscriptionU(this.#view, 8);
  }
}

const EVENTTYPE_CLOCK = 0;
const EVENTTYPE_FD_READ = 1;
const EVENTTYPE_FD_WRITE = 2;

type Eventtype =
  | typeof EVENTTYPE_CLOCK
  | typeof EVENTTYPE_FD_READ
  | typeof EVENTTYPE_FD_WRITE

const EVENTRWFLAGS_FD_READWRITE_HANGUP = 1 << 0;
type Eventrwflags = typeof EVENTRWFLAGS_FD_READWRITE_HANGUP

type EventFdReadwrite = {
  nbytes: bigint
  flags: Eventrwflags[]
}

class Event {
  #view: DataView
  constructor(view :DataView, offset: number) {
    this.#view = new DataView(view.buffer, view.byteOffset + offset);
  }

  set userdata(v: bigint) {
    this.#view.setBigUint64(0, v, true);
  }

  set errno(v: number) {
    this.#view.setUint16(8, v, true);
  }

  set type(v: Eventtype) {
    this.#view.setUint8(10, v)
  }

  set fd_readwrite(v: EventFdReadwrite) {
    this.#view.setBigUint64(16 + 0, v.nbytes, true);
    this.#view.setUint16(16 + 8, v.flags.reduce((l, r) => l | r, 0), true);
  }
}

class Iovec {
  #view: DataView
  constructor(view :DataView, offset: number) {
    this.#view = new DataView(view.buffer, view.byteOffset + offset);
  }

  get buf(): Uint8Array {
    const ptr = this.#view.getUint32(0, true);
    const len = this.#view.getUint32(4, true);
    return new Uint8Array(this.#view.buffer, ptr, len);
  }
}

class Ciovec {
  #view: DataView
  constructor(view :DataView, offset: number) {
    this.#view = new DataView(view.buffer, view.byteOffset + offset);
  }

  get buf(): Uint8Array {
    const ptr = this.#view.getUint32(0, true);
    const len = this.#view.getUint32(4, true);
    return new Uint8Array(this.#view.buffer, ptr, len);
  }
}

const FD_DEV = 3;
const FD_TCP = 4;

type WasiConstructorOpts = {
  netFactory: (host: string, port: number) => Promise<[ReadableStream<Uint8Array>, WritableStream<Uint8Array>]>,
  crypto: Crypto,
  logger?: (...args: unknown[]) => void,
}

export default class Wasi {
  #_memory: WebAssembly.Memory | undefined
  #fds: Record<number, Filedescriptor>
  /**
   * 0 .. stdin
   * 1 .. stdout
   * 2 .. stderr
   * 3 .. /dev
   * 4 .. /dev/tcp
   */
  #nextfd: number
  #netFactory: (host: string, port: number) => Promise<[ReadableStream<Uint8Array>, WritableStream<Uint8Array>]>
  #crypto: Crypto
  #logger: (...args: unknown[]) => void

  constructor({ netFactory, crypto, logger }: WasiConstructorOpts) {
    this.#fds = {
      [FD_DEV]: {
        type: "dir",
        name: "/dev",
        stat: {
          fs_filetype: FILETYPE_DIRECTORY,
          fs_flags: new Set(),
          fs_rights_base: new Set([RIGHT_FD_READDIR]),
          fs_rights_inheriting: new Set([]),
        },
      },
      [FD_TCP]: {
        type: "dir",
        name: "/dev/tcp",
        stat: {
          fs_filetype: FILETYPE_DIRECTORY,
          fs_flags: new Set(),
          fs_rights_base: new Set([RIGHT_FD_READDIR]),
          fs_rights_inheriting: new Set([]),
        },
      },
    };
    this.#netFactory = netFactory;
    this.#nextfd = 4;
    this.#crypto = crypto;
    this.#logger = logger ?? console.warn;
  }

  initialize(instance: WebAssembly.Instance) {
    const memory = instance.exports['memory'];
    const _initialize = instance.exports['_initialize'];
    if (!(memory instanceof WebAssembly.Memory)) {
      throw new Error(`!${memory} instanceof WebAssembly.Memory`);
    }
    if (typeof _initialize !== "function") {
      throw new Error(`no _initialize found.`);
    }
    this.#_memory = memory;
    _initialize();
  }

  async poll(fds: number[], _interests?: never[]): Promise<void> {
    const waiters: Promise<"ok" | "timed-out">[] = [];
    for (const fd of fds) {
      const fdi = this.#fds[fd];
      if (!fdi || fdi.type !== "socket") {
        throw new Error("invalid fd.");
      }

      for (const i of [0, 1]) {
        const r = Atomics.waitAsync(fdi.sig, i, 0);
        if (r.async) {
          waiters.push(r.value);
        }
      }
    }
    if (waiters.length) {
      await Promise.race(waiters);
    }
  }

  get #memory(): ArrayBuffer {
    if (!this.#_memory) {
      throw new Error("not initialized");
    }
    return this.#_memory.buffer;
  }

  get #memview(): DataView {
    const mem = this.#memory;
    return new DataView(mem);
  }

  clock_time_get(id: number, _: bigint, result: number): number {
    if (id !== 0) {
      return EINVAL;
    }

    const time = BigInt(Date.now()) * 1000_000n;
    this.#memview.setBigUint64(result, time, true);
    return 0;
  }

  fd_prestat_get(fd: number, result: number): number {
    const fdi = this.#fds[fd];
    if (!fdi || fdi.type !== "dir") {
      return EBADF;
    }

    const name = new TextEncoder().encode(fdi.name);
    const v = this.#memview;
    v.setUint8(result + 0, 0); //  prestat tag -> dir
    v.setUint32(result + 4, name.byteLength, true); //  prestat_dir pr_name_len
    return 0;
  }

  fd_prestat_dir_name(fd: number, path: number, path_len: number): number {
    const fdi = this.#fds[fd];
    if (!fdi || fdi.type !== "dir") {
      return EBADF;
    }

    const name = new TextEncoder().encode(fdi.name);
    if (path_len < name.byteLength) {
      return EINVAL;
    }
    new Uint8Array(this.#memory, path, path_len).set(name);
    return 0;
  }

  fd_fdstat_get(fd: number, result: number): number {
    const fdi = this.#fds[fd];
    if (typeof fdi === "undefined") {
      return EBADF;
    }
    const stat = fdi.stat;

    const view = this.#memview;
    view.setUint8(result + 0, stat.fs_filetype);
    view.setUint16(result + 2, Array.from(stat.fs_flags).reduce((l, r) => l | r, 0), true);
    view.setBigUint64(result + 8, Array.from(stat.fs_rights_base).reduce((l, r) => l | r, 0n), true);
    view.setBigUint64(result + 16, Array.from(stat.fs_rights_inheriting).reduce((l, r) => l | r, 0n), true);
    return 0;
  }

  fd_filestat_get(fd: number, result: number): number {
    const fdi = this.#fds[fd];
    switch (fdi?.type) {
      case "urandom": {
        const view = this.#memview;
        // filestat
        view.setBigUint64(result + 0, 1n, true); // dev
        view.setBigUint64(result + 8, 1n, true); // ino
        view.setUint8(result + 16, FILETYPE_CHARACTER_DEVICE); // filetype
        view.setBigUint64(result + 24, 1n, true); // nlink
        view.setBigUint64(result + 32, 0n, true); // size
        view.setBigUint64(result + 40, 0n, true); // atime
        view.setBigUint64(result + 48, 0n, true); // mtime
        view.setBigUint64(result + 56, 0n, true); // ctime
        return 0;
      }
    }
    return EINVAL;
  }

  fd_read(fd: number, iovs: number, iovs_len: number, result: number): number {
    const fdi = this.#fds[fd];
    switch (fdi?.type) {
      case "urandom": {
        let r = 0;
        for (let i = 0; i < iovs_len; i++) {
          const buf = new Iovec(this.#memview, iovs + (i * 8/*sizeof iovec*/)).buf;
          this.#crypto.getRandomValues(buf);
          r += buf.byteLength;
        }
        this.#memview.setUint32(result, r, true);
        return 0;
      }
    }
    return EINVAL;
  }

  path_open(
    fd: number,
    _dirflags: number,
    path: number,
    path_len: number,
    oflags: number,
    fs_rights_base: number,
    fs_rights_inheriting: number,
    fdflags: number,
    result: number
  ): number {
    if (oflags || fdflags || fs_rights_base || fs_rights_inheriting) {
      throw new Error("not implemented");
      //return EINVAL;
    }

    const parent = this.#fds[fd];
    if (!parent || parent.type !== "dir") {
      return EINVAL;
    }

    const name = new TextDecoder().decode(new Uint8Array(this.#memory, path, path_len));
    const fullname = [parent.name, name].join("/");
    const [dir, last] = fullname.split(/\/(?=[^/]*$)/, 2);
    if (!dir || !last) {
      return EINVAL;
    }
    switch (dir) {
      case "/dev": {
        if (last === "urandom") {
          const nextfd = this.#nextfd++;
          this.#fds[nextfd] = {
            type: "urandom",
            stat: {
              fs_filetype: FILETYPE_CHARACTER_DEVICE,
              fs_flags: new Set(),
              fs_rights_base: new Set([RIGHT_FD_READ]),
              fs_rights_inheriting: new Set([]),
            }
          }
          this.#memview.setUint32(result, nextfd, true);
          return 0;
        }
        return EBADF;
      }

      case "/dev/tcp": {
        const factory = this.#netFactory;

        const [host, port] = last.split(":", 2);
        if (!host || !port) {
          return EBADF;
        }
        if (!Number.isFinite(Number(port))) {
          return EBADF;
        }

        const fd: SockFd = {
          type: "socket",
          stat: {
            fs_filetype: FILETYPE_SOCKET_STREAM,
            fs_flags: new Set([FDFLAGS_NONBLOCK]),
            fs_rights_base: new Set([RIGHT_FD_READ, RIGHT_FD_WRITE]),
            fs_rights_inheriting: new Set([]),
          },
          rcx: {
            state: "connecting",
          },
          wcx: {
            state: "connecting",
          },
          sig: new Int32Array(new SharedArrayBuffer(Int32Array.BYTES_PER_ELEMENT * 2)),
        }
        factory(host, Number(port)).then(([r, w]) => {
          if (fd.rcx.state === "closed" || fd.wcx.state === "closed") {
            r.cancel().catch(this.#logger);
            w.close().catch(this.#logger);
            return;
          }

          fd.rcx = {
            state: "idle",
            buf: new Uint8Array(new ArrayBuffer(1024 * 8), 0, 0),
            stream: r,
            reader: r.getReader({ mode: "byob" }),
          }

          fd.wcx = {
            state: "idle",
            buf: new Uint8Array(new ArrayBuffer(1024 * 8)),
            stream: w,
            writer: w.getWriter(),
          }

          Atomics.store(fd.sig, 0, 1);
          Atomics.notify(fd.sig, 0);
          Atomics.store(fd.sig, 1, 1);
          Atomics.notify(fd.sig, 1);
        });
        const nextfd = this.#nextfd++;
        this.#fds[nextfd] = fd;
        this.#memview.setUint32(result, nextfd, true);
        return 0;
      }
    }

    return ENOENT;
  }

  fd_close(fd: number): number {
    const fdi = this.#fds[fd];
    if (!fdi) {
      return EBADF;
    }
    delete this.#fds[fd];

    switch (fdi.type) {
      case "dir":
        //fallthrough
      case "urandom":
        return 0; // NOP

      case "socket": {
        const { rcx, wcx } = fdi;
        fdi.rcx = {
          state: "closed",
        }
        fdi.wcx = {
          state: "closed",
        }

        switch (rcx.state) {
          case "connecting":
            //fallthrough
          case "closed": // unreachable
            //fallthrough
          case "error":
            //fallthrough
          case "reading": // close after task done
            break;

          case "idle":
            rcx.reader.releaseLock();
            rcx.stream.cancel().catch(this.#logger);
            break;
        }

        switch (wcx.state) {
          case "connecting":
            //fallthrough
          case "closed":
            //fallthrough
          case "error":
            //fallthrough
          case "writing": // close after task done
            break;

          case "idle":
            wcx.writer.releaseLock();
            wcx.stream.close().catch(this.#logger);
            break;
        }
        return 0;
      }
    }
  }

  sock_recv(fd: number, ri_data: number, ri_data_len: number, ri_flags: number, result: number): number {
    if (ri_flags !== 0) {
      return ENOSYS;
    }
    const fdi = this.#fds[fd];
    if (!fdi) {
      return EINVAL;
    }

    switch (fdi.type) {
      case "socket": {
        switch (fdi.rcx.state) {
          case "idle":
            break;

          case "connecting":
            //fallthrough
          case "reading":
            return EAGAIN;

          case "error":
            return EINVAL;

          case "closed":
            // unreachable
            return EINVAL;

          case "eof":
            this.#memview.setInt32(result, 0, true);
            return 0;
        }

        let { buf } = fdi.rcx;
        const { reader, stream } = fdi.rcx;
        if (!buf.length) {
          fdi.rcx = {
            state: "reading",
            stream,
            reader,
          }
          Atomics.store(fdi.sig, 0, 0);
          Atomics.notify(fdi.sig, 0);
          reader.read(new Uint8Array(buf.buffer)).then(({ value, done }) => {
            Atomics.store(fdi.sig, 0, 1);
            Atomics.notify(fdi.sig, 0);
            if (fdi.rcx.state === "closed") {
              reader.releaseLock();
              stream.cancel().catch(this.#logger);
              return;
            }

            if (done) {
              fdi.rcx = {
                stream,
                state: "eof",
              }
              return;
            }

            fdi.rcx = {
              state: "idle",
              buf: value,
              stream,
              reader,
            }
          }).catch((error) => {
            Atomics.store(fdi.sig, 0, 1);
            Atomics.notify(fdi.sig, 0);
            this.#logger(error);
            fdi.rcx = {
              state: "error",
              error,
            }
          });
          return EAGAIN;
        }

        let filled = 0;
        for (let i = 0; i < ri_data_len; i++) {
          const dst = new Iovec(this.#memview, ri_data + (i * 8/*sizeof iovec*/)).buf;
          const len = Math.min(buf.byteLength, dst.byteLength);
          dst.set(buf.subarray(0, len));
          filled += len;
          buf = buf.subarray(len);
          if (!buf.byteLength) {
            break;
          }
        }
        fdi.rcx.buf = buf;
        this.#memview.setInt32(result, filled, true);
        return 0;
      }

      default: return EINVAL;
    }
  }

  sock_send(fd: number, si_data: number, si_data_len: number, _si_flags: number, result: number): number {
    const fdi = this.#fds[fd];
    if (!fdi) {
      return EINVAL;
    }

    switch (fdi.type) {
      case "socket": {
        switch (fdi.wcx.state) {
          case "idle":
            break;

          case "connecting":
            //fallthrough
          case "writing":
            return EAGAIN;

          case "error":
            return EINVAL;

          case "closed":
            // unreachable
            return EINVAL;

          case "wrote": {
            const { len, buf, stream, writer } = fdi.wcx;
            fdi.wcx = {
              state: "idle",
              buf,
              stream,
              writer,
            }
            this.#memview.setInt32(result, len, true); // TODO on idle
            return 0;
          }
        }
        let { buf } = fdi.wcx;
        const { stream, writer } = fdi.wcx;

        fdi.wcx = {
          state: "writing",
          stream,
          writer,
        }
        Atomics.store(fdi.sig, 1, 0);
        Atomics.notify(fdi.sig, 1);

        for (let i = 0; i < si_data_len; i++) {
          const src = new Ciovec(this.#memview, si_data + (i * 8/*sizeof ciovec*/)).buf;
          const len = Math.min(buf.byteLength, src.byteLength);
          buf.set(src.subarray(0, len));
          buf = buf.subarray(buf.byteOffset + len);
          if (!buf.byteLength) {
            break;
          }
        }
        buf = new Uint8Array(buf.buffer, 0, buf.byteOffset);
        fdi.wcx.writer.write(buf).then(() => {
          Atomics.store(fdi.sig, 1, 1);
          Atomics.notify(fdi.sig, 1);
          if (fdi.wcx.state === "closed") {
            writer.releaseLock();
            stream.close().catch(console.warn);
            return;
          }

          fdi.wcx = {
            state: "wrote",
            len: buf.byteLength,
            buf: new Uint8Array(buf.buffer),
            stream,
            writer,
          }
        }).catch((error) => {
          Atomics.store(fdi.sig, 1, 1);
          Atomics.notify(fdi.sig, 1);
          this.#logger(error);
          fdi.wcx = {
            state: "error",
            error,
          }
        });
        return EAGAIN;
      }

      default: return EINVAL;
    }
  }

  poll_oneoff(in_: number, out: number, nsubscriptions: number, result: number): number {
    const view = this.#memview;
    let stored = 0;
    for (let i = 0; i < nsubscriptions; i++) {
      const sub = new Subscription(view, in_ + (i * 48)/*sizeof subscription*/);

      const [tag, val] = sub.u.val;
      switch (tag) {
        case SUBSCRIPTION_U_TAG_CLOCK:
          throw new Error("not implemented");

        case SUBSCRIPTION_U_TAG_FD_READ:
          const fd = this.#fds[val.file_descriptor];
          if (!fd || fd.type !== "socket") {
            return EINVAL;
          }

          switch (fd.rcx.state) {
            case "connecting":
              //fallthrough
            case "reading":
              break;

            case "idle": {
              const event = new Event(view, out + ((stored++) * 32/*sizeof event*/));
              event.userdata = sub.userdata;
              event.type = EVENTTYPE_FD_READ;
              event.fd_readwrite = {
                nbytes: BigInt(fd.rcx.buf.byteLength),
                flags: [],
              }
              break;
            }
            case "eof":
              const event = new Event(view, out + ((stored++) * 32/*sizeof event*/));
              event.userdata = sub.userdata;
              event.type = EVENTTYPE_FD_READ;
              event.fd_readwrite = {
                nbytes: BigInt(0),
                flags: [],
              }
              break;
          }
          break;

        case SUBSCRIPTION_U_TAG_FD_WRITE: {
          const fd = this.#fds[val.file_descriptor];
          if (!fd || fd.type !== "socket") {
            return EINVAL;
          }

          switch (fd.wcx.state) {
            case "connecting":
              //fallthrough
            case "writing":
              //fallthrough
            case "wrote":
              break;

            case "idle": {
              const event = new Event(view, out + ((stored++) * 32/*sizeof event*/));
              event.userdata = sub.userdata;
              event.type = EVENTTYPE_FD_WRITE;
              event.fd_readwrite = {
                nbytes: BigInt(fd.wcx.buf.byteLength),
                flags: [],
              }
              break;
            }
          }
          break;
        }
      }
    }
    this.#memview.setInt32(result, stored, true);
    return 0;
  }

  get exports(): WebAssembly.ModuleImports {
    //const stub = (name: string) => (...rest: unknown[]) => console.log("STUB", name, ...rest);
    const stub = (name: string) => (...rest: unknown[]) => { throw new Error(`${name} ${rest.join(" ")}`) };
    const exports = [
      "args_get",
      "args_sizes_get",
      "environ_get",
      "environ_sizes_get",
      "clock_res_get",
      "clock_time_get",
      "fd_advise",
      "fd_allocate",
      "fd_close",
      "fd_datasync",
      "fd_fdstat_get",
      "fd_fdstat_set_flags",
      "fd_fdstat_set_rights",
      "fd_filestat_get",
      "fd_filestat_set_size",
      "fd_filestat_set_times",
      "fd_pread",
      "fd_prestat_get",
      "fd_prestat_dir_name",
      "fd_pwrite",
      "fd_read",
      "fd_readdir",
      "fd_renumber",
      "fd_seek",
      "fd_sync",
      "fd_tell",
      "fd_write",
      "path_create_directory",
      "path_filestat_get",
      "path_filestat_set_times",
      "path_link",
      "path_open",
      "path_readlink",
      "path_remove_directory",
      "path_rename",
      "path_symlink",
      "path_unlink_file",
      "poll_oneoff",
      "proc_exit",
      "proc_raise",
      "sched_yield",
      "random_get",
      "sock_recv",
      "sock_send",
      "sock_shutdown",
    ];
    const it = this;
    return Object.fromEntries(exports.map(name => [name, (it as any)[name]?.bind(it) ?? stub(name)]));
  }
}
