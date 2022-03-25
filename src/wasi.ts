// TODO remove
import { webcrypto as crypto } from "crypto";

declare global {
  // TODO no type definition in lib.dom.d.ts
  type ReadableStreamBYOBReader = {
    read(view: Uint8Array): Promise<{ value: Uint8Array, done: false } | { value: undefined, done: true }>
  }
}

const EAGAIN = 6;
const EBADF = 8;
const EINVAL = 28;
const ENOENT = 44;
const ENOSYS = 52;

export const FILETYPE_UNKNOWN = 0;
export const FILETYPE_BLOCK_DEVICE = 1;
export const FILETYPE_CHARACTER_DEVICE = 2;
export const FILETYPE_DIRECTORY = 3;
export const FILETYPE_REGULAR = 4;
export const FILETYPE_SOCKET_DGRAM = 5;
export const FILETYPE_SOCKET_STREAM = 6;
export const FILETYPE_SYMBOLIC_LINK = 7;

type Filetype =
| typeof FILETYPE_UNKNOWN
| typeof FILETYPE_BLOCK_DEVICE
| typeof FILETYPE_CHARACTER_DEVICE
| typeof FILETYPE_DIRECTORY
| typeof FILETYPE_REGULAR
| typeof FILETYPE_SOCKET_DGRAM
| typeof FILETYPE_SOCKET_STREAM
| typeof FILETYPE_SYMBOLIC_LINK

export const FDFLAGS_APPEND = 1 << 0;
export const FDFLAGS_DSYNC = 1 << 1;
export const FDFLAGS_NONBLOCK = 1 << 2;
export const FDFLAGS_RSYNC = 1 << 3;
export const FDFLAGS_SYNC = 1 << 4;

type Fdflag =
| typeof FDFLAGS_APPEND
| typeof FDFLAGS_DSYNC
| typeof FDFLAGS_NONBLOCK
| typeof FDFLAGS_RSYNC
| typeof FDFLAGS_SYNC

export const RIGHT_FD_DATASYNC = 1n << 0n;
export const RIGHT_FD_READ = 1n << 1n;
export const RIGHT_FD_SEEK = 1n << 2n;
export const RIGHT_FD_FDSTAT_SET_FLAGS = 1n << 3n;
export const RIGHT_FD_SYNC = 1n << 4n;
export const RIGHT_FD_TELL = 1n << 5n;
export const RIGHT_FD_WRITE = 1n << 6n;
export const RIGHT_FD_ADVICE = 1n << 7n;
export const RIGHT_FD_ALLOCATE = 1n << 8n;
export const RIGHT_PATH_CRATE_DIRECTORY = 1n << 9n;
export const RIGHT_PATH_CREATE_FILE = 1n << 10n;
export const RIGHT_PATH_LINK_SOURCE = 1n << 11n;
export const RIGHT_PATH_LINK_TARGET = 1n << 12n;
export const RIGHT_PATH_OPEN = 1n << 13n;
export const RIGHT_FD_READDIR = 1n << 14n;
export const RIGHT_PATH_READLINK = 1n << 15n;
export const RIGHT_PATH_RENAME_SOURCE = 1n << 16n;
export const RIGHT_PATH_RENAME_TARGET = 1n << 17n;
export const RIGHT_PATH_FILESTAT_GET = 1n << 18n;
export const RIGHT_PATH_FILESTAT_SET_SIZE = 1n << 19n;
export const RIGHT_PATH_FILESTAT_SET_TIMES = 1n << 20n;
export const RIGHT_FD_FILESTAT_GET = 1n << 21n;
export const RIGHT_FD_FILESTAT_SET_SIZE = 1n << 22n;
export const RIGHT_FD_FILESTAT_SET_TIMES = 1n << 23n;
export const RIGHT_PATH_LINK = 1n << 24n;
export const RIGHT_PATH_REMOVE_DIRECTORY = 1n << 25n;
export const RIGHT_PATH_UNLINK_FILE = 1n << 26n;
export const RIGHT_FD_READWRITE = 1n << 27n;
export const RIGHT_SOCK_SHUTDOWN = 1n << 28n;
export const RIGHT_SOCK_ACCEPT = 1n << 29n;

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

