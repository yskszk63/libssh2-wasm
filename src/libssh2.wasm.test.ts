import { assertSnapshot } from "std/testing/snapshot.ts";

import { compile } from "@/libssh2.wasm.js";

Deno.test("snapshot - imports", async (t) => {
  const module = await compile();
  await assertSnapshot(t, WebAssembly.Module.imports(module));
});

Deno.test("snapshot - exports", async (t) => {
  const module = await compile();
  await assertSnapshot(t, WebAssembly.Module.exports(module));
});

Deno.test("compile without WebAssembly.compileStreaming", async () => {
  const old = WebAssembly.compileStreaming;
  try {
    // deno-lint-ignore no-explicit-any
    delete (WebAssembly as any)["compileStreaming"];
    await compile();
  } finally {
    WebAssembly.compileStreaming = old; // Just making sure.
  }
});
