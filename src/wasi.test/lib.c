#include <stdlib.h>
#include <time.h>
#include <unistd.h>
#include <fcntl.h>
#include <poll.h>

void dummy() {
    void *r = malloc(0);
    free(r);

    struct timespec *tp;
    clock_gettime(CLOCK_REALTIME, tp);

    fcntl(0, F_GETFL);

    poll(NULL, 0, -1);
}
