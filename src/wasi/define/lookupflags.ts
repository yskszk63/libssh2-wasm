import type * as ty from "@/wasi/ty/mod.ts";

export const symlink_follow = 1 << 0 as ty.lookupflags; // bool As long as the resolved path corresponds to a symbolic link, it is expanded.
