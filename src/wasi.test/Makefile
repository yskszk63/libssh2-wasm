WASMTIME = wasmtime
WASI_SDK_ROOT = /opt/wasi-sdk
CC = $(WASI_SDK_ROOT)/bin/clang

all: libtest.wasm check

libtest.wasm: lib.c
	$(CC) -nostartfiles -Wl,--no-entry -Wl,--export-all -o $@ $<

check.wasm: check.c
	$(CC) -o $@ $^

.PHONY: check
check: check.wasm
	$(WASMTIME) $<

.PHONY: clean
clean:
	$(RM) check.wasm libtest.wasm
