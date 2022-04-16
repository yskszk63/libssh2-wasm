openssl_url = https://www.openssl.org/source/openssl-1.1.1n.tar.gz
openssl_tar_gz = deps/openssl.tar.gz
openssl_dir = deps/openssl
libcrypto_a = $(openssl_dir)/libcrypto.a
libssl_a = $(openssl_dir)/libssl.a

libssh2_url = https://www.libssh2.org/download/libssh2-1.10.0.tar.gz
libssh2_tar_gz = deps/libssh2.tar.gz
libssh2_dir = deps/libssh2
libssh2_build_dir = deps/libssh2_build
libssh2_so = $(libssh2_build_dir)/src/libssh2.so

libssh2_wasm = libssh2.wasm

WASI_SDK_PREFIX = /opt/wasi-sdk
CC = $(WASI_SDK_PREFIX)/bin/clang
AR = $(WASI_SDK_PREFIX)/bin/ar
RANLIB = $(WASI_SDK_PREFIX)/bin/ranlib
CMAKE = cmake

openssl_configure_opts  = no-hw
openssl_configure_opts += no-threads
openssl_configure_opts += no-shared
openssl_configure_opts += no-zlib
openssl_configure_opts += no-asm
openssl_configure_opts += no-sock
openssl_configure_opts += no-dso
openssl_configure_opts += no-afalgeng
openssl_configure_opts += --with-rand-seed=devrandom

openssl_target = linux-generic32

openssl_cflags  = -DNO_SYSLOG
openssl_cflags += -DOPENSSL_NO_UI_CONSOLE
openssl_cflags += -DOPENSSL_NO_SECURE_MEMORY
openssl_cflags += -DDEVRANDOM='\"/dev/urandom\"'
openssl_cflags += -D_WASI_EMULATED_SIGNAL
openssl_cflags += -D_WASI_EMULATED_PROCESS_CLOCKS
openssl_cflags += -D_WASI_EMULATED_MMAN

openssl_ldflags  = -lwasi-emulated-signal
openssl_ldflags += -lwasi-emulated-process-clocks
openssl_ldflags += -lwasi-emulated-mman

libssh2_ldflags += -lwasi-emulated-signal
libssh2_ldflags += -lwasi-emulated-process-clocks
libssh2_ldflags += -lwasi-emulated-mman
libssh2_ldflags += -Wl,--allow-undefined
libssh2_ldflags += -mexec-model=reactor

libssh2_ldflags += -Wl,--export=errno
libssh2_ldflags += -Wl,--export=malloc
libssh2_ldflags += -Wl,--export=free
libssh2_ldflags += -Wl,--export=open
libssh2_ldflags += -Wl,--export=close
libssh2_ldflags += -Wl,--export=strerror

