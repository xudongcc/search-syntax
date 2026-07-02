import { jest } from "@jest/globals";

import {
  parse,
  ParseError,
  NoSearchableFieldsError,
  UnsupportedSyntaxError,
  Filter,
  searchSyntaxLexer,
} from "./index.js";

function expectUnsupportedSyntax(action: () => unknown): void {
  try {
    action();
  } catch (error) {
    expect(error).toBeInstanceOf(UnsupportedSyntaxError);
    return;
  }

  throw new Error("Expected UnsupportedSyntaxError");
}

// =============================================================================
// parse() function tests
// =============================================================================

describe("parse()", () => {
  describe("empty and undefined inputs", () => {
    it("should return null for undefined query", () => {
      expect(parse(undefined)).toBeNull();
    });

    it("should return null for empty string", () => {
      expect(parse("")).toBeNull();
    });

    it("should return null for whitespace-only string", () => {
      expect(parse("   ")).toBeNull();
      expect(parse("\t\n")).toBeNull();
    });
  });

  describe("parsing behavior", () => {
    it("should throw ParseError for unclosed parenthesis", () => {
      // The parser now correctly throws an error for unclosed parenthesis
      expect(() => parse("(status:active")).toThrow(ParseError);
    });

    it("should include query in ParseError", () => {
      try {
        parse("(status:active");
      } catch (error) {
        expect(error).toBeInstanceOf(ParseError);
        expect((error as ParseError).query).toBe("(status:active");
        expect((error as ParseError).name).toBe("ParseError");
      }
    });
  });
});

// =============================================================================
// Field Search
// =============================================================================

describe("Field Search", () => {
  it("should parse field:value with string value", () => {
    expect(parse("status:active")).toEqual({
      status: "active",
    } satisfies Filter<{ status: string }>);
    expect(parse("slug:getting-started")).toEqual({
      slug: "getting-started",
    } satisfies Filter<{ slug: string }>);
  });

  it("should parse field:value with numeric value", () => {
    expect(parse("id:3")).toEqual({ id: 3 } satisfies Filter<{ id: number }>);
    expect(parse("count:42")).toEqual({
      count: 42,
    } satisfies Filter<{ count: number }>);
  });

  it("should parse field:value with quoted string", () => {
    expect(parse('name:"John Doe"')).toEqual({
      name: "John Doe",
    } satisfies Filter<{ name: string }>);
    expect(parse("name:'Jane Doe'")).toEqual({
      name: "Jane Doe",
    } satisfies Filter<{ name: string }>);
  });

  it("should parse field:value with single character value", () => {
    expect(parse("grade:A")).toEqual({
      grade: "A",
    } satisfies Filter<{ grade: string }>);
    expect(parse("flag:x")).toEqual({
      flag: "x",
    } satisfies Filter<{ flag: string }>);
  });
});

// =============================================================================
// Global Search (Full Text Search)
// =============================================================================

describe("Global Search", () => {
  it("should throw NoSearchableFieldsError when no searchable fields defined", () => {
    expect(() => parse("hello")).toThrow(NoSearchableFieldsError);
  });

  it("should include term in NoSearchableFieldsError", () => {
    try {
      parse("hello");
    } catch (error) {
      expect(error).toBeInstanceOf(NoSearchableFieldsError);
      expect((error as NoSearchableFieldsError).term).toBe("hello");
      expect((error as NoSearchableFieldsError).name).toBe(
        "NoSearchableFieldsError"
      );
    }
  });

  it("should search across all searchable fields", () => {
    const result = parse("123456", {
      fields: {
        id: { type: "number", searchable: true },
        tags: { type: "string", array: true, searchable: true },
      },
    });
    expect(result).toEqual({
      $or: [{ id: 123456 }, { tags: { $contains: ["123456"] } }],
    } satisfies Filter<{ id: number; tags: string[] }>);
  });

  it("should filter out non-matching types in global search", () => {
    const result = parse("hello", {
      fields: {
        id: { type: "number", searchable: true },
        tags: { type: "string", array: true, searchable: true },
        createdAt: { type: "date", searchable: true },
      },
    });
    expect(result).toEqual({
      tags: { $contains: ["hello"] },
    } satisfies Filter<{ tags: string[] }>);
  });

  it("should throw NoSearchableFieldsError when global search value doesn't match any searchable field type", () => {
    // "hello" can't be coerced to number, so no filters match
    expect(() =>
      parse("hello", {
        fields: {
          id: { type: "number", searchable: true },
        },
      })
    ).toThrow(NoSearchableFieldsError);
  });

  it("should handle multiple global search terms with AND", () => {
    const result = parse("hello world", {
      fields: {
        tags: { type: "string", array: true, searchable: true },
      },
    });
    expect(result).toEqual({
      $and: [
        { tags: { $contains: ["hello"] } },
        { tags: { $contains: ["world"] } },
      ],
    } satisfies Filter<{ tags: string[] }>);
  });

  it("should handle quoted global search term", () => {
    const result = parse('"hello world"', {
      fields: {
        tags: { type: "string", array: true, searchable: true },
      },
    });
    expect(result).toEqual({
      tags: { $contains: ["hello world"] },
    } satisfies Filter<{ tags: string[] }>);
  });

  it("should search non-array searchable fields with direct equality", () => {
    const result = parse("active", {
      fields: {
        status: { type: "string", searchable: true },
      },
    });
    expect(result).toEqual({
      status: "active",
    } satisfies Filter<{ status: string }>);
  });

  it("should use $or when multiple searchable fields match", () => {
    const result = parse("hello", {
      fields: {
        title: { type: "string", searchable: true },
        description: { type: "string", searchable: true },
      },
    });
    expect(result).toEqual({
      $or: [{ title: "hello" }, { description: "hello" }],
    } satisfies Filter<{ title: string; description: string }>);
  });
});

