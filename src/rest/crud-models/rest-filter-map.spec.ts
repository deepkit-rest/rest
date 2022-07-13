import {
  AutoIncrement,
  BackReference,
  PrimaryKey,
  Reference,
  ReflectionKind,
  ReflectionProperty,
} from "@deepkit/type";

import { Filterable, RestFilterMapFactory } from "./rest-filter-map";

describe("RestFilterMapFactory", () => {
  let factory: RestFilterMapFactory;

  beforeEach(() => {
    factory = new RestFilterMapFactory();
  });

  it("should work", async () => {
    class MyEntity {
      id: number & AutoIncrement & PrimaryKey & Filterable = 0;
      ref1!: MyEntity & Reference & Filterable;
      ref2: MyEntity[] & BackReference = [];
      func1 = () => {};
      fund2() {}
    }
    const s = factory.build(MyEntity);
    expect(s.getPropertyNames()).toEqual(["id", "ref1"]);
    expectOperatorMap(s.getProperty("id"), ReflectionKind.number);
    expectOperatorMap(s.getProperty("ref1"), ReflectionKind.number);
  });

  function expectOperatorMap(target: ReflectionProperty, kind: ReflectionKind) {
    expect(target).toMatchObject({
      property: {
        optional: true,
        type: {
          kind: ReflectionKind.objectLiteral,
          types: [
            { name: "$eq", type: { kind }, optional: true },
            { name: "$ne", type: { kind }, optional: true },
            { name: "$gt", type: { kind }, optional: true },
            { name: "$gte", type: { kind }, optional: true },
            { name: "$lt", type: { kind }, optional: true },
            { name: "$lte", type: { kind }, optional: true },
            {
              name: "$in",
              type: { kind: ReflectionKind.array, type: { kind } },
              optional: true,
            },
            {
              name: "$nin",
              type: { kind: ReflectionKind.array, type: { kind } },
              optional: true,
            },
          ],
        },
      },
    });
  }
});
