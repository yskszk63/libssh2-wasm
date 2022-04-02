#include <sys/types.h>
#include <sys/stat.h>
#include <stdlib.h>
#include <stdio.h>
#include <time.h>
#include <unistd.h>
#include <fcntl.h>
#include <poll.h>

void assert(int cond, char* msg) {
    if (!cond) {
        printf("%s\n", msg);
        exit(1);
    }
}

int main() {
    assert(sizeof(time_t) == 8, "err time_t");
    assert(sizeof(long) == 4, "err long");
    assert(sizeof(struct timespec) == 16, "err struct timespec");

    assert(F_GETFL == 3, "err F_GETFL");
    assert(O_RDONLY == 0x4000000, "err O_RDONLY");
    assert(O_NONBLOCK == 0x4, "err O_NONBLOCK");

    assert(sizeof(char**) == 4, "err char**");
    assert(sizeof(int*) == 4, "err int*");

    assert(sizeof(struct pollfd) == 8, "err pollfd");
    assert(POLLIN == 0x001, "err POLLIN");
    assert(POLLOUT == 0x002, "err POLLOUT");

    assert(sizeof(struct stat) == 144, "err stat");
    return 0;
}