type ReadState = "idle" | "reading" | "eof"
type WriteState = "idle" | "writing"

type ReadContext = {
  state: ReadState
  buf: Uint8Array
  filled: number
  pos: number
  read: (b: Uint8Array) => Promise<number>
}

type WriteContext = {
  state: WriteState
  buf: Uint8Array
  write: (b: Uint8Array) => Promise<number>
}

type SockFd = {
  type: "socket"
  stat: Fdstat
  rcx?: ReadContext
  wcx?: WriteContext
  waker: EventTarget // TODO
}

type ReadContext2 = {
  state: "connecting",
} | {
  state: "idle",
  buf: Uint8Array,
  reader: ReadableStreamBYOBReader,
} | {
  state: "reading",
  reader: ReadableStreamBYOBReader,
} | {
  state: "eof",
}

type WriteContext2 = {
  state: "connecting",
} | {
  state: "idle",
  buf: Uint8Array
  writer: WritableStreamDefaultWriter<Uint8Array>
} | {
  state: "writing",
  writer: WritableStreamDefaultWriter<Uint8Array>
} | {
  state: "wrote",
  len: number,
  buf: Uint8Array
  writer: WritableStreamDefaultWriter<Uint8Array>
}

// TODO
type SockFd2 = {
  type: "socket2"
  stat: Fdstat
  rcx: ReadContext2
  wcx: WriteContext2
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

type Filedescriptor = SockFd | DirFd | DevUrandomFd | SockFd2

type AddFdOption = {
  filetype: Filetype
  flags: Fdflag[]
  rights: Right[]
  reader?: (b: Uint8Array) => Promise<number>
  writer?: (b: Uint8Array) => Promise<number>
}

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
  netFactory?: (host: string, port: number) => Promise<[ReadableStream<Uint8Array>, WritableStream<Uint8Array>]>
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
  #netFactory?: (host: string, port: number) => Promise<[ReadableStream<Uint8Array>, WritableStream<Uint8Array>]>

  constructor(opts: WasiConstructorOpts = {}) {
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
    this.#netFactory = opts.netFactory;
    this.#nextfd = 4;
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
    const waiters = [];
    for (const fd of fds) {
      const fdi = this.#fds[fd];
      if (!fdi || fdi.type !== "socket2") {
        throw new Error();
      }
      waiters.push((Atomics as any).waitAsync(fdi.sig, 0, 1)); // TODO
    }
    await Promise.race(waiters);
  }

  addFd(opts: AddFdOption): [number, () => Promise<void>] {
    const fd = this.#nextfd++;
    const rcx = !opts.reader ? void 0 : {
      state: "idle" as ReadState,
      buf: new Uint8Array(1024 * 8),
      filled: 0,
      pos: 0,
      read: opts.reader,
    }
    const wcx = !opts.writer ? void 0 : {
      state: "idle" as WriteState,
      buf: new Uint8Array(1024 * 8),
      write: opts.writer,
    }
    const waker = new EventTarget();
    this.#fds[fd] = {
      type: "socket",
      stat: {
        fs_filetype: opts.filetype,
        fs_flags: new Set(opts.flags),
        fs_rights_base: new Set(opts.rights),
        fs_rights_inheriting: new Set(),
      },
      rcx,
      wcx,
      waker,
    }
    return [fd, async () => {
      // TODO resolve if idle
      if (rcx?.state !== "reading" && wcx?.state !== "writing") {
        return;
      }
      return new Promise(resolve => waker.addEventListener("wake", () => resolve(), { once: true }))
    }];
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
    if (!(fd in this.#fds)) {
      return EBADF;
    }
    const stat = this.#fds[fd].stat;

    const view = new DataView(this.#memory);
    view.setUint8(result + 0, stat.fs_filetype);
    view.setUint16(result + 2, Array.from(stat.fs_flags).reduce((l, r) => l | r, 0), true);
    view.setBigUint64(result + 8, Array.from(stat.fs_rights_base).reduce((l, r) => l | r, 0n), true);
    view.setBigUint64(result + 16, Array.from(stat.fs_rights_inheriting).reduce((l, r) => l | r, 0n), true);
    return 0;
  }

  fd_filestat_get(fd: number): number {
    const fdi = this.#fds[fd];
    switch (fdi?.type) {
      case "urandom": {
        // TODO
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
          (crypto as unknown as Crypto).getRandomValues(buf);
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
    switch (parent.name) {
      case "/dev": {
        if (name === "urandom") {
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
        if (!factory) {
          return ENOSYS;
        }

        const [host, port] = name.split(":", 2);
        if (!host || !port) {
          return EBADF;
        }
        if (!Number(port)) {
          return EBADF;
        }

        const fd: SockFd2 = {
          type: "socket2",
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
          fd.rcx = {
            state: "idle",
            buf: new Uint8Array(new ArrayBuffer(1024 * 8), 0, 0),
            reader: (r as any).getReader({ mode: "byob" }), // TODO
          }

          fd.wcx = {
            state: "idle",
            buf: new Uint8Array(new ArrayBuffer(1024 * 8)),
            writer: w.getWriter(),
          }

          fd.sig[0] = 1;
          fd.sig[1] = 1;
          Atomics.notify(fd.sig, 0);
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

  sock_recv(fd: number, ri_data: number, ri_data_len: number, ri_flags: number, result: number): number {
    if (ri_flags !== 0) {
      return ENOSYS;
    }
    const fdi = this.#fds[fd];
    if (!fdi || (fdi.type !== "socket" && fdi.type !== "socket2")) {
      return EINVAL;
    }

    switch (fdi.type) {
      case "socket": {
        const { rcx, waker } = fdi;
        if (!rcx || !waker) {
          return EBADF;
        }

        switch (rcx.state) {
          case "idle":
            break;

          case "reading":
            return EAGAIN;

          case "eof":
            return 0;
        }

        const b = rcx.buf.subarray(rcx.pos, rcx.filled);
        if (!b.length) {
          rcx.filled = 0;
          rcx.pos = 0;
          rcx.state = "reading";
          rcx.read(rcx.buf).then(n => {
            waker.dispatchEvent(new globalThis.Event("wake"));
            if (n === 0) {
              rcx.state = "eof";
              return;
            }
            rcx.state = "idle";
            rcx.filled = n;
          });
          return EAGAIN;
        }

        let filled = 0;
        for (let i = 0; i < ri_data_len; i++) {
          const buf = new Iovec(this.#memview, ri_data + (i * 8/*sizeof iovec*/)).buf;
          const len = Math.min(buf.byteLength, rcx.filled - rcx.pos);
          buf.set(rcx.buf.subarray(rcx.pos, rcx.pos + len));
          filled += len;
          rcx.pos += len;
          if (rcx.pos >= rcx.filled) {
            break;
          }
        }
        this.#memview.setInt32(result, filled, true);
        return 0;
      }

      case "socket2": {
        switch (fdi.rcx.state) {
          case "idle":
            break;

          case "connecting":
            //fallthrough
          case "reading":
            return EAGAIN;

          case "eof":
            return 0;
        }

        let { buf } = fdi.rcx;
        const { reader } = fdi.rcx;
        if (!buf.length) {
          fdi.rcx = {
            state: "reading",
            reader,
          }
          fdi.sig[0] = 0;
          reader.read(new Uint8Array(buf.buffer)).then(({ value, done }) => {
            fdi.sig[0] = 1;
            Atomics.notify(fdi.sig, 0);

            if (done) {
              fdi.rcx = {
                state: "eof",
              }
              return;
            }

            fdi.rcx = {
              state: "idle",
              buf: value,
              reader,
            }
          }); // TODO catch
          return EAGAIN;
        }

        let filled = 0;
        for (let i = 0; i < ri_data_len; i++) {
          const dst = new Iovec(this.#memview, ri_data + (i * 8/*sizeof iovec*/)).buf;
          const len = Math.min(buf.byteLength, dst.byteLength);
          dst.set(buf.subarray(buf.byteOffset, buf.byteOffset + len));
          filled += len;
          buf = buf.subarray(buf.byteOffset + len, buf.byteLength);
          if (!buf.byteLength) {
            break;
          }
        }
        fdi.rcx.buf = buf;
        this.#memview.setInt32(result, filled, true);
        return 0;
      }
    }
  }

  sock_send(fd: number, si_data: number, si_data_len: number, _si_flags: number, result: number): number {
    const fdi = this.#fds[fd];
    if (!fdi || (fdi.type !== "socket" && fdi.type !== "socket2")) {
      return EINVAL;
    }

    switch (fdi.type) {
      case "socket": {
        const { wcx, waker } = fdi;
        if (!wcx || !waker) {
          return EBADF;
        }

        switch (wcx.state) {
          case "idle":
            break;

          case "writing":
            return EAGAIN;
        }
        let filled = 0;
        for (let i = 0; i < si_data_len; i++) {
          const buf = new Ciovec(this.#memview, si_data + (i * 8/*sizeof ciovec*/)).buf;
          const len = Math.min(buf.byteLength, wcx.buf.byteLength - filled);
          wcx.buf.set(buf.subarray(0, len));
          filled += len;
          if (filled >= wcx.buf.byteLength) {
            break;
          }
        }
        wcx.write(wcx.buf.subarray(0, filled)).then(() => {
          waker.dispatchEvent(new globalThis.Event("wake"));
          wcx.state = "idle";
        });
        this.#memview.setInt32(result, filled, true);
        return 0;
      }

      case "socket2": {
        switch (fdi.wcx.state) {
          case "idle":
            break;

          case "connecting":
            //fallthrough
          case "writing":
            return EAGAIN;

          case "wrote": {
            const { len, buf, writer } = fdi.wcx;
            fdi.wcx = {
              state: "idle",
              buf,
              writer,
            }
            this.#memview.setInt32(result, len, true); // TODO on idle
            return 0;
          }
        }
        let { buf } = fdi.wcx;
        const { writer } = fdi.wcx;

        fdi.wcx = {
          state: "writing",
          writer,
        }
        fdi.sig[1] = 0;

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
          fdi.sig[1] = 1;
          Atomics.notify(fdi.sig, 1);

          fdi.wcx = {
            state: "wrote",
            len: buf.byteLength,
            buf: new Uint8Array(buf.buffer),
            writer,
          }
        }); // TODO catch
        return EAGAIN;
      }
    }
  }

  poll_oneoff(in_: number, out: number, nsubscriptions: number, result: number): number {
    const view = this.#memview;
    let stored = 0;
    for (let i = 0; i < nsubscriptions; i++) {
      const sub = new Subscription(view, in_ + (i * 48)/*sizeof subscription*/);

      const event = new Event(view, out + (i * 32/*sizeof event*/));
      event.userdata = sub.userdata;
      const [tag, val] = sub.u.val;
      switch (tag) {
        case SUBSCRIPTION_U_TAG_CLOCK:
          throw new Error("not implemented");

        case SUBSCRIPTION_U_TAG_FD_READ:
          stored++;

          const fd = this.#fds[val.file_descriptor];
          if (!fd || fd.type !== "socket") {
            return EINVAL;
          }
          event.type = EVENTTYPE_FD_READ;
          if (!fd || !fd.rcx) {
            event.errno = EBADF;
            break;
          }
          event.fd_readwrite = {
            nbytes: BigInt(fd.rcx.buf.byteLength),
            flags: [],
          }
          break;

        case SUBSCRIPTION_U_TAG_FD_WRITE: {
          stored++;

          const fd = this.#fds[val.file_descriptor];
          if (!fd || fd.type !== "socket") {
            return EINVAL;
          }
          event.type = EVENTTYPE_FD_WRITE;
          if (!fd || !fd.wcx) {
            event.errno = EBADF;
            break;
          }
          event.fd_readwrite = {
            nbytes: BigInt(fd.wcx.buf.byteLength),
            flags: [],
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
