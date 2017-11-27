# WebAssembly experiment for musl libc

A [musl experiment][].

  [musl experiment]: /README.md

The goal of this prototype was to get a WebAssembly libc off the ground.

**Note:** This experimental WebAssembly C library is a hack. Don't
rely on it. Things are changing rapidly, so mixing different parts of
the toolchain may break from time to time, try to keep them all in
sync.

## Quick how-to

Build LLVM and Clang from source using
`-DLLVM_EXPERIMENTAL_TARGETS_TO_BUILD=WebAssembly`. Build LLD [from
the `wasm` branch on the `WebAssembly`
fork](https://github.com/WebAssembly/lld/tree/wasm).

Set the CC to clang, then use `./configure` and `make` to build musl:

```
export CC="/path/to/clang \
  --target=wasm32-unknown-unknown-wasm \
  -fuse-ld=/path/to/lld"
./configure --disable-shared --prefix=/path/to/musl
make all -j
make install
```

Append musl related arguments to CC, and build compiler-rt.

```
export CC="$CC --sysroot /path/to/musl"

# cmake will check if your C compiler works, which will fail unless you tell it
# not to expect compiler-rt with -nodefaultlibs.
CC_bak=$CC
export CC="$CC -nodefaultlibs -lc \
  -Xlinker --allow-undefined-file=/path/to/musl/lib/wasm.syms"

cd compiler-rt-src
mkdir build
cd build
mkdir /path/to/compiler-rt

cmake -DCMAKE_INSTALL_PREFIX=/path/to/compiler-rt \
  -DLLVM_CONFIG_PATH=/path/to/llvm/bin/llvm-config \
  -DCMAKE_AR=/path/to/llvm/llvm-ar \
  -DCOMPILER_RT_DEFAULT_TARGET_TRIPLE=wasm32-unknown-unknown-wasm \
  --target ../lib/builtins \
  -DCOMPILER_RT_BAREMETAL_BUILD=TRUE \
  -DCOMPILER_RT_EXCLUDE_ATOMIC_BUILTIN=TRUE

make all install -j

# make install puts compiler-rt in a subdirectory that clang doesn't expect.
mv /path/to/compiler-rt/lib/linux/*.a /path/to/compiler-rt/lib/
rm -r /path/to/compiler-rt/lib/linux

# Get rid of unnecessary arguments.
export CC=$CC_bak
```

Append compiler-rt related arguments to CC, and build your C files.

```
export CC="$CC -resource-dir /path/to/compiler-rt -rtlib=compiler-rt"
$CC -o foo foo.c
```

Run it in a browser using
[/arch/wasm32/js/kernel.js](/arch/wasm32/js/kernel.js) and
[/arch/wasm32/js/wasm.js](/arch/wasm32/js/wasm.js).

```html
<!doctype html>
<html>
  <head>
    <meta charset="utf-8"></meta>
  </head>

  <body>
    <script src="kernel.js"></script>
    <script>
      kernel("foo");
    </script>
  </body>
</html>
```

This may work... or not. File bugs on what's broken, or send patches!

## libc: how does it work?

The wasm binary:

* Declares its imports and exports.
* Reads and writes to the memory that it exports
* Calls its syscall imports to do IO.

The [kernel.js][] file:

  [kernel.js]: /arch/wasm32/js/kernel.js

* Spawns a `WebWorker` for `wasm.js`.
* Coordinates with the worker for all interactions that must occur on
  the main thread.

The [wasm.js][] file:

  [wasm.js]: /arch/wasm32/js/wasm.js

* Implements the syscalls musl depends on.
* Loads the wasm binary.
* Calls the wasm binary's `main` function.

## libc implementation details

The implementation is based on Emscripten's musl port, but is based on
a much more recent musl and has no modifications to musl's code: all
changes are in the `arch/wasm32` directory. It aims to only
communicate to the embedder using a syscall API, modeled after Linux'
own syscall API. This may have shortcomings, but it's a good thing to
try out since we can revisit later. Maybe more functionality should be
implemented in JavaScript, but experience with NaCl and Emscripten
leads us to believe the syscall API is a good boundary.

It's important that the wasm binary is run in a WebWorker. Many
syscalls that C code depends on are blocking, which the main thread is
not allowed to do. With the new `Atomics` API, the syscall
implementations can block until the kernel writes results back to the
shared memory and signals that the work is done.

The eventual goal is for the WebAssembly libc to be upstreamed to musl, and
that'll require *doing it right* according to the musl community. We also want
Emscripten to be able to use the same libc implementation. The approach in this
repository may not be the right one.
