// Patch whatwg-url to handle missing SharedArrayBuffer gracefully
// This must run before whatwg-url is imported

const originalDescriptor = Object.getOwnPropertyDescriptor(SharedArrayBuffer.prototype, "byteLength");
if (!originalDescriptor || !originalDescriptor.get) {
  // Fix the descriptor if it's missing
  Object.defineProperty(SharedArrayBuffer.prototype, "byteLength", {
    get: function() {
      return this.buffer ? this.buffer.byteLength : 0;
    },
    configurable: true,
    enumerable: false
  });
}
