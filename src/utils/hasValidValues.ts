/**
 * Checks if an object has any valid (non-undefined) values.
 * Recursively checks nested objects and arrays.
 * @internal
 */
export function hasValidValues(obj: unknown): boolean {
  if (obj === undefined) {
    return false;
  }

  if (obj === null || typeof obj !== "object") {
    return true;
  }

  // Date objects are valid values
  if (obj instanceof Date) {
    return true;
  }

  if (Array.isArray(obj)) {
    return obj.some((item) => hasValidValues(item));
  }

  const values = Object.values(obj);
  if (values.length === 0) {
    return false;
  }

  return values.some((value) => hasValidValues(value));
}
