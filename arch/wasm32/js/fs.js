BrowserFS.configure({
  fs: "MountableFileSystem",
  options: {
    "/tmp": { fs: "InMemory" }
  }
}, function (e) {
  if (e) {
    console.log('Failed to initialize BrowserFS');
    throw e;
  }
});

var bfs = BrowserFS.BFSRequire('fs');
var utils = BrowserFS.BFSRequire('bfs_utils');

var AT_FDCWD = -100;

// open flags
var O_APPEND = 0x400;
var O_CREAT = 0x40;
var O_EXCL = 0x80;
var O_RDONLY = 0x00;
var O_RDWR = 0x02;
var O_SYNC = 0x1000;
var O_TRUNC = 0x200;
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

var fs = {
  openat: function (dirfd, pathname, flags, mode) {
    if (dirfd !== AT_FDCWD) {
      console.log('openat: TODO: dirfd other than AT_FDCWD, ignoring');
    }
    return bfs.openSync(pathname, flagsToString(flags), mode);
  },

  read: function (fd, buf, offset, count) {
    var b = utils.uint8Array2Buffer(buf);
    return bfs.readSync(fd, b, offset, count, null);
  },

  write: function (fd, buf, offset, count) {
    var b = utils.uint8Array2Buffer(buf);
    return bfs.writeSync(fd, b, offset, count, null);
  },

  close: function (fd) {
    return bfs.close(fd);
  }
};
