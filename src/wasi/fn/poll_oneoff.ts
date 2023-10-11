import type { FdsContext } from "@/wasi/context.ts";
import type * as ty from "@/wasi/ty/mod.ts";
import * as errno from "@/wasi/define/errno.ts";
import * as eventtype from "@/wasi/define/eventtype.ts";

function decodeSubscriptions(
  view: DataView,
  ptr: number,
  size: number,
): ty.subscription[] {
  const result: ty.subscription[] = [];

  for (let i = 0; i < size; i++) {
    const head = ptr + (i * 48);

    const userdata = view.getBigUint64(head + 0, true) as ty.userdata;
    const variant = view.getInt8(head + 8);

    switch (variant) {
      case 0: { // clock
        result.push({
          userdata,
          u: {
            variant: "clock",
            value: {
              id: view.getUint32(head + 16, true) as ty.clockid,
              timeout: view.getBigUint64(head + 24, true) as ty.timestamp,
              precision: view.getBigUint64(head + 32, true) as ty.timestamp,
              flags: {
                subscription_clock_abstime: view.getUint8(head + 40) !== 0,
              },
            },
          },
        });
        break;
      }

      case 1: { // fd_read
        result.push({
          userdata,
          u: {
            variant: "fd_read",
            value: {
              file_descriptor: view.getUint32(head + 16, true) as ty.fd,
            },
          },
        });
        break;
      }

      case 2: { // fd_write
        result.push({
          userdata,
          u: {
            variant: "fd_write",
            value: {
              file_descriptor: view.getUint32(head + 16, true) as ty.fd,
            },
          },
        });
        break;
      }

      default: {
        // TODO
        break;
      }
    }
  }

  return result;
}

function encodeEvent(view: DataView, ptr: number, events: ty.event[]) {
  let h = ptr;
  for (const event of events) {
    view.setBigUint64(h + 0, event.userdata, true);
    view.setUint16(h + 8, event.error, true);
    view.setUint8(h + 10, event.type);
    view.setBigUint64(h + 16, event.fd_readwrite?.nbytes ?? 0n, true);
    view.setUint8(
      h + 24,
      (event.fd_readwrite?.flags.fd_readwrite_hangup ?? false) === false
        ? 0
        : 1,
    );
    h += 32;
  }
}

export function poll_oneoff(
  cx: FdsContext,
  in_: ty.PointerU8,
  out: ty.PointerU8,
  nsubscriptions: ty.size,
  result: number,
): ty.errno {
  if (nsubscriptions === 0) {
    return errno.inval;
  }

  const view = new DataView(cx.memory.buffer);

  const events: ty.event[] = [];

  const subscriptions = decodeSubscriptions(view, in_, nsubscriptions);
  for (const subscription of subscriptions) {
    switch (subscription.u.variant) {
      case "clock": {
        events.push({
          userdata: subscription.userdata,
          error: errno.inval,
          type: eventtype.clock,
          fd_readwrite: null,
        });
        break;
      }

      case "fd_read": {
        const fdi = cx.fds[subscription.u.value.file_descriptor];
        if (fdi.type !== "sock" || fdi.state !== "connected") {
          events.push({
            userdata: subscription.userdata,
            error: errno.inval,
            type: eventtype.fd_read,
            fd_readwrite: null,
          });
          continue;
        }
        console.log(subscription, fdi.recv);
        if (fdi.recv.state !== "idle") {
          events.push({
            userdata: subscription.userdata,
            error: errno.again,
            type: eventtype.fd_read,
            fd_readwrite: null,
          });
        }
        if (fdi.recv.buf.byteLength < 1) {
          fdi.recv.state = "insufficient";
          events.push({
            userdata: subscription.userdata,
            error: errno.again,
            type: eventtype.fd_read,
            fd_readwrite: null,
          });
        }

        events.push({
          userdata: subscription.userdata,
          error: errno.success,
          type: eventtype.fd_read,
          fd_readwrite: {
            nbytes: BigInt(fdi.recv.buf.byteLength) as ty.filesize,
            flags: {
              fd_readwrite_hangup: false,
            },
          },
        });
        break;
      }

      case "fd_write": {
        const fdi = cx.fds[subscription.u.value.file_descriptor];
        if (fdi.type !== "sock" || fdi.state !== "connected") {
          events.push({
            userdata: subscription.userdata,
            error: errno.inval,
            type: eventtype.fd_write,
            fd_readwrite: null,
          });
          continue;
        }
        if (fdi.send.state !== "idle" || fdi.send.buf.byteLength < 1) {
          events.push({
            userdata: subscription.userdata,
            error: errno.again,
            type: eventtype.fd_write,
            fd_readwrite: null,
          });
        }

        events.push({
          userdata: subscription.userdata,
          error: errno.success,
          type: eventtype.fd_write,
          fd_readwrite: {
            nbytes: BigInt(fdi.send.buf.byteLength) as ty.filesize,
            flags: {
              fd_readwrite_hangup: false,
            },
          },
        });
        break;
      }
    }
  }
  encodeEvent(view, out, events);

  view.setUint32(result + 0, events.length, true);
  return errno.success;
}