// =============================================================================
// Automatic Type Recognition
// =============================================================================

describe("Automatic Type Recognition", () => {
  describe("Null", () => {
    it("should parse null value", () => {
      expect(parse("image:null")).toEqual({
        image: null,
      } satisfies Filter<{ image: null }>);
    });
  });

  describe("Boolean", () => {
    it("should parse true value", () => {
      expect(parse("featured:true")).toEqual({
        featured: true,
      } satisfies Filter<{ featured: boolean }>);
    });

    it("should parse false value", () => {
      expect(parse("featured:false")).toEqual({
        featured: false,
      } satisfies Filter<{ featured: boolean }>);
    });
  });

  describe("Number", () => {
    it("should parse integer", () => {
      expect(parse("count:5")).toEqual({
        count: 5,
      } satisfies Filter<{ count: number }>);
    });

    it("should parse decimal number", () => {
      expect(parse("price:3.14")).toEqual({
        price: 3.14,
      } satisfies Filter<{ price: number }>);
    });

    it("should parse negative number in field value", () => {
      // Note: "field:-10" is parsed as field: followed by NOT 10
      // To get negative numbers, use quotes or field options
      const result = parse('temperature:"-10"');
      expect(result).toEqual({
        temperature: "-10",
      } satisfies Filter<{ temperature: string }>);
    });

    it("should throw ParseError for field with negative sign and no value", () => {
      // "temperature:-10" is parsed as "temperature:" followed by NOT "-10"
      // This is a parsing error because field: requires a value
      expect(() => parse("temperature:-10")).toThrow(ParseError);
    });
  });

  describe("Date", () => {
    it("should parse date (YYYY-MM-DD)", () => {
      expect(parse("date:2022-01-01")).toEqual({
        date: new Date(2022, 0, 1),
      } satisfies Filter<{ date: Date }>);
    });

    it("should parse date with time", () => {
      expect(parse("date:2022-01-01T12:34:56")).toEqual({
        date: new Date(2022, 0, 1, 12, 34, 56),
      } satisfies Filter<{ date: Date }>);
    });

    it("should parse date with timezone", () => {
      expect(parse("date:2022-01-01T12:34:56+08:00")).toEqual({
        date: new Date("2022-01-01T12:34:56+08:00"),
      } satisfies Filter<{ date: Date }>);
    });

    it("should parse date with Z timezone", () => {
      expect(parse("date:2022-01-01T12:34:56Z")).toEqual({
        date: new Date("2022-01-01T12:34:56Z"),
      } satisfies Filter<{ date: Date }>);
    });

    it("should parse ISO strings with milliseconds", () => {
      expect(parse("date:2022-01-01T12:34:56.789Z")).toEqual({
        date: new Date("2022-01-01T12:34:56.789Z"),
      } satisfies Filter<{ date: Date }>);
    });
  });

  describe("String", () => {
    it("should parse unquoted string", () => {
      expect(parse("status:active")).toEqual({
        status: "active",
      } satisfies Filter<{ status: string }>);
    });

    it("should parse double-quoted string", () => {
      expect(parse('author:"Steve Jobs"')).toEqual({
        author: "Steve Jobs",
      } satisfies Filter<{ author: string }>);
    });

    it("should parse single-quoted string", () => {
      expect(parse("author:'Steve Jobs'")).toEqual({
        author: "Steve Jobs",
      } satisfies Filter<{ author: string }>);
    });
  });
});

// =============================================================================
// Type Coercion with Field Options
// =============================================================================

