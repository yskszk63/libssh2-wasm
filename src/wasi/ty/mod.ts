export type PointerU8 = number & { __PointerU8Branded: never };

export type size = number & { __sizeBranded: never };
export type Handle = number & { __HandleBranded: never };
export type fd = Handle & { __fdBranded: never };

export type filesize = bigint & { __filesizeBranded: never };

export type timestamp = bigint & { __timestampBranded: never };
export type clockid = number & { __clockidBranded: never };

export type errno = number & { __errnoBranded: never };

export type filetype = number & { __filetypeBranded: never };

export type fdflags = number & { __fdflagsBranded: never };

export type rights = bigint & { __rightsBranded: never };

export type fdstat = {
  fs_filetype: filetype;
  fs_flags: fdflags;
  fs_rights_base: rights;
  fs_rights_inheriting: rights;
};

export type lookupflags = number & { __lookupflagsBranded: never };

export type oflags = number & { __oflagsBranded: never };

export type prestat_dir = {
  pr_name_len: size;
};

export type prestat = {
  tag: "dir";
  value: prestat_dir;
};

export type exitcode = number & { __exitcodeBranded: never };

export type riflags = number & { __riflagsBranded: never };
export type roflags = number & { __roflagsBranded: never };
export type siflags = number & { __siflagsBranded: never };

export type userdata = bigint & { __userdataBranded: never };

export type subclockflags = {
  subscription_clock_abstime: boolean;
};

export type subscription_clock = {
  id: clockid;
  timeout: timestamp;
  precision: timestamp;
  flags: subclockflags;
};

export type subscription_fd_readwrite = {
  file_descriptor: fd;
};

export type subscription_u = {
  variant: "clock";
  value: subscription_clock;
} | {
  variant: "fd_read";
  value: subscription_fd_readwrite;
} | {
  variant: "fd_write";
  value: subscription_fd_readwrite;
};

export type subscription = {
  userdata: userdata;
  u: subscription_u;
};

export type eventtype = number & { __eventtypeBranded: never };

export type eventrwflags = {
  fd_readwrite_hangup: boolean;
};

export type event_fd_readwrite = {
  nbytes: filesize;
  flags: eventrwflags;
};

export type event = {
  userdata: userdata;
  error: errno;
  type: eventtype;
  fd_readwrite: event_fd_readwrite | null;
};

export type iovec = {
  buf: PointerU8;
  buf_len: size;
};

export type ciovec = {
  buf: PointerU8;
  buf_len: size;
};
