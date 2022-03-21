const EAGAIN = 6;
const EBADF = 8;
const EINVAL = 28;
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

type Filedescriptor = {
  stat: Fdstat
  rcx?: ReadContext
  wcx?: WriteContext
  waker: EventTarget
}

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

export default class Wasi {
  #_memory: WebAssembly.Memory | undefined
  #fds: Record<number, Filedescriptor>
  #nextfd: number

  constructor() {
    this.#fds = {};
    this.#nextfd = 3;
  }

  initialize(instance: WebAssembly.Instance) {
    const memory = instance.exports['memory'];
    if (!(memory instanceof WebAssembly.Memory)) {
      throw new Error(`!${memory} instanceof WebAssembly.Memory`);
    }
    this.#_memory = memory;
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

  sock_recv(fd: number, ri_data: number, ri_data_len: number, ri_flags: number, result: number): number {
    if (ri_flags !== 0) {
      return ENOSYS;
    }

    const { rcx, waker } = this.#fds[fd] ?? {};
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

  sock_send(fd: number, si_data: number, si_data_len: number, _si_flags: number, result: number): number {
    const { wcx, waker } = this.#fds[fd] ?? {};
    if (!wcx || !waker) {
      return EBADF;
    }

    switch (wcx.state) {
      case "idle":
        break;

      case "writing":
        return EAGAIN;
    }
    wcx.state = "writing";
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


