# libssh2-wasm

Node bindings for libssh2 built with WASI.

Work In Progress...

## Example

```typescript
const session = await libssh2.connect({
  host: "localhost",
  port: 2222,
  knownhost: "[localhost]:2222 ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIMdYZGgT+jpoNO4HLbRPzAgDzApC1ASA8MI9qV4Mn9Z6",
  username: "yskszk63",
  privatekey: () => fs.readFile("./test_id_ed25519"),
});
try {
  const channel = await session.exec("cat");
  try {
    const {
      stdin, // WritableStream
      stdout, // ReadableStream
      stderr, // ReadableStream
    } = channel;

    const t1 = stdout.pipeTo(...);
    const t2 = stderr.pipeTo(...);
    xxx.pipeTo(stdin);
    await Promise.all([t1, t2, channel.waitEof()]);
    console.log(channel.status);

  } finally {
    await channel.close();
    channel.free();
  }

} finally {
  await session.disconnect();
  session.close();
  session.free();
}
```

## License

[MIT](LICENSE)

## Author

[yskszk63](https://github.com/yskszk63)
