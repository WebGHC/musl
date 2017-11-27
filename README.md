# WebAssembly experiment for musl libc

A [musl experiment][].

  [musl experiment]: /README.md

The goal of this prototype was to get a WebAssembly libc off the ground.

**Note:** This experimental WebAssembly C library is a hack. Don't
rely on it. Things are changing rapidly, so mixing different parts of
the toolchain may break from time to time, try to keep them all in
sync.

## Quick how-to

Build LLVM, Clang, and LLD from source using
`-DLLVM_EXPERIMENTAL_TARGETS_TO_BUILD=WebAssembly`. The wasm LLD port
has been upstreamed into LLD, so the WebAssembly/lld fork is no longer
necessary.

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
[webabi](https://github.com/WebGHC/webabi).

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

WebAssembly binaries are linked with `musl`, which relies on a syscall
ABI to perform IO such as allocating memory. `musl` will cause your
WebAssembly binary to have `import`s for this ABI, which are satisfied
by `webabi`. At runtime, when `musl` needs to do IO, it will call this
ABI, and `webabi` will do the IO.

**Note:** When `webabi` needs to block (e.g. `sleep`), it will use
`Atomics.wait`, so your wasm binary is run in a WebWorker. Synchronous
file IO is currently only implemented via an in-memory virtual FS, so
this will not require blocking.

## libc implementation details

The implementation is based on Emscripten's musl port, but is based on
a much more recent musl and has no modifications to musl's code: all
changes are in the `arch/wasm32` directory. It aims to only
communicate to the embedder using a syscall API, modeled after Linux'
own syscall API. This may have shortcomings, but it's a good thing to
try out since we can revisit later. Maybe more functionality should be
implemented in JavaScript, but experience with NaCl and Emscripten
leads us to believe the syscall API is a good boundary.

The eventual goal is for the WebAssembly libc to be upstreamed to
musl, and that'll require *doing it right* according to the musl
community. That is why the JS exists in a separate repo; it's not
necessarily tied to `musl`. We also want Emscripten to be able to use
the same libc implementation. The approach in this repository may not
be the right one.
