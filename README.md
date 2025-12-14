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
parse("date:2024-01-01");     // { date: Date("2024-01-01") }
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

### Multiple Values

Comma-separated values create an `$in` query (or `$contains` for array fields):

```typescript
parse("status:active,pending,draft");
// => { status: { $in: ["active", "pending", "draft"] } }

parse("tags:vue,react", {
  fields: { tags: { type: "string", array: true } }
});
// => { tags: { $contains: ["vue", "react"] } }
```

### Wildcard Search

Use `*` for prefix or suffix matching:

```typescript
parse("name:john*");   // { name: { $like: "john%" } }
parse("email:*@gmail.com");  // { email: { $like: "%@gmail.com" } }
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
// => { $not: { $and: [{ status: "archived" }] } }

parse("NOT status:archived");
// => { $not: { $and: [{ status: "archived" }] } }
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

## Configuration

### ParseOptions

| Option | Type | Description |
|--------|------|-------------|
| `fields` | `Record<string, FieldOptions>` | Field definitions for type coercion |
| `aliases` | `Record<string, string>` | Field name aliases |
| `timezone` | `string` | Timezone for date parsing |

### FieldOptions

| Option | Type | Description |
|--------|------|-------------|
| `type` | `"string" \| "number" \| "boolean" \| "date"` | Data type for coercion |
| `array` | `boolean` | Whether the field contains an array |
| `searchable` | `boolean` | Include in global search |

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
| `$like` | Pattern matching (% wildcard) |

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