describe("Type Coercion with Field Options", () => {
  describe("string type", () => {
    it("should coerce to string", () => {
      const result = parse("name:123", {
        fields: { name: { type: "string" } },
      });
      expect(result).toEqual({
        name: "123",
      } satisfies Filter<{ name: string }>);
    });

    it("should handle quoted string", () => {
      const result = parse('name:"hello world"', {
        fields: { name: { type: "string" } },
      });
      expect(result).toEqual({
        name: "hello world",
      } satisfies Filter<{ name: string }>);
    });
  });

  describe("number type", () => {
    it("should coerce to number", () => {
      const result = parse("count:42", {
        fields: { count: { type: "number" } },
      });
      expect(result).toEqual({
        count: 42,
      } satisfies Filter<{ count: number }>);
    });

    it("should reject non-numeric string", () => {
      expectUnsupportedSyntax(() =>
        parse("count:abc", {
          fields: { count: { type: "number" } },
        })
      );
    });
  });

  describe("boolean type", () => {
    it("should coerce 'true' to true", () => {
      const result = parse("active:true", {
        fields: { active: { type: "boolean" } },
      });
      expect(result).toEqual({
        active: true,
      } satisfies Filter<{ active: boolean }>);
    });

    it("should coerce 'false' to false", () => {
      const result = parse("active:false", {
        fields: { active: { type: "boolean" } },
      });
      expect(result).toEqual({
        active: false,
      } satisfies Filter<{ active: boolean }>);
    });

    it("should coerce any non-true string to false", () => {
      const result = parse("active:yes", {
        fields: { active: { type: "boolean" } },
      });
      expect(result).toEqual({
        active: false,
      } satisfies Filter<{ active: boolean }>);
    });
  });

  describe("date type", () => {
    it("should coerce valid date string", () => {
      const result = parse("created:2024-01-15", {
        fields: { created: { type: "date" } },
      });
      expect(result).toEqual({
        created: {
          $gte: new Date(2024, 0, 15),
          $lte: new Date(2024, 0, 15, 23, 59, 59, 999),
        },
      } satisfies Filter<{ created: Date }>);
    });

    it("should coerce year and month precision date strings", () => {
      expect(
        parse("created:2024", {
          fields: { created: { type: "date" } },
        })
      ).toEqual({
        created: {
          $gte: new Date(2024, 0, 1),
          $lte: new Date(2024, 11, 31, 23, 59, 59, 999),
        },
      } satisfies Filter<{ created: Date }>);

      expect(
        parse("created:2024-01", {
          fields: { created: { type: "date" } },
        })
      ).toEqual({
        created: {
          $gte: new Date(2024, 0, 1),
          $lte: new Date(2024, 0, 31, 23, 59, 59, 999),
        },
      } satisfies Filter<{ created: Date }>);
    });

    it("should preserve null equality for date fields", () => {
      expect(
        parse("created:null", {
          fields: { created: { type: "date" } },
        })
      ).toEqual({
        created: null,
      } satisfies Filter<{ created: Date | null }>);

      expect(
        parse("created:null,2024", {
          fields: { created: { type: "date" } },
          timezone: "UTC",
        })
      ).toEqual({
        $or: [
          { created: null },
          {
            created: {
              $gte: new Date("2024-01-01T00:00:00.000Z"),
              $lte: new Date("2024-12-31T23:59:59.999Z"),
            },
          },
        ],
      } satisfies Filter<{ created: Date | null }>);
    });

    it("should reject invalid date", () => {
      // Note: "not-a-date" would be parsed as NOT operator followed by "a-date"
      // Use a string that won't trigger NOT parsing
      expectUnsupportedSyntax(() =>
        parse("created:invalid", {
          fields: { created: { type: "date" } },
        })
      );
    });

    it("should reject date strings with invalid calendar parts", () => {
      const options = { fields: { created: { type: "date" as const } } };

      expectUnsupportedSyntax(() => parse("created:2024-13", options));
      expectUnsupportedSyntax(() => parse("created:2024-13-01", options));
      expectUnsupportedSyntax(() => parse('created:"2024-13"', options));
      expectUnsupportedSyntax(() => parse('created:"2024-13-01"', options));
      expectUnsupportedSyntax(() => parse('created:"2024-99-99"', options));
      expectUnsupportedSyntax(() => parse('created:"2024-02-31"', options));
      expectUnsupportedSyntax(() =>
        parse('created:"2024-13-01T12:00:00+08:00"', options)
      );
    });

    it("should reject invalid unquoted dates without creating global search terms", () => {
      const options = {
        fields: {
          created: { type: "date" as const },
          title: { type: "string" as const, searchable: true },
        },
      };

      expectUnsupportedSyntax(() => parse("created:2024-13", options));
      expectUnsupportedSyntax(() => parse("created:2024-13-01", options));
      expectUnsupportedSyntax(() => parse("created:2024-99-99", options));
    });

    it("should reject invalid unquoted date-like suffixes as one field value", () => {
      const options = {
        fields: {
          created: { type: "date" as const },
          title: { type: "string" as const, searchable: true },
        },
      };

      expectUnsupportedSyntax(() => parse("created:2024-01-15x", options));
      expectUnsupportedSyntax(() => parse("created:2024-01x", options));
      expectUnsupportedSyntax(() => parse("created:2024-01-1", options));
      expectUnsupportedSyntax(() => parse("created:2024-01-001", options));
    });

    it("should parse date-only strings in the configured timezone", () => {
      const result = parse("created:2024-01-15", {
        fields: { created: { type: "date" } },
        timezone: "America/New_York",
      });

      expect(result).toEqual({
        created: {
          $gte: new Date("2024-01-15T05:00:00.000Z"),
          $lte: new Date("2024-01-16T04:59:59.999Z"),
        },
      } satisfies Filter<{ created: Date }>);
    });

    it("should parse year and month precision dates in the configured timezone", () => {
      expect(
        parse("created:2024", {
          fields: { created: { type: "date" } },
          timezone: "America/New_York",
        })
      ).toEqual({
        created: {
          $gte: new Date("2024-01-01T05:00:00.000Z"),
          $lte: new Date("2025-01-01T04:59:59.999Z"),
        },
      } satisfies Filter<{ created: Date }>);

      expect(
        parse("created:2024-01", {
          fields: { created: { type: "date" } },
          timezone: "America/New_York",
        })
      ).toEqual({
        created: {
          $gte: new Date("2024-01-01T05:00:00.000Z"),
          $lte: new Date("2024-02-01T04:59:59.999Z"),
        },
      } satisfies Filter<{ created: Date }>);
    });

    it("should use OR ranges for multiple date values instead of $in", () => {
      expect(
        parse("created:2024-01,2024-02", {
          fields: { created: { type: "date" } },
          timezone: "UTC",
        })
      ).toEqual({
        $or: [
          {
            created: {
              $gte: new Date("2024-01-01T00:00:00.000Z"),
              $lte: new Date("2024-01-31T23:59:59.999Z"),
            },
          },
          {
            created: {
              $gte: new Date("2024-02-01T00:00:00.000Z"),
              $lte: new Date("2024-02-29T23:59:59.999Z"),
            },
          },
        ],
      } satisfies Filter<{ created: Date }>);
    });

    it("should parse local datetimes in the configured timezone", () => {
      const result = parse("created:2024-01-15T12:00:00", {
        fields: { created: { type: "date" } },
        timezone: "America/New_York",
      });

      expect(result).toEqual({
        created: new Date("2024-01-15T17:00:00.000Z"),
      } satisfies Filter<{ created: Date }>);
    });

    it("should keep explicit datetime offsets when timezone is configured", () => {
      const result = parse("created:2024-01-15T12:00:00+08:00", {
        fields: { created: { type: "date" } },
        timezone: "America/New_York",
      });

      expect(result).toEqual({
        created: new Date("2024-01-15T04:00:00.000Z"),
      } satisfies Filter<{ created: Date }>);
    });

    it("should coerce ISO strings with milliseconds", () => {
      expect(
        parse("created:2024-01-15T12:00:00.123Z", {
          fields: { created: { type: "date" } },
        })
      ).toEqual({
        created: new Date("2024-01-15T12:00:00.123Z"),
      } satisfies Filter<{ created: Date }>);

      expect(
        parse("created:2024-01-15T12:00:00.123+08:00", {
          fields: { created: { type: "date" } },
          timezone: "America/New_York",
        })
      ).toEqual({
        created: new Date("2024-01-15T04:00:00.123Z"),
      } satisfies Filter<{ created: Date }>);
    });

    it("should reject direct relative date values", () => {
      const options = {
        fields: { created: { type: "date" as const } },
        timezone: "UTC",
      };

      expectUnsupportedSyntax(() => parse("created:1h", options));
      expectUnsupportedSyntax(() => parse("created:-7d", options));
      expectUnsupportedSyntax(() => parse("created:+2w", options));
      expectUnsupportedSyntax(() => parse("created:-1w,1M", options));
    });

    it("should include unsupported field and value in unsupported syntax errors", () => {
      try {
        parse("created:-7d", {
          fields: { created: { type: "date" } },
        });
        throw new Error("Expected UnsupportedSyntaxError");
      } catch (error) {
        expect(error).toBeInstanceOf(UnsupportedSyntaxError);
        expect((error as UnsupportedSyntaxError).field).toBe("created");
        expect((error as UnsupportedSyntaxError).value).toBe("-7d");
      }
    });

    it("should resolve relative date comparisons from the configured timezone", () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date("2024-03-09T17:00:00.000Z"));

      try {
        expect(
          parse("created:>=1d", {
            fields: { created: { type: "date" } },
            timezone: "America/New_York",
          })
        ).toEqual({
          created: { $gte: new Date("2024-03-10T05:00:00.000Z") },
        } satisfies Filter<{ created: Date }>);
      } finally {
        jest.useRealTimers();
      }
    });

    it("should coerce relative date strings in comparisons", () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date("2024-01-15T10:30:00.000Z"));

      try {
        expect(
          parse("created:>=-1w created:<1M", {
            fields: { created: { type: "date" } },
          })
        ).toEqual({
          $and: [
            { created: { $gte: new Date(2024, 0, 8) } },
            { created: { $lt: new Date(2024, 1, 15) } },
          ],
        } satisfies Filter<{ created: Date }>);
      } finally {
        jest.useRealTimers();
      }
    });

    it("should snap relative date comparisons to range boundaries", () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date("2024-01-15T10:30:00.000Z"));

      try {
        const options = {
          fields: { created: { type: "date" as const } },
          timezone: "UTC",
        };

        expect(parse("created:>=-7d", options)).toEqual({
          created: { $gte: new Date("2024-01-08T00:00:00.000Z") },
        } satisfies Filter<{ created: Date }>);

        expect(parse("created:>-7d", options)).toEqual({
          created: { $gt: new Date("2024-01-08T23:59:59.999Z") },
        } satisfies Filter<{ created: Date }>);

        expect(parse("created:<-7d", options)).toEqual({
          created: { $lt: new Date("2024-01-08T00:00:00.000Z") },
        } satisfies Filter<{ created: Date }>);

        expect(parse("created:<=-7d", options)).toEqual({
          created: { $lte: new Date("2024-01-08T23:59:59.999Z") },
        } satisfies Filter<{ created: Date }>);
      } finally {
        jest.useRealTimers();
      }
    });

    it("should snap date-only comparisons to precision boundaries", () => {
      const options = {
        fields: { created: { type: "date" as const } },
        timezone: "UTC",
      };

      expect(parse("created:>=2024-01", options)).toEqual({
        created: { $gte: new Date("2024-01-01T00:00:00.000Z") },
      } satisfies Filter<{ created: Date }>);

      expect(parse("created:<=2024-01", options)).toEqual({
        created: { $lte: new Date("2024-01-31T23:59:59.999Z") },
      } satisfies Filter<{ created: Date }>);

      expect(parse("created:>2024", options)).toEqual({
        created: { $gt: new Date("2024-12-31T23:59:59.999Z") },
      } satisfies Filter<{ created: Date }>);

      expect(parse("created:<2024-01-15", options)).toEqual({
        created: { $lt: new Date("2024-01-15T00:00:00.000Z") },
      } satisfies Filter<{ created: Date }>);
    });

    it("should clamp month offsets to the target month", () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date("2024-01-31T10:30:00.000Z"));

      try {
        expect(
          parse("created:>=1M", {
            fields: { created: { type: "date" } },
            timezone: "UTC",
          })
        ).toEqual({
          created: { $gte: new Date("2024-02-29T00:00:00.000Z") },
        } satisfies Filter<{ created: Date }>);
      } finally {
        jest.useRealTimers();
      }
    });

    it("should clamp year offsets from leap day", () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date("2024-02-29T10:30:00.000Z"));

      try {
        expect(
          parse("created:>=1y", {
            fields: { created: { type: "date" } },
            timezone: "UTC",
          })
        ).toEqual({
          created: { $gte: new Date("2025-02-28T00:00:00.000Z") },
        } satisfies Filter<{ created: Date }>);
      } finally {
        jest.useRealTimers();
      }
    });

    it("should not coerce relative date strings in global search for date fields", () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date("2024-01-15T10:30:00.000Z"));

      try {
        const result = parse("-7d", {
          fields: {
            title: { type: "string", searchable: true },
            created: { type: "date", searchable: true },
          },
        });

        expect(result).toEqual({
          title: "-7d",
        } satisfies Filter<{ title: string; created: Date }>);
      } finally {
        jest.useRealTimers();
      }
    });

    it("should reject unsupported relative date units and overflowed dates", () => {
      const options = { fields: { created: { type: "date" as const } } };

      expectUnsupportedSyntax(() => parse('created:"1Q"', options));
      expectUnsupportedSyntax(() => parse('created:"1quarter"', options));
      expectUnsupportedSyntax(() => parse('created:"1ms"', options));
      expectUnsupportedSyntax(() => parse('created:"1millisecond"', options));
      expectUnsupportedSyntax(() =>
        parse("created:9007199254740991y", options)
      );
    });

    it("should reject long relative date units", () => {
      const options = { fields: { created: { type: "date" as const } } };

      expectUnsupportedSyntax(() => parse('created:"1second"', options));
      expectUnsupportedSyntax(() => parse('created:"1minute"', options));
      expectUnsupportedSyntax(() => parse('created:"1hour"', options));
      expectUnsupportedSyntax(() => parse('created:"1day"', options));
      expectUnsupportedSyntax(() => parse('created:"1week"', options));
      expectUnsupportedSyntax(() => parse('created:"1month"', options));
      expectUnsupportedSyntax(() => parse('created:"1year"', options));
    });

    it("should only tokenize short relative date units as relative dates", () => {
      const result = searchSyntaxLexer.tokenize("created:1weeks");

      expect(result.errors).toEqual([]);
      expect(result.tokens.map((token) => token.tokenType.name)).not.toContain(
        "RelativeDate"
      );
    });
  });
});

