import * as assert from "std/assert/mod.ts";
import { describe, it } from "std/testing/bdd.ts";

import { Libssh2Sys } from "@/sys.ts";
import { Memory } from "@/memory.ts";

function startSshd(signal: AbortSignal) {
  const port = 2222;
  const hostkey = "~/.ssh/id_ed25519";

  const cmd = new Deno.Command("/usr/sbin/sshd", {
    args: [`-p${port}`, `-oHostKey=${hostkey}`, "-ddd"],
    signal,
    stdin: "null",
    stdout: "inherit",
    stderr: "inherit",
  });

  const proc = cmd.spawn();
  return {
    port,
    proc,
  };
}

describe("sys", () => {
  it("OK", async () => {
    const abort = new AbortController();
    using _ = {
      [Symbol.dispose]() {
        abort.abort();
      },
    };
    const sshd = startSshd(abort.signal);
    await using _2 = {
      async [Symbol.asyncDispose]() {
        sshd.proc.kill();
        await sshd.proc.status;
      },
    };

    const sys = await Libssh2Sys.instantiate(async (hostname, port, signal) => {
      const conn = await Deno.connect({
        hostname,
        port,
      });
      if (signal.aborted) {
        conn.close();
        signal.throwIfAborted();
      }
      return [conn.readable, conn.writable];
    });

    const result = sys.libssh2_init(0);
    if (result !== 0) {
      throw new Error();
    }

    // TODO defer libssh2_exit

    const session = sys.libssh2_session_init_ex(0, 0, 0, 0);
    if (session === 0) {
      throw new Error();
    }

    using _3 = {
      [Symbol.dispose]() {
        sys.libssh2_session_free(session);
      },
    };

    const memory = new Memory(sys);
    using path = memory.str("/dev/socket");
    const sock = sys.open(path.ptr, 0x0400_0000);
    if (sock < 0) {
      throw new Error();
    }
    using _4 = {
      [Symbol.dispose]() {
        sys.close(sock);
      },
    };

    await sys.sys_connect(sock, "localhost", sshd.port);
    sys.libssh2_session_set_blocking(session, 0);
    while (true) {
      const n = sys.libssh2_session_handshake(session, sock);
      if (n === 0) {
        break;
      }

      if (n !== -37) { // TODO -37 ????
        throw new Error(`${n}`);
      }
      await sys.sys_poll(sock);
    }
  });
});
