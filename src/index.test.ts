import { parse } from "./index.js";

describe("Field Search", () => {
  it("should parse simple id & value combos", () => {
    expect(parse("id:3")).toMatchObject({ id: 3 });

    expect(parse("slug:getting-started")).toMatchObject({
      slug: "getting-started",
    });
  });
});

describe("Full Text Search", () => {
  it("should parse simple id & value combos", () => {
    expect(parse("hello")).toMatchObject({});

    expect(
      parse("123456", {
        fields: {
          id: { type: "bigint", searchable: true },
          tags: { type: "string", array: true, searchable: true },
          html: { type: "string", fulltext: true, searchable: true },
        },
      })
    ).toMatchObject({
      $or: [
        {
          id: 123456n,
        },
        { tags: { $contains: ["123456"] } },
        { html: { $fulltext: "123456" } },
      ],
    });

    expect(
      parse("hello", {
        fields: {
          id: { type: "bigint", searchable: true },
          tags: { type: "string", array: true, searchable: true },
          html: { type: "string", fulltext: true, searchable: true },
          createdAt: { type: "date", searchable: true },
        },
      })
    ).toMatchObject({
      $or: [
        { tags: { $contains: ["hello"] } },
        { html: { $fulltext: "hello" } },
      ],
    });

    expect(
      parse("hello world", {
        fields: {
          id: { type: "bigint", searchable: true },
          tags: { type: "string", array: true, searchable: true },
          html: { type: "string", fulltext: true, searchable: true },
          createdAt: { type: "date", searchable: true },
        },
      })
    ).toMatchObject({
      $and: [
        {
          $or: [
            { tags: { $contains: ["hello"] } },
            { html: { $fulltext: "hello" } },
          ],
        },
        {
          $or: [
            { tags: { $contains: ["world"] } },
            { html: { $fulltext: "world" } },
          ],
        },
      ],
    });

    expect(
      parse(`"hello world"`, {
        fields: {
          id: { type: "bigint", searchable: true },
          tags: { type: "string", array: true, searchable: true },
          html: { type: "string", fulltext: true, searchable: true },
          createdAt: { type: "date", searchable: true },
        },
      })
    ).toMatchObject({
      $or: [
        { tags: { $contains: ["hello world"] } },
        { html: { $fulltext: "hello world" } },
      ],
    });
  });
});

describe("Automatic Type Recognition", () => {
  it("Null Type", () => {
    expect(parse("image:null")).toMatchObject({ image: null });
  });

  it("Boolean Type", () => {
    expect(parse("featured:true")).toMatchObject({ featured: true });
    expect(parse("featured:false")).toMatchObject({ featured: false });
  });

  it("Number Type", () => {
    expect(parse("count:5")).toMatchObject({ count: 5 });
  });

  it("Number Type with Decimal", () => {
    expect(parse("count:3.14")).toMatchObject({ count: 3.14 });
  });

  it("BigInt Type", () => {
    expect(parse("count:9007199254740992")).toMatchObject({
      count: 9007199254740992n,
    });
  });

  it("Date Type", () => {
    expect(parse(`date:2022-01-01`)).toMatchObject({
      date: new Date("2022-01-01"),
    });
  });

  it("Date Type with Time", () => {
    expect(parse(`date:2022-01-01T12:34:56`)).toMatchObject({
      date: new Date("2022-01-01T12:34:56"),
    });
  });

  it("Date Type with Time and Timezone", () => {
    expect(parse(`date:2022-01-01T12:34:56+08:00`)).toMatchObject({
      date: new Date("2022-01-01T12:34:56+08:00"),
    });
  });
});

describe("Comparison Operators", () => {
  it("Greater Than Operator", () => {
    expect(parse(`count:>5`)).toMatchObject({ count: { $gt: 5 } });

    expect(parse(`tag:>getting-started`)).toMatchObject({
      tag: { $gt: "getting-started" },
    });

    expect(parse(`author:>"Joe Bloggs"`)).toMatchObject({
      author: { $gt: "Joe Bloggs" },
    });
  });

  it("Less Than Operator", () => {
    expect(parse(`count:<5`)).toMatchObject({ count: { $lt: 5 } });

    expect(parse(`tag:<getting-started`)).toMatchObject({
      tag: { $lt: "getting-started" },
    });

    expect(parse(`author:<"Joe Bloggs"`)).toMatchObject({
      author: { $lt: "Joe Bloggs" },
    });
  });

  it("Greater Than or Equal Operator", () => {
    expect(parse(`count:>=5`)).toMatchObject({ count: { $gte: 5 } });

    expect(parse(`tag:>=getting-started`)).toMatchObject({
      tag: { $gte: "getting-started" },
    });

    expect(parse(`author:>="Joe Bloggs"`)).toMatchObject({
      author: { $gte: "Joe Bloggs" },
    });
  });

  it("Less Than or Equal Operator", () => {
    expect(parse(`count:<=5`)).toMatchObject({ count: { $lte: 5 } });

    expect(parse(`tag:<=getting-started`)).toMatchObject({
      tag: { $lte: "getting-started" },
    });

    expect(parse(`author:<="Joe Bloggs"`)).toMatchObject({
      author: { $lte: "Joe Bloggs" },
    });
  });
});

