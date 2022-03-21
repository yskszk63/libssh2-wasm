#include <stdlib.h>
#include <stdio.h>
#include <time.h>
#include <unistd.h>
#include <fcntl.h>

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
    return 0;
}
