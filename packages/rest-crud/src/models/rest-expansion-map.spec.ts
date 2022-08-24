import {
  AutoIncrement,
  BackReference,
  PrimaryKey,
  Reference,
  ReflectionKind,
} from "@deepkit/type";

import { Expandable, RestExpansionMapFactory } from "./rest-expansion-map";

describe("RestExpansionMapFactory", () => {
  let factory: RestExpansionMapFactory;

  beforeEach(() => {
    factory = new RestExpansionMapFactory();
  });

  it("should work", async () => {
    class MyEntity {
      id: number & PrimaryKey & AutoIncrement = 0;
      ref?: MyEntity & Reference & Expandable = undefined;
      refs?: MyEntity[] & BackReference & Expandable = undefined;
    }
    const schema = factory.build(MyEntity);
    expect(schema.getPropertyNames()).toEqual(["ref", "refs"]);
    expect(schema.getProperty("ref")).toMatchObject({
      property: {
        type: { kind: ReflectionKind.boolean },
        optional: true,
      },
    });
    expect(schema.getProperty("refs")).toMatchObject({
      property: {
        type: { kind: ReflectionKind.boolean },
        optional: true,
      },
    });
  });

  it("should throw for non-relational fields", async () => {
    class MyEntity {
      id: number & PrimaryKey & AutoIncrement & Expandable = 0;
    }
    expect(() => factory.build(MyEntity)).toThrow("relational");
  });
});
