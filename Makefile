openssl_url = https://www.openssl.org/source/openssl-1.1.1n.tar.gz
openssl_dir = openssl

libssh2_url = https://www.libssh2.org/download/libssh2-1.10.0.tar.gz
libssh2_dir = libssh2
libssh2_build_dir = libssh2_build

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

#libssh2_ldflags  = -nostartfiles
#libssh2_ldflags += -Wl,--no-entry
libssh2_ldflags += -Wl,--export-all
libssh2_ldflags += -lwasi-emulated-signal
libssh2_ldflags += -lwasi-emulated-process-clocks
libssh2_ldflags += -lwasi-emulated-mman
libssh2_ldflags += -Wl,--allow-undefined
libssh2_ldflags += -mexec-model=reactor

libssh2.wasm: $(libssh2_build_dir)/src/libssh2.so
	cp $< $@

.PHONY: make-libssh2
make-libssh2:
	$(RM) -rf $(libssh2_build_dir)
	mkdir $(libssh2_build_dir)
	$(CMAKE) -S $(libssh2_dir) -B $(libssh2_build_dir) --toolchain $(WASI_SDK_PREFIX)/share/cmake/wasi-sdk.cmake -DWASI_SDK_PREFIX=$(WASI_SDK_PREFIX) -DBUILD_SHARED_LIBS=ON -DCRYPTO_BACKEND=OpenSSL -DOPENSSL_CRYPTO_LIBRARY=$(openssl_dir)/libcrypto.a -DOPENSSL_SSL_LIBRARY=$(openssl_dir)/libssl.a -DOPENSSL_INCLUDE_DIR=$(openssl_dir)/include -DCMAKE_C_COMPILER_ID=Clang -DCMAKE_SHARED_LINKER_FLAGS="$(libssh2_ldflags)"
	$(CMAKE) --build $(libssh2_build_dir) --target libssh2

.PHONY: fetch-libssh2
fetch-libssh2:
	$(RM) -rf $(libssh2_dir)
	mkdir $(libssh2_dir)
	curl -sSfL $(libssh2_url) | tar zxf - --strip-components=1 -C $(libssh2_dir)

.PHONY: make-openssl
make-openssl:
	cd $(openssl_dir) && CC=$(CC) AR=$(AR) RANLIB=$(RANLIB) ./Configure $(openssl_configure_opts) $(openssl_target)
	$(MAKE) -C $(openssl_dir) build_libs CFLAGS="$(openssl_cflags)" LDFLAGS="$(openssl_ldflags)"

.PHONY: fetch-openssl
fetch-openssl:
	$(RM) -rf $(openssl_dir)
	mkdir $(openssl_dir)
	curl -sSfL $(openssl_url) | tar zxf - --strip-components=1 -C $(openssl_dir)
