#define SHARED
#define START "_start"
#define _dlstart_c _start_c
#include "../ldso/dlstart.c"

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

__attribute__((__visibility__("hidden")))
_Noreturn void __dls2(unsigned char *base, size_t *sp)
{
	int (*main1)(int,char **,char **);
#ifdef __wasm__
	main1 = __wasm_host_main;
#else
	main1 = main;
#endif
	__libc_start_main(main1, *sp, (void *)(sp+1), _init, _fini, 0);
}
