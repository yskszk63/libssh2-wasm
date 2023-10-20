import * as assert from "std/assert/mod.ts";
import { describe, it } from "std/testing/bdd.ts";
import * as path from "std/path/mod.ts";

import { Libssh2Sys } from "@/sys.ts";
import { Memory } from "@/memory.ts";

async function startSshd(signal: AbortSignal) {
  const tmpdir = await Deno.makeTempDir();
  signal.addEventListener(
    "abort",
    () => Deno.removeSync(tmpdir, { recursive: true }),
  );

  await Deno.chmod(tmpdir, 0o700);
  const hostkey = path.join(tmpdir, "hostkey");
  await new Deno.Command("ssh-keygen", {
    args: ["-f", hostkey, "-ted25519", "-q", "-N", ""],
    stdin: "null",
    stdout: "null",
    stderr: "inherit",
  }).output();
  const hostkeypub = await Deno.readFile(`${hostkey}.pub`);

  const identity = path.join(tmpdir, "identity");
  await new Deno.Command("ssh-keygen", {
    args: ["-f", identity, "-ted25519", "-q", "-N", ""],
    stdin: "null",
    stdout: "null",
    stderr: "inherit",
  }).output();
  const identitykey = await Deno.readFile(identity);

  const port = 2222;

  const cmd = new Deno.Command("/usr/sbin/sshd", {
    args: [
      `-p${port}`,
      `-oHostKey=${hostkey}`,
      `-oAuthorizedKeysFile=${identity}.pub`,
      "-oStrictModes=no",
      "-f/dev/null",
      "-ddd",
    ],
    signal,
    stdin: "null",
    stdout: "null",
    //stderr: "inherit",
    stderr: "null",
  });

  const proc = cmd.spawn();
  return {
    port,
    proc,
    hostkeypub,
    identitykey,
  };
}

describe("sys", () => {
  it("happy", async () => {
    const abort = new AbortController();
    using _ = {
      [Symbol.dispose]() {
        abort.abort();
      },
    };
    const sshd = await startSshd(abort.signal);
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

    using _3 = {
      [Symbol.dispose]() {
        sys.libssh2_exit();
      },
    };

    const session = sys.libssh2_session_init_ex(0, 0, 0, 0);
    if (session === 0) {
      throw new Error();
    }

    using _4 = {
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
    using _5 = {
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

    using username = memory.str(Deno.env.get("USER") ?? "TODO ???", true);

    let authlist: string[];
    while (true) {
      let n: number;
      if (
        (n = sys.libssh2_userauth_list(
          session,
          username.ptr,
          username.length,
        )) !== 0
      ) {
        authlist = memory.deref(n).str().split(",");
        break;
      }

      const errno = sys.libssh2_session_last_errno(session);
      if (errno !== -37) { // TODO -37 ????
        throw new Error(`${errno}`);
      }
      await sys.sys_poll(sock);
    }

    if (!authlist.includes("publickey")) {
      throw new Error(authlist.join(" "));
    }

    const privatekeydata = memory.malloc(sshd.identitykey.byteLength);
    privatekeydata.set(sshd.identitykey);
    while (true) {
      const n = sys.libssh2_userauth_publickey_frommemory(
        session,
        username.ptr,
        username.length,
        0,
        0,
        privatekeydata.ptr,
        privatekeydata.length,
        0,
      );
      if (n === 0) {
        break;
      }

      if (n !== -37) { // TODO -37 ????
        const errmsg = memory.malloc(Uint32Array.BYTES_PER_ELEMENT);
        const errmsg_len = memory.malloc(Uint32Array.BYTES_PER_ELEMENT);
        const r = sys.libssh2_session_last_error(
          session,
          errmsg.ptr,
          errmsg_len.ptr,
          errmsg.length,
        );
        if (r !== n) {
          throw new Error(`${n}`);
        }
        const view = new DataView(sys.memory.buffer);
        const msg = memory.deref(
          view.getUint32(errmsg.ptr, true),
          view.getUint32(errmsg_len.ptr, true),
        );
        throw new Error(msg.str());
      }
      await sys.sys_poll(sock);
    }
  });
});
