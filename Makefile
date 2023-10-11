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


src/libssh2.wasm.js: libssh2.wasm
	deno run npm:wasmto-js < $< > $@

libssh2.wasm: deps/libssh2.wasm.stripped
	wasm-opt -O $< -o $@

deps/libssh2.wasm.stripped: deps/libssh2.wasm.original
	wasm-strip $< -o $@

deps/libssh2.wasm.original: $(libssh2_a) $(libssl_a) $(libcrypto_a) export.list
	$(CC) $(CFLAGS) $(CPPFLAGS) $(LDFLAGS) $(libssh2_a) $(libssl_a) $(libcrypto_a) -o $@ -O2 -mexec-model=reactor -flto=thin --shared $(shell cat export.list | sed -e's/#.*//g' | grep \\S | sed -e's/.*/-Wl,--export=\0/g' | xargs)


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


.PHONY: clean test
test:
	deno task test

clean:
	$(RM) -rf deps libssh2.wasm
