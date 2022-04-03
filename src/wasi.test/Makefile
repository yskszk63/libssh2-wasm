WASMTIME = wasmtime
WASI_SDK_ROOT = /opt/wasi-sdk
CC = $(WASI_SDK_ROOT)/bin/clang

all: libtest.wasm

libtest.wasm: lib.c
	$(CC) -mexec-model=reactor -Wl,--export-all -o $@ $<

.PHONY: clean
clean:
	$(RM) check.wasm libtest.wasm