// =============================================================================
// Comparison Operators
// =============================================================================

describe("Comparison Operators", () => {
  describe("Greater Than (:>)", () => {
    it("should parse greater than with number", () => {
      expect(parse("count:>5")).toEqual({
        count: { $gt: 5 },
      } satisfies Filter<{ count: number }>);
    });

    it("should parse greater than with string", () => {
      expect(parse("tag:>getting-started")).toEqual({
        tag: { $gt: "getting-started" },
      } satisfies Filter<{ tag: string }>);
    });

    it("should parse greater than with quoted string", () => {
      expect(parse('author:>"Steve Jobs"')).toEqual({
        author: { $gt: "Steve Jobs" },
      } satisfies Filter<{ author: string }>);
    });
  });

  describe("Less Than (:<)", () => {
    it("should parse less than with number", () => {
      expect(parse("count:<5")).toEqual({
        count: { $lt: 5 },
      } satisfies Filter<{ count: number }>);
    });

    it("should parse less than with string", () => {
      expect(parse("tag:<getting-started")).toEqual({
        tag: { $lt: "getting-started" },
      } satisfies Filter<{ tag: string }>);
    });

    it("should parse less than with quoted string", () => {
      expect(parse('author:<"Steve Jobs"')).toEqual({
        author: { $lt: "Steve Jobs" },
      } satisfies Filter<{ author: string }>);
    });
  });

  describe("Greater Than or Equal (:>=)", () => {
    it("should parse greater than or equal with number", () => {
      expect(parse("count:>=5")).toEqual({
        count: { $gte: 5 },
      } satisfies Filter<{ count: number }>);
    });

    it("should parse greater than or equal with string", () => {
      expect(parse("tag:>=getting-started")).toEqual({
        tag: { $gte: "getting-started" },
      } satisfies Filter<{ tag: string }>);
    });

    it("should parse greater than or equal with quoted string", () => {
      expect(parse('author:>="Steve Jobs"')).toEqual({
        author: { $gte: "Steve Jobs" },
      } satisfies Filter<{ author: string }>);
    });
  });

  describe("Less Than or Equal (:<=)", () => {
    it("should parse less than or equal with number", () => {
      expect(parse("count:<=5")).toEqual({
        count: { $lte: 5 },
      } satisfies Filter<{ count: number }>);
    });

    it("should parse less than or equal with string", () => {
      expect(parse("tag:<=getting-started")).toEqual({
        tag: { $lte: "getting-started" },
      } satisfies Filter<{ tag: string }>);
    });

    it("should parse less than or equal with quoted string", () => {
      expect(parse('author:<="Steve Jobs"')).toEqual({
        author: { $lte: "Steve Jobs" },
      } satisfies Filter<{ author: string }>);
    });
  });

  describe("Comparison with undefined value", () => {
    it("should reject comparison value when it does not match the field type", () => {
      expectUnsupportedSyntax(() =>
        parse("count:>abc", {
          fields: { count: { type: "number" } },
        })
      );
    });
  });
});

