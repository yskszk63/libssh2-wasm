jobs=$(shell nproc)

openssl_version = 3.1.3
openssl_url = https://www.openssl.org/source/openssl-$(openssl_version).tar.gz
openssl_dir = deps/openssl
openssl_tar_gz = $(openssl_dir)/openssl-$(openssl_version).tar.gz
libcrypto_a = $(openssl_dir)/build/libcrypto.a
libssl_a = $(openssl_dir)/build/libssl.a

libssh2_version = 1.11.0
libssh2_url = https://www.libssh2.org/download/libssh2-$(libssh2_version).tar.gz
libssh2_dir = deps/libssh2
libssh2_tar_gz = $(libssh2_dir)/libssh2-$(libssh2_version).tar.gz
libssh2_a = $(libssh2_dir)/build/src/.libs/libssh2.a

CC = zig cc
CFLAGS = --target=wasm32-wasi -O2
CPPFLAGS = -D_WASI_EMULATED_SIGNAL -D_WASI_EMULATED_PROCESS_CLOCKS -D_WASI_EMULATED_MMAN -D_WASI_EMULATED_GETPID -Dgetuid=getpagesize -Dgeteuid=getpagesize -Dgetgid=getpagesize -Dgetegid=getpagesize
LD = zig ld.lld
LDFLAGS = -lwasi-emulated-signal -lwasi-emulated-process-clocks -lwasi-emulated-mman -lwasi-emulated-getpid
AR = zig ar
RANLIB = zig ranlib
NM = zig nm

openssl_configure_opts  = no-afalgeng
openssl_configure_opts += no-asm
openssl_configure_opts += no-async
openssl_configure_opts += no-autoload-config
openssl_configure_opts += no-comp
openssl_configure_opts += no-dgram
openssl_configure_opts += no-dso
openssl_configure_opts += no-ocsp
openssl_configure_opts += no-posix-io
openssl_configure_opts += no-rdrand
openssl_configure_opts += no-shared
openssl_configure_opts += no-sock
openssl_configure_opts += no-stdio
openssl_configure_opts += no-tests
openssl_configure_opts += no-threads
openssl_configure_opts += no-ui-console
openssl_configure_opts += no-hw
openssl_configure_opts += no-zlib
openssl_configure_opts += --with-rand-seed=devrandom

openssl_cflags  = $(CFLAGS)

openssl_cppflags  = $(CPPFLAGS)
openssl_cppflags += -DDEVRANDOM=\"\\\"/dev/urandom\\\"\"

openssl_ldflags  = $(LDFLAGS)

libssh2_configure_opts  = --host=wasm32-wasi
libssh2_configure_opts += --disable-examples-build
libssh2_configure_opts += --without-libssl-prefix
libssh2_configure_opts += --disable-tests
libssh2_configure_opts += --disable-docker-tests
libssh2_configure_opts += --disable-sshd-tests

libssh2_cflags  = $(CFLAGS)
libssh2_cflags += -I$(CURDIR)/$(openssl_dir)/build/include
libssh2_cflags += -I$(CURDIR)/$(openssl_dir)/src/include

libssh2_cppflags  = $(CPPFLAGS)

libssh2_ldflags  = $(LDFLAGS)
libssh2_ldflags += -L$(CURDIR)/$(openssl_dir)/build

exports  = -Wl,--export=errno
exports += -Wl,--export=malloc
exports += -Wl,--export=free
exports += -Wl,--export=open
exports += -Wl,--export=close
exports += -Wl,--export=strerror

