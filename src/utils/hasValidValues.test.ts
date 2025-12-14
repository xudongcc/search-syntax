import { hasValidValues } from "./hasValidValues.js";

describe("hasValidValues", () => {
  it("should return false for undefined", () => {
    expect(hasValidValues(undefined)).toBe(false);
  });

  it("should return true for null", () => {
    expect(hasValidValues(null)).toBe(true);
  });

  it("should return true for primitive values", () => {
    expect(hasValidValues("string")).toBe(true);
    expect(hasValidValues(123)).toBe(true);
    expect(hasValidValues(true)).toBe(true);
  });

  it("should return true for Date objects", () => {
    expect(hasValidValues(new Date())).toBe(true);
  });

  it("should return false for empty object", () => {
    expect(hasValidValues({})).toBe(false);
  });

  it("should return false for empty array", () => {
    expect(hasValidValues([])).toBe(false);
  });

  it("should return true for object with valid values", () => {
    expect(hasValidValues({ a: 1 })).toBe(true);
  });

  it("should return false for object with only undefined values", () => {
    expect(hasValidValues({ a: undefined })).toBe(false);
  });

  it("should return true for array with valid values", () => {
    expect(hasValidValues([1, 2, 3])).toBe(true);
  });

  it("should return false for array with only undefined values", () => {
    expect(hasValidValues([undefined, undefined])).toBe(false);
  });

  it("should handle nested objects", () => {
    expect(hasValidValues({ a: { b: 1 } })).toBe(true);
    expect(hasValidValues({ a: { b: undefined } })).toBe(false);
    expect(hasValidValues({ a: {} })).toBe(false);
  });
});
