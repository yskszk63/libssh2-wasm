interface Allocator {
  memory: WebAssembly.Memory;
  malloc(size: number): number;
  free(ptr: number): void;
}

export class Pointer {
  #allocator: Allocator;
  #ptr: number;
  #length: number;

  constructor(allocator: Allocator, ptr: number, length: number) {
    if (ptr === 0) {
      throw new Error("Null pointer.");
    }

    this.#allocator = allocator;
    this.#ptr = ptr;
    this.#length = length;
  }

  get ptr() {
    if (this.#ptr === 0) {
      throw new Error("Invalid reference.");
    }

    return this.#ptr;
  }

  get length() {
    return this.#length;
  }

  set(buf: ArrayLike<number>, offset = 0) {
    if (offset + buf.length > this.length) {
      throw new Error(`Too large. ${buf.length} > ${this.length}`);
    }

    new Uint8Array(
      this.#allocator.memory.buffer,
      this.ptr + offset,
      this.length,
    ).set(buf);
  }

  free() {
    if (this.#ptr === 0) {
      return;
    }

    this.#allocator.free(this.#ptr);
    this.#ptr = 0;
    this.#length = 0;
  }

  [Symbol.dispose]() {
    this.free();
  }
}

export class Memory {
  #allocator: Allocator;

  constructor(allocator: Allocator) {
    this.#allocator = allocator;
  }

  malloc(size: number): Pointer {
    const ret = this.#allocator.malloc(size);
    if (ret < 0) {
      throw new Error("Failed to allocate memory.");
    }

    return new Pointer(this.#allocator, ret, size);
  }

  str(text: string): Pointer {
    const buf = new TextEncoder().encode(text);
    const ptr = this.malloc(buf.length + 1);
    ptr.set(buf);
    ptr.set([0], buf.length);
    return ptr;
  }
}