exports += -Wl,--export=libssh2_agent_connect
exports += -Wl,--export=libssh2_agent_disconnect
exports += -Wl,--export=libssh2_agent_free
exports += -Wl,--export=libssh2_agent_get_identity
exports += -Wl,--export=libssh2_agent_get_identity_path
exports += -Wl,--export=libssh2_agent_init
exports += -Wl,--export=libssh2_agent_list_identities
exports += -Wl,--export=libssh2_agent_set_identity_path
exports += -Wl,--export=libssh2_agent_userauth
exports += -Wl,--export=libssh2_banner_set
exports += -Wl,--export=libssh2_base64_decode
exports += -Wl,--export=libssh2_channel_close
#exports += -Wl,--export=libssh2_channel_direct_tcpip # libssh2_channel_direct_tcpip_ex
exports += -Wl,--export=libssh2_channel_direct_tcpip_ex
exports += -Wl,--export=libssh2_channel_eof
#exports += -Wl,--export=libssh2_channel_exec # libssh2_channel_process_startup
#exports += -Wl,--export=libssh2_channel_flush # libssh2_channel_flush_ex
exports += -Wl,--export=libssh2_channel_flush_ex
#exports += -Wl,--export=libssh2_channel_flush_stderr # libssh2_channel_flush_ex
exports += -Wl,--export=libssh2_channel_forward_accept
exports += -Wl,--export=libssh2_channel_forward_cancel
#exports += -Wl,--export=libssh2_channel_forward_listen # libssh2_channel_forward_listen_ex
exports += -Wl,--export=libssh2_channel_forward_listen_ex
exports += -Wl,--export=libssh2_channel_free
exports += -Wl,--export=libssh2_channel_get_exit_signal
exports += -Wl,--export=libssh2_channel_get_exit_status
exports += -Wl,--export=libssh2_channel_handle_extended_data
exports += -Wl,--export=libssh2_channel_handle_extended_data2
#exports += -Wl,--export=libssh2_channel_ignore_extended_data # libssh2_channel_handle_extended_data
exports += -Wl,--export=libssh2_channel_open_ex
#exports += -Wl,--export=libssh2_channel_open_session # libssh2_channel_open_ex
exports += -Wl,--export=libssh2_channel_process_startup
#exports += -Wl,--export=libssh2_channel_read # libssh2_channel_read_ex
exports += -Wl,--export=libssh2_channel_read_ex
#exports += -Wl,--export=libssh2_channel_read_stderr # libssh2_channel_read_ex
exports += -Wl,--export=libssh2_channel_receive_window_adjust
exports += -Wl,--export=libssh2_channel_receive_window_adjust2
exports += -Wl,--export=libssh2_channel_request_auth_agent
#exports += -Wl,--export=libssh2_channel_request_pty # libssh2_channel_request_pty_ex
exports += -Wl,--export=libssh2_channel_request_pty_ex
#exports += -Wl,--export=libssh2_channel_request_pty_size # libssh2_channel_request_pty_size_ex
exports += -Wl,--export=libssh2_channel_request_pty_size_ex
exports += -Wl,--export=libssh2_channel_send_eof
exports += -Wl,--export=libssh2_channel_set_blocking
#exports += -Wl,--export=libssh2_channel_setenv # libssh2_channel_setenv_ex
exports += -Wl,--export=libssh2_channel_setenv_ex
#exports += -Wl,--export=libssh2_channel_shell # libssh2_channel_process_startup
#exports += -Wl,--export=libssh2_channel_subsystem # libssh2_channel_process_startup
exports += -Wl,--export=libssh2_channel_wait_closed
exports += -Wl,--export=libssh2_channel_wait_eof
#exports += -Wl,--export=libssh2_channel_window_read # libssh2_channel_window_read_ex
exports += -Wl,--export=libssh2_channel_window_read_ex
#exports += -Wl,--export=libssh2_channel_window_write # libssh2_channel_window_write_ex
exports += -Wl,--export=libssh2_channel_window_write_ex
#exports += -Wl,--export=libssh2_channel_write # libssh2_channel_write_ex
exports += -Wl,--export=libssh2_channel_write_ex
#exports += -Wl,--export=libssh2_channel_write_stderr # libssh2_channel_write_ex
#exports += -Wl,--export=libssh2_channel_x11_req # libssh2_channel_x11_req_ex
exports += -Wl,--export=libssh2_channel_x11_req_ex
exports += -Wl,--export=libssh2_exit
exports += -Wl,--export=libssh2_free
exports += -Wl,--export=libssh2_hostkey_hash
exports += -Wl,--export=libssh2_init
exports += -Wl,--export=libssh2_keepalive_config
exports += -Wl,--export=libssh2_keepalive_send
exports += -Wl,--export=libssh2_knownhost_add
exports += -Wl,--export=libssh2_knownhost_addc
exports += -Wl,--export=libssh2_knownhost_check
exports += -Wl,--export=libssh2_knownhost_checkp
exports += -Wl,--export=libssh2_knownhost_del
exports += -Wl,--export=libssh2_knownhost_free
exports += -Wl,--export=libssh2_knownhost_get
exports += -Wl,--export=libssh2_knownhost_init
exports += -Wl,--export=libssh2_knownhost_readfile
exports += -Wl,--export=libssh2_knownhost_readline
exports += -Wl,--export=libssh2_knownhost_writefile
exports += -Wl,--export=libssh2_knownhost_writeline
exports += -Wl,--export=libssh2_poll
exports += -Wl,--export=libssh2_poll_channel_read
#exports += -Wl,--export=libssh2_publickey_add # libssh2_publickey_add_ex
exports += -Wl,--export=libssh2_publickey_add_ex
exports += -Wl,--export=libssh2_publickey_init
exports += -Wl,--export=libssh2_publickey_list_fetch
exports += -Wl,--export=libssh2_publickey_list_free
#exports += -Wl,--export=libssh2_publickey_remove # libssh2_publickey_remove_ex
exports += -Wl,--export=libssh2_publickey_remove_ex
exports += -Wl,--export=libssh2_publickey_shutdown
exports += -Wl,--export=libssh2_scp_recv
exports += -Wl,--export=libssh2_scp_recv2
#exports += -Wl,--export=libssh2_scp_send # libssh2_scp_send_ex
exports += -Wl,--export=libssh2_scp_send64
exports += -Wl,--export=libssh2_scp_send_ex
exports += -Wl,--export=libssh2_session_abstract
exports += -Wl,--export=libssh2_session_banner_get
exports += -Wl,--export=libssh2_session_banner_set
exports += -Wl,--export=libssh2_session_block_directions
exports += -Wl,--export=libssh2_session_callback_set
#exports += -Wl,--export=libssh2_session_disconnect # libssh2_session_disconnect_ex
exports += -Wl,--export=libssh2_session_disconnect_ex
exports += -Wl,--export=libssh2_session_flag
exports += -Wl,--export=libssh2_session_free
exports += -Wl,--export=libssh2_session_get_blocking
exports += -Wl,--export=libssh2_session_get_timeout
exports += -Wl,--export=libssh2_session_handshake
exports += -Wl,--export=libssh2_session_hostkey
#exports += -Wl,--export=libssh2_session_init # libssh2_session_init_ex
exports += -Wl,--export=libssh2_session_init_ex
exports += -Wl,--export=libssh2_session_last_errno
exports += -Wl,--export=libssh2_session_last_error
exports += -Wl,--export=libssh2_session_method_pref
exports += -Wl,--export=libssh2_session_methods
exports += -Wl,--export=libssh2_session_set_blocking
exports += -Wl,--export=libssh2_session_set_last_error
exports += -Wl,--export=libssh2_session_set_timeout
exports += -Wl,--export=libssh2_session_startup
exports += -Wl,--export=libssh2_session_supported_algs
#exports += -Wl,--export=libssh2_sftp_close # libssh2_sftp_close_handle
exports += -Wl,--export=libssh2_sftp_close_handle
#exports += -Wl,--export=libssh2_sftp_closedir # libssh2_sftp_close_handle
#exports += -Wl,--export=libssh2_sftp_fsetstat # libssh2_sftp_fstat_ex
#exports += -Wl,--export=libssh2_sftp_fstat # libssh2_sftp_fstat_ex
exports += -Wl,--export=libssh2_sftp_fstat_ex
exports += -Wl,--export=libssh2_sftp_fstatvfs
exports += -Wl,--export=libssh2_sftp_fsync
exports += -Wl,--export=libssh2_sftp_get_channel
exports += -Wl,--export=libssh2_sftp_init
exports += -Wl,--export=libssh2_sftp_last_error
#exports += -Wl,--export=libssh2_sftp_lstat # libssh2_sftp_stat_ex
#exports += -Wl,--export=libssh2_sftp_mkdir # libssh2_sftp_mkdir_ex
exports += -Wl,--export=libssh2_sftp_mkdir_ex
#exports += -Wl,--export=libssh2_sftp_open # libssh2_sftp_open_ex
exports += -Wl,--export=libssh2_sftp_open_ex
#exports += -Wl,--export=libssh2_sftp_opendir # libssh2_sftp_open_ex
exports += -Wl,--export=libssh2_sftp_read
#exports += -Wl,--export=libssh2_sftp_readdir # libssh2_sftp_readdir_ex
exports += -Wl,--export=libssh2_sftp_readdir_ex
#exports += -Wl,--export=libssh2_sftp_readlink # libssh2_sftp_symlink_ex
#exports += -Wl,--export=libssh2_sftp_realpath # libssh2_sftp_symlink_ex
#exports += -Wl,--export=libssh2_sftp_rename # libssh2_sftp_rename_ex
exports += -Wl,--export=libssh2_sftp_rename_ex
#exports += -Wl,--export=libssh2_sftp_rewind # libssh2_sftp_seek64
#exports += -Wl,--export=libssh2_sftp_rmdir # libssh2_sftp_rmdir_ex
exports += -Wl,--export=libssh2_sftp_rmdir_ex
exports += -Wl,--export=libssh2_sftp_seek
exports += -Wl,--export=libssh2_sftp_seek64
#exports += -Wl,--export=libssh2_sftp_setstat # libssh2_sftp_stat_ex
exports += -Wl,--export=libssh2_sftp_shutdown
#exports += -Wl,--export=libssh2_sftp_stat # libssh2_sftp_fstat_ex
exports += -Wl,--export=libssh2_sftp_stat_ex
exports += -Wl,--export=libssh2_sftp_statvfs
#exports += -Wl,--export=libssh2_sftp_symlink # libssh2_sftp_symlink_ex
exports += -Wl,--export=libssh2_sftp_symlink_ex
exports += -Wl,--export=libssh2_sftp_tell
exports += -Wl,--export=libssh2_sftp_tell64
#exports += -Wl,--export=libssh2_sftp_unlink # libssh2_sftp_unlink_ex
exports += -Wl,--export=libssh2_sftp_unlink_ex
exports += -Wl,--export=libssh2_sftp_write
exports += -Wl,--export=libssh2_trace
exports += -Wl,--export=libssh2_trace_sethandler
exports += -Wl,--export=libssh2_userauth_authenticated
#exports += -Wl,--export=libssh2_userauth_hostbased_fromfile # libssh2_userauth_hostbased_fromfile_ex
exports += -Wl,--export=libssh2_userauth_hostbased_fromfile_ex
#exports += -Wl,--export=libssh2_userauth_keyboard_interactive # libssh2_userauth_keyboard_interactive_ex
exports += -Wl,--export=libssh2_userauth_keyboard_interactive_ex
exports += -Wl,--export=libssh2_userauth_list
#exports += -Wl,--export=libssh2_userauth_password # libssh2_userauth_password_ex
exports += -Wl,--export=libssh2_userauth_password_ex
exports += -Wl,--export=libssh2_userauth_publickey
#exports += -Wl,--export=libssh2_userauth_publickey_fromfile # libssh2_userauth_publickey_fromfile_ex
exports += -Wl,--export=libssh2_userauth_publickey_fromfile_ex
exports += -Wl,--export=libssh2_userauth_publickey_frommemory
exports += -Wl,--export=libssh2_version

