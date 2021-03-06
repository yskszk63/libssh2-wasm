export type WasiExports = {
  memory: WebAssembly.Memory;
  _initialize(): void;
};

export function isWasiExports(
  item: WebAssembly.Exports,
): item is WasiExports & WebAssembly.Exports {
  if (!(item["memory"] instanceof WebAssembly.Memory)) {
    return false;
  }

  const props = [
    "_initialize",
  ];

  for (const prop of props) {
    if (typeof item[prop] !== "function") {
      return false;
    }
  }
  return true;
}

export type CExports = {
  errno: WebAssembly.Global;
  malloc(size: number): number;
  free(ptr: number): void;
  open(pathname: number, flags: number): number;
  close(fd: number): number;
  strerror(errnum: number): number;
};

export function isCExports(
  item: WebAssembly.Exports,
): item is CExports & WebAssembly.Exports {
  if (!(item["errno"] instanceof WebAssembly.Global)) {
    return false;
  }

  const props = [
    "malloc",
    "free",
    "open",
    "close",
  ];

  for (const prop of props) {
    if (typeof item[prop] !== "function") {
      return false;
    }
  }
  return true;
}

export type Libssh2Exports = {
  libssh2_version(required_version: number): number;
  libssh2_init(flags: number): number;
  libssh2_exit(): void;

  libssh2_session_init_ex(
    myalloc: number,
    myfree: number,
    myrealloc: number,
    abstract: number,
  ): number;
  libssh2_session_free(session: number): number;
  libssh2_session_set_blocking(session: number, blocking: number): number;
  libssh2_session_handshake(session: number, socket: number): number;
  libssh2_session_last_error(
    session: number,
    errmsg: number,
    errmsg_len: number,
    want_buf: number,
  ): number;
  libssh2_session_last_errno(session: number): number;
  libssh2_session_disconnect_ex(
    session: number,
    reason: number,
    description: number,
    lang: number,
  ): number;
  libssh2_session_hostkey(session: number, len: number, type: number): number;
  libssh2_session_method_pref(
    session: number,
    method_type: number,
    prefs: number,
  ): number;

  libssh2_userauth_authenticated(session: number): number;
  libssh2_userauth_publickey_frommemory(
    session: number,
    username: number,
    username_len: number,
    publickeydata: number,
    publickeydata_len: number,
    privatekeydata: number,
    privatekeydata_len: number,
    passphrase: number,
  ): number;

  libssh2_channel_open_ex(
    session: number,
    channel_type: number,
    channel_type_len: number,
    window_size: number,
    packet_size: number,
    message: number,
    message_len: number,
  ): number;
  libssh2_channel_close(channel: number): number;
  libssh2_channel_wait_closed(channel: number): number;
  libssh2_channel_process_startup(
    channel: number,
    request: number,
    request_len: number,
    message: number,
    message_len: number,
  ): number;
  libssh2_channel_send_eof(channel: number): number;
  libssh2_channel_eof(channel: number): number;
  libssh2_channel_read_ex(
    channel: number,
    stream_id: number,
    buf: number,
    buflen: number,
  ): number;
  libssh2_channel_free(channel: number): number;
  libssh2_channel_write_ex(
    channel: number,
    stream_id: number,
    buf: number,
    buflen: number,
  ): number;
  libssh2_channel_flush_ex(channel: number, stream_id: number): number;
  libssh2_channel_wait_eof(channel: number): number;
  libssh2_channel_get_exit_status(channel: number): number;
  libssh2_channel_get_exit_signal(
    channel: number,
    exitsignal: number,
    exitsignal_len: number,
    errmsg: number,
    errmsg_len: number,
    langtag: number,
    langtag_len: number,
  ): number;

  libssh2_knownhost_init(session: number): number;
  libssh2_knownhost_free(hosts: number): void;
  libssh2_knownhost_readline(
    hosts: number,
    line: number,
    len: number,
    type: number,
  ): number;
  libssh2_knownhost_checkp(
    hosts: number,
    host: number,
    pot: number,
    key: number,
    keylen: number,
    typemask: number,
    knownhost: number,
  ): number;
};

export function isLibssh2Exports(
  item: WebAssembly.Exports,
): item is Libssh2Exports & WebAssembly.Exports {
  const props = [
    "libssh2_version",
    "libssh2_init",
    "libssh2_exit",

    "libssh2_session_init_ex",
    "libssh2_session_free",
    "libssh2_session_set_blocking",
    "libssh2_session_handshake",
    "libssh2_session_last_error",
    "libssh2_session_last_errno",
    "libssh2_session_disconnect_ex",
    "libssh2_session_hostkey",

    "libssh2_userauth_authenticated",
    "libssh2_userauth_publickey_frommemory",

    "libssh2_channel_open_ex",
    "libssh2_channel_close",
    "libssh2_channel_wait_closed",
    "libssh2_channel_process_startup",
    "libssh2_channel_send_eof",
    "libssh2_channel_eof",
    "libssh2_channel_read_ex",
    "libssh2_channel_free",
    "libssh2_channel_write_ex",
    "libssh2_channel_flush_ex",
    "libssh2_channel_wait_eof",
    "libssh2_channel_get_exit_status",
    "libssh2_channel_get_exit_signal",

    "libssh2_knownhost_init",
    "libssh2_knownhost_free",
    "libssh2_knownhost_readline",
    "libssh2_knownhost_checkp",
  ];

  for (const prop of props) {
    if (typeof item[prop] !== "function") {
      return false;
    }
  }
  return true;
}
