# search-syntax

[![npm version](https://badge.fury.io/js/search-syntax.svg)](https://www.npmjs.com/package/search-syntax)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A search syntax parser similar to GitHub, Shopify, and Gmail. Converts human-readable search queries into filter objects compatible with database query builders.

## Installation

```bash
npm install search-syntax
# or
pnpm add search-syntax
# or
yarn add search-syntax
```

## Quick Start

```typescript
import { parse } from "search-syntax";

// Simple field search
parse("status:active");
// => { status: "active" }

// Comparison operators
parse("count:>5");
// => { count: { $gt: 5 } }

// Multiple values (comma-separated)
parse("id:1,2,3", { fields: { id: { type: "number" } } });
// => { id: { $in: [1, 2, 3] } }

// Logical operators
parse("status:active OR status:pending");
// => { $or: [{ status: "active" }, { status: "pending" }] }
```

## Syntax Reference

### Field Search

Search for specific field values using `field:value` syntax:

```typescript
parse("name:john");           // { name: "john" }
parse('author:"John Doe"');   // { author: "John Doe" }
parse("count:42");            // { count: 42 }
parse("active:true");         // { active: true }
parse("date:2024-01-01");     // { date: Date }
parse("created:2024", { fields: { created: { type: "date" } } });
// { created: { $gte: Date, $lte: Date } } for the full year
parse("image:null");          // { image: null }
```

### Comparison Operators

| Operator | Description | Example |
|----------|-------------|---------|
| `:` | Equal | `count:5` |
| `:>` | Greater than | `count:>5` |
| `:>=` | Greater than or equal | `count:>=5` |
| `:<` | Less than | `count:<5` |
| `:<=` | Less than or equal | `count:<=5` |

```typescript
parse("price:>100");   // { price: { $gt: 100 } }
parse("age:>=18");     // { age: { $gte: 18 } }
parse("stock:<10");    // { stock: { $lt: 10 } }
parse("rating:<=5");   // { rating: { $lte: 5 } }
```

### Date Values

Fields configured with `type: "date"` accept `YYYY`, `YYYY-MM`, `YYYY-MM-DD`, and ISO datetimes. Date values without an explicit offset are parsed in the system timezone by default, or in the configured user `timezone`. Comparisons also accept relative date offsets, resolved from the current time in that timezone:

```typescript
parse("created:>=-7d", {
  fields: { created: { type: "date" } },
});
// => { created: { $gte: Date } }

parse("created:2024-01,2024-02", {
  fields: { created: { type: "date" } },
});
// => { $or: [
//   { created: { $gte: Date, $lte: Date } },
//   { created: { $gte: Date, $lte: Date } }
// ] }

parse("created:2024-01-15", {
  fields: { created: { type: "date" } },
  timezone: "Asia/Shanghai",
});
// => { created: {
//   $gte: Date("2024-01-14T16:00:00.000Z"),
//   $lte: Date("2024-01-15T15:59:59.999Z")
// } }
```

Relative offsets use `[+|-]number + unit` in comparison expressions. Omitting the sign adds the offset to the current time, so `created:>=1h` means one hour from now. Supported units are `s`, `m`, `h`, `d`, `w`, `M`, and `y`; `m` means minute and `M` means month. Long units such as `seconds`, `minutes`, or `weeks` are not supported. Direct field searches such as `created:-1w` are not supported.

Direct field searches for date precision values use inclusive ranges: `created:2024-01-15` matches that day, `created:2024-01` matches that month, and `created:2024` matches that year.

In comparisons, date-like values are aligned to range boundaries: `>=` and `<` use the start boundary, while `>` and `<=` use the end boundary. For example, `created:>=-7d` starts at the beginning of the target day; `created:<=2024-01` ends at the end of January 2024.

### Multiple Values

Comma-separated values create an `$in` query for non-date fields. Array fields use `$contains`, and date fields use `$or` so date precision values can expand to ranges:

```typescript
parse("status:active,pending,draft");
// => { status: { $in: ["active", "pending", "draft"] } }

parse("tags:vue,react", {
  fields: { tags: { type: "string", array: true } }
});
// => { tags: { $contains: ["vue", "react"] } }

parse("created:2024-01,2024-02", {
  fields: { created: { type: "date" } }
});
// => { $or: [
//   { created: { $gte: Date, $lte: Date } },
//   { created: { $gte: Date, $lte: Date } }
// ] }
```

### Wildcard Search

Wildcard values are preserved as literal strings by default. For string fields configured with `prefix: true`, a trailing `*` becomes a `$prefix` search:

```typescript
parse("name:john*");
// => { name: "john*" }

parse("name:john*", {
  fields: { name: { type: "string", prefix: true } }
});
// => { name: { $prefix: "john" } }
```

### Logical Operators

| Operator | Description |
|----------|-------------|
| (space) or `AND` | Logical AND |
| `OR` | Logical OR |
| `-` or `NOT` | Negation |

```typescript
// AND (implicit)
parse("status:active featured:true");
// => { $and: [{ status: "active" }, { featured: true }] }

// AND (explicit)
parse("status:active AND featured:true");
// => { $and: [{ status: "active" }, { featured: true }] }

// OR
parse("status:active OR status:draft");
// => { $or: [{ status: "active" }, { status: "draft" }] }

// NOT
parse("-status:archived");
// => { $not: { status: "archived" } }

parse("NOT status:archived");
// => { $not: { status: "archived" } }
```

### Grouping with Parentheses

```typescript
parse("category:books AND (status:active OR status:featured)");
// => {
//   $and: [
//     { category: "books" },
//     { $or: [{ status: "active" }, { status: "featured" }] }
//   ]
// }
```

### Nested Fields

Use dot notation for nested field access:

```typescript
parse("user.profile.name:john");
// => { user: { profile: { name: "john" } } }
```

### Global Search

Terms without field names search across all fields marked as `searchable`:

```typescript
parse("hello", {
  fields: {
    title: { type: "string", searchable: true },
    description: { type: "string", searchable: true },
  }
});
// => { $or: [{ title: "hello" }, { description: "hello" }] }
```

### Errors

Empty input returns `null`. Invalid query structure throws `ParseError`, global search without a matching searchable field throws `NoSearchableFieldsError`, and unsupported explicit field values throw `UnsupportedSyntaxError`. `UnsupportedSyntaxError` includes the field and raw value when available:

```typescript
parse("");
// => null

parse("count:abc", {
  fields: { count: { type: "number" } }
});
// throws UnsupportedSyntaxError

parse("created:-1w", {
  fields: { created: { type: "date" } }
});
// throws UnsupportedSyntaxError
```

## Configuration

### ParseOptions

| Option | Type | Description |
|--------|------|-------------|
| `fields` | `Record<string, FieldOptions>` | Field definitions for type coercion |
| `aliases` | `Record<string, string>` | Field name aliases |
| `timezone` | `string` | User timezone for date parsing and relative date comparisons; defaults to the system timezone |

### FieldOptions

| Option | Type | Description |
|--------|------|-------------|
| `type` | `"string" \| "number" \| "boolean" \| "date"` | Data type for coercion |
| `array` | `boolean` | Whether the field contains an array |
| `searchable` | `boolean` | Include in global search |
| `fulltext` | `boolean` | Use `$fulltext` for string equality searches |
| `prefix` | `boolean` | Use `$prefix` for trailing `*` searches on string fields |

### Example with Full Configuration

```typescript
import { parse } from "search-syntax";

const filter = parse("john tag:typescript,react created:>2024-01-01", {
  fields: {
    name: { type: "string", searchable: true },
    tag: { type: "string", array: true },
    created: { type: "date" },
  },
  aliases: {
    author: "createdBy",
  },
});
```

## Output Format

The parser produces filter objects with the following operators:

### Comparator Operators

| Operator | Description |
|----------|-------------|
| `$eq` | Equal to |
| `$gt` | Greater than |
| `$gte` | Greater than or equal |
| `$lt` | Less than |
| `$lte` | Less than or equal |
| `$in` | Value in array |
| `$contains` | Array contains values |
| `$fulltext` | Full-text string search |
| `$prefix` | Prefix string search |

### Logical Operators

| Operator | Description |
|----------|-------------|
| `$and` | Logical AND |
| `$or` | Logical OR |
| `$not` | Logical NOT |

## Advanced Usage

### Custom CST Visitor

For advanced use cases, you can use the parser and visitor directly:

```typescript
import {
  searchSyntaxLexer,
  searchSyntaxParser,
  SearchSyntaxCstVisitor,
} from "search-syntax";

const tokens = searchSyntaxLexer.tokenize("status:active");
searchSyntaxParser.input = tokens.tokens;
const cst = searchSyntaxParser.query();

const visitor = new SearchSyntaxCstVisitor({
  fields: { status: { type: "string" } }
});
const filter = visitor.visit(cst);
```

## TypeScript Support

Full TypeScript support with generic types:

```typescript
interface User {
  name: string;
  age: number;
  active: boolean;
}

const filter = parse<User>("age:>18 active:true");
// filter is typed as Filter<User>
```

## License

MIT
