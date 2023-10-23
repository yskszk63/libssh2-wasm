interface Task {
  (): void;
}

interface Releaser {
  release(): void;
  [Symbol.dispose](): void;
}

export class Mutex {
  #locked = false;
  #tasks: Task[] = [];

  acquire(signal?: AbortSignal | undefined): Promise<Releaser> {
    let released = false;
    const release = () => {
      if (released) {
        return;
      }

      released = true;
      const next = this.#tasks.shift();
      if (typeof next !== "undefined") {
        return next();
      }

      this.#locked = false;
    };
    signal?.addEventListener("abort", () => release());

    const releaser = {
      release,
      [Symbol.dispose]: release,
    };

    if (!this.#locked) {
      this.#locked = true;
      return Promise.resolve(releaser);
    }

    return new Promise<Releaser>((resolve) => {
      this.#tasks.push(() => resolve(releaser));
    });
  }
}