// =============================================================================
// Logical Operators
// =============================================================================

describe("Logical Operators", () => {
  describe("AND (implicit)", () => {
    it("should merge non-conflicting terms into single object", () => {
      expect(parse("status:active featured:true")).toEqual({
        status: "active",
        featured: true,
      } satisfies Filter<{ status: string; featured: boolean }>);
    });

    it("should merge multiple non-conflicting terms", () => {
      expect(parse("a:1 b:2 c:3")).toEqual({
        a: 1,
        b: 2,
        c: 3,
      } satisfies Filter<{ a: number; b: number; c: number }>);
    });

    it("should use $and for conflicting keys", () => {
      expect(parse("status:active status:pending")).toEqual({
        $and: [{ status: "active" }, { status: "pending" }],
      } satisfies Filter<{ status: string }>);
    });
  });

  describe("AND (explicit)", () => {
    it("should merge non-conflicting terms with explicit AND", () => {
      expect(parse("status:active AND featured:true")).toEqual({
        status: "active",
        featured: true,
      } satisfies Filter<{ status: string; featured: boolean }>);
    });
  });

  describe("OR", () => {
    it("should parse OR operator", () => {
      expect(parse("status:active OR status:pending")).toEqual({
        $or: [{ status: "active" }, { status: "pending" }],
      } satisfies Filter<{ status: string }>);
    });

    it("should parse multiple OR operators", () => {
      expect(parse("a:1 OR b:2 OR c:3")).toEqual({
        $or: [{ a: 1 }, { b: 2 }, { c: 3 }],
      } satisfies Filter<{ a: number; b: number; c: number }>);
    });
  });

  describe("NOT", () => {
    it("should parse dash prefix as NOT", () => {
      expect(parse("-status:archived")).toEqual({
        $not: { status: "archived" },
      } satisfies Filter<{ status: string }>);
    });

    it("should parse 'not' keyword as NOT", () => {
      expect(parse("not status:archived")).toEqual({
        $not: { status: "archived" },
      } satisfies Filter<{ status: string }>);
    });

    it("should parse 'NOT' keyword (uppercase)", () => {
      expect(parse("NOT status:archived")).toEqual({
        $not: { status: "archived" },
      } satisfies Filter<{ status: string }>);
    });

    it("should handle NOT with grouped OR expression", () => {
      expect(parse("-(status:active OR status:pending)")).toEqual({
        $not: {
          $or: [{ status: "active" }, { status: "pending" }],
        },
      } satisfies Filter<{ status: string }>);
    });

    it("should handle nested NOT", () => {
      expect(parse("-(a:1 OR -b:2)")).toEqual({
        $not: {
          $or: [{ a: 1 }, { $not: { b: 2 } }],
        },
      } satisfies Filter<{ a: number; b: number }>);
    });

    it("should use $and when all conditions have special operators", () => {
      // Both conditions contain $not, so neither can be merged
      expect(parse("-a:1 -b:2")).toEqual({
        $and: [{ $not: { a: 1 } }, { $not: { b: 2 } }],
      } satisfies Filter<{ a: number; b: number }>);
    });
  });

  describe("Operator Precedence", () => {
    it("AND should have higher priority than OR", () => {
      expect(parse("a:1 OR b:2 AND c:3")).toEqual({
        $or: [{ a: 1 }, { b: 2, c: 3 }],
      } satisfies Filter<{ a: number; b: number; c: number }>);
    });

    it("Parentheses should override default precedence", () => {
      expect(parse("(a:1 OR b:2) AND c:3")).toEqual({
        $and: [{ c: 3 }, { $or: [{ a: 1 }, { b: 2 }] }],
      } satisfies Filter<{ a: number; b: number; c: number }>);
    });

    it("should keep $and when $or is combined with simple field", () => {
      expect(parse("(a:1 OR b:2) c:3")).toEqual({
        $and: [{ c: 3 }, { $or: [{ a: 1 }, { b: 2 }] }],
      } satisfies Filter<{ a: number; b: number; c: number }>);
    });

    it("Complex nested expression", () => {
      expect(parse("a:1 OR b:2 AND (c:3 OR d:4)")).toEqual({
        $or: [{ a: 1 }, { $and: [{ b: 2 }, { $or: [{ c: 3 }, { d: 4 }] }] }],
      } satisfies Filter<{ a: number; b: number; c: number; d: number }>);
    });
  });
});