libssh2_ldflags += -Wl,--export=libssh2_agent_connect
libssh2_ldflags += -Wl,--export=libssh2_agent_disconnect
libssh2_ldflags += -Wl,--export=libssh2_agent_free
libssh2_ldflags += -Wl,--export=libssh2_agent_get_identity
libssh2_ldflags += -Wl,--export=libssh2_agent_get_identity_path
libssh2_ldflags += -Wl,--export=libssh2_agent_init
libssh2_ldflags += -Wl,--export=libssh2_agent_list_identities
libssh2_ldflags += -Wl,--export=libssh2_agent_set_identity_path
libssh2_ldflags += -Wl,--export=libssh2_agent_userauth
libssh2_ldflags += -Wl,--export=libssh2_banner_set
libssh2_ldflags += -Wl,--export=libssh2_base64_decode
libssh2_ldflags += -Wl,--export=libssh2_channel_close
libssh2_ldflags += -Wl,--export=libssh2_channel_direct_tcpip
libssh2_ldflags += -Wl,--export=libssh2_channel_direct_tcpip_ex
libssh2_ldflags += -Wl,--export=libssh2_channel_eof
libssh2_ldflags += -Wl,--export=libssh2_channel_exec
libssh2_ldflags += -Wl,--export=libssh2_channel_flush
libssh2_ldflags += -Wl,--export=libssh2_channel_flush_ex
libssh2_ldflags += -Wl,--export=libssh2_channel_flush_stderr
libssh2_ldflags += -Wl,--export=libssh2_channel_forward_accept
libssh2_ldflags += -Wl,--export=libssh2_channel_forward_cancel
libssh2_ldflags += -Wl,--export=libssh2_channel_forward_listen
libssh2_ldflags += -Wl,--export=libssh2_channel_forward_listen_ex
libssh2_ldflags += -Wl,--export=libssh2_channel_free
libssh2_ldflags += -Wl,--export=libssh2_channel_get_exit_signal
libssh2_ldflags += -Wl,--export=libssh2_channel_get_exit_status
libssh2_ldflags += -Wl,--export=libssh2_channel_handle_extended_data
libssh2_ldflags += -Wl,--export=libssh2_channel_handle_extended_data2
libssh2_ldflags += -Wl,--export=libssh2_channel_ignore_extended_data
libssh2_ldflags += -Wl,--export=libssh2_channel_open_ex
libssh2_ldflags += -Wl,--export=libssh2_channel_open_session
libssh2_ldflags += -Wl,--export=libssh2_channel_process_startup
libssh2_ldflags += -Wl,--export=libssh2_channel_read
libssh2_ldflags += -Wl,--export=libssh2_channel_read_ex
libssh2_ldflags += -Wl,--export=libssh2_channel_read_stderr
libssh2_ldflags += -Wl,--export=libssh2_channel_receive_window_adjust
libssh2_ldflags += -Wl,--export=libssh2_channel_receive_window_adjust2
libssh2_ldflags += -Wl,--export=libssh2_channel_request_auth_agent
libssh2_ldflags += -Wl,--export=libssh2_channel_request_pty
libssh2_ldflags += -Wl,--export=libssh2_channel_request_pty_ex
libssh2_ldflags += -Wl,--export=libssh2_channel_request_pty_size
libssh2_ldflags += -Wl,--export=libssh2_channel_request_pty_size_ex
libssh2_ldflags += -Wl,--export=libssh2_channel_send_eof
libssh2_ldflags += -Wl,--export=libssh2_channel_set_blocking
libssh2_ldflags += -Wl,--export=libssh2_channel_setenv
libssh2_ldflags += -Wl,--export=libssh2_channel_setenv_ex
libssh2_ldflags += -Wl,--export=libssh2_channel_shell
libssh2_ldflags += -Wl,--export=libssh2_channel_subsystem
libssh2_ldflags += -Wl,--export=libssh2_channel_wait_closed
libssh2_ldflags += -Wl,--export=libssh2_channel_wait_eof
libssh2_ldflags += -Wl,--export=libssh2_channel_window_read
libssh2_ldflags += -Wl,--export=libssh2_channel_window_read_ex
libssh2_ldflags += -Wl,--export=libssh2_channel_window_write
libssh2_ldflags += -Wl,--export=libssh2_channel_window_write_ex
libssh2_ldflags += -Wl,--export=libssh2_channel_write
libssh2_ldflags += -Wl,--export=libssh2_channel_write_ex
libssh2_ldflags += -Wl,--export=libssh2_channel_write_stderr
libssh2_ldflags += -Wl,--export=libssh2_channel_x11_req
libssh2_ldflags += -Wl,--export=libssh2_channel_x11_req_ex
libssh2_ldflags += -Wl,--export=libssh2_exit
libssh2_ldflags += -Wl,--export=libssh2_free
libssh2_ldflags += -Wl,--export=libssh2_hostkey_hash
libssh2_ldflags += -Wl,--export=libssh2_init
libssh2_ldflags += -Wl,--export=libssh2_keepalive_config
libssh2_ldflags += -Wl,--export=libssh2_keepalive_send
libssh2_ldflags += -Wl,--export=libssh2_knownhost_add
libssh2_ldflags += -Wl,--export=libssh2_knownhost_addc
libssh2_ldflags += -Wl,--export=libssh2_knownhost_check
libssh2_ldflags += -Wl,--export=libssh2_knownhost_checkp
libssh2_ldflags += -Wl,--export=libssh2_knownhost_del
libssh2_ldflags += -Wl,--export=libssh2_knownhost_free
libssh2_ldflags += -Wl,--export=libssh2_knownhost_get
libssh2_ldflags += -Wl,--export=libssh2_knownhost_init
libssh2_ldflags += -Wl,--export=libssh2_knownhost_readfile
libssh2_ldflags += -Wl,--export=libssh2_knownhost_readline
libssh2_ldflags += -Wl,--export=libssh2_knownhost_writefile
libssh2_ldflags += -Wl,--export=libssh2_knownhost_writeline
libssh2_ldflags += -Wl,--export=libssh2_poll
libssh2_ldflags += -Wl,--export=libssh2_poll_channel_read
libssh2_ldflags += -Wl,--export=libssh2_publickey_add
libssh2_ldflags += -Wl,--export=libssh2_publickey_add_ex
libssh2_ldflags += -Wl,--export=libssh2_publickey_init
libssh2_ldflags += -Wl,--export=libssh2_publickey_list_fetch
libssh2_ldflags += -Wl,--export=libssh2_publickey_list_free
libssh2_ldflags += -Wl,--export=libssh2_publickey_remove
libssh2_ldflags += -Wl,--export=libssh2_publickey_remove_ex
libssh2_ldflags += -Wl,--export=libssh2_publickey_shutdown
libssh2_ldflags += -Wl,--export=libssh2_scp_recv
libssh2_ldflags += -Wl,--export=libssh2_scp_recv2
libssh2_ldflags += -Wl,--export=libssh2_scp_send
libssh2_ldflags += -Wl,--export=libssh2_scp_send64
libssh2_ldflags += -Wl,--export=libssh2_scp_send_ex
libssh2_ldflags += -Wl,--export=libssh2_session_abstract
libssh2_ldflags += -Wl,--export=libssh2_session_banner_get
libssh2_ldflags += -Wl,--export=libssh2_session_banner_set
libssh2_ldflags += -Wl,--export=libssh2_session_block_directions
libssh2_ldflags += -Wl,--export=libssh2_session_callback_set
libssh2_ldflags += -Wl,--export=libssh2_session_disconnect
libssh2_ldflags += -Wl,--export=libssh2_session_disconnect_ex
libssh2_ldflags += -Wl,--export=libssh2_session_flag
libssh2_ldflags += -Wl,--export=libssh2_session_free
libssh2_ldflags += -Wl,--export=libssh2_session_get_blocking
libssh2_ldflags += -Wl,--export=libssh2_session_get_timeout
libssh2_ldflags += -Wl,--export=libssh2_session_handshake
libssh2_ldflags += -Wl,--export=libssh2_session_hostkey
libssh2_ldflags += -Wl,--export=libssh2_session_init
libssh2_ldflags += -Wl,--export=libssh2_session_init_ex
libssh2_ldflags += -Wl,--export=libssh2_session_last_errno
libssh2_ldflags += -Wl,--export=libssh2_session_last_error
libssh2_ldflags += -Wl,--export=libssh2_session_method_pref
libssh2_ldflags += -Wl,--export=libssh2_session_methods
libssh2_ldflags += -Wl,--export=libssh2_session_set_blocking
libssh2_ldflags += -Wl,--export=libssh2_session_set_last_error
libssh2_ldflags += -Wl,--export=libssh2_session_set_timeout
libssh2_ldflags += -Wl,--export=libssh2_session_startup
libssh2_ldflags += -Wl,--export=libssh2_session_supported_algs
libssh2_ldflags += -Wl,--export=libssh2_sftp_close
libssh2_ldflags += -Wl,--export=libssh2_sftp_close_handle
libssh2_ldflags += -Wl,--export=libssh2_sftp_closedir
libssh2_ldflags += -Wl,--export=libssh2_sftp_fsetstat
libssh2_ldflags += -Wl,--export=libssh2_sftp_fstat
libssh2_ldflags += -Wl,--export=libssh2_sftp_fstat_ex
libssh2_ldflags += -Wl,--export=libssh2_sftp_fstatvfs
libssh2_ldflags += -Wl,--export=libssh2_sftp_fsync
libssh2_ldflags += -Wl,--export=libssh2_sftp_get_channel
libssh2_ldflags += -Wl,--export=libssh2_sftp_init
libssh2_ldflags += -Wl,--export=libssh2_sftp_last_error
libssh2_ldflags += -Wl,--export=libssh2_sftp_lstat
libssh2_ldflags += -Wl,--export=libssh2_sftp_mkdir
libssh2_ldflags += -Wl,--export=libssh2_sftp_mkdir_ex
libssh2_ldflags += -Wl,--export=libssh2_sftp_open
libssh2_ldflags += -Wl,--export=libssh2_sftp_open_ex
libssh2_ldflags += -Wl,--export=libssh2_sftp_opendir
libssh2_ldflags += -Wl,--export=libssh2_sftp_read
libssh2_ldflags += -Wl,--export=libssh2_sftp_readdir
libssh2_ldflags += -Wl,--export=libssh2_sftp_readdir_ex
libssh2_ldflags += -Wl,--export=libssh2_sftp_readlink
libssh2_ldflags += -Wl,--export=libssh2_sftp_realpath
libssh2_ldflags += -Wl,--export=libssh2_sftp_rename
libssh2_ldflags += -Wl,--export=libssh2_sftp_rename_ex
libssh2_ldflags += -Wl,--export=libssh2_sftp_rewind
libssh2_ldflags += -Wl,--export=libssh2_sftp_rmdir
libssh2_ldflags += -Wl,--export=libssh2_sftp_rmdir_ex
libssh2_ldflags += -Wl,--export=libssh2_sftp_seek
libssh2_ldflags += -Wl,--export=libssh2_sftp_seek64
libssh2_ldflags += -Wl,--export=libssh2_sftp_setstat
libssh2_ldflags += -Wl,--export=libssh2_sftp_shutdown
libssh2_ldflags += -Wl,--export=libssh2_sftp_stat
libssh2_ldflags += -Wl,--export=libssh2_sftp_stat_ex
libssh2_ldflags += -Wl,--export=libssh2_sftp_statvfs
libssh2_ldflags += -Wl,--export=libssh2_sftp_symlink
libssh2_ldflags += -Wl,--export=libssh2_sftp_symlink_ex
libssh2_ldflags += -Wl,--export=libssh2_sftp_tell
libssh2_ldflags += -Wl,--export=libssh2_sftp_tell64
libssh2_ldflags += -Wl,--export=libssh2_sftp_unlink
libssh2_ldflags += -Wl,--export=libssh2_sftp_unlink_ex
libssh2_ldflags += -Wl,--export=libssh2_sftp_write
libssh2_ldflags += -Wl,--export=libssh2_trace
libssh2_ldflags += -Wl,--export=libssh2_trace_sethandler
libssh2_ldflags += -Wl,--export=libssh2_userauth_authenticated
libssh2_ldflags += -Wl,--export=libssh2_userauth_hostbased_fromfile
libssh2_ldflags += -Wl,--export=libssh2_userauth_hostbased_fromfile_ex
libssh2_ldflags += -Wl,--export=libssh2_userauth_keyboard_interactive
libssh2_ldflags += -Wl,--export=libssh2_userauth_keyboard_interactive_ex
libssh2_ldflags += -Wl,--export=libssh2_userauth_list
libssh2_ldflags += -Wl,--export=libssh2_userauth_password
libssh2_ldflags += -Wl,--export=libssh2_userauth_password_ex
libssh2_ldflags += -Wl,--export=libssh2_userauth_publickey
libssh2_ldflags += -Wl,--export=libssh2_userauth_publickey_fromfile
libssh2_ldflags += -Wl,--export=libssh2_userauth_publickey_fromfile_ex
libssh2_ldflags += -Wl,--export=libssh2_userauth_publickey_frommemory
libssh2_ldflags += -Wl,--export=libssh2_version