describe("Logical Operators", () => {
  it("AND Operator", () => {
    expect(parse("page:false status:published")).toMatchObject({
      $and: [{ page: false }, { status: "published" }],
    });
  });

  it("OR Operator", () => {
    expect(parse("page:true OR featured:true")).toMatchObject({
      $or: [{ page: true }, { featured: true }],
    });

    expect(parse("page:true OR page:false")).toMatchObject({
      $or: [{ page: true }, { page: false }],
    });
  });

  it("Same Operator Order Priority", () => {
    expect(
      parse("id:1 id:2 id:3", {
        fields: {
          id: { type: "number", searchable: true, filterable: true },
        },
      })
    ).toMatchObject({
      $and: [{ id: 1 }, { id: 2 }, { id: 3 }],
    });
  });

  it("AND Operator Should Have Higher Priority than OR Operator", () => {
    expect(
      parse("id:1 OR id:2 AND id:3", {
        fields: {
          id: { type: "number", searchable: true, filterable: true },
        },
      })
    ).toMatchObject({
      $or: [{ id: 1 }, { $and: [{ id: 2 }, { id: 3 }] }],
    });
  });

  it("Parentheses Should Have Higher Priority than AND Operator", () => {
    expect(
      parse("id:1 OR id:2 AND (id:3 OR id: 4)", {
        fields: {
          id: { type: "number", searchable: true, filterable: true },
        },
      })
    ).toMatchObject({
      $or: [{ id: 1 }, { $and: [{ id: 2 }, { $or: [{ id: 3 }, { id: 4 }] }] }],
    });
  });
});

describe("Exclusion Search", () => {
  it("can parse not equals", () => {
    expect(parse(`-count:5`)).toMatchObject({
      $not: { $and: [{ count: 5 }] },
    });

    expect(parse(`not count:5`)).toMatchObject({
      $not: { $and: [{ count: 5 }] },
    });

    expect(parse(`-tag:getting-started`)).toMatchObject({
      $not: { $and: [{ tag: "getting-started" }] },
    });

    expect(parse(`-author:"Joe Bloggs"`)).toMatchObject({
      $not: { $and: [{ author: "Joe Bloggs" }] },
    });

    expect(
      parse(`- (tag:getting-started OR author:"Joe Bloggs")`)
    ).toMatchObject({
      $not: {
        $or: [{ tag: "getting-started" }, { author: "Joe Bloggs" }],
      },
    });

    expect(
      parse(`-(tag:getting-started OR -author:"Joe Bloggs")`)
    ).toMatchObject({
      $not: {
        $or: [
          { tag: "getting-started" },
          { $not: { $and: [{ author: "Joe Bloggs" }] } },
        ],
      },
    });
  });
});

describe("Ignore Whitespace", function () {
  it("should ignore whitespace in expressions", function () {
    expect(parse(`- count : 5`)).toMatchObject(parse(`-count:5`));
    expect(parse(`- author : joe  tag : photo`)).toMatchObject(
      parse(`-author:joe tag:photo`)
    );
  });

  it("should not ignore whitespace inside quotes", function () {
    expect(parse(`author : "Hello World"`)).toMatchObject({
      author: "Hello World",
    });
  });
});

describe("Prefix and Suffix Search", () => {
  it("Prefix Search", () => {
    expect(
      parse("name: abc*", {
        fields: {
          name: {
            type: "string",
            searchable: true,
            filterable: true,
          },
        },
      })
    ).toMatchObject({ name: { $like: "abc%" } });
  });

  it("Suffix Search", () => {
    expect(
      parse("name: *abc", {
        fields: {
          name: {
            type: "string",
            searchable: true,
            filterable: true,
          },
        },
      })
    ).toMatchObject({ name: { $like: "%abc" } });
  });
});

describe("Nested Field Search", () => {
  it("should parse nested field search", () => {
    expect(parse(`post.id: 1`)).toMatchObject({
      post: { id: 1 },
    });
  });
});

describe("Alias", () => {
  it("Field Alias", () => {
    expect(
      parse("John AND name: John", {
        fields: {
          username: {
            type: "string",
            searchable: true,
            filterable: true,
          },
        },
        aliases: {
          name: "username",
        },
      })
    ).toMatchObject({
      $and: [{ $or: [{ username: "John" }] }, { username: "John" }],
    });
  });
});

describe("Comma for Multiple Values", () => {
  it("should parse as $in when field is not an array", () => {
    expect(
      parse("id: 1,2,3", {
        fields: {
          id: {
            type: "number",
            filterable: true,
          },
        },
      })
    ).toMatchObject({
      id: { $in: [1, 2, 3] },
    });
  });

  it("should parse as $contains when field is an array", () => {
    expect(
      parse("tags: a,b,c", {
        fields: {
          tags: {
            type: "string",
            filterable: true,
            array: true,
          },
        },
      })
    ).toMatchObject({
      tags: { $contains: ["a", "b", "c"] },
    });
  });
});
