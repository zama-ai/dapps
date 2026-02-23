// Browser-compatible fs shim for node-tkms WASM loading.
// node-tkms calls require('fs').readFileSync(path) to load kms_lib_bg.wasm.
// In the browser, we serve it from public/ and load via synchronous XHR.
module.exports = {
  readFileSync: function (filePath) {
    var filename = filePath.split("/").pop();
    var xhr = new XMLHttpRequest();
    xhr.open("GET", "/" + filename, false); // synchronous
    xhr.responseType = "arraybuffer";
    xhr.send();
    if (xhr.status >= 200 && xhr.status < 300) {
      return new Uint8Array(xhr.response);
    }
    throw new Error("fs shim: failed to load /" + filename + " (status: " + xhr.status + ")");
  },
};