$(libssh2_wasm): $(libssh2_so)
	cp $< $@

$(libssh2_so): $(libssh2_build_dir)/Makefile
	$(CMAKE) --build $(libssh2_build_dir) --target libssh2

$(libssh2_build_dir)/Makefile: $(libssl_a) $(libcrypto_a) $(libssh2_dir)/CMakeLists.txt
	mkdir -p $(libssh2_build_dir)
	$(CMAKE) -S $(libssh2_dir) -B $(libssh2_build_dir) --toolchain $(WASI_SDK_PREFIX)/share/cmake/wasi-sdk.cmake -DWASI_SDK_PREFIX=$(WASI_SDK_PREFIX) -DBUILD_SHARED_LIBS=ON -DCRYPTO_BACKEND=OpenSSL -DOPENSSL_CRYPTO_LIBRARY=$(openssl_dir)/libcrypto.a -DOPENSSL_SSL_LIBRARY=$(openssl_dir)/libssl.a -DOPENSSL_INCLUDE_DIR=$(openssl_dir)/include -DCMAKE_C_COMPILER_ID=Clang -DCMAKE_SHARED_LINKER_FLAGS="$(libssh2_ldflags)" -DCMAKE_BUILD_TYPE=Release

$(libssl_a) $(libcrypto_a): $(openssl_dir)/Configure
	cd $(openssl_dir) && CC=$(CC) AR=$(AR) RANLIB=$(RANLIB) ./Configure $(openssl_configure_opts) $(openssl_target)
	$(MAKE) -C $(openssl_dir) build_libs CFLAGS="$(openssl_cflags)" LDFLAGS="$(openssl_ldflags)"

$(libssh2_dir)/CMakeLists.txt:
	mkdir -p dpes $(libssh2_dir)
	curl -sSfL $(libssh2_url) -o $@
	tar zxf $< --strip-components=1 -C $@

$(openssl_dir)/Configure:
	mkdir -p deps $(openssl_dir)
	curl -sSfL $(openssl_url) -o $(openssl_tar_gz)
	tar zxf $(openssl_tar_gz) --strip-components=1 -C $(openssl_dir)

.PHONY: clean
clean:
	$(RM) -rf deps
	$(RM) $(libssh2_wasm)
