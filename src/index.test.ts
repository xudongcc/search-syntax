import { parse } from ".";

test("empty query", () => {
  expect(parse("")).toBe(null);
  expect(parse(null)).toBe(null);
  expect(parse(undefined)).toBe(null);
});

test("do not specify a field", () => {
  expect(parse("Hello")).toMatchObject({
    $text: {
      $search: "Hello",
    },
  });
});

test("is not null", () => {
  expect(parse("NOT field:NULL")).toMatchObject({
    $not: {
      field: {
        $eq: null,
      },
    },
  });
});

test("removes leading and trailing whitespace", () => {
  expect(parse("field:test ")).toMatchObject({
    field: {
      $eq: "test",
    },
  });
});

test("number decimal point", () => {
  expect(parse("number:123.45")).toMatchObject({
    number: {
      $eq: 123.45,
    },
  });
});

test("gt", () => {
  expect(parse("number:>123.45")).toMatchObject({
    number: {
      $gt: 123.45,
    },
  });
});

test("and", () => {
  expect(parse('name:"John Wick" AND enable:true')).toMatchObject({
    $and: [
      {
        name: {
          $eq: '"John Wick"',
        },
      },
      {
        enable: {
          $eq: true,
        },
      },
    ],
  });
});

test("or", () => {
  expect(parse("name:John OR enable:true")).toMatchObject({
    $or: [
      {
        name: {
          $eq: "John",
        },
      },
      {
        enable: {
          $eq: true,
        },
      },
    ],
  });
});

test("sub query", () => {
  expect(
    parse(
      '(name:John OR age:>=18) created_at:>="2020-01-01 00:00:00" AND created_at:<="2020-12-31 23:59:59"'
    )
  ).toMatchObject({
    $and: [
      {
        $or: [
          {
            name: {
              $eq: "John",
            },
          },
          {
            age: {
              $gte: 18,
            },
          },
        ],
      },
      {
        created_at: {
          $gte: '"2020-01-01 00:00:00"',
        },
      },
      {
        created_at: {
          $lte: '"2020-12-31 23:59:59"',
        },
      },
    ],
  });
});
