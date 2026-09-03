/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Enable safe BigInt JSON serialization across the entire app
if (typeof BigInt !== 'undefined' && !(BigInt.prototype as any).toJSON) {
  (BigInt.prototype as any).toJSON = function () {
    return { __bigint: this.toString() };
  };
}

/**
 * Deep clones an object or data structure preserving BigInt, dates, nested objects, and arrays.
 */
export function deepClone<T>(value: T): T {
  if (value === null || typeof value !== 'object') {
    return value;
  }
  if (typeof structuredClone === 'function') {
    try {
      return structuredClone(value);
    } catch {
      // Fallback if clone cannot be structured
    }
  }
  return JSON.parse(
    JSON.stringify(value, (_key, val) => (typeof val === 'bigint' ? { __bigint: val.toString() } : val)),
    (_key, val) => (val && typeof val === 'object' && val.__bigint !== undefined ? BigInt(val.__bigint) : val)
  );
}
