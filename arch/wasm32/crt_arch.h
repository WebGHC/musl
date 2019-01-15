#ifndef SHARED
void _start_c(long *p);

void _start(long *p) {
  _start_c(p);
}
#endif
