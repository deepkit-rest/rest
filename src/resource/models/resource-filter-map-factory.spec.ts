import {
  AutoIncrement,
  BackReference,
  PrimaryKey,
  Reference,
  ReflectionKind,
  ReflectionProperty,
} from "@deepkit/type";

import { ResourceFilterMapFactory } from "./resource-filter-map-factory";

describe("ResourceFilterMapFactory", () => {
  class MyEntity {
    id: number & AutoIncrement & PrimaryKey = 0;
    ref1!: MyEntity & Reference;
    ref2: MyEntity[] & BackReference = [];
    func1 = () => {};
    fund2() {}
  }

  it("should work", async () => {
    const s = ResourceFilterMapFactory.build<MyEntity>("all", "include");
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