// =============================================================================
// Grouping with Parentheses
// =============================================================================

describe("Grouping with Parentheses", () => {
  it("should handle simple grouped expression", () => {
    expect(parse("(status:active)")).toEqual({
      status: "active",
    } satisfies Filter<{ status: string }>);
  });

  it("should handle nested parentheses", () => {
    expect(parse("((a:1))")).toEqual({
      a: 1,
    } satisfies Filter<{ a: number }>);
  });

  it("should handle grouped OR within AND", () => {
    expect(parse("type:post AND (status:active OR status:draft)")).toEqual({
      $and: [
        { type: "post" },
        { $or: [{ status: "active" }, { status: "draft" }] },
      ],
    } satisfies Filter<{ type: string; status: string }>);
  });
});


// =============================================================================
// Multiple Values (Comma-separated)
// =============================================================================

describe("Multiple Values (Comma-separated)", () => {
  describe("$in for non-array fields", () => {
    it("should parse comma-separated values as $in", () => {
      const result = parse("status:active,pending,draft");
      expect(result).toEqual({
        status: { $in: ["active", "pending", "draft"] },
      } satisfies Filter<{ status: string }>);
    });

    it("should parse numeric comma-separated values", () => {
      const result = parse("id:1,2,3", {
        fields: { id: { type: "number" } },
      });
      expect(result).toEqual({
        id: { $in: [1, 2, 3] },
      } satisfies Filter<{ id: number }>);
    });
  });

  describe("$contains for array fields", () => {
    it("should parse comma-separated values as $contains for array field", () => {
      const result = parse("tags:vue,react,angular", {
        fields: { tags: { type: "string", array: true } },
      });
      expect(result).toEqual({
        tags: { $contains: ["vue", "react", "angular"] },
      } satisfies Filter<{ tags: string[] }>);
    });
  });
});

// =============================================================================
// Nested Field Search
// =============================================================================

describe("Nested Field Search", () => {
  it("should parse nested field with dot notation", () => {
    expect(parse("user.name:john")).toEqual({
      user: { name: "john" },
    } satisfies Filter<{ user: { name: string } }>);
  });

  it("should parse deeply nested field", () => {
    expect(parse("user.profile.avatar:url")).toEqual({
      user: { profile: { avatar: "url" } },
    } satisfies Filter<{ user: { profile: { avatar: string } } }>);
  });

  it("should parse nested field with numeric value", () => {
    expect(parse("post.id:123")).toEqual({
      post: { id: 123 },
    } satisfies Filter<{ post: { id: number } }>);
  });

  it("should parse nested field with comparison operators", () => {
    expect(parse("user.age:>18")).toEqual({
      user: { age: { $gt: 18 } },
    });
  });

  it("should parse nested field with all comparison operators", () => {
    expect(parse("user.age:>=18")).toEqual({
      user: { age: { $gte: 18 } },
    });
    expect(parse("user.age:<65")).toEqual({
      user: { age: { $lt: 65 } },
    });
    expect(parse("user.age:<=65")).toEqual({
      user: { age: { $lte: 65 } },
    });
  });
});

// =============================================================================
// Field Aliases
// =============================================================================

