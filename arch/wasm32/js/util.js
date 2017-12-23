var dec = new TextDecoder();

function bufStr(buf, ptr, end) {
  return dec.decode(buf.slice(ptr, end));
}

var stdout__buf = "";
function stdout__write(str) {
  var i = str.lastIndexOf("\n");
  if (i >= 0) {
    console.log(stdout__buf + str.substring(0, i));
    stdout__buf = str.substring(i + 1);
  } else {
    stdout__buf += str;
  }
}
