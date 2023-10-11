import type { Context } from "@/wasi/context.ts";
import type * as ty from "@/wasi/ty/mod.ts";

export class ProcExit extends Error {
  readonly retval: number;

  constructor(retval: number) {
    super(`Exit: ${retval}`);

    this.retval = retval;
  }
}

export function proc_exit(_cx: Context, retval: ty.exitcode): never {
  throw new ProcExit(retval);
}