describe("Field Aliases", () => {
  it("should resolve field alias to actual field name", () => {
    const result = parse("author:john", {
      aliases: { author: "createdBy" },
    });
    expect(result).toEqual({
      createdBy: "john",
    } satisfies Filter<{ createdBy: string }>);
  });

  it("should work with searchable fields and aliases", () => {
    const result = parse("john AND name:john", {
      fields: {
        username: { type: "string", searchable: true },
      },
      aliases: {
        name: "username",
      },
    });
    // Both conditions use same key "username", so they remain in $and
    expect(result).toEqual({
      $and: [{ username: "john" }, { username: "john" }],
    } satisfies Filter<{ username: string }>);
  });

  it("should not transform field without alias", () => {
    const result = parse("name:john", {
      aliases: { author: "createdBy" },
    });
    expect(result).toEqual({
      name: "john",
    } satisfies Filter<{ name: string }>);
  });
});

// =============================================================================
// Whitespace Handling
// =============================================================================

describe("Whitespace Handling", () => {
  it("should ignore whitespace around field and value", () => {
    expect(parse("status : active")).toEqual({
      status: "active",
    } satisfies Filter<{ status: string }>);
  });

  it("should handle whitespace around comparison operator", () => {
    // Note: "count : > 5" is parsed as "count:>" "5" (two separate terms)
    // The :> must be together. Whitespace IS allowed between field and :>
    expect(parse("count :> 5")).toEqual({
      count: { $gt: 5 },
    } satisfies Filter<{ count: number }>);
  });

  it("should ignore whitespace around NOT operator", () => {
    expect(parse("- status : active")).toEqual({
      $not: { status: "active" },
    } satisfies Filter<{ status: string }>);
  });

  it("should preserve whitespace inside quoted strings", () => {
    expect(parse('name : "Hello World"')).toEqual({
      name: "Hello World",
    } satisfies Filter<{ name: string }>);
  });

  it("should handle multiple spaces between terms", () => {
    expect(parse("a:1    b:2")).toEqual({
      a: 1,
      b: 2,
    } satisfies Filter<{ a: number; b: number }>);
  });
});

// =============================================================================
// Edge Cases and Error Handling
// =============================================================================

describe("Edge Cases", () => {
  it("should handle single term query", () => {
    expect(parse("status:active")).toEqual({
      status: "active",
    } satisfies Filter<{ status: string }>);
  });

  it("should throw NoSearchableFieldsError when OR contains global search term without searchable fields", () => {
    // globalTerm without searchable fields throws error
    expect(() => parse("invalid OR valid:1")).toThrow(NoSearchableFieldsError);
  });

  it("should handle URLs with quotes (colon in value)", () => {
    // Colons are special characters, so URLs need quotes
    expect(parse('url:"https://example.com"')).toEqual({
      url: "https://example.com",
    } satisfies Filter<{ url: string }>);
  });

  it("should throw ParseError for URL without quotes (multiple colons)", () => {
    // Without quotes, the colon after "https" causes a parsing error
    // because "//example.com" is not a valid value
    expect(() => parse("url:https://example.com")).toThrow(ParseError);
  });

  it("should handle negative numbers with quotes", () => {
    // Negative sign is parsed as NOT operator, so use quotes
    // However, quoted "-20" is a string, so type coercion to number gives NaN
    const result = parse('temp:"-20"');
    // Without field type, it remains a string
    expect(result).toEqual({
      temp: "-20",
    } satisfies Filter<{ temp: string }>);
  });

  it("should handle decimal numbers", () => {
    expect(parse("rate:0.5")).toEqual({
      rate: 0.5,
    } satisfies Filter<{ rate: number }>);
  });
});

// =============================================================================
// Combined Scenarios
// =============================================================================

describe("Combined Scenarios", () => {
  it("should handle complex real-world query", () => {
    const result = parse(
      'status:active OR status:pending AND category:blog AND -featured:true author:"John Doe"',
      {
        fields: {
          status: { type: "string" },
          category: { type: "string" },
          featured: { type: "boolean" },
          author: { type: "string" },
        },
      }
    );
    expect(result).toEqual({
      $or: [
        { status: "active" },
        {
          $and: [
            { status: "pending", category: "blog", author: "John Doe" },
            { $not: { featured: true } },
          ],
        },
      ],
    } satisfies Filter<{
      status: string;
      category: string;
      featured: boolean;
      author: string;
    }>);
  });

  it("should handle mixed global search and field search", () => {
    const result = parse("typescript tag:javascript", {
      fields: {
        title: { type: "string", searchable: true },
        tag: { type: "string" },
      },
    });
    expect(result).toEqual({
      tag: "javascript",
      title: "typescript",
    } satisfies Filter<{ title: string; tag: string }>);
  });

  it("should handle comparison with type coercion", () => {
    const result = parse("price:>100 AND price:<500", {
      fields: { price: { type: "number" } },
    });
    expect(result).toEqual({
      $and: [{ price: { $gt: 100 } }, { price: { $lt: 500 } }],
    } satisfies Filter<{ price: number }>);
  });
});

// =============================================================================
// Fulltext Search
// =============================================================================

