import { parse, ParseError, NoSearchableFieldsError, Filter } from "./index.js";

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
      $or: [{ tags: { $contains: ["hello"] } }],
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
        { $or: [{ tags: { $contains: ["hello"] } }] },
        { $or: [{ tags: { $contains: ["world"] } }] },
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
      $or: [{ tags: { $contains: ["hello world"] } }],
    } satisfies Filter<{ tags: string[] }>);
  });

  it("should search non-array searchable fields with direct equality", () => {
    const result = parse("active", {
      fields: {
        status: { type: "string", searchable: true },
      },
    });
    expect(result).toEqual({
      $or: [{ status: "active" }],
    } satisfies Filter<{ status: string }>);
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
        date: new Date("2022-01-01"),
      } satisfies Filter<{ date: Date }>);
    });

    it("should parse date with time", () => {
      expect(parse("date:2022-01-01T12:34:56")).toEqual({
        date: new Date("2022-01-01T12:34:56"),
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

    it("should return null for non-numeric string", () => {
      const result = parse("count:abc", {
        fields: { count: { type: "number" } },
      });
      expect(result).toBeNull();
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
        created: new Date("2024-01-15"),
      } satisfies Filter<{ created: Date }>);
    });

    it("should return null for invalid date", () => {
      // Note: "not-a-date" would be parsed as NOT operator followed by "a-date"
      // Use a string that won't trigger NOT parsing
      const result = parse("created:invalid", {
        fields: { created: { type: "date" } },
      });
      expect(result).toBeNull();
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
    it("should return null when comparison value is undefined (invalid type)", () => {
      const result = parse("count:>abc", {
        fields: { count: { type: "number" } },
      });
      expect(result).toBeNull();
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
// Wildcard Search (Prefix/Suffix)
// =============================================================================

describe("Wildcard Search", () => {
  describe("Prefix Search", () => {
    it("should parse prefix wildcard (abc*)", () => {
      expect(parse("name:abc*")).toEqual({
        name: { $like: "abc%" },
      } satisfies Filter<{ name: string }>);
    });

    it("should handle prefix search with field options", () => {
      const result = parse("name:test*", {
        fields: { name: { type: "string" } },
      });
      expect(result).toEqual({
        name: { $like: "test%" },
      } satisfies Filter<{ name: string }>);
    });
  });

  describe("Suffix Search", () => {
    it("should parse suffix wildcard (*abc)", () => {
      expect(parse("name:*abc")).toEqual({
        name: { $like: "%abc" },
      } satisfies Filter<{ name: string }>);
    });

    it("should handle suffix search with field options", () => {
      const result = parse("name:*test", {
        fields: { name: { type: "string" } },
      });
      expect(result).toEqual({
        name: { $like: "%test" },
      } satisfies Filter<{ name: string }>);
    });
  });

  describe("No wildcard transformation for short strings", () => {
    it("should not transform single character with asterisk", () => {
      // Single char string length check - "*" alone is length 1
      expect(parse("flag:*")).toEqual({
        flag: "*",
      } satisfies Filter<{ flag: string }>);
    });
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
      $and: [{ username: "john" }, { $or: [{ username: "john" }] }],
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
      $and: [{ tag: "javascript" }, { $or: [{ title: "typescript" }] }],
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
