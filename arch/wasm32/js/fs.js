var bfs = BrowserFS.BFSRequire('fs');
var utils = BrowserFS.BFSRequire('bfs_utils');

// Certain directories are required by POSIX (and musl). In case there is an
// in memory filesystem under root we need to take care to create these manually.
// See musl manual for details.
function initRootFs() {
  var ds = [ "/bin"
           , "/etc"
           , "/etc/zoneinfo"
           , "/dev"
           , "/dev/shm"
           , "/tmp"
           ];
  ds.forEach(d => bfs.mkdirSync(d, 511 /*=0777*/));
}

BrowserFS.configure({
  fs: "MountableFileSystem",
  options: {
    "/": { fs: "InMemory" }
  }
}, function (e) {
  if (e) {
    console.log('Failed to initialize BrowserFS');
    throw e;
  }

  initRootFs();
});

var AT_FDCWD              = -0x64;
var AT_SYMLINK_NOFOLLOW   = 0x100;
var AT_REMOVEDIR          = 0x200;
var AT_SYMLINK_FOLLOW     = 0x400;
var AT_NO_AUTOMOUNT       = 0x800;
var AT_EMPTY_PATH         = 0x1000;
var AT_STATX_SYNC_TYPE    = 0x6000;
var AT_STATX_SYNC_AS_STAT = 0x0000;
var AT_STATX_FORCE_SYNC   = 0x2000;
var AT_STATX_DONT_SYNC    = 0x4000;

// open flags
var O_APPEND = 0x400;
var O_CREAT  = 0x40;
var O_EXCL   = 0x80;
var O_RDONLY = 0x00;
var O_RDWR   = 0x02;
var O_SYNC   = 0x1000;
var O_TRUNC  = 0x200;
var O_WRONLY = 0x01;

// BrowserFS only supports string flags. See:
// https://github.com/nodejs/node/blob/master/lib/internal/fs.js
// Hopefully flagsToString . stringToFlags = id
// TODO: possibly make a PR to BrowserFS to support integer flags?
function flagsToString(a) {
  switch(a & 0x1fff) {
  case O_RDONLY: return 'r';
  case O_RDONLY | O_SYNC: return 'rs';
  case O_RDWR: return 'r+';
  case O_RDWR | O_SYNC: return 'rs+';

  case O_TRUNC | O_CREAT | O_WRONLY: return 'w';
  case O_TRUNC | O_CREAT | O_WRONLY | O_EXCL: return 'wx';

  case O_TRUNC | O_CREAT | O_RDWR: return 'w+';
  case O_TRUNC | O_CREAT | O_RDWR | O_EXCL: return 'wx+';

  case O_APPEND | O_CREAT | O_WRONLY: return 'a';
  case O_APPEND | O_CREAT | O_WRONLY | O_EXCL: return 'ax';

  case O_APPEND | O_CREAT | O_RDWR: return 'a+';
  case O_APPEND | O_CREAT | O_RDWR | O_EXCL: return 'ax+';
  }

  throw 'flagToString: Invalid flag value';
}

// on error a syscall should return -ERRNOVAL (see linux syscall abi)
function catchApiError(f) {
  try {
    return f();
  } catch (e) {
    if (e instanceof BrowserFS.Errors.ApiError) {
      return -e.errno;
    } else {
      throw e;
    }
  }
}

var fs = {
  openat: function (dirfd, pathname, flags, mode) {
    if (dirfd !== AT_FDCWD) {
      console.log('openat: TODO: dirfd other than AT_FDCWD, ignoring');
    }
    return catchApiError(() => bfs.openSync(pathname, flagsToString(flags), mode));
  },

  creat: function (pathname, mode) {
    return this.openat(AT_FDCWD, pathname, O_CREAT|O_WRONLY|O_TRUNC, mode);
  },

  read: function (fd, buf, offset, count) {
    var b = utils.uint8Array2Buffer(buf);
    return catchApiError(() => bfs.readSync(fd, b, offset, count, null));
  },

  write: function (fd, buf, offset, count) {
    // stdout is handled specially here, we may have a more robust solution
    // in the future that does not assume stdout is connected to console
    if (fd === 1) {
      stdout__write(bufStr(buf, offset, offset + count));
      return count;
    } else {
      var b = utils.uint8Array2Buffer(buf);
      return catchApiError(() => bfs.writeSync(fd, b, offset, count, null));
    }
  },

  close: function (fd) {
    return catchApiError(() => bfs.closeSync(fd));
  },

  linkat: function (dirfd, oldpath, newpath) {
    if (dirfd !== AT_FDCWD) {
      console.log('linkat: TODO: dirfd other than AT_FDCWD, ignoring');
    }
    return catchApiError(() => bfs.linkSync(oldpath, newpath));
  },

  unlink: function (pathname) {
    return catchApiError(() => bfs.unlinkSync(pathname));
  },

  unlinkat: function (dirfd, pathname, flags) {
    if (difd !== AT_FDCWD) {
      console.log('unlinkat: TODO: dirfd other than AT_FDCWD, ignoring');
    }
    if (flags & AT_REMOVEDIR) {
      return this.rmdir(pathname);
    } else {
      return this.unlink(pathname);
    }
  },

  mkdirat: function (dirfd, pathname, mode) {
    if (dirfd !== AT_FDCWD) {
      console.log('linkat: TODO: dirfd other than AT_FDCWD, ignoring');
    }
    return catchApiError(() => bfs.mkdirSync(pathname, mode));
  },

  rmdir: function(pathname) {
    return catchApiError(() => bfs.rmdirSync(pathname));
  },

  chmod: function (pathname, mode) {
    return catchApiError(() => bfs.chmodSync(pathname, mode));
  },

  chown: function (pathname, owner, group) {
    return catchApiError(() => bfs.chownSync(pathname, false, owner, group));
  },

  lchown: function (pathname, owner, group) {
    return catchApiError(() => bfs.chownSync(pathname, true, owner, group));
  },

  rename: function (oldpath, newpath) {
    return catchApiError(() => bfs.renameSync(oldpath, newpath));
  },

  symlinkat: function (target, newdirfd, linkpath) {
    if (dirfd !== AT_FDCWD) {
      console.log('symlinkat: TODO: dirfd other than AT_FDCWD, ignoring');
    }
    return catchApiError(() => bfs.symlinkSync(target, linkpath, ''));
  },

  readlinkat: function (dirfd, pathname) {
    if (dirfd !== AT_FDCWD) {
      console.log('readlinkat: TODO: dirfd other than AT_FDCWD, ignoring');
    }
    return catchApiError(() => bfs.readlinkSync(pathname));
  },

  truncate: function (pathPtr, length) {
    var path = heapStr(pathPtr);
    return catchApiError(() => bfs.truncate(path, length));
  },

  ftruncate: function (fd, length) {
    return catchApiError(() => bfs.ftruncate(fd, length));
  }
};
