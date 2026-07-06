import { timingSafeEqual, webcrypto } from 'node:crypto';

const globalWithCrypto = globalThis as typeof globalThis & { crypto?: Crypto };
const cryptoWithPolyfill = globalWithCrypto.crypto ?? webcrypto;
const subtleWithPolyfill = cryptoWithPolyfill.subtle as SubtleCrypto & {
  timingSafeEqual?: (left: BufferSource, right: BufferSource) => boolean;
};

if (typeof subtleWithPolyfill.timingSafeEqual !== 'function') {
  subtleWithPolyfill.timingSafeEqual = (left, right) => {
    const leftBytes = Buffer.from(left as ArrayBufferLike);
    const rightBytes = Buffer.from(right as ArrayBufferLike);

    if (leftBytes.length !== rightBytes.length) {
      return false;
    }

    return timingSafeEqual(leftBytes, rightBytes);
  };
}

if (!globalWithCrypto.crypto) {
  Object.defineProperty(globalThis, 'crypto', {
    value: cryptoWithPolyfill,
    configurable: true,
  });
}
