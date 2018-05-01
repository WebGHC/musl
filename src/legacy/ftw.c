#include <ftw.h>
#include "libc.h"

extern int nftw_impl(const char *path, int, int (*fn1)(const char *, const struct stat *, int), int (*fn2)(const char *, const struct stat *, int, struct FTW *), int fd_limit, int flags);

int ftw(const char *path, int (*fn)(const char *, const struct stat *, int), int fd_limit)
{
	/* The following cast assumes that calling a function with one
	 * argument more than it needs behaves as expected. This is
	 * actually undefined, but works on all real-world machines. */
	return nftw_impl(path, 1, fn, 0, fd_limit, FTW_PHYS);
}

LFS64(ftw);
