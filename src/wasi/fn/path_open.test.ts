import * as assert from "std/assert/mod.ts";
import { describe, it } from "std/testing/bdd.ts";

import { path_open } from "@/wasi/fn/mod.ts";
import * as ty from "@/wasi/ty/mod.ts";
import * as errno from "@/wasi/define/errno.ts";
import * as filetype from "@/wasi/define/filetype.ts";
import * as rights from "@/wasi/define/rights.ts";

describe("path_open", () => {
  it("noent", () => {
    const cx = {
      memory: new WebAssembly.Memory({ initial: 32 }),
      fds: {
        0: {
          type: "dir" as const,
          name: new TextEncoder().encode("/dev"),
          stat: {
            fs_filetype: filetype.directory,
            fs_flags: 0 as ty.fdflags,
            fs_rights_base: rights.fd_readdir,
            fs_rights_inheriting: 0n as ty.rights,
          },
        },
      },
      nextfd: 1,
    };
    const name = new TextEncoder().encode("notexists");
    new Uint8Array(cx.memory.buffer).set(name);
    assert.assertEquals(
      path_open(
        cx,
        0 as ty.fd,
        0 as ty.lookupflags,
        0 as ty.PointerU8,
        name.byteLength as ty.size,
        0 as ty.oflags,
        0n as ty.rights,
        0n as ty.rights,
        0 as ty.fdflags,
        name.byteLength,
      ),
      errno.noent,
    );
  });

  it("noparent", () => {
    const cx = {
      memory: new WebAssembly.Memory({ initial: 32 }),
      fds: {
        0: {
          type: "dir" as const,
          name: new TextEncoder().encode("/dev"),
          stat: {
            fs_filetype: filetype.directory,
            fs_flags: 0 as ty.fdflags,
            fs_rights_base: rights.fd_readdir,
            fs_rights_inheriting: 0n as ty.rights,
          },
        },
      },
      nextfd: 1,
    };
    const name = new TextEncoder().encode("notexists");
    new Uint8Array(cx.memory.buffer).set(name);
    assert.assertEquals(
      path_open(
        cx,
        1 as ty.fd,
        0 as ty.lookupflags,
        0 as ty.PointerU8,
        name.byteLength as ty.size,
        0 as ty.oflags,
        0n as ty.rights,
        0n as ty.rights,
        0 as ty.fdflags,
        name.byteLength,
      ),
      errno.noent,
    );
  });

  it("notdir", () => {
    const cx = {
      memory: new WebAssembly.Memory({ initial: 32 }),
      fds: {
        0: {
          type: "random" as const,
          stat: {
            fs_filetype: filetype.character_device,
            fs_flags: 0 as ty.fdflags,
            fs_rights_base: rights.fd_readdir,
            fs_rights_inheriting: 0n as ty.rights,
          },
        },
      },
      nextfd: 1,
    };
    const name = new TextEncoder().encode("notexists");
    new Uint8Array(cx.memory.buffer).set(name);
    assert.assertEquals(
      path_open(
        cx,
        0 as ty.fd,
        0 as ty.lookupflags,
        0 as ty.PointerU8,
        name.byteLength as ty.size,
        0 as ty.oflags,
        0n as ty.rights,
        0n as ty.rights,
        0 as ty.fdflags,
        name.byteLength,
      ),
      errno.badf,
    );
  });

  it("random", () => {
    const cx = {
      memory: new WebAssembly.Memory({ initial: 32 }),
      fds: {
        0: {
          type: "dir" as const,
          name: new TextEncoder().encode("/dev"),
          stat: {
            fs_filetype: filetype.directory,
            fs_flags: 0 as ty.fdflags,
            fs_rights_base: rights.fd_readdir,
            fs_rights_inheriting: 0n as ty.rights,
          },
        },
      },
      nextfd: 1,
    };
    const name = new TextEncoder().encode("random");
    new Uint8Array(cx.memory.buffer).set(name);
    assert.assertEquals(
      path_open(
        cx,
        0 as ty.fd,
        0 as ty.lookupflags,
        0 as ty.PointerU8,
        name.byteLength as ty.size,
        0 as ty.oflags,
        0n as ty.rights,
        0n as ty.rights,
        0 as ty.fdflags,
        name.byteLength,
      ),
      errno.success,
    );
    assert.assertEquals(
      new DataView(cx.memory.buffer, name.byteLength).getUint32(0, true),
      1,
    );
    // deno-lint-ignore no-explicit-any
    assert.assertEquals((cx.fds as any)[1], {
      stat: {
        fs_filetype: 6,
        fs_flags: 0,
        fs_rights_base: 0n,
        fs_rights_inheriting: 0n,
      },
      type: "random",
    });
  });

  it("socket", () => {
    const cx = {
      memory: new WebAssembly.Memory({ initial: 32 }),
      fds: {
        0: {
          type: "dir" as const,
          name: new TextEncoder().encode("/dev"),
          stat: {
            fs_filetype: filetype.directory,
            fs_flags: 0 as ty.fdflags,
            fs_rights_base: rights.fd_readdir,
            fs_rights_inheriting: 0n as ty.rights,
          },
        },
      },
      nextfd: 1,
    };
    const name = new TextEncoder().encode("socket");
    new Uint8Array(cx.memory.buffer).set(name);
    assert.assertEquals(
      path_open(
        cx,
        0 as ty.fd,
        0 as ty.lookupflags,
        0 as ty.PointerU8,
        name.byteLength as ty.size,
        0 as ty.oflags,
        0n as ty.rights,
        0n as ty.rights,
        0 as ty.fdflags,
        name.byteLength,
      ),
      errno.success,
    );
    assert.assertEquals(
      new DataView(cx.memory.buffer, name.byteLength).getUint32(0, true),
      1,
    );
    // deno-lint-ignore no-explicit-any
    assert.assertEquals((cx.fds as any)[1], {
      stat: {
        fs_filetype: 6,
        fs_flags: 0,
        fs_rights_base: 0n,
        fs_rights_inheriting: 0n,
      },
      type: "sock",
      state: "opened",
      abort: new AbortController(),
      recvbuf: new ArrayBuffer(87040),
      sendbuf: new ArrayBuffer(87040),
    });
  });
});
