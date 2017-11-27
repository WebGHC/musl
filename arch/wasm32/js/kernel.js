function kernel(progName, options) {
  const worker = new Worker("wasm.js");
  worker.postMessage({ progName: progName, options: options });
}
