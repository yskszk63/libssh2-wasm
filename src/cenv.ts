import type { CExports, WasiExports } from "./sys";

export class CPtr {
  #env: CEnv
  #ptr: number | null
  #len: number | null
  #owned: boolean

  constructor(env: CEnv, ptr: number, len: number | null, owned: boolean) {
    this.#env = env;
    this.#ptr = ptr;
    this.#len = len;
    this.#owned = owned;
  }

  get ptr(): number {
    if (this.#ptr === null) {
      throw new Error("already freed.");
    }
    return this.#ptr;
  }

  get len(): number | null {
    return this.#len;
  }

  get live(): boolean {
    return this.#ptr !== null;
  }

  get owned(): boolean {
    return this.#owned;
  }

  free() {
    if (!this.#owned) {
      throw new Error("not owned.");
    }
    this.#env.free(this);
    this.#ptr = null;
  }
}

export default class CEnv {
  #exports: CExports & WasiExports

  constructor(exports: CExports & WasiExports) {
    this.#exports = exports;
  }

  malloc(len: number): CPtr {
    const ptr = this.#exports.malloc(len);
    if (ptr === 0) {
      throw new Error("failed to alloc memory.");
    }
    return new CPtr(this, ptr, len, true);
  }

  free(ptr: CPtr) {
    this.#exports.free(ptr.ptr);
  }

  get errno(): number {
    const errptr = this.#exports.errno.value;
    if (!errptr) {
      return 0;
    }
    return new DataView(this.#exports.memory.buffer).getInt16(errptr, true);
  }

  strerror(errnum: number): CPtr {
    const ptr = this.#exports.strerror(errnum);
    return new CPtr(this, ptr, null, false);
  }

  cstr(s: string): CPtr {
    const b = new TextEncoder().encode(`${s}\0`);
    const ptr = this.malloc(b.byteLength);
    this.set(ptr, b);
    return ptr;
  }

  set(ptr: CPtr, content: Uint8Array) {
    if (ptr.len === null || ptr.len !== content.byteLength) {
      throw new Error();
    }
    new Uint8Array(this.#exports.memory.buffer, ptr.ptr, ptr.len).set(content);
  }

  copy(content: Uint8Array): CPtr {
    const ptr = this.malloc(content.byteLength);
    this.set(ptr, content);
    return ptr;
  }

  str(ptr: CPtr): string {
    const off = ptr.ptr;
    let len = ptr.len;
    if (len === null) {
      len = new Uint8Array(this.#exports.memory.buffer, off).indexOf(0);
      if (len < 0) {
        throw new Error();
      }
    }
    const buf = new Uint8Array(this.#exports.memory.buffer, off, len);
    return new TextDecoder().decode(buf);
  }

  u32(ptr: CPtr): number {
    if (ptr.len !== null && ptr.len < 4) {
      throw new Error();
    }
    return new DataView(this.#exports.memory.buffer).getUint32(ptr.ptr, true);
  }

  ref(off: number, len: number | null): CPtr {
    return new CPtr(this, off, len, false);
  }

  async with<R>(ss: Array<string | CPtr>, fn: (ptrs: CPtr[]) => Promise<R>): Promise<R> {
    const allocs: CPtr[] = [];
    function free() {
      for (const ptr of allocs) {
        if (ptr.live && ptr.owned) {
          ptr.free();
        }
      }
    }

    try {
      for (const s of ss) {
        if (typeof s === "string") {
          const ptr = this.cstr(s);
          allocs.push(ptr);
        } else {
          allocs.push(s);
        }
      }
      return await fn(allocs);

    } finally {
      free();
    }
  }

  ccall<F extends Function>(fn: F, ...args: ArgumentTypes<F>): number {
    const r = fn(...args);
    if (r < 0) {
      const errnum = this.errno;
      const err = this.strerror(errnum);
      throw new Error(this.str(err));
    }
    return r;
  }
}

// https://stackoverflow.com/questions/51851677/how-to-get-argument-types-from-function-in-typescript
type ArgumentTypes<F extends Function> = F extends (...args: infer A) => number ? A : never;