describe("Fulltext Search", () => {
  describe("Field Search with fulltext option", () => {
    it("should use $fulltext operator when fulltext is true", () => {
      const result = parse("title:hello", {
        fields: { title: { type: "string", fulltext: true } },
      });
      expect(result).toEqual({
        title: { $fulltext: "hello" },
      } satisfies Filter<{ title: string }>);
    });

    it("should use $fulltext operator with quoted string", () => {
      const result = parse('title:"hello world"', {
        fields: { title: { type: "string", fulltext: true } },
      });
      expect(result).toEqual({
        title: { $fulltext: "hello world" },
      } satisfies Filter<{ title: string }>);
    });

    it("should use direct value when fulltext is false", () => {
      const result = parse("status:active", {
        fields: { status: { type: "string", fulltext: false } },
      });
      expect(result).toEqual({
        status: "active",
      } satisfies Filter<{ status: string }>);
    });

    it("should use direct value when fulltext is not set", () => {
      const result = parse("status:active", {
        fields: { status: { type: "string" } },
      });
      expect(result).toEqual({
        status: "active",
      } satisfies Filter<{ status: string }>);
    });

    it("should still use $in for multiple values even with fulltext", () => {
      const result = parse("title:hello,world", {
        fields: { title: { type: "string", fulltext: true } },
      });
      expect(result).toEqual({
        title: { $in: ["hello", "world"] },
      } satisfies Filter<{ title: string }>);
    });

    it("should still use $contains for array field even with fulltext", () => {
      const result = parse("tags:javascript", {
        fields: { tags: { type: "string", fulltext: true, array: true } },
      });
      expect(result).toEqual({
        tags: { $contains: ["javascript"] },
      } satisfies Filter<{ tags: string[] }>);
    });
  });

  describe("Global Search with fulltext option", () => {
    it("should use $fulltext for searchable field with fulltext", () => {
      const result = parse("hello", {
        fields: { title: { type: "string", searchable: true, fulltext: true } },
      });
      expect(result).toEqual({
        title: { $fulltext: "hello" },
      } satisfies Filter<{ title: string }>);
    });

    it("should use direct value for searchable field without fulltext", () => {
      const result = parse("hello", {
        fields: { status: { type: "string", searchable: true } },
      });
      expect(result).toEqual({
        status: "hello",
      } satisfies Filter<{ status: string }>);
    });

    it("should mix fulltext and non-fulltext fields in global search", () => {
      const result = parse("hello", {
        fields: {
          title: { type: "string", searchable: true, fulltext: true },
          status: { type: "string", searchable: true },
        },
      });
      expect(result).toEqual({
        $or: [{ title: { $fulltext: "hello" } }, { status: "hello" }],
      } satisfies Filter<{ title: string; status: string }>);
    });

    it("should use $contains for searchable array field even with fulltext", () => {
      const result = parse("hello", {
        fields: {
          tags: {
            type: "string",
            searchable: true,
            fulltext: true,
            array: true,
          },
        },
      });
      expect(result).toEqual({
        tags: { $contains: ["hello"] },
      } satisfies Filter<{ tags: string[] }>);
    });
  });

  describe("Field Search with prefix option", () => {
    it("should use $prefix for wildcard pattern with prefix: true", () => {
      const result = parse("title:hello*", {
        fields: { title: { type: "string", prefix: true } },
      });
      expect(result).toEqual({
        title: { $prefix: "hello" },
      } satisfies Filter<{ title: string }>);
    });

    it("should not transform single asterisk even with prefix: true", () => {
      const result = parse("title:*", {
        fields: { title: { type: "string", prefix: true } },
      });
      expect(result).toEqual({
        title: "*",
      } satisfies Filter<{ title: string }>);
    });

    it("should keep wildcard as-is without prefix option", () => {
      const result = parse("title:hello*", {
        fields: { title: { type: "string" } },
      });
      expect(result).toEqual({
        title: "hello*",
      } satisfies Filter<{ title: string }>);
    });

    it("should use direct value for non-wildcard search even with prefix", () => {
      const result = parse("title:hello", {
        fields: { title: { type: "string", prefix: true } },
      });
      expect(result).toEqual({
        title: "hello",
      } satisfies Filter<{ title: string }>);
    });

    it("should still use $in for multiple values even with prefix", () => {
      const result = parse("title:hello,world", {
        fields: { title: { type: "string", prefix: true } },
      });
      expect(result).toEqual({
        title: { $in: ["hello", "world"] },
      } satisfies Filter<{ title: string }>);
    });

    it("should still use $contains for array field even with prefix", () => {
      const result = parse("tags:javascript", {
        fields: { tags: { type: "string", prefix: true, array: true } },
      });
      expect(result).toEqual({
        tags: { $contains: ["javascript"] },
      } satisfies Filter<{ tags: string[] }>);
    });
  });

  describe("Global Search with prefix option", () => {
    it("should use $prefix for wildcard search with prefix option", () => {
      const result = parse("hello*", {
        fields: { title: { type: "string", searchable: true, prefix: true } },
      });
      expect(result).toEqual({
        title: { $prefix: "hello" },
      } satisfies Filter<{ title: string }>);
    });

    it("should use direct value for non-wildcard search even with prefix", () => {
      const result = parse("hello", {
        fields: { title: { type: "string", searchable: true, prefix: true } },
      });
      expect(result).toEqual({
        title: "hello",
      } satisfies Filter<{ title: string }>);
    });

    it("should mix prefix and non-prefix fields in global wildcard search", () => {
      const result = parse("hello*", {
        fields: {
          title: { type: "string", searchable: true, prefix: true },
          status: { type: "string", searchable: true },
        },
      });
      expect(result).toEqual({
        $or: [{ title: { $prefix: "hello" } }, { status: "hello*" }],
      } satisfies Filter<{ title: string; status: string }>);
    });

    it("should use $contains for searchable array field even with prefix wildcard", () => {
      const result = parse("hello*", {
        fields: {
          tags: {
            type: "string",
            searchable: true,
            prefix: true,
            array: true,
          },
        },
      });
      expect(result).toEqual({
        tags: { $contains: ["hello*"] },
      } satisfies Filter<{ tags: string[] }>);
    });
  });
});

// =============================================================================
// Parser Error Handling
// =============================================================================

describe("Parser Error Handling", () => {
  it("should throw ParseError for unmatched closing parenthesis", () => {
    expect(() => parse(")")).toThrow(ParseError);
  });

  it("should throw ParseError for invalid syntax with only operator", () => {
    expect(() => parse("OR")).toThrow(ParseError);
  });

  it("should throw ParseError for only AND operator", () => {
    expect(() => parse("AND")).toThrow(ParseError);
  });
});
