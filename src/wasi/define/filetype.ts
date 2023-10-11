import type * as ty from "@/wasi/ty/mod.ts";

export const unknown = 0x00 as ty.filetype; // The type of the file descriptor or file is unknown or is different from any of the other types specified.
export const block_device = 0x01 as ty.filetype; // The file descriptor or file refers to a block device inode.
export const character_device = 0x02 as ty.filetype; // The file descriptor or file refers to a character device inode.
export const directory = 0x03 as ty.filetype; // The file descriptor or file refers to a directory inode.
export const regular_file = 0x04 as ty.filetype; // The file descriptor or file refers to a regular file inode.
export const socket_dgram = 0x05 as ty.filetype; // The file descriptor or file refers to a datagram socket.
export const socket_stream = 0x06 as ty.filetype; // The file descriptor or file refers to a byte-stream socket.
export const symbolic_link = 0x07 as ty.filetype; // The file refers to a symbolic link inode.
