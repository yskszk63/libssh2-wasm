#include <stdlib.h>
#include <time.h>
#include <unistd.h>
#include <fcntl.h>
#include <poll.h>
#include <sys/types.h>
#include <sys/stat.h>
#include <fcntl.h>
#include <poll.h>
#include <sys/types.h>
#include <sys/socket.h>

size_t sizeof_timespec() {
    return sizeof(struct timespec*);
}

size_t offsetof_timespec_tv_sec() {
    return offsetof(struct timespec, tv_sec);
}

size_t offsetof_timespec_tv_nsec() {
    return offsetof(struct timespec, tv_nsec);
}

size_t sizeof_stat() {
    return sizeof(struct stat);
}

void dummy() {
    void *p = malloc(0);
    free(NULL);

    clock_gettime(0, NULL);

    fcntl(0, F_GETFL);

    poll(NULL, 0, -1);

    open("", 0);
    close(0);

    poll(NULL, 0, -1);

    recv(0, NULL, 0, 0);
    send(0, NULL, 0, 0);

    fstat(0, NULL);

    read(0, NULL, 0);
}
