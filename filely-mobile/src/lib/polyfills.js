// Polyfills for Hermes engine (React Native)
// Must be imported before any other modules
'use strict';

// Debug logging
console.log('[Polyfills] Starting polyfills, SharedArrayBuffer exists:', typeof SharedArrayBuffer !== 'undefined');

// SharedArrayBuffer is required by whatwg-url but doesn't exist in Hermes
if (typeof SharedArrayBuffer === 'undefined') {
  console.log('[Polyfills] Creating SharedArrayBuffer polyfill');
  // First, ensure ArrayBuffer.prototype has a byteLength getter
  // Hermes may not have it as an accessor property
  const abProto = ArrayBuffer.prototype;
  let abByteLengthGetter = Object.getOwnPropertyDescriptor(abProto, 'byteLength');

  if (!abByteLengthGetter || !abByteLengthGetter.get) {
    // Define a proper accessor descriptor on ArrayBuffer.prototype
    Object.defineProperty(abProto, 'byteLength', {
      get: function() {
        // Native Hermes ArrayBuffer instances have byteLength as own property
        // We need to access it via Object.getOwnPropertyDescriptor on the instance
        const ownDesc = Object.getOwnPropertyDescriptor(this, 'byteLength');
        if (ownDesc && typeof ownDesc.value === 'number') {
          return ownDesc.value;
        }
        return 0;
      },
      configurable: true,
      enumerable: false
    });
  }

  // Create a proper SharedArrayBuffer constructor
  function SharedArrayBufferConstructor() {
    if (arguments.length === 0) {
      return new ArrayBuffer();
    }
    return new ArrayBuffer(arguments[0]);
  }

  // Set up prototype chain - inherits from ArrayBuffer
  SharedArrayBufferConstructor.prototype = Object.create(ArrayBuffer.prototype);
  SharedArrayBufferConstructor.prototype.constructor = SharedArrayBufferConstructor;

  // CRITICAL: whatwg-url does this:
  // Object.getOwnPropertyDescriptor(SharedArrayBuffer.prototype, "byteLength").get
  // The byteLength accessor is inherited from ArrayBuffer.prototype, so it should work
  // But let's explicitly define it to be safe
  Object.defineProperty(SharedArrayBufferConstructor.prototype, 'byteLength', {
    get: function() {
      const ownDesc = Object.getOwnPropertyDescriptor(this, 'byteLength');
      if (ownDesc && typeof ownDesc.value === 'number') {
        return ownDesc.value;
      }
      return 0;
    },
    configurable: true,
    enumerable: false
  });

  global.SharedArrayBuffer = SharedArrayBufferConstructor;
  console.log('[Polyfills] SharedArrayBuffer polyfill created, prototype.byteLength exists:',
    Object.getOwnPropertyDescriptor(SharedArrayBufferConstructor.prototype, 'byteLength'));
}

// Also ensure it's on globalThis for compatibility
if (typeof globalThis !== 'undefined' && typeof globalThis.SharedArrayBuffer === 'undefined') {
  globalThis.SharedArrayBuffer = global.SharedArrayBuffer;
}

console.log('[Polyfills] Polyfills complete, SharedArrayBuffer.prototype.byteLength.get exists:',
  typeof SharedArrayBuffer !== 'undefined' &&
  !!Object.getOwnPropertyDescriptor(SharedArrayBuffer.prototype, 'byteLength')?.get);
