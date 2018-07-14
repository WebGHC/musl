#include <features.h>

#define START "_start"

#include "crt_arch.h"

#ifdef __wasm__
int main(int,char **);
int __wasm_host_main(int argc, char **argv, char **env) {
  return main(argc, argv);
}
#else
int main(int,char **,char **);
#endif
void _init(void) __attribute__((weak));
void _fini(void) __attribute__((weak));
_Noreturn int __libc_start_main(int (*)(int,char **,char **), int, char **, void *, void *, void *);

void _start_c(long *p)
{
	int argc = p[0];
	char **argv = (void *)(p+1);
	int (*main1)(int,char **,char **);
#ifdef __wasm__
	main1 = __wasm_host_main;
#else
	main1 = main;
#endif
	__libc_start_main(main1, argc, argv, _init, _fini, 0);
}