libssh2.wasm: deps/libssh2.wasm.stripped
	wasm-opt -O $< -o $@

deps/libssh2.wasm.stripped: deps/libssh2.wasm.original
	wasm-strip $< -o $@

deps/libssh2.wasm.original: $(libssh2_a) $(libssl_a) $(libcrypto_a)
	$(CC) $(CFLAGS) $(CPPFLAGS) $(LDFLAGS) $^ -o $@ -O2 -mexec-model=reactor -flto=thin --shared $(exports)


$(libssh2_a): $(libssh2_dir)/build/Makefile
	$(MAKE) -C $(libssh2_dir)/build -j $(jobs)

$(libssh2_dir)/build/Makefile: $(libssh2_dir)/src/configure $(libssl_a) $(libcrypto_a)
	mkdir -p $(libssh2_dir)/build
	cd $(libssh2_dir)/build && CC='$(CC)' CFLAGS='$(libssh2_cflags)' CPPFLAGS='$(libssh2_cppflags)' LD='$(LD)' LDFLAGS='$(libssh2_ldflags)' AR='$(AR)' RANLIB='$(RANLIB)' NM='$(NM)' ../src/configure $(libssh2_configure_opts)

$(libssh2_dir)/src/configure: $(libssh2_tar_gz)
	mkdir -p $(libssh2_dir)/src
	tar zxf $< --strip-components=1 -C $(libssh2_dir)/src
	touch $@

$(libssh2_tar_gz):
	mkdir -p $(libssh2_dir)
	curl -sSfL $(libssh2_url) -o $@


$(libssl_a) $(libcrypto_a): $(openssl_dir)/build/Makefile
	$(MAKE) -C $(openssl_dir)/build -j $(jobs) build_libs

$(openssl_dir)/build/Makefile: $(openssl_dir)/src/Configure
	mkdir -p $(openssl_dir)/build
	cd $(openssl_dir)/build && CC='$(CC)' CFLAGS='$(openssl_cflags)' CPPFLAGS='$(openssl_cppflags)' LD='$(LD)' LDFLAGS='$(openssl_ldflags)' AR='$(AR)' RANLIB='$(RANLIB)' NM='$(NM)' ../src/Configure linux-generic32 $(openssl_configure_opts)

$(openssl_dir)/src/Configure: $(openssl_tar_gz)
	mkdir -p $(openssl_dir)/src
	tar zxf $< --strip-components=1 -C $(openssl_dir)/src
	touch $@

$(openssl_tar_gz):
	mkdir -p $(openssl_dir)
	curl -sSfL $(openssl_url) -o $@


.PHONY: clean
clean:
	$(RM) -rf deps libssh2.wasm
